(function () {
    'use strict';
    angular
        .module('chessApp', [
            "ngMaterial",
            "ngAnimate",
            "ngSanitize",
            "ngMessages"
        ])
        .config(iconProvider)
        .controller("loginController", loginController);

    function iconProvider($mdIconProvider) {
        $mdIconProvider
            .iconSet('social', '/vendors/angular-material-icons/sets/social-icons.svg', 24)
            .iconSet('device', '/vendors/angular-material-icons/sets/device-icons.svg', 24)
            .iconSet('communication', '/vendors/angular-material-icons/sets/communication-icons.svg', 24)
            .iconSet('call', '/vendors/angular-material-icons/sets/communication-icons.svg', 24)
            .iconSet('core', '/vendors/angular-material-icons/sets/core-icons.svg', 24);
    }

    function loginController($http, $scope) {
        var vm = this;
        vm.status = 'login';
        vm.register = {};
        vm.showRegister = function () {
            vm.status = 'register';
        };
        vm.showLogin = function () {
            vm.status = 'login';
        };
        vm.verifyUser = function (type, value, error, name) {
            $http({
                url: "/user/verify",
                method: 'post',
                params: {value: value, type: type}
            }).then(function (res) {
                $scope.$$childHead.formRegister[name].$setValidity(error, res.data.success);
            });
        }
    }
})();
