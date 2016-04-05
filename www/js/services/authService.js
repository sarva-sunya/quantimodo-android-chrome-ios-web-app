angular.module('starter')

	.factory('authService', function ($http, $q, localStorageService, utilsService, $state, $ionicLoading) {

		var authSrv = {

			// extract values from token response and saves in localstorage
			updateAccessToken: function (accessResponse) {
				if(accessResponse){
					var accessToken = accessResponse.accessToken || accessResponse.access_token;
					var expiresIn = accessResponse.expiresIn || accessResponse.expires_in;
					var refreshToken = accessResponse.refreshToken || accessResponse.refresh_token;

					// save in localStorage
					if(accessToken) {
						localStorageService.setItem('accessToken', accessToken);
                    }
					if(refreshToken) {
						localStorageService.setItem('refreshToken', refreshToken);
                    }

					console.log("expires in: ", JSON.stringify(expiresIn), parseInt(expiresIn, 10));

					// calculate expires at
					var expiresAt = new Date().getTime() + parseInt(expiresIn, 10) * 1000 - 60000;

					// save in localStorage
					if(expiresAt) {
						localStorageService.setItem('expiresAt', expiresAt);
                    }

					return accessToken;
				} else {
					return "";
                }
			},

			generateV1OAuthUrl: function(register) {
				var url = config.getApiUrl() + "/api/oauth2/authorize?"
				// add params
				url += "response_type=code";
				url += "&client_id="+config.getClientId();
				url += "&client_secret="+config.getClientSecret();
				url += "&scope="+config.getPermissionString();
				url += "&state=testabcd";
				if(register === true){
					url += "&register=true";
				}
				//url += "&redirect_uri=" + config.getRedirectUri();
				return url;
			},

			generateV2OAuthUrl: function() {
				var url = config.getURL("api/v2/bshaffer/oauth/authorize", true);
				url += "response_type=code";
				url += "&client_id="+config.getClientId();
				url += "&client_secret="+config.getClientSecret();
				url += "&scope="+config.getPermissionString();
				url += "&state=testabcd";
				url += "&token="+responseToken;
				//url += "&redirect_uri=" + config.getRedirectUri();
				return url;
			},

			getAuthorizationCodeFromUrl: function(event) {
				console.log('the authorization code that i got is: ' + event.url);
				console.log('extract authorization code');
				var authorizationCode = utilsService.getUrlParameter(event.url, 'code');

				if(authorizationCode === false) {
					authorizationCode = utilsService.getUrlParameter(event.url, 'token');
				}
				return authorizationCode;
			},

			nonNativeMobileLogin: function(register) {
				console.log("Mobile device detected and ionic platform is " + ionic.Platform.platforms[0]);
				console.log(JSON.stringify(ionic.Platform.platforms));

				var url = authSrv.generateV1OAuthUrl(register);

				console.log('open the auth window via inAppBrowser.');
				var ref = window.open(url,'_blank', 'location=no,toolbar=yes');

				console.log('listen to its event when the page changes');
				ref.addEventListener('loadstart', function(event) {

					console.log(JSON.stringify(event));
					console.log('The event.url is ' + event.url);
					console.log('The redirection url is ' + config.getRedirectUri());

					console.log('Checking if changed url is the same as redirection url.');
					if(utilsService.startsWith(event.url, config.getRedirectUri())) {

						console.log('event.url starts with ' + config.getRedirectUri());
						if(!utilsService.getUrlParameter(event.url,'error')) {

							var authorizationCode = authSrv.getAuthorizationCodeFromUrl(event);
							console.log('Closing inAppBrowser.');
							ref.close();
							console.log('Going to get an access token using authorization code.');
							$scope.getAccessTokenFromAuthorizationCode(authorizationCode);

						} else {

							console.log("error occurred", utilsService.getUrlParameter(event.url, 'error'));

							console.log('close inAppBrowser');
							ref.close();
						}
					}

				});
				
			},
			
			chromeLogin: function(register) {
				if(chrome.identity){
					console.log("login: Code running in a Chrome extension (content script, background page, etc.");

					var url = authSrv.generateV1OAuthUrl(register);
					
					chrome.identity.launchWebAuthFlow({
						'url': url,
						'interactive': true
					}, function(redirect_url) {
						var authorizationCode = authSrv.getAuthorizationCodeFromUrl(event);
						$scope.getAccessTokenFromAuthorizationCode(authorizationCode);
					});
				} else {
					console.log("It is an extension, so we use sessions instead of OAuth flow. ");
					chrome.tabs.create({ url: config.getApiUrl() + "/" });
				}


			},

			nonOAuthBrowserLogin : function(register) {
				var loginUrl = config.getURL("api/v2/auth/login");
				if (register === true) {
					loginUrl = config.getURL("api/v2/auth/register");
				}
				console.log("Client id is oAuthDisabled - will redirect to regular login.");
				loginUrl += "redirect_uri=" + encodeURIComponent(window.location.href);
				console.debug('AUTH redirect URL created:', loginUrl);
				console.debug('GOOD LUCK!');
				window.location.replace(loginUrl);
			},

			browserLogin: function(register) {

				console.log("Browser Login");

				if (config.getClientId() !== 'oAuthDisabled') {
					var url = authSrv.generateV1OAuthUrl(register);
	
					var ref = window.open(url, '_blank');
	
					if (!ref) {
						alert("You must first unblock popups, and and refresh the page for this to work!");
					} else {
						// broadcast message question every second to sibling tabs
						var interval = setInterval(function () {
							ref.postMessage('isLoggedIn?', config.getRedirectUri());
							ref.postMessage('isLoggedIn?', 'https://app.quantimo.do/ionic/Modo/www/callback/');
							ref.postMessage('isLoggedIn?', 'https://local.quantimo.do:4417/ionic/Modo/www/callback/');
							ref.postMessage('isLoggedIn?', 'https://staging.quantimo.do/ionic/Modo/www/callback/');
						}, 1000);
	
						// handler when a message is received from a sibling tab
						window.onMessageReceived = function (event) {
							console.log("message received from sibling tab", event.data);
	
							// Don't ask login question anymore
							clearInterval(interval);
	
							// the url that QuantiModo redirected us to
							var iframe_url = event.data;
	
							// validate if the url is same as we wanted it to be
							if (utilsService.startsWith(iframe_url, config.getRedirectUri())) {
								// if there is no error
								if (!utilsService.getUrlParameter(iframe_url, 'error')) {
	
									// extract token
									var authorizationCode = utilsService.getUrlParameter(iframe_url, 'code');
	
									if (authorizationCode === false) {
										authorizationCode = utilsService.getUrlParameter(iframe_url, 'token');
									}
	
									// get access token from authorization code
									$scope.getAccessToken(authorizationCode);
	
									// close the sibling tab
									ref.close();
	
								} else {
									// TODO : display_error
									console.log("Error occurred validating redirect url. Closing the sibling tab.",
										utilsService.getUrlParameter(iframe_url, 'error'));
	
									// close the sibling tab
									ref.close();
								}
							}
						};
	
						// listen to broadcast messages from other tabs within browser
						window.addEventListener("message", window.onMessageReceived, false);
					}
				} else {
					authSrv.nonOAuthBrowserLogin(register);
				}
			},
		

			// retrieves access token.
			// if expired, renews it
			// if not logged in, returns rejects
			getAccessToken: function () {

				var deferred = $q.defer();

				var tokenInGetParams = authSrv.utilsService.getUrlParameter(location.href, 'accessToken');

				if(!tokenInGetParams) {
					tokenInGetParams = authSrv.utilsService.getUrlParameter(location.href, 'access_token');
                }

				//check if token in get params
				if (tokenInGetParams) {

					localStorageService.setItem('accessToken', tokenInGetParams);
					//resolving promise using token fetched from get params
					console.log('resolving token using token fetched from get', tokenInGetParams);
					deferred.resolve({
						accessToken: tokenInGetParams
					});
				} else {

					//check if previously we already tried to get token from user credentials
					//this is possible if user logged in with cookie
					console.log('previously tried to fetch credentials:', authSrv.triedToFetchCredentials);
					if (authSrv.triedToFetchCredentials) {

						console.log('previous credentials fetch result:', authSrv.succesfullyFetchedCredentials);
						if (authSrv.succesfullyFetchedCredentials) {

							console.log('resolving token using value from local storage');

							deferred.resolve({
								accessToken: localStorageService.getItemSync('accessToken')
							});

						} else {

							console.log('starting access token fetching flow');

							authSrv._defaultGetAccessToken(deferred);

						}

					} else {
						console.log('trying to fetch user credentials');
						//try to fetch credentials with call to /api/user
						$http.get(config.getURL("api/user")).then(
							function (userCredentialsResp) {
								//if direct API call was successful
								console.log('User credentials fetched:', userCredentialsResp);

								Bugsnag.metaData = {
									user: {
										name: userCredentialsResp.data.displayName,
										email: userCredentialsResp.data.email
									}
								};

								//get token value from response
								var token = userCredentialsResp.data.token.split("|")[2];
								//update locally stored token
								localStorageService.setItem('accessToken', token);

								//set flags
								authSrv.triedToFetchCredentials = true;
								authSrv.succesfullyFetchedCredentials = true;

								//resolve promise
								deferred.resolve({
									accessToken: token
								});

							},
							function (errorResp) {
								//if no luck with getting credentials
								console.log('failed to fetch user credentials', errorResp);

								console.log('client id is ' + config.getClientId());

								console.log('Platform is browser: ' +ionic.Platform.is('browser'));
								console.log('Platform is ios: ' +ionic.Platform.is('ios'));
								console.log('Platform is android: ' +ionic.Platform.is('android'));

								//console.log('Platform is ' + JSON.stringify(ionic.Platform.platforms[0]));

								//Using OAuth on Staging for tests
								if(!ionic.Platform.is('ios') && !ionic.Platform.is('android')
									&& config.getClientId() === 'oAuthDisabled'
								    && !(window.location.origin.indexOf('staging.quantimo.do') > -1)){
										console.log("Browser Detected and client id is oAuthDisabled.  ");
									    $ionicLoading.hide();
										$state.go('app.login');
										// var loginUrl = config.getURL("api/v2/auth/login");
										// console.log("Client id is oAuthDisabled - will redirect to regular login.");
										// loginUrl += "redirect_uri=" + encodeURIComponent(window.location.href);
										// console.debug('AUTH redirect URL created:', loginUrl);
										// console.debug('GOOD LUCK!');
										// //window.location.replace(loginUrl);
										// var win = window.open(loginUrl, '_blank');
										// win.focus();
								} else {
								//set flags
								authSrv.triedToFetchCredentials = true;
								authSrv.succesfullyFetchedCredentials = false;

								console.log('starting access token fetching flow');

								authSrv._defaultGetAccessToken(deferred);
								}
							})

					}

				}
				return deferred.promise;
			},

			// get access token from authorization code
			getAccessTokenFromAuthorizationCode: function (authorizationCode, withJWT) {
				console.log("Authorization code is " + authorizationCode);

				var deferred = $q.defer();

				var url = config.getURL("api/oauth2/token");

				// make request
				var request = {
					method: 'POST',
					url: url,
					responseType: 'json',
					headers: {
						'Content-Type': "application/json"
					},
					data: {
						client_id: config.getClientId(),
						client_secret: config.getClientSecret(),
						grant_type: 'authorization_code',
						code: authorizationCode,
						redirect_uri: config.getRedirectUri()
					}
				};

				console.log('getAccessTokenFromAuthorizationCode: request is ', request);
				console.log(JSON.stringify(request));

				// post
				$http(request).success(function (response) {
					console.log('getAccessTokenFromAuthorizationCode: Successful response is ', response);
					console.log(JSON.stringify(response));
					deferred.resolve(response);
				}).error(function (response) {
					console.log('getAccessTokenFromAuthorizationCode: Error response is ', response);
					console.log(JSON.stringify(response));
					deferred.reject(response);
				});

				return deferred.promise;
			},

			getJWTToken: function (provider, accessToken) {
				var deferred = $q.defer();

				var url = config.getURL('api/v2/auth/social/authorizeToken');

				url += "provider=" + provider;
				url += "&accessToken=" + accessToken;

				$http({
					method: 'GET',
					url: url,
					headers: {
						'Content-Type': 'application/json'
					}
				}).then(function (response) {
					if (response.data.success && response.data.data && response.data.data.token) {
						deferred.resolve(response.data.data.token);
					} else deferred.reject(response);
				}, function (response) {
					deferred.reject(response);
				});

				return deferred.promise;
			},

			_defaultGetAccessToken: function (deferred) {

				console.log('access token resolving flow');

				var now = new Date().getTime();
				var expiresAt = localStorageService.getItemSync('expiresAt');
				var refreshToken = localStorageService.getItemSync('refreshToken');
				var accessToken = localStorageService.getItemSync('accessToken');

				console.log('Values from local storage:', {
					expiresAt: expiresAt,
					refreshToken: refreshToken,
					accessToken: accessToken
				});

				// get expired time
				if (now < expiresAt) {

					console.log('Current token should not be expired');
					// valid token
					console.log('Resolving token using value from local storage');

					deferred.resolve({
						accessToken: accessToken
					});

				} else if (typeof refreshToken != "undefined") {

					console.log('Refresh token will be used to fetch access token from ' +
						config.getURL("api/oauth2/token") + ' with client id ' + config.getClientId());

					var url = config.getURL("api/oauth2/token");

					//expire token, refresh
					$http.post(url, {

						client_id: config.getClientId(),
						client_secret: config.getClientSecret(),
						refresh_token: refreshToken,
						grant_type: 'refresh_token'
					}).success(function (data) {
						// update local storage
						if (data.error) {
							console.log('Token refresh failed: ' + data.error);
							deferred.reject('refresh failed');
						} else {
							var accessTokenRefreshed = authSrv.updateAccessToken(data);

							console.log('access token successfully updated from api server', data);
							console.log('resolving toke using response value');
							// respond
							deferred.resolve({
								accessToken: accessTokenRefreshed
							});
						}

					}).error(function (response) {
						console.log("failed to refresh token from api server", response);
						// error refreshing
						deferred.reject(response);
					});

				} else {
					// nothing in cache
					localStorage.removeItem('accessToken');
					console.warn('Refresh token is undefined. Not enough data for oauth flow. rejecting token promise. ' +
						'Clearing accessToken from local storage.');
					deferred.reject();

				}

			},

			utilsService: utilsService
		};

		return authSrv;
	});
