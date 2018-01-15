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
        vm.selectedCell = {i: undefined, j: undefined};
        vm.oponentSelectedCell = {i: undefined, j: undefined};
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
            }
            else {
                vm.time.you.number = resp.data.white.time;
                vm.time.other.number = resp.data.black.time;
            }
            vm.postpone = resp.data.postpone;
            vm.finished = resp.data.finished;
            vm.winner = resp.data.winner;
            vm.lost = resp.data.lost;
            updateTime();
            if (!vm.finished)
                socket.emit('game', {_id: vm._id, to: vm.getOponentColor().user._id});
        });

        vm.isWhite = function (i, j) {
            if (i === 0 || i === 2 || i === 4 || i === 6) {
                return (j == 0 || j == 2 || j == 4 || j == 6);
            } else if (i === 1 || i === 3 || i === 5 || i === 7)
                return (j == 1 || j == 3 || j == 5 || j == 7);
            return true;
        };

        vm.selectCell = function (i, j, $event) {
            if (!vm.postpone && !vm.finished) {
                if (vm.isAnySelected() && vm.canMove(i, j))
                    vm.move(i, j);
                else if (vm.isAnySelected() && vm.isEnroque(i, j))
                    vm.enroque(i, j);
                else if (vm.isSelected(i, j)) {
                    vm.cleanSelected();
                    socket.emit('unselectcell', {oponent: vm.getOponentColor().user._id});
                }
                else if (vm.board[i][j] && vm.board[i][j].type && vm.canSelect(i, j)) {
                    vm.selectedCell = {i: i, j: j};
                    socket.emit('selectcell', {i: i, j: j, oponent: vm.getOponentColor().user._id});
                }
            }
            $event.stopPropagation();
        };

        vm.isSelected = function (i, j) {
            return (vm.selectedCell.i === i && vm.selectedCell.j === j);
        };
        vm.isOpponetSelected = function (i, j) {
            return (vm.oponentSelectedCell.i === i && vm.oponentSelectedCell.j === j);
        };
        vm.isAnySelected = function () {
            return vm.selectedCell.i !== undefined && vm.selectedCell.j !== undefined;
        };
        vm.canMove = function (i, j) {
            if ((vm.moves.length % 2 === 0 && vm.black.user._id === $rootScope.user._id) || (vm.moves.length % 2 !== 0 && vm.white.user._id === $rootScope.user._id))
                return false;
            var selected = vm.board[vm.selectedCell.i][vm.selectedCell.j];
            var can = false;
            switch (selected.type) {
                //Falta el peon al paso y la coronación
                case "peon":
                    if (vm.selectedCell.j === j) {
                        if (selected.color) {
                            if ((vm.selectedCell.i + 1 === i && !vm.board[i][j].type) || (vm.selectedCell.i === 1 && vm.selectedCell.i + 2 === i && !vm.board[i][j].type))
                                can = true;
                        } else {
                            if ((vm.selectedCell.i - 1 === i && !vm.board[i][j].type) || (vm.selectedCell.i === 6 && vm.selectedCell.i - 2 === i && !vm.board[i][j].type))
                                can = true;
                        }
                    } else {
                        if (selected.color) {
                            if ((vm.selectedCell.i + 1 === i) && (vm.selectedCell.j + 1 === j || vm.selectedCell.j - 1 === j) && vm.board[i][j].color === false)
                                can = true;
                        } else {
                            if ((vm.selectedCell.i - 1 === i) && (vm.selectedCell.j + 1 === j || vm.selectedCell.j - 1 === j) && vm.board[i][j].color === true)
                                can = true;
                        }
                    }
                    break;
                case "horse":
                    if ((vm.selectedCell.i + 2 === i && (vm.selectedCell.j + 1 === j || vm.selectedCell.j - 1 === j)) ||
                        (vm.selectedCell.i - 2 === i && (vm.selectedCell.j + 1 === j || vm.selectedCell.j - 1 === j)) ||
                        (vm.selectedCell.j + 2 === j && (vm.selectedCell.i + 1 === i || vm.selectedCell.i - 1 === i)) ||
                        (vm.selectedCell.j - 2 === j && (vm.selectedCell.i + 1 === i || vm.selectedCell.i - 1 === i)))
                        if (selected.color) {
                            if (vm.board[i][j].color === false || vm.board[i][j].color === undefined)
                                can = true;
                        } else {
                            if (vm.board[i][j].color === true || vm.board[i][j].color === undefined)
                                can = true;
                        }
                    break;
                case "alfil":
                    var newI = vm.selectedCell.i, newJ = vm.selectedCell.j;
                    var clean = true;
                    while (newI !== i && newJ !== j && clean) {
                        if (i > newI)
                            newI++;
                        else
                            newI--;
                        if (j > newJ)
                            newJ++;
                        else
                            newJ--;
                        clean = (vm.board[newI][newJ].type === false) ? true : false;
                    }
                    if (newI === i && newJ === j && vm.board[i][j].color != vm.board[vm.selectedCell.i][vm.selectedCell.j].color)
                        can = true;
                    break;
                case "tower":
                    var newI = vm.selectedCell.i, newJ = vm.selectedCell.j;
                    var clean = true;
                    if (vm.selectedCell.i === i || vm.selectedCell.j === j) {
                        if (vm.selectedCell.i === i)
                            while (newJ !== j && clean) {
                                if (j > newJ)
                                    newJ++;
                                else
                                    newJ--;
                                clean = (vm.board[newI][newJ].type === false) ? true : false;
                            }
                        else if (vm.selectedCell.j === j)
                            while (newI !== i && clean) {
                                if (i > newI)
                                    newI++;
                                else
                                    newI--;
                                clean = (vm.board[newI][newJ].type === false) ? true : false;
                            }
                    }
                    if (newI === i && newJ === j && vm.board[i][j].color != vm.board[vm.selectedCell.i][vm.selectedCell.j].color)
                        can = true;
                    break;
                case "queen":
                    var newI = vm.selectedCell.i, newJ = vm.selectedCell.j;
                    var clean = true;
                    if (vm.selectedCell.i === i || vm.selectedCell.j === j) {
                        if (vm.selectedCell.i === i)
                            while (newJ !== j && clean) {
                                if (j > newJ)
                                    newJ++;
                                else
                                    newJ--;
                                clean = (vm.board[newI][newJ].type === false) ? true : false;
                            }
                        else if (vm.selectedCell.j === j)
                            while (newI !== i && clean) {
                                if (i > newI)
                                    newI++;
                                else
                                    newI--;
                                clean = (vm.board[newI][newJ].type === false) ? true : false;
                            }
                    } else {
                        while (newI !== i && newJ !== j && clean) {
                            if (i > newI)
                                newI++;
                            else
                                newI--;
                            if (j > newJ)
                                newJ++;
                            else
                                newJ--;
                            clean = (vm.board[newI][newJ].type === false) ? true : false;
                        }
                    }
                    if (newI === i && newJ === j && vm.board[i][j].color != vm.board[vm.selectedCell.i][vm.selectedCell.j].color)
                        can = true;
                    break;
                case "king":
                    var newI = vm.selectedCell.i, newJ = vm.selectedCell.j;
                    if (((newI === i + 1 && (newJ === j + 1 || newJ === j - 1 || newJ === j)) || (newI === i - 1 && (newJ === j + 1 || newJ === j - 1 || newJ === j))) && (!vm.board[i][j].color || vm.board[i][j].color != vm.board[vm.selectedCell.i][vm.selectedCell.j].color))
                        can = true;
                    break;
            }

            return can;
        };
        vm.isEnroque = function (i, j) {
            if ((vm.moves.length % 2 === 0 && vm.black.user._id === $rootScope.user._id) || (vm.moves.length % 2 !== 0 && vm.white.user._id === $rootScope.user._id))
                return false;
            var selected = vm.board[vm.selectedCell.i][vm.selectedCell.j];
            var can = false;
            if (selected.type === 'king' && selected.initial === true) {
                if (selected.color) {
                    if (i === 0 && j === 1 && vm.board[0][0].color && vm.board[0][0].type === 'tower' && vm.board[0][0].initial === true && !vm.board[0][1].type && !vm.board[0][2].type)
                        can = true;
                    else if (i === 0 && j === 5 && vm.board[0][7].color && vm.board[0][7].type === 'tower' && vm.board[0][7].initial === true && !vm.board[0][6].type && !vm.board[0][5].type && !vm.board[0][4].type) {
                        can = true;
                    }
                } else {
                    if (i === 7 && j === 1 && !vm.board[7][0].color && vm.board[7][0].type === 'tower' && vm.board[7][0].initial === true && !vm.board[7][1].type && !vm.board[7][2].type)
                        can = true;
                    else if (i === 7 && j === 5 && !vm.board[7][7].color && vm.board[7][7].type === 'tower' && vm.board[7][7].initial === true && !vm.board[7][6].type && !vm.board[7][5].type && !vm.board[7][4].type) {
                        can = true;
                    }
                }
            }
            return can;
        };
        vm.enroque = function (i, j) {
            baseFactory.enroque(vm._id, vm.getMyColor(), {
                i: vm.selectedCell.i,
                j: vm.selectedCell.j
            }, {i: i, j: j})
                .then(function () {
                    var selected = vm.board[vm.selectedCell.i][vm.selectedCell.j];
                    var piece = {
                        color: selected.color,
                        type: selected.type
                    };
                    vm.board[vm.selectedCell.i][vm.selectedCell.j] = {type: false};
                    if (selected.color) {
                        if (i === 0 && j === 1) {
                            vm.board[0][1] = piece;
                            var tower = vm.board[0][0];
                            vm.board[0][0] = {type: false};
                            vm.board[0][2] = tower;
                        } else if (i === 0 && j === 5) {
                            vm.board[0][5] = piece;
                            var tower = vm.board[0][7];
                            vm.board[0][7] = {type: false};
                            vm.board[0][4] = tower;
                        }
                    } else {
                        if (i === 7 && j === 1) {
                            vm.board[7][1] = piece;
                            var tower = vm.board[7][0];
                            vm.board[7][0] = {type: false};
                            vm.board[7][2] = tower;
                        } else if (i === 7 && j === 5) {
                            vm.board[7][5] = piece;
                            var tower = vm.board[7][7];
                            vm.board[7][7] = {type: false};
                            vm.board[7][4] = tower;
                        }
                    }
                    socket.emit('enroque', {
                        from: vm.selectedCell,
                        to: {i: i, j: j},
                        _id: vm._id,
                        oponent: vm.getOponentColor()
                    });
                    vm.cleanSelected();
                });

        };
        vm.canSelect = function (i, j) {
            return (vm.board[i][j].color && vm.white.user._id === $rootScope.user._id) || (!vm.board[i][j].color && vm.black.user._id === $rootScope.user._id)
        };
        vm.getMyColor = function () {
            return (vm.white.user._id === $rootScope.user._id) ? vm.white : vm.black;
        };
        vm.getOponentColor = function () {
            return (vm.white.user._id !== $rootScope.user._id) ? vm.white : vm.black;
        };

        vm.getCellClass = function (i, j) {
            var _class = " ";
            if (vm.isWhite(i, j))
                _class += "white ";
            else
                _class += "black ";
            if (vm.isSelected(i, j))
                _class += "selected ";
            if (vm.isOpponetSelected(i, j))
                _class += "opponent-selected ";
            _class += $rootScope.user.profile.board;
            return _class;
        };

        vm.getBoardClass = function () {
            return (vm.white.user._id === $rootScope.user._id) ? "rotate-180" : "";
        };

        vm.move = function (i, j) {
            baseFactory.move(vm._id, vm.getMyColor(), {
                i: vm.selectedCell.i,
                j: vm.selectedCell.j
            }, {i: i, j: j})
                .then(function (resp) {
                    if (resp.data.success) {
                        var selected = vm.board[vm.selectedCell.i][vm.selectedCell.j];
                        var piece = {
                            color: selected.color,
                            type: selected.type
                        };
                        vm.board[vm.selectedCell.i][vm.selectedCell.j] = {type: false};
                        if (piece.type === 'peon' && ((piece.color && i === 7) || (!piece.color && i === 0))) {
                            piece.type = $rootScope.user.profile.promove;
                            socket.emit('promove', {
                                from: vm.selectedCell,
                                to: {i: i, j: j},
                                _id: vm._id,
                                oponent: vm.getOponentColor(),
                                promove: $rootScope.user.profile.promove
                            });

                        } else {
                            socket.emit('move', {
                                from: vm.selectedCell,
                                to: {i: i, j: j},
                                _id: vm._id,
                                oponent: vm.getOponentColor()
                            });
                        }
                        vm.board[i][j] = piece;
                        vm.moves.push({
                            move: String.fromCharCode(72 - j) + (i + 1),
                            piece: piece.type,
                            color: piece.color ? 'white' : 'black'
                        });
                        vm.cleanSelected();
                    }
                });
        };
        vm.cleanSelected = function () {
            vm.selectedCell = {i: undefined, j: undefined};
        };
        vm.setPromove = function (promove) {
            baseFactory.changePromove(promove)
                .then(function (res) {
                    if (res.data.success)
                        $rootScope.user.profile.promove = promove;
                });
        };
        /*
         * Events
         */
        socket.on('move', function (from, to) {
            var selected = vm.board[from.i][from.j];
            var piece = {
                color: selected.color,
                type: selected.type
            };
            vm.board[from.i][from.j] = {type: false};
            vm.board[to.i][to.j] = piece;
            vm.moves.push({
                move: String.fromCharCode(72 - to.j) + (to.i + 1),
                piece: piece.type,
                color: piece.color ? 'white' : 'black'
            });
        });

        socket.on('enroque', function (from, to) {
            var selected = vm.board[from.i][from.j];
            var piece = {
                color: selected.color,
                type: selected.type
            };
            vm.board[from.i][from.j] = {type: false};
            if (selected.color) {
                if (to.i === 0 && to.j === 1) {
                    vm.board[0][1] = piece;
                    var tower = vm.board[0][0];
                    vm.board[0][0] = {type: false};
                    vm.board[0][2] = tower;
                } else if (to.i === 0 && to.j === 5) {
                    vm.board[0][5] = piece;
                    var tower = vm.board[0][7];
                    vm.board[0][7] = {type: false};
                    vm.board[0][4] = tower;
                }
            } else {
                if (to.i === 7 && to.j === 1) {
                    vm.board[7][1] = piece;
                    var tower = vm.board[7][0];
                    vm.board[7][0] = {type: false};
                    vm.board[7][2] = tower;
                } else if (to.i === 7 && to.j === 5) {
                    vm.board[7][5] = piece;
                    var tower = vm.board[7][7];
                    vm.board[7][7] = {type: false};
                    vm.board[7][4] = tower;
                }
            }

        });

        socket.on('settime', function (white, black) {
            if (vm.black.user._id === $rootScope.user._id) {
                vm.time.you.number = black;
                vm.time.other.number = white;
            }
            else {
                vm.time.you.number = white;
                vm.time.other.number = black;
            }
            updateTime();
        });

        socket.on('finish', function (winner) {
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
        });
        socket.on('outofgame', function (time) {
            vm.outofgame = time;
        });
        socket.on('ingame', function () {
            vm.outofgame = 0;
            vm.postpone = false;
        })
        socket.on('postpone', function () {
            vm.postpone = true;
        });
        socket.on('selectcell', function (i, j) {
            vm.oponentSelectedCell = {i: i, j: j};
        });
        socket.on('unselectcell', function () {
            vm.oponentSelectedCell = {i: undefined, j: undefined};
        });
        socket.on('promove', function (from, to, promove) {
            var selected = vm.board[from.i][from.j];
            var piece = {
                color: selected.color,
                type: promove
            };
            vm.board[from.i][from.j] = {type: false};
            vm.board[to.i][to.j] = piece;
            vm.moves.push({
                move: String.fromCharCode(72 - to.j) + (to.i + 1),
                piece: piece.type,
                color: piece.color ? 'white' : 'black'
            });
        });
    }
})();