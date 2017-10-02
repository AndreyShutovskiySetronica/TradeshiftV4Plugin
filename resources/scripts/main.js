'use strict';

var _ = app('LoDash');
var Q = app('Q');

var services = {};
services.AppStore = app('AppStoreService');
services.AppSetting = app('AppSettingService');
services.CloudinaryService = app('CloudinaryService');
services.CloudScan = app('CloudScanService');
services.CollaborationService = app('CollaborationService');
services.MessageCoreService = app('MessageCoreService');
services.Comment = app('CommentService');
services.Company = app('CompanyService');
services.Config = app('ConfigService');
services.Conversation = app('ConversationService');
services.Document = app('DocumentService');
services.DocumentAccessService = app('DocumentAccessService');
services.Info = app('InfoService');
services.LegalEntity = app('LegalEntityService');
services.Menu = app('MenuService');
services.Network = app('NetworkService');
services.Recommendation = app('RecommendationService');
services.Role = app('RoleService');
services.Upload = app('UploadService');
services.User = app('UserService');
services.Task = app('TaskService');
services.PurchaseRequest = app('PurchaseRequestService');
services.Scanning = app('ScanningService');
services.StorefrontOfferService = app('StorefrontOfferService');
services.WorkflowUserService = app('WorkflowUserService');
services.WorkflowService = app('WorkflowServicev4');
services.NetworkService = app('NetworkService');
services.AppActivationService = app('AppActivationService');

// Libs
services.Core = app('Core');
services.DateLib = app('Date');
services.InfoLib = app('Info');
services.Links = app('Links');
services.LocaleSettings = app('LocaleSettings');
services.Logger = app('Logger');
services.NumberFormat = app('NumberFormat');
services.Rest = app('Rest');
services.UBL = app('UBL');

function mainController($scope, $parse, notificationService) {
    $scope.isLoading = false;
    $scope.response = null;
    $scope.serviceNames = _.keys(services);
    $scope.request = {
        service: '',
        method: '',
        args: []
    };

    $scope.onChangeServiceName = function() {
        $scope.request.method = '';
        $scope.request.args = [];
        $scope.response = null;
    };

    $scope.onChangeMethodName = function() {
        $scope.request.args = [];
        $scope.response = null;
    };

    $scope.isValidJson = function(arg) {
        if (!arg) {
            return false;
        }

        var parsedArg = getParsedArg(arg);
        return !_.isNull(parsedArg);
    };

    $scope.isReady = function() {
        return $scope.request.service && $scope.request.method;
    };

    $scope.getMethods = function(serviceName) {
        if (serviceName) {
            return _.keys(services[serviceName]).filter(function(methodName) {
                return methodName !== 'require';
            });
        }
    };

    $scope.getArgs = function() {
        if ($scope.isReady()) {
            var method = getMethod($scope.request.service, $scope.request.method);
            if (method) {
                var cachedArgs = getCachedMethodArgs($scope.request.service, $scope.request.method);
                var freshArgs = getArgs(method);
                var useCached = isProduction() && _.isArray(cachedArgs);
                return useCached ? cachedArgs : freshArgs;
            }
        }
    };

    $scope.getMethodPreview = function() {
        if ($scope.isReady()) {
            var method = getMethod($scope.request.service, $scope.request.method);
            if (method) {
                return method.toString();
            }
        }
    };

    $scope.callAPI = function(methodArgs) {
        $scope.isLoading = true;
        var promise = getPromise($scope.request.service, $scope.request.method, methodArgs);
        promise
            .then(function(body) {
                notificationService.success('The request was successful');
                $scope.response = {
                    body: getSyntaxHighlighted(body),
                    status: 200
                };
            })
            .catch(function(response) {
                var isHttpResponse = _.has(response, 'data');
                var body;
                if (isHttpResponse) {
                    body = response.data ? JSON.stringify(response.data, null, 2) : '';
                } else {
                    body = response;
                }
                var status = response.status;
                $scope.response = {
                    body: body,
                    status: status
                };
            })
            .finally(function() {
                $scope.isLoading = false;
                $scope.$digest();
            })
            .done();
    };

    // Only strings containing objects and arrays should be parsed
    function getParsedArg(arg) {
        try {
            var parsedArg = $parse(arg)();
            if (_.isObject(parsedArg) || _.isArray(parsedArg)) {
                return parsedArg;
            } else {
                return null;
            }
        } catch (e) {
            return null;
        }
    }

    function tryParseJSON(methodArgs) {
        return methodArgs.map(function(arg) {
            try {
                var parsedArg = getParsedArg(arg);
                return parsedArg || arg;
            } catch (e) {
                return arg;
            }
        });
    }

    function getPromise(serviceName, methodName, methodArgs) {
        methodArgs = tryParseJSON(methodArgs);
        var method = getMethod(serviceName, methodName);
        return Q.try(function() {
            var context = services[serviceName];
            return method.apply(context, methodArgs);
        });
    }
}

function getSyntaxHighlighted(json) {
    json = JSON.stringify(json, undefined, 4);
    try {
        json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        return json.replace(
            /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
            function(match) {
                var cls = 'number';
                if (/^"/.test(match)) {
                    if (/:$/.test(match)) {
                        cls = 'key';
                    } else {
                        cls = 'string';
                    }
                } else if (/true|false/.test(match)) {
                    cls = 'boolean';
                } else if (/null/.test(match)) {
                    cls = 'null';
                }
                return '<span class="' + cls + '">' + match + '</span>';
            }
        );
    } catch (e) {
        return json;
    }
}

function isProduction() {
    return runtime.environment !== 'development';
}

function getArgs(fn) {
    try {
        var argNames = fn.toString().match(/function\s*\w*\s*\((.*?)\)/)[1].split(/\s*,\s*/);
        return _.compact(argNames);
    } catch (e) {
        console.log('Could not get args for ' + fn);
    }
}

function getMethod(serviceName, methodName) {
    try {
        var fn = services[serviceName][methodName];
        return fn;
    } catch (e) {
        console.log('Could not get function for', serviceName, methodName);
    }
}


mainController.$inject = ['$scope', '$parse', 'notificationService'];
module.exports = mainController;
