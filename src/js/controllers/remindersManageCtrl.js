angular.module('starter').controller('RemindersManageCtrl', ["$scope", "$state", "$stateParams", "$ionicPopup", "$rootScope", "$timeout", "$ionicLoading", "$filter", "$ionicActionSheet", "qmService", "qmLogService", function($scope, $state, $stateParams, $ionicPopup,
																	 $rootScope, $timeout, $ionicLoading, $filter,
																	 $ionicActionSheet,  qmService, qmLogService) {
	$scope.controller_name = "RemindersManageCtrl";
	qmLogService.debug(null, 'Loading ' + $scope.controller_name, null);
	$rootScope.showFilterBarSearchIcon = false;
    qmService.sendToLoginIfNecessaryAndComeBack();
	$scope.state = {
		showButtons : false,
		variableCategory : $stateParams.variableCategoryName,
		showMeasurementBox : false,
		selectedReminder : false,
		reminderDefaultValue : "",
		selected1to5Value : false,
		trackingReminders : [],
		measurementDate : new Date(),
		slots : {
			epochTime: new Date().getTime()/1000,
			format: 12,
			step: 1,
			closeLabel: 'Cancel'
		},
		variable : {},
		isDisabled : false,
		loading : true,
		showTreatmentInfoCard : false,
		showSymptomInfoCard : false,
		noRemindersTitle: "Add Some Variables",
		noRemindersText: "You don't have any reminders, yet.",
		noRemindersIcon: "ion-android-notifications-none"
	};
	$scope.$on('$ionicView.beforeEnter', function(e) { qmLogService.info(null, 'beforeEnter RemindersManageCtrl', null);
		if(urlHelper.getParam('variableCategoryName')){$stateParams.variableCategoryName = urlHelper.getParam('variableCategoryName');}
		qmService.showBasicLoader();
		$rootScope.hideNavigationMenu = false;
		$scope.stateParams = $stateParams;
		var actionButtons = [
			{ text: '<i class="icon ion-arrow-down-c"></i>Sort by Name'},
			{ text: '<i class="icon ion-clock"></i>Sort by Time' }
		];
		if (!$stateParams.variableCategoryName || $stateParams.variableCategoryName === "Anything") {
			if(!$scope.stateParams.title) { $scope.stateParams.title = "Manage Reminders"; }
			if(!$scope.stateParams.addButtonText) { $scope.stateParams.addButtonText = "Add a Variable"; }
            if(!$scope.stateParams.addMeasurementButtonText) { $scope.stateParams.addMeasurementButtonText = "Record Measurement"; }
			actionButtons[2] = qmService.actionSheetButtons.history;
            actionButtons[3] = qmService.actionSheetButtons.addReminder;
		} else {
			$scope.state.noRemindersTitle = "Add " + $stateParams.variableCategoryName;
			$scope.state.noRemindersText = "You haven't saved any " + $stateParams.variableCategoryName.toLowerCase() + " favorites or reminders here, yet.";
			$scope.state.noRemindersIcon = qmService.getVariableCategoryInfo($stateParams.variableCategoryName).ionIcon;
			if(!$scope.stateParams.title){ $scope.stateParams.title = $stateParams.variableCategoryName; }
			if(!$scope.stateParams.addButtonText) {
				$scope.stateParams.addButtonText = 'Add New ' + pluralize($filter('wordAliases')($stateParams.variableCategoryName), 1);
			}
			$scope.stateParams.addMeasurementButtonText = "Add  " + pluralize($filter('wordAliases')($stateParams.variableCategoryName), 1) + " Measurement";
            actionButtons[2] = { text: '<i class="icon ' + qmService.ionIcons.history + '"></i>' + $stateParams.variableCategoryName + ' History'};
            actionButtons[3] = { text: '<i class="icon ' + qmService.ionIcons.reminder + '"></i>' + $scope.stateParams.addButtonText};
		}
        actionButtons[4] = qmService.actionSheetButtons.recordMeasurement;
        actionButtons[5] = qmService.actionSheetButtons.charts;
        actionButtons[6] = qmService.actionSheetButtons.refresh;
		$scope.state.showButtons = true;
		getTrackingReminders();
		$rootScope.showActionSheetMenu = function() {
			var hideSheet = $ionicActionSheet.show({
				buttons: actionButtons,
				cancelText: '<i class="icon ion-ios-close"></i>Cancel',
				cancel: function() {qmLogService.debug(null, 'CANCELLED', null);},
				buttonClicked: function(index) {
					qmLogService.debug(null, 'BUTTON CLICKED', null, index);
					if(index === 0){$rootScope.reminderOrderParameter = 'variableName';}
					if(index === 1){$rootScope.reminderOrderParameter = 'reminderStartTimeLocal';}
					if(index === 2){qmService.goToState('app.historyAll', {variableCategoryName: $stateParams.variableCategoryName});}
                    if(index === 3){qmService.goToState('app.reminderSearch', {variableCategoryName : $stateParams.variableCategoryName});}
                    if(index === 4){qmService.goToState('app.measurementAddSearch', {variableCategoryName : $stateParams.variableCategoryName});}
                    if(index === 5){qmService.goToState('app.chartSearch', {variableCategoryName : $stateParams.variableCategoryName});}
                    if(index === 6){$scope.refreshReminders();}
					return true;
				}
			});
			$timeout(function() { hideSheet(); }, 20000);
		};
	});
	if(!$rootScope.reminderOrderParameter){ $rootScope.reminderOrderParameter = 'variableName'; }
	function showAppropriateHelpInfoCards(){
		$scope.state.showTreatmentInfoCard = (!$scope.state.trackingReminders || $scope.state.trackingReminders.length === 0) &&
			(window.location.href.indexOf('Treatments') > -1 || $stateParams.variableCategoryName === 'Anything');
		$scope.state.showSymptomInfoCard = ((!$scope.state.trackingReminders || $scope.state.trackingReminders.length === 0) &&
			window.location.href.indexOf('Symptom') > -1 || $stateParams.variableCategoryName === 'Anything');
	}
	function hideLoader() {
        $scope.$broadcast('scroll.refreshComplete'); //Stop the ion-refresher from spinning
        qmService.hideLoader();
    }
	function addRemindersToScope(allTrackingReminderTypes) {
		hideLoader();
		if(!allTrackingReminderTypes.allTrackingReminders || !allTrackingReminderTypes.allTrackingReminders.length){
			qmLogService.info(null, 'No reminders!', null);
			$scope.state.showNoRemindersCard = true;
			return;
		}
        qmLogService.info(null, 'Got ' + allTrackingReminderTypes.allTrackingReminders.length + ' ' + $stateParams.variableCategoryName +
            " category allTrackingReminderTypes.allTrackingReminders!", null);
		$scope.state.showNoRemindersCard = false;
		$scope.state.favorites = allTrackingReminderTypes.favorites;
		$scope.state.trackingReminders = allTrackingReminderTypes.trackingReminders;
        var count = 0;
        if(allTrackingReminderTypes.trackingReminders && allTrackingReminderTypes.trackingReminders.length){count = allTrackingReminderTypes.trackingReminders.length;}
        qmLogService.info(null, 'Got ' + count + ' ' + $stateParams.variableCategoryName + ' category allTrackingReminderTypes.trackingReminders', null);
		$scope.state.archivedTrackingReminders = allTrackingReminderTypes.archivedTrackingReminders;
		showAppropriateHelpInfoCards();
	}
	$scope.refreshReminders = function () {
		qmService.showInfoToast('Syncing...');
		qmService.syncTrackingReminders(true).then(function(){
            hideLoader();
			getTrackingReminders();
		});
	};
	var getTrackingReminders = function(){
		if(urlHelper.getParam('variableCategoryName')){$stateParams.variableCategoryName = urlHelper.getParam('variableCategoryName');}
		qmLogService.info(null, 'Getting ' + $stateParams.variableCategoryName + ' category reminders', null);
		qmService.getAllReminderTypes($stateParams.variableCategoryName).then(function (allTrackingReminderTypes) {
			addRemindersToScope(allTrackingReminderTypes);
		});
	};
	$scope.showMoreNotificationInfoPopup = function(){
		var moreNotificationInfoPopup = $ionicPopup.show({
			title: "Individual Notifications Disabled",
			subTitle: 'Currently, you will only get one non-specific repeating device notification at a time.',
			scope: $scope,
			template: "It is possible to instead get a separate device notification for each tracking reminder that " +
				"you create.  You can change this setting or update the notification frequency on the settings page.",
			buttons:[
				{text: 'Settings', type: 'button-positive', onTap: function(e) { qmService.goToState('app.settings'); }},
				{text: 'OK', type: 'button-assertive'}
			]
		});
		moreNotificationInfoPopup.then(function(res) { qmLogService.debug(null, 'Tapped!', null, res); });
	};
	$scope.edit = function(trackingReminder){
		trackingReminder.fromState = $state.current.name;
		qmService.goToState('app.reminderAdd', { reminder : trackingReminder, fromUrl: window.location.href });
	};
	$scope.addNewReminderButtonClick = function(){
		if ($stateParams.variableCategoryName && $stateParams.variableCategoryName !== 'Anything') {
			qmService.goToState('app.reminderSearch', {variableCategoryName : $stateParams.variableCategoryName, fromUrl: window.location.href});}
		else {qmService.goToState('app.reminderSearch');}
	};
	$scope.addNewMeasurementButtonClick = function(){
		if ($stateParams.variableCategoryName && $stateParams.variableCategoryName !== 'Anything') {
			qmService.goToState('app.measurementAddSearch', {variableCategoryName : $stateParams.variableCategoryName});}
		else { qmService.goToState('app.measurementAddSearch'); }
	};
	$scope.deleteReminder = function(reminder){
		reminder.hide = true;
		qmService.qmStorage.deleteById('trackingReminders', reminder.trackingReminderId);
			//.then(function(){getTrackingReminders();});
		qmService.deleteTrackingReminderDeferred(reminder).then(function(){qmLogService.debug(null, 'Reminder deleted', null);}, function(error){
			qmLogService.error('Failed to Delete Reminder: ' + error);
		});
	};
	$scope.showActionSheet = function(trackingReminder) {
		var variableObject = qmService.convertTrackingReminderToVariableObject(trackingReminder);
		var hideSheet = $ionicActionSheet.show({
			buttons: [
				{ text: '<i class="icon ion-android-notifications-none"></i>Edit'},
				qmService.actionSheetButtons.recordMeasurement,
				qmService.actionSheetButtons.charts,
				qmService.actionSheetButtons.history,
				qmService.actionSheetButtons.analysisSettings
			],
			destructiveText: '<i class="icon ion-trash-a"></i>Delete',
			cancelText: '<i class="icon ion-ios-close"></i>Cancel',
			cancel: function() {qmLogService.debug(null, 'CANCELLED', null);},
			buttonClicked: function(index) {
				qmLogService.debug(null, 'BUTTON CLICKED', null, index);
				if(index === 0){$scope.edit(trackingReminder);}
				if(index === 1){qmService.goToState('app.measurementAdd', {variableObject: variableObject, variableName: variableObject.name});}
				if(index === 2){qmService.goToState('app.charts', {variableObject: variableObject, variableName: variableObject.name});}
				if(index === 3){qmService.goToState('app.historyAllVariable', {variableObject: variableObject, variableName: variableObject.name});}
				if(index === 4){qmService.goToState('app.variableSettings', {variableObject: variableObject, variableName: variableObject.name});}
				return true;
			},
			destructiveButtonClicked: function() {
				$scope.deleteReminder(trackingReminder);
				return true;
			}
		});
		$timeout(function() {hideSheet();}, 20000);
	};
}]);