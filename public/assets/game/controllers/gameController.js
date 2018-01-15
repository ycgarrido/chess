(function () {
    'use strict';
    angular
        .module('chessApp')
        .controller("gameController", gameController);

    function gameController($interval, $rootScope, socket, baseFactory, $state) {
        var vm = this;
        if (!$state.params.game)
            $state.go("index");
        socket.emit('setpage', $state.current.name);
        vm.time = {other: {number: "", string: ""}, you: {number: "", string: ""}};
        vm.board = [];
        vm.moves = [];
        vm.turn = true;
        vm.color = "";
        vm.white = {};
        vm.black = {};
        vm.winner = false;
        vm.lost = false;
        vm.outofgame = 0;
        vm.postpone = false;
        vm.finished = false;
        vm._id = $state.params.game;

        function updateTime() {
            var hours = (vm.time.you.number / 3600).toString().split(".")[0];
            var minutes = (vm.time.you.number / 60).toString().split(".")[0];
            var second = vm.time.you.number % 60;
            vm.time.you.string = (hours.length === 1 ? "0" + hours : hours) + ":" + (minutes.length === 1 ? "0" + minutes : minutes) + ":" + (second.toString().length === 1 ? "0" + second : second);

            var hours = (vm.time.other.number / 3600).toString().split(".")[0];
            var minutes = (vm.time.other.number / 60).toString().split(".")[0];
            var second = vm.time.other.number % 60;
            vm.time.other.string = (hours.length === 1 ? "0" + hours : hours) + ":" + (minutes.length === 1 ? "0" + minutes : minutes) + ":" + (second.toString().length === 1 ? "0" + second : second);
        };

        baseFactory.getGame(vm._id).then(function (resp) {
            if (resp.data.unauthorized)
                $state.go("index");
            vm.board = resp.data.board;
            vm.white = resp.data.white;
            vm.black = resp.data.black;
            vm.moves = resp.data.moves;
            if (vm.black.user._id === $rootScope.user._id) {
                vm.time.you.number = resp.data.black.time;
                vm.time.other.number = resp.data.white.time;
                vm.color = "black";
            }
            else {
                vm.time.you.number = resp.data.white.time;
                vm.time.other.number = resp.data.black.time;
                vm.color = "white";
            }
            vm.postpone = resp.data.postpone;
            vm.finished = resp.data.finished;
            vm.winner = resp.data.winner;
            vm.lost = resp.data.lost;
            vm.turn = (vm.moves.length % 2 === 0) ? true : false;
            updateTime();
            if (!vm.finished)
                socket.emit('game', {_id: vm._id, to: vm.getOponentColor().user._id});
        });

        vm.setPromove = function (promove) {
            baseFactory.changePromove(promove)
                .then(function (res) {
                    if (res.data.success)
                        $rootScope.user.profile.promove = promove;
                });
        };

        vm.getOponentColor = function () {
            return (vm.white.user._id !== $rootScope.user._id) ? vm.white : vm.black;
        };
        /*
         * Events
         */
        socket.on('settime', function (white, black, _id) {
            if (_id === vm._id) {
                if (vm.black.user._id === $rootScope.user._id) {
                    vm.time.you.number = black;
                    vm.time.other.number = white;
                }
                else {
                    vm.time.you.number = white;
                    vm.time.other.number = black;
                }
                updateTime();
            }
        });
        socket.on('finish', function (winner, _id) {
            if (_id === vm._id) {
                if (winner) {
                    if (winner === vm.white.user._id) {
                        vm.winner = vm.white.user;
                        vm.lost = vm.black.user;
                    } else {
                        vm.winner = vm.black.user;
                        vm.lost = vm.white.user;
                    }
                }
                vm.finished = true;
            }
        });
        socket.on('outofgame', function (time, _id) {
            if (_id === vm._id) {
                vm.outofgame = time;
            }
        });
        socket.on('ingame', function (_id) {
            if (_id === vm._id) {
                vm.outofgame = 0;
                vm.postpone = false;
            }
        });
        socket.on('postpone', function (_id) {
            if (_id === vm._id) {
                vm.postpone = true;
            }
        });
    }
})();