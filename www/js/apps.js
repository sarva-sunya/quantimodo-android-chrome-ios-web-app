// SubDomain : Filename
var appConfigFileNames = {
    "app" : "quantimodo",
    "energymodo" : "energymodo",
    "default" : "default",
    "ionic" : "quantimodo",
    "local" : "quantimodo",
    "medimodo" : "medimodo",
    "mindfirst" : "mindfirst",
    "moodimodo" : "moodimodo",
    "oauth" : "quantimodo",
    "quantimodo" : "quantimodo",
    "yourlowercaseappnamehere": "yourlowercaseappnamehere"
};

function getSubDomain(){
    var full = window.location.host;
    var parts = full.split('.');
    return parts[0].toLowerCase();
}

function getClientIdFromQueryParameters() {
    var queryString = document.location.toString().split('?')[1];
    if(!queryString) {return false;}
    var queryParameterStrings = queryString.split('&');
    if(!queryParameterStrings) {return false;}
    for (var i = 0; i < queryParameterStrings.length; i++) {
        var queryKeyValuePair = queryParameterStrings[i].split('=');
        if (['app','appname','lowercaseappname','clientid'].contains(queryKeyValuePair[0].toLowerCase().replace('_',''))) {
            return queryKeyValuePair[1].split('#')[0].toLowerCase();
        }
    }
}

function getQuantiModoClientId() {
    if(window.location.href.indexOf('https://') === -1 || window.location.href.indexOf('quantimo.do') === -1){return "default";} // On mobile
    if(getClientIdFromQueryParameters()){return getClientIdFromQueryParameters();}
    if(appConfigFileNames[getSubDomain()]){return appConfigFileNames[getSubDomain()];}
    return getSubDomain();
}

function getUrlParameter(parameterName, url, shouldDecode) {
    if(!url){url = window.location.href;}
    if(parameterName.toLowerCase().indexOf('name') !== -1){shouldDecode = true;}
    if(url.split('?').length > 1){
        var queryString = url.split('?')[1];
        var parameterKeyValuePairs = queryString.split('&');
        for (var i = 0; i < parameterKeyValuePairs.length; i++) {
            var currentParameterKeyValuePair = parameterKeyValuePairs[i].split('=');
            if (currentParameterKeyValuePair[0].replace('_', '').toLowerCase() === parameterName.replace('_', '').toLowerCase()) {
                if(typeof shouldDecode !== "undefined")  {
                    return decodeURIComponent(currentParameterKeyValuePair[1]);
                } else {
                    return currentParameterKeyValuePair[1];
                }
            }
        }
    }
    return null;
}

var appsManager = { // jshint ignore:line
	defaultApp : "default",
	getAppConfig : function(){
        console.debug('getQuantiModoClientId returns ' + getQuantiModoClientId());
		if(getQuantiModoClientId()){
			return 'configs/' + getQuantiModoClientId() + '.js';
		} else {
			return 'configs/' + appsManager.defaultApp + '.js';
		}
	},
	getPrivateConfig : function(){
		if(getQuantiModoClientId()){
			return './private_configs/'+ getQuantiModoClientId() + '.config.js';
		} else {
			return './private_configs/'+ appsManager.defaultApp + '.config.js';
		}
	},
	doWeHaveLocalConfigFile: function () {
        if(appConfigFileNames[getQuantiModoClientId()]){return true;}
    },
	getSubDomain: function(){
		return getSubDomain();
	},
    getUrlParameter: function (parameterName, url, shouldDecode) {
        return getUrlParameter(parameterName, url, shouldDecode);
    },
    getAppSettingsFromUrlParameter: function(){
        var appSettings = getUrlParameter('appSettings');
        if(appSettings) {
            appSettings = JSON.parse(decodeURIComponent(appSettings));
            window.config.appSettings = appSettings;
            return appSettings;
        }
    },
    getQuantiModoClientId: function () {
        return getQuantiModoClientId();
    }
};