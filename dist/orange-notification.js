﻿/**
    OrangeNotificaiton - Notification Service for Angular Apps.
    Original Author (C) 2014 Knut Gaute Vardenær

    This library is free software; you can redistribute it and/or
    modify it under the terms of the GNU Lesser General Public
    License as published by the Free Software Foundation; either
    version 2.1 of the License, or (at your option) any later version.

    This library is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
    Lesser General Public License for more details.

    This is version 1.0.0.
 */

(function () {
    'use strict';

    angular
		.module('orangeNotification', [])
		.provider('orangeNotification', orangeNotificationProvider)
		.directive('orangeNotification', orangeNotification);

    //////////

    function orangeNotificationProvider() {
        var self = this;
        var expiration = 5; // seconds
        var directiveTemplateUrl = '';

        self.setNotificationExpiraiton = function (value) {
            if (!isNaN(value)) {
                expiration = value;
            }
        }

        self.setDirectiveTemplateUrl = function (value) {
            if (value && value !== '') {
                directiveTemplateUrl = value;
            } else {
                throw 'orangeNotificationProvider :: Bad template url given';
            }
        }

        self.$get = ['$q', function ($q) {
            function NotificationService(oExpiration, oDirectiveTemplateUrl) {
                var self = this;

                if (!oDirectiveTemplateUrl){
                  throw 'orangeNotificationService :: No template url given';
                }

                self.notifications = [];
                self.directiveTemplateUrl = oDirectiveTemplateUrl;

                self.success = success;
                self.info = info;
                self.warning = warning;
                self.error = error;
                self.wait = wait;
                self.dialog = dialog;

                return self;

                //////////

                function pushNotification(notification) {
                    self.notifications.push(notification);
                }

                function addNotification(message, type) {
                    var notification = {
                        message: message,
                        type: type,
                        expires: new Date().getTime() + oExpiration * 1000,
                        discarded: false
                    };

                    pushNotification(notification);
                }

                function success(message) {
                    addNotification(message, 'success');
                }

                function info(message) {
                    addNotification(message, 'info');
                }

                function warning(message) {
                    addNotification(message, 'warning');
                }

                function error(message) {
                    addNotification(message, 'error');
                }

                function dialog(message) {
                    var args = arguments;
                    var dialogOptions = [];

                    if (args.length < 2) {
                        throw 'Expected (message, args[]), got ' + args;
                    }

                    for (var i = 1; i < arguments.length; i++) {
                        if (typeof args[i] !== 'object') {
                            throw 'Expected object, got ' + typeof args[i];
                        } else {
                            dialogOptions.push(args[i]);
                        }
                    }

                    var deferred = $q.defer();

                    var notification = {
                        dialogOptions: dialogOptions,
                        message: message,
                        type: 'dialog',
                        discarded: false,
                        resolve: function (val) {
                            deferred.resolve(val);
                        },
                        reject: function () {
                            deferred.reject();
                        }
                    };

                    deferred.promise.finally(function () {
                        notification.discarded = true;
                    });

                    pushNotification(notification);

                    return deferred.promise;
                }

                function wait(message, promise) {
                    var notification = {
                        message: message,
                        type: 'wait',
                        discarded: false,
                        promise: promise
                    };

                    pushNotification(notification);

                    return notification.promise.finally(function () {
                        notification.discarded = true;
                    });
                }
            }
            return new NotificationService(expiration, directiveTemplateUrl);
        }];
    }

    //////////

    orangeNotification['$inject'] = ['orangeNotification', '$interval'];

    function orangeNotification(ns, $interval) {
        var directive = {
            restrict: 'AE',
            scope: true,
            templateUrl: ns.directiveTemplateUrl,
            controller: ['$scope', Controller],
            controllerAs: 'vm'
        }

        return directive;

        //////////

        function Controller($scope) {
            var vm = this;

            vm.notifications = ns.notifications;
            vm.hasExpired = hasExpired;
            vm.getIconType = getIconType;

            init();

            //////////

            function init() {
                var loop = $interval(function () {
                    var doApply = false;

                    for (var i = vm.notifications.length - 1; i >= 0 ; --i) {
                        if (hasExpired(vm.notifications[i])) {
                            vm.notifications.splice(i, 1);
                            doApply = true;
                        }
                    }

                    if (doApply) {
                        $scope.$apply();
                    }

                }, 200, 0, false);

                $scope.$on('$destroy', function () {
                    if (angular.isDefined(loop)) {
                        $interval.cancel(loop);
                    }
                });
            }

            function getIconType(notification) {
                switch (notification.type) {
                    case 'success': return 'fa fa-check';
                    case 'info': return 'fa fa-exclamation';
                    case 'warning': return 'fa fa-fire';
                    case 'error': return 'fa fa-close';
                    case 'wait': return 'fa fa-circle-o-notch fa-spin';
                    case 'dialog': return 'fa fa-question';
                }
            }

            function hasExpired(notification) {
                if (notification.discarded !== true && notification.expires) {
                    return notification.expires < now();
                } else {
                    return notification.discarded;
                }

                function now() {
                    return new Date().getTime();
                }
            }
        }

    }

})();