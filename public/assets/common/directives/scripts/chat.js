(function () {
    'use strict';
    angular
        .module('chessApp')
        .directive("chessChat", chessChat);

    function chessChat(socket, baseFactory, $rootScope) {
        return {
            restrict: 'E',
            scope: {},
            templateUrl: '/assets/common/directives/templates/chat.html',
            controller: function ($scope) {
                $scope.minimized = true;
                $scope.users = [];
                $scope.usersIndexConnected = {};
                $scope.openedTalks = [];
                $scope.minimize = function () {
                    $scope.minimized = !$scope.minimized;
                };
                baseFactory.getUsersConnected().then(function (resp) {
                    angular.forEach(resp.data.users, function (item, index) {
                        if (item._id !== $rootScope.user._id) {
                            $scope.users.push(item);
                            $scope.usersIndexConnected[item._id] = $scope.users.length - 1;
                        }
                    });
                    console.log($scope.users)
                });
                $scope.openTalk = function (user) {
                    if (!isOpened(user._id))
                        $scope.openedTalks.push(user);
                };
                var isOpened = function (id) {
                    return ($scope.openedTalks[id] !== undefined);
                };
            }
        };
    }
})();