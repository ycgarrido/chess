(function () {
    'use strict';
    angular
        .module('chessApp')
        .controller("indexController", indexController);

    function indexController($rootScope, socket, baseFactory, $scope, $state, $mdDialog, util, $mdToast, $document) {
        var vm = this;
        socket.emit('setpage', $state.current.name);
        $scope.usersConnected = [];
        $scope.usersIndexConnected = {};
        vm.invites = [];
        vm.postponed = [];
        vm.userSelected = false;

        baseFactory.getInvites($rootScope.user._id)
            .then(function (res) {
                vm.invites = res.data;
            });
        baseFactory.getPostponedGames()
            .then(function (res) {
                vm.postponed = res.data;
            });

        $scope.existUser = function (user) {
            return ($scope.usersIndexConnected[user._id] !== undefined);
        };
        vm.inPage = function (user, page) {
            var item = $scope.usersConnected[$scope.usersIndexConnected[user._id]];
            return (item && item.page === page)
        };
        $scope.invite = function (user) {
            baseFactory.invite(user._id).then(function (res) {
                if (res.data.success) {
                    socket.emit('invite', {
                        from: $rootScope.user,
                        to: user,
                        options: {time: $rootScope.user.profile.time.name, color: $rootScope.user.profile.color}
                    });
                }
            });
        };
        vm.changeColor = function (color) {
            baseFactory.changeColor(color)
                .then(function (res) {
                    if (res.data.success)
                        $rootScope.user.profile.color = color;
                });
        };
        vm.changeTime = function (time) {
            baseFactory.changeTime(time)
                .then(function (res) {
                    if (res.data.success)
                        $rootScope.user.profile.time = time;
                });
        };
        vm.changeBoard = function (board) {
            baseFactory.changeBoard(board)
                .then(function (res) {
                    if (res.data.success)
                        $rootScope.user.profile.board = board;
                });
        };
        vm.acceptInvite = function (invite, i) {
            var white = {_id: $rootScope.user._id, name: $rootScope.user.name, username: $rootScope.user.username};
            var black = invite.from;
            if (invite.options.color === 'b') {
                white = invite.from;
                black = {_id: $rootScope.user._id, name: $rootScope.user.name, username: $rootScope.user.username};
            } else if (invite.options.color === 'a') {
                var rand = Math.floor((Math.random() * 10) + 1);
                if (rand % 2 === 0) {
                    white = invite.from;
                    black = {_id: $rootScope.user._id, name: $rootScope.user.name, username: $rootScope.user.username};
                } else {
                    white = {_id: $rootScope.user._id, name: $rootScope.user.name, username: $rootScope.user.username};
                    black = invite.from;
                }
            }
            baseFactory.declineInvite(i)
                .then(function (res) {
                    if (res.data.success)
                        baseFactory.createGame(white, black, invite.options.time.value).then(function (resp) {
                            if (resp.data.success) {
                                $state.go("game", {game: resp.data.success});
                            }
                        });
                });
        };
        vm.declineInvite = function (i) {
            baseFactory.declineInvite(i)
                .then(function (res) {
                    if (res.data.success)
                        vm.invites.splice(i, 1);
                });
        };
        baseFactory.getUsersConnected().then(function (resp) {
            $scope.usersConnected.length = 0;
            angular.forEach(resp.data.users, function (item, index) {
                if (item._id !== $rootScope.user._id) {
                    item.page = resp.data.pages[index];
                    $scope.usersConnected.push(item);
                    $scope.usersIndexConnected[item._id] = $scope.usersConnected.length - 1;
                }
            });
        });
        vm.goToGame = function (_id) {
            $state.go("game", {game: _id});
        };
        vm.showUserInfo = function (user) {
            vm.userSelected = {user: user, info: baseFactory.calculateElo(user.elo)};
        };
        vm.hideUserInfo = function () {
            vm.userSelected = false;
        };
        vm.declineGame = function (_id) {
            var confirm = $mdDialog.confirm()
                .title('Abandonar partida')
                .textContent('Al abandonar la partida perderá puntos en su ELO ¿Desea continuar?')
                .ok('Si')
                .cancel('No');
            $mdDialog.show(confirm).then(function () {
                baseFactory.declineGame(_id)
                    .then(function (resp) {
                        if (resp.data.success)
                            util.messages.success("La partida ha sido abandonada");
                        else
                            util.messages.success("Ocurrió un error al abandonar la partida");
                    });
            });
        };
        /*
         * Events
         */
        socket.on('connected-users', function (user) {
            if (user._id !== $rootScope.user._id && !$scope.existUser(user)) {
                $scope.usersConnected.push(user);
                $scope.usersIndexConnected[user._id] = $scope.usersConnected.length - 1;
            }
        });
        socket.on('disconnected-users', function (user) {
            if (user) {
                delete $scope.usersIndexConnected[user._id];
                var aux = [];
                angular.forEach($scope.usersConnected, function (item, i) {
                    if (item._id !== user._id) {
                        aux.push(item);
                        $scope.usersIndexConnected[item._id] = i;
                    }
                });
                $scope.usersConnected = aux;
            }
        });
        socket.on('invite', function () {
            baseFactory.getInvites($rootScope.user._id)
                .then(function (res) {
                    vm.invites = res.data;
                });
        });
        socket.on('game', function (_id) {
            $state.go("game", {game: _id});
        });
        socket.on('setpage', function (user, page) {
            var item = $scope.usersConnected[$scope.usersIndexConnected[user._id]];
            if (item) {
                item.page = page;
            }
        });
    }
})
();