(function () {
    'use strict';
    angular
        .module('chessApp', [
            "ngMaterial",
            "ngAnimate",
            "ngSanitize",
            "ngMessages",
            'ui.router',
            'oc.lazyLoad'
        ])
        .config(iconProvider)
        .factory('socket', socket)
        .factory('baseFactory', baseFactory)
        .factory('util', util)
        .config(routingModule)
        .controller("chessController", chessController);

    function iconProvider($mdIconProvider) {
        $mdIconProvider
            .iconSet('social', '/vendors/angular-material-icons/sets/social-icons.svg', 24)
            .iconSet('device', '/vendors/angular-material-icons/sets/device-icons.svg', 24)
            .iconSet('communication', '/vendors/angular-material-icons/sets/communication-icons.svg', 24)
            .iconSet('call', '/vendors/angular-material-icons/sets/communication-icons.svg', 24)
            .iconSet('core', '/vendors/angular-material-icons/sets/core-icons.svg', 24);
    }

    /*
     * Controller
     */
    function chessController($rootScope, socket, $state) {
        var vm = this;
        console.log($state)
        $rootScope.user = JSON.parse(document.querySelector("body").dataset.user);
        $rootScope.times = [
            {
                name: "10 segundos",
                value: 10
            }, {
                name: "3 minutos",
                value: 180
            }, {
                name: "5 minutos",
                value: 300
            }, {
                name: "10 minutos",
                value: 600
            }, {
                name: "15 minutos",
                value: 900
            }];

        $rootScope.boards = [{
            name: "Azul",
            value: "blue"
        }, {
            name: "Clásico",
            value: "classic"
        }, {
            name: "Verde",
            value: "green"
        }];

        socket.emit('user-in', {userid: $rootScope.user._id});
        console.log($rootScope.user)
    }

    /*
     * Routing
     */
    function routingModule($stateProvider, $urlRouterProvider) {
        $stateProvider
            .state('index', {
                url: '/',
                views: {
                    lazyLoadView: {
                        controller: 'indexController',
                        controllerAs: 'vm',
                        templateUrl: '/assets/index/views/index.html',
                        resolve: {
                            loadMyCtrl: ['$ocLazyLoad', function ($ocLazyLoad) {
                                return $ocLazyLoad.load([
                                    "/assets/index/controllers/indexController.js"
                                ]);
                            }]
                        }
                    }
                }
            })
            .state('game', {
                url: '/game?game',
                views: {
                    lazyLoadView: {
                        controller: 'gameController',
                        controllerAs: 'vm',
                        templateUrl: '/assets/game/views/index.html',
                        resolve: {
                            loadMyCtrl: ['$ocLazyLoad', function ($ocLazyLoad) {
                                return $ocLazyLoad.load([
                                    "/assets/common/directives/scripts/board.js",
                                    "/assets/game/controllers/gameController.js"
                                ]);
                            }]
                        }
                    }
                }
            })
            .state('chat', {
                url: '/chat',
                views: {
                    lazyLoadView: {
                        templateUrl: '/assets/chat/views/index.html',
                        resolve: {
                            loadMyCtrl: ['$ocLazyLoad', function ($ocLazyLoad) {
                                return $ocLazyLoad.load([
                                    "/assets/common/directives/scripts/chat.js"
                                ]);
                            }]
                        }
                    }
                }
            })
            .state('try', {
                url: '/try',
                views: {
                    lazyLoadView: {
                        controller: 'tryController',
                        controllerAs: 'vm',
                        templateUrl: '/assets/try/views/index.html',
                        resolve: {
                            loadMyCtrl: ['$ocLazyLoad', function ($ocLazyLoad) {
                                return $ocLazyLoad.load([
                                    "/assets/common/directives/scripts/board.js",
                                    "/assets/try/controllers/tryController.js"
                                ]);
                            }]
                        }
                    }
                }
            });
        $urlRouterProvider.otherwise('/');
    }

    /*
     * Util
     */
    function util($mdToast) {
        return {
            messages: {
                success: function (msg) {
                    $mdToast.show(
                        $mdToast.simple()
                            .textContent(msg)
                            .position('top right')
                    );
                }
            }
        }
    }

    /*
     * Socket
     */
    function socket($rootScope) {
        var socket = io('http://' + document.domain + ':3000');

        return {
            on: function (eventName, callback) {
                socket.on(eventName, function () {
                    var args = arguments;
                    $rootScope.$apply(function () {
                        callback.apply(socket, args);
                    });
                });
            },
            emit: function (eventName, data, callback) {
                socket.emit(eventName, data, function () {
                    var args = arguments;
                    $rootScope.$apply(function () {
                        if (callback) {
                            callback.apply(socket, args);
                        }
                    });
                })
            }
        };
    }

    /*
     * Base factory
     */
    function baseFactory($http, $rootScope) {
        return {
            getUsersConnected: function () {
                return $http({
                    url: "/user/logged"
                });
            },
            createGame: function (white, black, time) {
                return $http({
                    url: "/game/create",
                    method: 'post',
                    params: {
                        white: white,
                        black: black,
                        time: time
                    }
                });
            },
            move: function (_id, color, from, to) {
                return $http({
                    url: 'game/move',
                    method: 'post',
                    params: {
                        color: color,
                        from: from,
                        to: to,
                        _id: _id
                    }
                });
            },
            enroque: function (_id, color, from, to) {
                return $http({
                    url: 'game/enroque',
                    method: 'post',
                    params: {
                        color: color,
                        from: from,
                        to: to,
                        _id: _id
                    }
                });
            },
            past: function (_id, color, from, to) {
                return $http({
                    url: 'game/past',
                    method: 'post',
                    params: {
                        color: color,
                        from: from,
                        to: to,
                        _id: _id
                    }
                });
            },
            getGame: function (_id) {
                return $http({
                    url: 'game/get',
                    params: {game: _id}
                });
            },
            invite: function (to) {
                return $http({
                    url: 'user/invite',
                    method: 'POST',
                    params: {
                        _id: to
                    }
                });
            },
            getInvites: function (_id) {
                return $http({
                    url: 'user/invite/get',
                    params: {
                        _id: _id
                    }
                });
            },
            declineInvite: function (invite) {
                return $http({
                    url: 'user/invite/decline',
                    method: 'POST',
                    params: {
                        invite: invite
                    }
                });
            },
            declineGame: function (_id) {
                return $http({
                    url: 'game/decline',
                    method: 'POST',
                    params: {
                        _id: _id
                    }
                });
            },
            changeColor: function (color) {
                return $http({
                    url: 'user/profile/changeColor',
                    method: 'POST',
                    params: {
                        color: color
                    }
                });
            },
            changeTime: function (time) {
                return $http({
                    url: 'user/profile/changeTime',
                    method: 'POST',
                    params: {
                        time: time
                    }
                });
            },
            getPostponedGames: function () {
                return $http({
                    url: 'game/postponed'
                });
            },
            changeBoard: function (board) {
                return $http({
                    url: 'user/profile/changeBoard',
                    method: 'POST',
                    params: {
                        board: board
                    }
                });
            },
            calculateElo: function (oponent) {
                var k = 32;
                var espected = 1 / (1 + Math.pow(100, (oponent - $rootScope.user.elo) / 400));
                return {
                    win: {
                        probability: Math.round(espected * 100),
                        elo: Math.round($rootScope.user.elo + k * (1 - espected))
                    },
                    lost: {
                        probability: Math.round((1 - espected) * 100),
                        elo: Math.round($rootScope.user.elo + k * (0 - espected))
                    },
                    draw: {
                        probability: Math.round(espected * 50),
                        elo: Math.round($rootScope.user.elo + k * (0.5 - espected))
                    }
                };
            },
            changePromove: function (promove) {
                return $http({
                    url: 'user/profile/changePromove',
                    method: 'POST',
                    params: {
                        promove: promove
                    }
                });
            }
        };
    }
})();