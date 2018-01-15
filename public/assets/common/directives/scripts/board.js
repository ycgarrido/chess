(function () {
    'use strict';
    angular
        .module('chessApp')
        .directive("chessBoard", chessBoard);

    function chessBoard($rootScope, baseFactory, socket) {
        return {
            restrict: 'E',
            scope: {
                cBoard: "=",
                cMoves: "=",
                cWhite: "=",
                cBlack: "=",
                cGame: "=",
                cColor: "=",
                cTurn: "=",
                cPostpone: "=",
                cFinished: "="
            },
            templateUrl: '/assets/common/directives/templates/board.html',
            link: function ($scope) {
                //Guarda el valor de las posibles celdas a donde puedo ir
                $scope.possiblesPlays = [];
                //Guarda el valor de la celda seleccionada
                $scope.selectedCell = {i: undefined, j: undefined};
                //Establece una clase css para la celda seleccionada
                $scope.getCellClass = function (i, j) {
                    var _class = " ";
                    if ($scope.isWhite(i, j))
                        _class += "white ";
                    else
                        _class += "black ";
                    if ($scope.isSelected(i, j))
                        _class += "selected ";
                    angular.forEach($scope.possiblesPlays, function (play) {
                        if (play.i === i && play.j === j) {
                            _class += "possible ";
                            return;
                        }
                    });
                    _class += $rootScope.user.profile.board;
                    return _class;
                };
                //Retorna true en caso que la celda seleccionada sea igual a la pasada como parametro
                $scope.isSelected = function (i, j) {
                    return ($scope.selectedCell.i === i && $scope.selectedCell.j === j);
                };
                //Si la celda es de color blanca retorna true, si no false
                $scope.isWhite = function (i, j) {
                    if (i === 0 || i === 2 || i === 4 || i === 6) {
                        return (j == 0 || j == 2 || j == 4 || j == 6);
                    } else if (i === 1 || i === 3 || i === 5 || i === 7)
                        return (j == 1 || j == 3 || j == 5 || j == 7);
                    return true;
                };
                //Selecciona una celda o mueve la piezaseleccionada al hacer click en una celda
                $scope.selectCell = function (i, j, $event) {
                    if (!$scope.cPostpone && !$scope.cFinished) {
                        if (isAnySelected() && isEnroque(i, j)) {
                            enroque(i, j);
                            $scope.possiblesPlays = [];
                        } else if (isAnySelected() && isPastPeon(i, j)) {
                            pastPeon(i, j)
                            $scope.possiblesPlays = [];
                        } else if (isAnySelected() && canMove(i, j)) {
                            move(i, j);
                            $scope.possiblesPlays = [];
                        } else if ($scope.isSelected(i, j)) {
                            cleanSelected();
                            $scope.possiblesPlays = [];
                        }
                        else if ($scope.cBoard[i][j] && $scope.cBoard[i][j].type && canSelect(i, j)) {
                            $scope.selectedCell = {i: i, j: j};
                            $scope.possiblesPlays = getPossiblesPlays($scope.cBoard[$scope.selectedCell.i][$scope.selectedCell.j], $scope.selectedCell.i, $scope.selectedCell.j);
                        }
                    }
                    $event.stopPropagation();
                };
                //Esta blece la clase del tablero
                $scope.getBoardClass = function () {
                    return ($scope.cColor === "white" || !$scope.cColor) ? "rotate-180" : "";
                };
                //Retorna true si hay alguna pieza seleccionada, si no false
                var isAnySelected = function () {
                    return $scope.selectedCell.i !== undefined && $scope.selectedCell.j !== undefined;
                };
                /*var isSelected = function (i, j) {
                 return ($scope.selectedCell.i === i && $scope.selectedCell.j === j);
                 };*/
                var canSelect = function (i, j) {
                    return (!$scope.cColor && $scope.cBoard[i][j].color === $scope.cTurn) || ($scope.cBoard[i][j].color && $scope.cColor === "white") || (!$scope.cBoard[i][j].color && $scope.cColor === "black")
                };
                var cleanSelected = function () {
                    $scope.selectedCell = {i: undefined, j: undefined};
                };
                var canMove = function (i, j) {
                    var selected = $scope.cBoard[$scope.selectedCell.i][$scope.selectedCell.j];
                    if (selected.color !== $scope.cTurn)
                        return false;
                    var can = false;
                    angular.forEach($scope.possiblesPlays, function (item) {
                        if (item.i === i && item.j === j) {
                            can = true;
                            return;
                        }
                    });
                    return can;
                };
                var moveClient = function (i, j) {
                    var selected = $scope.cBoard[$scope.selectedCell.i][$scope.selectedCell.j];
                    var piece = {
                        color: selected.color,
                        type: selected.type
                    };
                    $scope.cBoard[$scope.selectedCell.i][$scope.selectedCell.j] = {type: false};
                    if (piece.type === 'peon' && ((piece.color && i === 7) || (!piece.color && i === 0))) {
                        piece.type = $rootScope.user.profile.promove;
                        if ($scope.cGame)
                            socket.emit('promove', {
                                from: $scope.selectedCell,
                                to: {i: i, j: j},
                                _id: $scope.cGame,
                                oponent: getOponentColor(),
                                promove: $rootScope.user.profile.promove
                            });
                    } else {
                        if ($scope.cGame)
                            socket.emit('move', {
                                from: $scope.selectedCell,
                                to: {i: i, j: j},
                                _id: $scope.cGame,
                                oponent: getOponentColor()
                            });
                    }
                    $scope.cBoard[i][j] = piece;
                    $scope.cMoves.push({
                        move: String.fromCharCode(72 - j) + (i + 1),
                        piece: piece.type,
                        color: piece.color ? 'white' : 'black',
                        cell: {i: i, j: j},
                        from: $scope.selectedCell
                    });
                    cleanSelected();
                    $scope.cTurn = !$scope.cTurn;
                    inJaqueMate();
                };
                var move = function (i, j) {
                    if ($scope.cGame) {
                        baseFactory.move($scope.cGame, getMyColor(), {
                            i: $scope.selectedCell.i,
                            j: $scope.selectedCell.j
                        }, {i: i, j: j})
                            .then(function (resp) {
                                if (resp.data.success) {
                                    moveClient(i, j);
                                }
                            });
                    } else
                        moveClient(i, j);
                };
                var getMyColor = function () {
                    return ($scope.cGame) ? ($scope.cWhite.user._id === $rootScope.user._id) ? $scope.cWhite : $scope.cBlack : undefined;
                };
                var getOponentColor = function () {
                    return ($scope.cGame) ? ($scope.cWhite.user._id !== $rootScope.user._id) ? $scope.cWhite : $scope.cBlack : undefined;
                };
                //Obtiene mi ultima jugada
                var getMyLastMove = function () {
                    return ($scope.cMoves.length - 2 >= 0) ? $scope.cMoves[$scope.cMoves.length - 2] : undefined;
                };
                //Obtiene la ultima jugada del oponente
                var getOpponentLastMove = function () {
                    return ($scope.cMoves.length - 1 >= 0) ? $scope.cMoves[$scope.cMoves.length - 1] : undefined;
                };
                //Verifica si existe la posibilidad de un enroque
                var isEnroque = function (i, j) {
                    var selected = $scope.cBoard[$scope.selectedCell.i][$scope.selectedCell.j];
                    if (selected.color !== $scope.cTurn)
                        return false;
                    var can = false;
                    if (selected.type === 'king' && selected.initial === true && !inJaque($scope.selectedCell.i, $scope.selectedCell.j, $scope.selectedCell.i, $scope.selectedCell.j)) {
                        if (selected.color) {
                            if (i === 0 && j === 1 && $scope.cBoard[0][0].color && $scope.cBoard[0][0].type === 'tower' && $scope.cBoard[0][0].initial === true && !$scope.cBoard[0][1].type && !$scope.cBoard[0][2].type)
                                can = true;
                            else if (i === 0 && j === 5 && $scope.cBoard[0][7].color && $scope.cBoard[0][7].type === 'tower' && $scope.cBoard[0][7].initial === true && !$scope.cBoard[0][6].type && !$scope.cBoard[0][5].type && !$scope.cBoard[0][4].type) {
                                can = true;
                            }
                        } else {
                            if (i === 7 && j === 1 && !$scope.cBoard[7][0].color && $scope.cBoard[7][0].type === 'tower' && $scope.cBoard[7][0].initial === true && !$scope.cBoard[7][1].type && !$scope.cBoard[7][2].type)
                                can = true;
                            else if (i === 7 && j === 5 && !$scope.cBoard[7][7].color && $scope.cBoard[7][7].type === 'tower' && $scope.cBoard[7][7].initial === true && !$scope.cBoard[7][6].type && !$scope.cBoard[7][5].type && !$scope.cBoard[7][4].type) {
                                can = true;
                            }
                        }
                    }
                    return can;
                };
                //Verifica si existe el peon al paso
                var isPastPeon = function (i, j) {
                    var selected = $scope.cBoard[$scope.selectedCell.i][$scope.selectedCell.j];
                    var opponentLastMove = getOpponentLastMove();
                    if (selected.color) {
                        if ($scope.selectedCell.i === i - 1 && opponentLastMove && opponentLastMove.from.i === 6)
                            if (opponentLastMove.piece === "peon" && opponentLastMove.cell.j === j && opponentLastMove.cell.i === i - 1 && ($scope.selectedCell.j - 1 === j || $scope.selectedCell.j + 1 === j))
                                return true;
                    } else {
                        if ($scope.selectedCell.i === i + 1 && opponentLastMove && opponentLastMove.from.i === 1)
                            if (opponentLastMove.piece === "peon" && opponentLastMove.cell.j === j && opponentLastMove.cell.i === i + 1 && ($scope.selectedCell.j - 1 === j || $scope.selectedCell.j + 1 === j))
                                return true;
                    }
                    return false;
                };
                //Enroca el rey en el cliente
                var enroqueClient = function (i, j) {
                    var selected = $scope.cBoard[$scope.selectedCell.i][$scope.selectedCell.j];
                    var piece = {
                        color: selected.color,
                        type: selected.type
                    };
                    $scope.cBoard[$scope.selectedCell.i][$scope.selectedCell.j] = {type: false};
                    if (selected.color) {
                        if (i === 0 && j === 1) {
                            $scope.cBoard[0][1] = piece;
                            var tower = $scope.cBoard[0][0];
                            $scope.cBoard[0][0] = {type: false};
                            $scope.cBoard[0][2] = tower;
                        } else if (i === 0 && j === 5) {
                            $scope.cBoard[0][5] = piece;
                            var tower = $scope.cBoard[0][7];
                            $scope.cBoard[0][7] = {type: false};
                            $scope.cBoard[0][4] = tower;
                        }
                    } else {
                        if (i === 7 && j === 1) {
                            $scope.cBoard[7][1] = piece;
                            var tower = $scope.cBoard[7][0];
                            $scope.cBoard[7][0] = {type: false};
                            $scope.cBoard[7][2] = tower;
                        } else if (i === 7 && j === 5) {
                            $scope.cBoard[7][5] = piece;
                            var tower = $scope.cBoard[7][7];
                            $scope.cBoard[7][7] = {type: false};
                            $scope.cBoard[7][4] = tower;
                        }
                    }
                    $scope.cMoves.push({
                        move: String.fromCharCode(72 - j) + (i + 1),
                        piece: piece.type,
                        color: piece.color ? 'white' : 'black',
                        cell: {i: i, j: j},
                        from: $scope.selectedCell
                    });
                    cleanSelected();
                    $scope.cTurn = !$scope.cTurn;
                };
                //Enroca el rey en el servidor
                var enroque = function (i, j) {
                    if ($scope.cGame) {
                        baseFactory.enroque($scope.cGame, getMyColor(), {
                            i: $scope.selectedCell.i,
                            j: $scope.selectedCell.j
                        }, {i: i, j: j})
                            .then(function (resp) {
                                if (resp.data.success) {
                                    socket.emit('enroque', {
                                        from: $scope.selectedCell,
                                        to: {i: i, j: j},
                                        _id: $scope.cGame,
                                        oponent: getOponentColor()
                                    });
                                    enroqueClient(i, j);
                                }
                            });
                    } else
                        enroqueClient(i, j);
                };
                //Obtiene las posibles jugadas de una pieza
                var getPossiblesPlays = function (piece, i, j) {
                    var moves = [];
                    if (piece.type === "peon") {
                        var opponentLastMove = getOpponentLastMove();
                        if (piece.color) {
                            if (!$scope.cBoard[i + 1][j].type && !inJaque(i, j, i + 1, j))
                                moves.push({i: i + 1, j: j});
                            if (i === 1 && !$scope.cBoard[i + 1][j].type && !$scope.cBoard[i + 2][j].type && !inJaque(i, j, i + 2, j))
                                moves.push({i: i + 2, j: j});
                            if ($scope.cBoard[i + 1][j - 1] && $scope.cBoard[i + 1][j - 1].type && !$scope.cBoard[i + 1][j - 1].color && !inJaque(i, j, i + 1, j - 1))
                                moves.push({i: i + 1, j: j - 1});
                            if ($scope.cBoard[i + 1][j + 1] && $scope.cBoard[i + 1][j + 1].type && !$scope.cBoard[i + 1][j + 1].color && !inJaque(i, j, i + 1, j + 1))
                                moves.push({i: i + 1, j: j + 1});
                            if (i === 4 && opponentLastMove && opponentLastMove.from.i === 6) {
                                if (opponentLastMove.piece === "peon" && opponentLastMove.cell.j === j - 1 && opponentLastMove.cell.i === i)
                                    moves.push({i: i + 1, j: j - 1});
                                if (opponentLastMove.piece === "peon" && opponentLastMove.cell.j === j + 1 && opponentLastMove.cell.i === i)
                                    moves.push({i: i + 1, j: j + 1});
                            }
                        } else {
                            if (!$scope.cBoard[i - 1][j].type && !inJaque(i, j, i - 1, j))
                                moves.push({i: i - 1, j: j});
                            if (i === 6 && !$scope.cBoard[i - 1][j].type && !$scope.cBoard[i - 2][j].type && !inJaque(i, j, i - 2, j))
                                moves.push({i: i - 2, j: j});
                            if ($scope.cBoard[i - 1][j - 1] && $scope.cBoard[i - 1][j - 1].type && $scope.cBoard[i - 1][j - 1].color && !inJaque(i, j, i - 1, j - 1))
                                moves.push({i: i - 1, j: j - 1});
                            if ($scope.cBoard[i - 1][j + 1] && $scope.cBoard[i - 1][j + 1].type && $scope.cBoard[i - 1][j + 1].color && !inJaque(i, j, i - 1, j + 1))
                                moves.push({i: i - 1, j: j + 1});
                            if (i === 3 && opponentLastMove && opponentLastMove.from.i === 1) {
                                if (opponentLastMove.piece === "peon" && opponentLastMove.cell.j === j - 1 && opponentLastMove.cell.i === i)
                                    moves.push({i: i - 1, j: j - 1});
                                if (opponentLastMove.piece === "peon" && opponentLastMove.cell.j === j + 1 && opponentLastMove.cell.i === i)
                                    moves.push({i: i - 1, j: j + 1});
                            }
                        }
                    }
                    if (piece.type === "king") {
                        if ($scope.cBoard[i + 1] && (!$scope.cBoard[i + 1][j].type || piece.color !== $scope.cBoard[i + 1][j].color) && !inJaque(i, j, i + 1, j))
                            moves.push({i: i + 1, j: j});
                        if ($scope.cBoard[i - 1] && (!$scope.cBoard[i - 1][j].type || piece.color !== $scope.cBoard[i - 1][j].color) && !inJaque(i, j, i - 1, j))
                            moves.push({i: i - 1, j: j});
                        if ($scope.cBoard[i] && (!$scope.cBoard[i][j + 1].type || piece.color !== $scope.cBoard[i][j + 1].color) && !inJaque(i, j, i, j + 1))
                            moves.push({i: i, j: j + 1});
                        if ($scope.cBoard[i] && (!$scope.cBoard[i][j - 1].type || piece.color !== $scope.cBoard[i][j - 1].color) && !inJaque(i, j, i, j - 1))
                            moves.push({i: i, j: j - 1});
                        if ($scope.cBoard[i + 1] && (!$scope.cBoard[i + 1][j + 1].type || piece.color !== $scope.cBoard[i + 1][j + 1].color) && !inJaque(i, j, i + 1, j + 1))
                            moves.push({i: i + 1, j: j + 1});
                        if ($scope.cBoard[i + 1] && (!$scope.cBoard[i + 1][j - 1].type || piece.color !== $scope.cBoard[i + 1][j - 1].color) && !inJaque(i, j, i + 1, j - 1))
                            moves.push({i: i + 1, j: j - 1});
                        if ($scope.cBoard[i - 1] && (!$scope.cBoard[i - 1][j - 1].type || piece.color !== $scope.cBoard[i - 1][j - 1].color) && !inJaque(i, j, i - 1, j - 1))
                            moves.push({i: i - 1, j: j - 1});
                        if ($scope.cBoard[i - 1] && (!$scope.cBoard[i - 1][j + 1].type || piece.color !== $scope.cBoard[i - 1][j + 1].color) && !inJaque(i, j, i - 1, j + 1))
                            moves.push({i: i - 1, j: j + 1});
                        if (!inJaque(i, j, i, j)) {
                            if (piece.color) {
                                if ($scope.cBoard[0][0].color && $scope.cBoard[0][0].type === 'tower' && $scope.cBoard[0][0].initial === true && !$scope.cBoard[0][1].type && !$scope.cBoard[0][2].type && !inJaque(i, j, 0, 1) && !inJaque(i, j, 0, 2))
                                    moves.push({i: 0, j: 1});
                                if ($scope.cBoard[0][7].color && $scope.cBoard[0][7].type === 'tower' && $scope.cBoard[0][7].initial === true && !$scope.cBoard[0][6].type && !$scope.cBoard[0][5].type && !$scope.cBoard[0][4].type && !inJaque(i, j, 0, 5) && !inJaque(i, j, 0, 4))
                                    moves.push({i: 0, j: 5});
                            } else {
                                if (!$scope.cBoard[7][0].color && $scope.cBoard[7][0].type === 'tower' && $scope.cBoard[7][0].initial === true && !$scope.cBoard[7][1].type && !$scope.cBoard[7][2].type && !inJaque(i, j, 7, 1) && !inJaque(i, j, 7, 2))
                                    moves.push({i: 7, j: 1});
                                if (!$scope.cBoard[7][7].color && $scope.cBoard[7][7].type === 'tower' && $scope.cBoard[7][7].initial === true && !$scope.cBoard[7][6].type && !$scope.cBoard[7][5].type && !$scope.cBoard[7][4].type && !inJaque(i, j, 7, 5) && !inJaque(i, j, 7, 4))
                                    moves.push({i: 7, j: 5});
                            }
                        }
                    }
                    if (piece.type === "horse") {
                        if ($scope.cBoard[i + 2] && $scope.cBoard[i + 2][j + 1] && $scope.cBoard[i + 2][j + 1].color !== piece.color && !inJaque(i, j, i + 2, j + 1))
                            moves.push({i: i + 2, j: j + 1});
                        if ($scope.cBoard[i + 2] && $scope.cBoard[i + 2][j - 1] && $scope.cBoard[i + 2][j - 1].color !== piece.color && !inJaque(i, j, i + 2, j - 1))
                            moves.push({i: i + 2, j: j - 1});
                        if ($scope.cBoard[i - 2] && $scope.cBoard[i - 2][j + 1] && $scope.cBoard[i - 2][j + 1].color !== piece.color && !inJaque(i, j, i - 2, j + 1))
                            moves.push({i: i - 2, j: j + 1});
                        if ($scope.cBoard[i - 2] && $scope.cBoard[i - 2][j - 1] && $scope.cBoard[i - 2][j - 1].color !== piece.color && !inJaque(i, j, i - 2, j - 1))
                            moves.push({i: i - 2, j: j - 1});
                        if ($scope.cBoard[i + 1] && $scope.cBoard[i + 1][j - 2] && $scope.cBoard[i + 1][j - 2].color !== piece.color && !inJaque(i, j, i + 1, j - 2))
                            moves.push({i: i + 1, j: j - 2});
                        if ($scope.cBoard[i + 1] && $scope.cBoard[i + 1][j + 2] && $scope.cBoard[i + 1][j + 2].color !== piece.color && !inJaque(i, j, i + 1, j + 2))
                            moves.push({i: i + 1, j: j + 2});
                        if ($scope.cBoard[i - 1] && $scope.cBoard[i - 1][j + 2] && $scope.cBoard[i - 1][j + 2].color !== piece.color && !inJaque(i, j, i - 1, j + 2))
                            moves.push({i: i - 1, j: j + 2});
                        if ($scope.cBoard[i - 1] && $scope.cBoard[i - 1][j - 2] && $scope.cBoard[i - 1][j - 2].color !== piece.color && !inJaque(i, j, i - 1, j - 2))
                            moves.push({i: i - 1, j: j - 2});
                    }
                    if (piece.type === "queen" || piece.type === "alfil") {
                        var newI = i + 1, newJ = j + 1;
                        while (newI <= 7 && newJ <= 7 && !$scope.cBoard[newI][newJ].type) {
                            if (!inJaque(i, j, newI, newJ))
                                moves.push({i: newI, j: newJ});
                            newI++;
                            newJ++;
                        }
                        if ($scope.cBoard[newI] && $scope.cBoard[newJ] && $scope.cBoard[newI][newJ].color != piece.color && !inJaque(i, j, newI, newJ))
                            moves.push({i: newI, j: newJ});
                        newI = i + 1, newJ = j - 1;
                        while (newI <= 7 && newJ >= 0 && !$scope.cBoard[newI][newJ].type) {
                            if (!inJaque(i, j, newI, newJ))
                                moves.push({i: newI, j: newJ});
                            newI++;
                            newJ--;
                        }
                        if ($scope.cBoard[newI] && $scope.cBoard[newJ] && $scope.cBoard[newI][newJ].color != piece.color && !inJaque(i, j, newI, newJ))
                            moves.push({i: newI, j: newJ});
                        newI = i - 1, newJ = j + 1;
                        while (newI >= 0 && newJ <= 7 && !$scope.cBoard[newI][newJ].type) {
                            if (!inJaque(i, j, newI, newJ))
                                moves.push({i: newI, j: newJ});
                            newI--;
                            newJ++;
                        }
                        if ($scope.cBoard[newI] && $scope.cBoard[newJ] && $scope.cBoard[newI][newJ].color != piece.color && !inJaque(i, j, newI, newJ))
                            moves.push({i: newI, j: newJ});
                        newI = i - 1, newJ = j - 1;
                        while (newI >= 0 && newJ >= 0 && !$scope.cBoard[newI][newJ].type) {
                            if (!inJaque(i, j, newI, newJ))
                                moves.push({i: newI, j: newJ});
                            newI--;
                            newJ--;
                        }
                        if ($scope.cBoard[newI] && $scope.cBoard[newJ] && $scope.cBoard[newI][newJ].color != piece.color && !inJaque(i, j, newI, newJ))
                            moves.push({i: newI, j: newJ});
                    }
                    if (piece.type === "queen" || piece.type === "tower") {
                        newI = i + 1, newJ = j;
                        while (newI <= 7 && !$scope.cBoard[newI][newJ].type) {
                            if (!inJaque(i, j, newI, newJ))
                                moves.push({i: newI, j: newJ});
                            newI++;
                        }
                        if ($scope.cBoard[newI] && $scope.cBoard[newJ] && $scope.cBoard[newI][newJ].color != piece.color && !inJaque(i, j, newI, newJ))
                            moves.push({i: newI, j: newJ});
                        newI = i - 1, newJ = j;
                        while (newI >= 0 && !$scope.cBoard[newI][newJ].type) {
                            if (!inJaque(i, j, newI, newJ))
                                moves.push({i: newI, j: newJ});
                            newI--;
                        }
                        if ($scope.cBoard[newI] && $scope.cBoard[newJ] && $scope.cBoard[newI][newJ].color != piece.color && !inJaque(i, j, newI, newJ))
                            moves.push({i: newI, j: newJ});
                        newI = i, newJ = j + 1;
                        while (newJ <= 7 && !$scope.cBoard[newI][newJ].type) {
                            if (!inJaque(i, j, newI, newJ))
                                moves.push({i: newI, j: newJ});
                            newJ++;
                        }
                        if ($scope.cBoard[newI] && $scope.cBoard[newJ] && $scope.cBoard[newI][newJ].color != piece.color && !inJaque(i, j, newI, newJ))
                            moves.push({i: newI, j: newJ});
                        newI = i, newJ = j - 1;
                        while (newJ >= 0 && !$scope.cBoard[newI][newJ].type) {
                            if (!inJaque(i, j, newI, newJ))
                                moves.push({i: newI, j: newJ});
                            newJ--;
                        }
                        if ($scope.cBoard[newI] && $scope.cBoard[newJ] && $scope.cBoard[newI][newJ].color != piece.color && !inJaque(i, j, newI, newJ))
                            moves.push({i: newI, j: newJ});
                    }
                    return moves;
                };
                //Verifica si el rey esta en jaque mate
                var inJaqueMate = function () {
                    var inMate = true;
                    angular.forEach($scope.cBoard, function (row, i) {
                        angular.forEach(row, function (cell, j) {
                            if (cell.type && cell.color === $scope.cTurn && getPossiblesPlays(cell, i, j).length) {
                                inMate = false;
                                return;
                            }
                        });
                        if (!inMate)
                            return;
                    });
                    if (inMate) {
                        $scope.cFinished = true;
                        alert("Juego terminado. Ha ganado " + !$scope.turn);
                    }
                };
                //Verifica si el rey esta en jaque
                var inJaque = function (fromI, fromJ, i, j) {
                    var auxBoard = angular.copy($scope.cBoard);
                    var selected = auxBoard[fromI][fromJ];
                    var piece = {
                        color: selected.color,
                        type: selected.type
                    };
                    auxBoard[fromI][fromJ] = {type: false};
                    if (piece.type === 'peon' && ((piece.color && i === 7) || (!piece.color && i === 0))) {
                        piece.type = $rootScope.user.profile.promove;
                    }
                    auxBoard[i][j] = piece;

                    var king = undefined;
                    var kingPosition = {};
                    angular.forEach(auxBoard, function (row, newI) {
                        angular.forEach(row, function (cell, newJ) {
                            if (cell.type === 'king' && ((cell.color && $scope.cTurn) || (!cell.color && !$scope.cTurn))) {
                                king = cell;
                                kingPosition = {i: newI, j: newJ};
                                return;
                            }
                        });
                        if (king !== undefined)
                            return;
                    });
                    if (king && king.type === 'king') {
                        if (king.color) {
                            // Validando que el rey blanco no este en jaque por un peon negro.
                            if ((auxBoard[kingPosition.i + 1] &&
                                auxBoard[kingPosition.i + 1][kingPosition.j + 1] && !auxBoard[kingPosition.i + 1][kingPosition.j + 1].color &&
                                auxBoard[kingPosition.i + 1][kingPosition.j + 1].type === 'peon') ||
                                (auxBoard[kingPosition.i + 1] &&
                                auxBoard[kingPosition.i + 1][kingPosition.j - 1] && !auxBoard[kingPosition.i + 1][kingPosition.j - 1].color &&
                                auxBoard[kingPosition.i + 1][kingPosition.j - 1].type === 'peon'))
                                return true;
                            // Validando que el rey blanco no este en jaque por un alfil o dama.
                            var auxKingPosition = {i: kingPosition.i - 1, j: kingPosition.j - 1};
                            while (auxKingPosition.i >= 0 && auxKingPosition.j >= 0 && !auxBoard[auxKingPosition.i][auxKingPosition.j].type) {
                                auxKingPosition.i--;
                                auxKingPosition.j--;
                            }
                            var piece = (auxBoard[auxKingPosition.i] && auxBoard[auxKingPosition.i][auxKingPosition.j]) ? auxBoard[auxKingPosition.i][auxKingPosition.j] : undefined;
                            if (piece && !piece.color && (piece.type === 'alfil' || piece.type === 'queen' ))
                                return true;

                            var auxKingPosition = {i: kingPosition.i - 1, j: kingPosition.j + 1};
                            while (auxKingPosition.i >= 0 && auxKingPosition.j <= 7 && !auxBoard[auxKingPosition.i][auxKingPosition.j].type) {
                                auxKingPosition.i--;
                                auxKingPosition.j++;
                            }
                            var piece = (auxBoard[auxKingPosition.i] && auxBoard[auxKingPosition.i][auxKingPosition.j]) ? auxBoard[auxKingPosition.i][auxKingPosition.j] : undefined;
                            if (piece && !piece.color && (piece.type === 'alfil' || piece.type === 'queen' ))
                                return true;

                            var auxKingPosition = {i: kingPosition.i + 1, j: kingPosition.j - 1};
                            while (auxKingPosition.i <= 7 && auxKingPosition.j >= 0 && !auxBoard[auxKingPosition.i][auxKingPosition.j].type) {
                                auxKingPosition.i++;
                                auxKingPosition.j--;
                            }
                            var piece = (auxBoard[auxKingPosition.i] && auxBoard[auxKingPosition.i][auxKingPosition.j]) ? auxBoard[auxKingPosition.i][auxKingPosition.j] : undefined;
                            if (piece && !piece.color && (piece.type === 'alfil' || piece.type === 'queen' ))
                                return true;

                            var auxKingPosition = {i: kingPosition.i + 1, j: kingPosition.j + 1};
                            while (auxKingPosition.i <= 7 && auxKingPosition.j <= 7 && !auxBoard[auxKingPosition.i][auxKingPosition.j].type) {
                                auxKingPosition.i++;
                                auxKingPosition.j++;
                            }
                            var piece = (auxBoard[auxKingPosition.i] && auxBoard[auxKingPosition.i][auxKingPosition.j]) ? auxBoard[auxKingPosition.i][auxKingPosition.j] : undefined;
                            if (piece && !piece.color && (piece.type === 'alfil' || piece.type === 'queen' ))
                                return true;

                            // Validando que el rey blanco no este en jaque por una torre o dama.
                            var auxKingPosition = {i: kingPosition.i, j: kingPosition.j - 1};
                            while (auxKingPosition.j >= 0 && !auxBoard[auxKingPosition.i][auxKingPosition.j].type) {
                                auxKingPosition.j--;
                            }
                            var piece = (auxBoard[auxKingPosition.i] && auxBoard[auxKingPosition.i][auxKingPosition.j]) ? auxBoard[auxKingPosition.i][auxKingPosition.j] : undefined;
                            if (piece && !piece.color && (piece.type === 'tower' || piece.type === 'queen' ))
                                return true;

                            var auxKingPosition = {i: kingPosition.i, j: kingPosition.j + 1};
                            while (auxKingPosition.j <= 7 && !auxBoard[auxKingPosition.i][auxKingPosition.j].type) {
                                auxKingPosition.j++;
                            }
                            var piece = (auxBoard[auxKingPosition.i] && auxBoard[auxKingPosition.i][auxKingPosition.j]) ? auxBoard[auxKingPosition.i][auxKingPosition.j] : undefined;
                            if (piece && !piece.color && (piece.type === 'tower' || piece.type === 'queen' ))
                                return true;

                            var auxKingPosition = {i: kingPosition.i - 1, j: kingPosition.j};
                            while (auxKingPosition.i >= 0 && !auxBoard[auxKingPosition.i][auxKingPosition.j].type) {
                                auxKingPosition.i--;
                            }
                            var piece = (auxBoard[auxKingPosition.i] && auxBoard[auxKingPosition.i][auxKingPosition.j]) ? auxBoard[auxKingPosition.i][auxKingPosition.j] : undefined;
                            if (piece && !piece.color && (piece.type === 'tower' || piece.type === 'queen' ))
                                return true;

                            var auxKingPosition = {i: kingPosition.i + 1, j: kingPosition.j};
                            while (auxKingPosition.i <= 7 && !auxBoard[auxKingPosition.i][auxKingPosition.j].type) {
                                auxKingPosition.i++;
                            }
                            var piece = (auxBoard[auxKingPosition.i] && auxBoard[auxKingPosition.i][auxKingPosition.j]) ? auxBoard[auxKingPosition.i][auxKingPosition.j] : undefined;
                            if (piece && !piece.color && (piece.type === 'tower' || piece.type === 'queen' ))
                                return true;

                            // Validando que el rey blanco no este en jaque por un caballo
                            if ((auxBoard[kingPosition.i - 2] && auxBoard[kingPosition.i - 2][kingPosition.j - 1] && auxBoard[kingPosition.i - 2][kingPosition.j - 1].type === 'horse' && !auxBoard[kingPosition.i - 2][kingPosition.j - 1].color) ||
                                (auxBoard[kingPosition.i - 2] && auxBoard[kingPosition.i - 2][kingPosition.j + 1] && auxBoard[kingPosition.i - 2][kingPosition.j + 1].type === 'horse' && !auxBoard[kingPosition.i - 2][kingPosition.j + 1].color) ||
                                (auxBoard[kingPosition.i + 2] && auxBoard[kingPosition.i + 2][kingPosition.j - 1] && auxBoard[kingPosition.i + 2][kingPosition.j - 1].type === 'horse' && !auxBoard[kingPosition.i + 2][kingPosition.j - 1].color) ||
                                (auxBoard[kingPosition.i + 2] && auxBoard[kingPosition.i + 2][kingPosition.j + 1] && auxBoard[kingPosition.i + 2][kingPosition.j + 1].type === 'horse' && !auxBoard[kingPosition.i + 2][kingPosition.j + 1].color) ||
                                (auxBoard[kingPosition.i + 1] && auxBoard[kingPosition.i + 1][kingPosition.j - 2] && auxBoard[kingPosition.i + 1][kingPosition.j - 2].type === 'horse' && !auxBoard[kingPosition.i + 1][kingPosition.j - 2].color) ||
                                (auxBoard[kingPosition.i - 1] && auxBoard[kingPosition.i - 1][kingPosition.j - 2] && auxBoard[kingPosition.i - 1][kingPosition.j - 2].type === 'horse' && !auxBoard[kingPosition.i - 1][kingPosition.j - 2].color) ||
                                (auxBoard[kingPosition.i + 1] && auxBoard[kingPosition.i + 1][kingPosition.j + 2] && auxBoard[kingPosition.i + 1][kingPosition.j + 2].type === 'horse' && !auxBoard[kingPosition.i + 1][kingPosition.j + 2].color) ||
                                (auxBoard[kingPosition.i - 1] && auxBoard[kingPosition.i - 1][kingPosition.j + 2] && auxBoard[kingPosition.i - 1][kingPosition.j + 2].type === 'horse' && !auxBoard[kingPosition.i - 1][kingPosition.j + 2].color))
                                return true;
                        } else {
                            // Validando que el rey negro no este en jaque por un peon blanco.
                            if ((auxBoard[kingPosition.i - 1] &&
                                auxBoard[kingPosition.i - 1][kingPosition.j + 1] && auxBoard[kingPosition.i - 1][kingPosition.j + 1].color &&
                                auxBoard[kingPosition.i - 1][kingPosition.j + 1].type === 'peon') ||
                                (auxBoard[kingPosition.i - 1] &&
                                auxBoard[kingPosition.i - 1][kingPosition.j - 1] && auxBoard[kingPosition.i - 1][kingPosition.j - 1].color &&
                                auxBoard[kingPosition.i - 1][kingPosition.j - 1].type === 'peon'))
                                return true;
                            // Validando que el rey negro no este en jaque por un alfil o dama.
                            var auxKingPosition = {i: kingPosition.i - 1, j: kingPosition.j - 1};
                            while (auxKingPosition.i >= 0 && auxKingPosition.j >= 0 && !auxBoard[auxKingPosition.i][auxKingPosition.j].type) {
                                auxKingPosition.i--;
                                auxKingPosition.j--;
                            }
                            var piece = (auxBoard[auxKingPosition.i] && auxBoard[auxKingPosition.i][auxKingPosition.j]) ? auxBoard[auxKingPosition.i][auxKingPosition.j] : undefined;
                            if (piece && piece.color && (piece.type === 'alfil' || piece.type === 'queen' ))
                                return true;

                            var auxKingPosition = {i: kingPosition.i - 1, j: kingPosition.j + 1};
                            while (auxKingPosition.i >= 0 && auxKingPosition.j <= 7 && !auxBoard[auxKingPosition.i][auxKingPosition.j].type) {
                                auxKingPosition.i--;
                                auxKingPosition.j++;
                            }
                            var piece = (auxBoard[auxKingPosition.i] && auxBoard[auxKingPosition.i][auxKingPosition.j]) ? auxBoard[auxKingPosition.i][auxKingPosition.j] : undefined;
                            if (piece && piece.color && (piece.type === 'alfil' || piece.type === 'queen' ))
                                return true;

                            var auxKingPosition = {i: kingPosition.i + 1, j: kingPosition.j - 1};
                            while (auxKingPosition.i <= 7 && auxKingPosition.j >= 0 && !auxBoard[auxKingPosition.i][auxKingPosition.j].type) {
                                auxKingPosition.i++;
                                auxKingPosition.j--;
                            }
                            var piece = (auxBoard[auxKingPosition.i] && auxBoard[auxKingPosition.i][auxKingPosition.j]) ? auxBoard[auxKingPosition.i][auxKingPosition.j] : undefined;
                            if (piece && piece.color && (piece.type === 'alfil' || piece.type === 'queen' ))
                                return true;

                            var auxKingPosition = {i: kingPosition.i + 1, j: kingPosition.j + 1};
                            while (auxKingPosition.i <= 7 && auxKingPosition.j <= 7 && !auxBoard[auxKingPosition.i][auxKingPosition.j].type) {
                                auxKingPosition.i++;
                                auxKingPosition.j++;
                            }
                            var piece = (auxBoard[auxKingPosition.i] && auxBoard[auxKingPosition.i][auxKingPosition.j]) ? auxBoard[auxKingPosition.i][auxKingPosition.j] : undefined;
                            if (piece && piece.color && (piece.type === 'alfil' || piece.type === 'queen' ))
                                return true;

                            // Validando que el rey negro no este en jaque por una torre o dama.
                            var auxKingPosition = {i: kingPosition.i, j: kingPosition.j - 1};
                            while (auxKingPosition.j >= 0 && !auxBoard[auxKingPosition.i][auxKingPosition.j].type) {
                                auxKingPosition.j--;
                            }
                            var piece = (auxBoard[auxKingPosition.i] && auxBoard[auxKingPosition.i][auxKingPosition.j]) ? auxBoard[auxKingPosition.i][auxKingPosition.j] : undefined;
                            if (piece && piece.color && (piece.type === 'tower' || piece.type === 'queen' ))
                                return true;

                            var auxKingPosition = {i: kingPosition.i, j: kingPosition.j + 1};
                            while (auxKingPosition.j <= 7 && !auxBoard[auxKingPosition.i][auxKingPosition.j].type) {
                                auxKingPosition.j++;
                            }
                            var piece = (auxBoard[auxKingPosition.i] && auxBoard[auxKingPosition.i][auxKingPosition.j]) ? auxBoard[auxKingPosition.i][auxKingPosition.j] : undefined;
                            if (piece && piece.color && (piece.type === 'tower' || piece.type === 'queen' ))
                                return true;

                            var auxKingPosition = {i: kingPosition.i - 1, j: kingPosition.j};
                            while (auxKingPosition.i >= 0 && !auxBoard[auxKingPosition.i][auxKingPosition.j].type) {
                                auxKingPosition.i--;
                            }
                            var piece = (auxBoard[auxKingPosition.i] && auxBoard[auxKingPosition.i][auxKingPosition.j]) ? auxBoard[auxKingPosition.i][auxKingPosition.j] : undefined;
                            if (piece && piece.color && (piece.type === 'tower' || piece.type === 'queen' ))
                                return true;

                            var auxKingPosition = {i: kingPosition.i + 1, j: kingPosition.j};
                            while (auxKingPosition.i <= 7 && !auxBoard[auxKingPosition.i][auxKingPosition.j].type) {
                                auxKingPosition.i++;
                            }
                            var piece = (auxBoard[auxKingPosition.i] && auxBoard[auxKingPosition.i][auxKingPosition.j]) ? auxBoard[auxKingPosition.i][auxKingPosition.j] : undefined;
                            if (piece && piece.color && (piece.type === 'tower' || piece.type === 'queen' ))
                                return true;

                            // Validando que el rey negro no este en jaque por un caballo
                            if ((auxBoard[kingPosition.i - 2] && auxBoard[kingPosition.i - 2][kingPosition.j - 1] && auxBoard[kingPosition.i - 2][kingPosition.j - 1].type === 'horse' && auxBoard[kingPosition.i - 2][kingPosition.j - 1].color) ||
                                (auxBoard[kingPosition.i - 2] && auxBoard[kingPosition.i - 2][kingPosition.j + 1] && auxBoard[kingPosition.i - 2][kingPosition.j + 1].type === 'horse' && auxBoard[kingPosition.i - 2][kingPosition.j + 1].color) ||
                                (auxBoard[kingPosition.i + 2] && auxBoard[kingPosition.i + 2][kingPosition.j - 1] && auxBoard[kingPosition.i + 2][kingPosition.j - 1].type === 'horse' && auxBoard[kingPosition.i + 2][kingPosition.j - 1].color) ||
                                (auxBoard[kingPosition.i + 2] && auxBoard[kingPosition.i + 2][kingPosition.j + 1] && auxBoard[kingPosition.i + 2][kingPosition.j + 1].type === 'horse' && auxBoard[kingPosition.i + 2][kingPosition.j + 1].color) ||
                                (auxBoard[kingPosition.i + 1] && auxBoard[kingPosition.i + 1][kingPosition.j - 2] && auxBoard[kingPosition.i + 1][kingPosition.j - 2].type === 'horse' && auxBoard[kingPosition.i + 1][kingPosition.j - 2].color) ||
                                (auxBoard[kingPosition.i - 1] && auxBoard[kingPosition.i - 1][kingPosition.j - 2] && auxBoard[kingPosition.i - 1][kingPosition.j - 2].type === 'horse' && auxBoard[kingPosition.i - 1][kingPosition.j - 2].color) ||
                                (auxBoard[kingPosition.i + 1] && auxBoard[kingPosition.i + 1][kingPosition.j + 2] && auxBoard[kingPosition.i + 1][kingPosition.j + 2].type === 'horse' && auxBoard[kingPosition.i + 1][kingPosition.j + 2].color) ||
                                (auxBoard[kingPosition.i - 1] && auxBoard[kingPosition.i - 1][kingPosition.j + 2] && auxBoard[kingPosition.i - 1][kingPosition.j + 2].type === 'horse' && auxBoard[kingPosition.i - 1][kingPosition.j + 2].color))
                                return true;
                        }
                    }
                    return false;
                };
                //Juega el peon al paso en el cliente
                var pastPeonClient = function (i, j) {
                    var selected = $scope.cBoard[$scope.selectedCell.i][$scope.selectedCell.j];
                    var piece = {
                        color: selected.color,
                        type: selected.type
                    };
                    var opponentLastMove = getOpponentLastMove();
                    if (selected.color) {
                        $scope.cBoard[i - 1][j] = {type: false};
                    } else {
                        $scope.cBoard[i + 1][j] = {type: false};
                    }
                    $scope.cBoard[$scope.selectedCell.i][$scope.selectedCell.j] = {type: false};
                    $scope.cBoard[i][j] = piece;
                    $scope.cMoves.push({
                        move: String.fromCharCode(72 - j) + (i + 1),
                        piece: piece.type,
                        color: piece.color ? 'white' : 'black',
                        cell: {i: i, j: j},
                        from: $scope.selectedCell
                    });
                    if ($scope.cGame)
                        socket.emit('past', {
                            from: $scope.selectedCell,
                            to: {i: i, j: j},
                            _id: $scope.cGame,
                            oponent: getOponentColor()
                        });
                    cleanSelected();
                    $scope.cTurn = !$scope.cTurn;
                };
                //Juega el peon al paso en el servidor
                var pastPeon = function (i, j) {
                    if ($scope.cGame) {
                        baseFactory.past($scope.cGame, getMyColor(), {
                            i: $scope.selectedCell.i,
                            j: $scope.selectedCell.j
                        }, {i: i, j: j})
                            .then(function (resp) {
                                if (resp.data.success) {
                                    pastPeonClient(i, j);
                                }
                            });
                    } else
                        pastPeonClient(i, j);
                };

                /*
                 * Events
                 */
                socket.on('move', function (from, to) {
                    var selected = $scope.cBoard[from.i][from.j];
                    var piece = {
                        color: selected.color,
                        type: selected.type
                    };
                    $scope.cBoard[from.i][from.j] = {type: false};
                    $scope.cBoard[to.i][to.j] = piece;
                    $scope.cMoves.push({
                        move: String.fromCharCode(72 - to.j) + (to.i + 1),
                        piece: piece.type,
                        color: piece.color ? 'white' : 'black',
                        cell: to,
                        from: from
                    });
                    $scope.cTurn = !$scope.cTurn;
                });
                socket.on('past', function (from, to) {
                    var selected = $scope.cBoard[from.i][from.j];
                    var piece = {
                        color: selected.color,
                        type: selected.type
                    };
                    $scope.cMoves.push({
                        move: String.fromCharCode(72 - to.j) + (to.i + 1),
                        piece: piece.type,
                        color: piece.color ? 'white' : 'black',
                        cell: to,
                        from: from
                    });
                    var opponentLastMove = getOpponentLastMove();
                    if (selected.color) {
                        $scope.cBoard[to.i - 1][to.j] = {type: false};
                    } else {
                        $scope.cBoard[to.i + 1][to.j] = {type: false};
                    }
                    $scope.cBoard[to.i][to.j] = piece;
                    $scope.cBoard[from.i][from.j] = {type: false};
                    $scope.cTurn = !$scope.cTurn;
                });
                socket.on('enroque', function (from, to) {
                    var selected = $scope.cBoard[from.i][from.j];
                    var piece = {
                        color: selected.color,
                        type: selected.type
                    };
                    $scope.cBoard[from.i][from.j] = {type: false};
                    if (selected.color) {
                        if (to.i === 0 && to.j === 1) {
                            $scope.cBoard[0][1] = piece;
                            var tower = $scope.cBoard[0][0];
                            $scope.cBoard[0][0] = {type: false};
                            $scope.cBoard[0][2] = tower;
                        } else if (to.i === 0 && to.j === 5) {
                            $scope.cBoard[0][5] = piece;
                            var tower = $scope.cBoard[0][7];
                            $scope.cBoard[0][7] = {type: false};
                            $scope.cBoard[0][4] = tower;
                        }
                    } else {
                        if (to.i === 7 && to.j === 1) {
                            $scope.cBoard[7][1] = piece;
                            var tower = $scope.cBoard[7][0];
                            $scope.cBoard[7][0] = {type: false};
                            $scope.cBoard[7][2] = tower;
                        } else if (to.i === 7 && to.j === 5) {
                            $scope.cBoard[7][5] = piece;
                            var tower = $scope.cBoard[7][7];
                            $scope.cBoard[7][7] = {type: false};
                            $scope.cBoard[7][4] = tower;
                        }
                    }
                    $scope.cMoves.push({
                        move: String.fromCharCode(72 - to.j) + (to.i + 1),
                        piece: piece.type,
                        color: piece.color ? 'white' : 'black',
                        cell: to,
                        from: from
                    });
                    $scope.cTurn = !$scope.cTurn;
                });
                socket.on('promove', function (from, to, promove) {
                    var selected = $scope.cBoard[from.i][from.j];
                    var piece = {
                        color: selected.color,
                        type: promove
                    };
                    $scope.cBoard[from.i][from.j] = {type: false};
                    $scope.cBoard[to.i][to.j] = piece;
                    $scope.cMoves.push({
                        move: String.fromCharCode(72 - to.j) + (to.i + 1),
                        piece: piece.type,
                        color: piece.color ? 'white' : 'black',
                        cell: to,
                        from: from
                    });
                });
            }
        };
    }
})();