var _this = this;
this.create = function (req, res, next) {
    var gameConfig = require("../conf/game.json");
    var white = JSON.parse(req.query.white);
    var black = JSON.parse(req.query.black);
    var time = req.query.time;

    var game = new db.Game({
        white: {user: white, time: time},
        black: {user: black, time: time},
        winner: {},
        lost: {}
    });
    game.moves = [];
    game.board = gameConfig.board;
    game.finished = false;
    game.save(function (error, game) {
        if (error)
            res.send({success: false, error: error});
        res.send({success: game.id});
    });
};
this.get = function (req, res, next) {
    var game = req.param("game");
    db.Game.findById(game, function (error, g) {
        if (error)
            res.send(error);
        if (g !== undefined && g !== null && (g.white.user._id.toString() === req.session.user._id || g.black.user._id.toString() === req.session.user._id))
            return res.send(g);
        else
            return res.send({unauthorized: true});
    });
};
this.move = function (req, res, next) {
    var _id = req.query._id;
    var from = JSON.parse(req.query.from);
    var to = JSON.parse(req.query.to);
    db.Game.findById(_id, function (error, game) {
        if (error)
            res.send({success: false});
        if (game) {
            var board = game.board;
            var selected = board[from.i][from.j];
            var piece = {
                color: selected.color,
                type: selected.type
            };
            board[from.i][from.j] = {type: false};
            if (piece.type === 'tower' || piece.type === 'king')
                piece.initial = false;
            else if (piece.type === 'peon') {
                if ((piece.color && to.i === 7) || (!piece.color && to.i === 0)) {
                    piece.type = req.session.user.profile.promove;
                }
            }
            board[to.i][to.j] = piece;
            var move = {
                move: String.fromCharCode(72 - to.j) + (to.i + 1),
                piece: piece.type,
                color: (piece.color) ? 'white' : 'black',
                cell: {i: to.i, j: to.j},
                from: {i: from.i, j: from.j}
            };
            game.moves.push(move);
            game.board = [];
            for (var i = 0; i < 8; i++) {
                game.board.push([]);
                for (var j = 0; j < 8; j++) {
                    game.board[i][j] = board[i][j];
                }
            }
            game.save(function (error, game) {
                if (error)
                    res.send({success: false});
                global.games.boards[game._id].moves.push(move);
                res.send({success: true});
            });
        } else
            res.send({success: false});

    });
};
this.canMove = function (board, opponentLastMove, turn, i, j) {
    var selected = board[$scope.selectedCell.i][$scope.selectedCell.j];
    if (selected.color !== turn)
        return false;
    var can = false;
    var possibles = this.getPossiblesPlays(board,);
    angular.forEach($scope.possiblesPlays, function (item) {
        if (item.i === i && item.j === j) {
            can = true;
            return;
        }
    });
    return can;
};
this.getPossiblesPlays = function (board, opponentLastMove, piece, i, j) {
    var moves = [];
    if (piece.type === "peon") {
        var opponentLastMove = getOpponentLastMove();
        if (piece.color) {
            if (!board[i + 1][j].type && !inJaque(i, j, i + 1, j))
                moves.push({i: i + 1, j: j});
            if (i === 1 && !board[i + 1][j].type && !board[i + 2][j].type && !inJaque(i, j, i + 2, j))
                moves.push({i: i + 2, j: j});
            if (board[i + 1][j - 1] && board[i + 1][j - 1].type && !board[i + 1][j - 1].color && !inJaque(i, j, i + 1, j - 1))
                moves.push({i: i + 1, j: j - 1});
            if (board[i + 1][j + 1] && board[i + 1][j + 1].type && !board[i + 1][j + 1].color && !inJaque(i, j, i + 1, j + 1))
                moves.push({i: i + 1, j: j + 1});
            if (i === 4 && opponentLastMove && opponentLastMove.from.i === 6) {
                if (opponentLastMove.piece === "peon" && opponentLastMove.cell.j === j - 1 && opponentLastMove.cell.i === i)
                    moves.push({i: i + 1, j: j - 1});
                if (opponentLastMove.piece === "peon" && opponentLastMove.cell.j === j + 1 && opponentLastMove.cell.i === i)
                    moves.push({i: i + 1, j: j + 1});
            }
        } else {
            if (!board[i - 1][j].type && !inJaque(i, j, i - 1, j))
                moves.push({i: i - 1, j: j});
            if (i === 6 && !board[i - 1][j].type && !board[i - 2][j].type && !inJaque(i, j, i - 2, j))
                moves.push({i: i - 2, j: j});
            if (board[i - 1][j - 1] && board[i - 1][j - 1].type && board[i - 1][j - 1].color && !inJaque(i, j, i - 1, j - 1))
                moves.push({i: i - 1, j: j - 1});
            if (board[i - 1][j + 1] && board[i - 1][j + 1].type && board[i - 1][j + 1].color && !inJaque(i, j, i - 1, j + 1))
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
        if (board[i + 1] && (!board[i + 1][j].type || piece.color !== board[i + 1][j].color) && !inJaque(i, j, i + 1, j))
            moves.push({i: i + 1, j: j});
        if (board[i - 1] && (!board[i - 1][j].type || piece.color !== board[i - 1][j].color) && !inJaque(i, j, i - 1, j))
            moves.push({i: i - 1, j: j});
        if (board[i] && (!board[i][j + 1].type || piece.color !== board[i][j + 1].color) && !inJaque(i, j, i, j + 1))
            moves.push({i: i, j: j + 1});
        if (board[i] && (!board[i][j - 1].type || piece.color !== board[i][j - 1].color) && !inJaque(i, j, i, j - 1))
            moves.push({i: i, j: j - 1});
        if (board[i + 1] && (!board[i + 1][j + 1].type || piece.color !== board[i + 1][j + 1].color) && !inJaque(i, j, i + 1, j + 1))
            moves.push({i: i + 1, j: j + 1});
        if (board[i + 1] && (!board[i + 1][j - 1].type || piece.color !== board[i + 1][j - 1].color) && !inJaque(i, j, i + 1, j - 1))
            moves.push({i: i + 1, j: j - 1});
        if (board[i - 1] && (!board[i - 1][j - 1].type || piece.color !== board[i - 1][j - 1].color) && !inJaque(i, j, i - 1, j - 1))
            moves.push({i: i - 1, j: j - 1});
        if (board[i - 1] && (!board[i - 1][j + 1].type || piece.color !== board[i - 1][j + 1].color) && !inJaque(i, j, i - 1, j + 1))
            moves.push({i: i - 1, j: j + 1});
        if (!inJaque(i, j, i, j)) {
            if (piece.color) {
                if (board[0][0].color && board[0][0].type === 'tower' && board[0][0].initial === true && !board[0][1].type && !board[0][2].type && !inJaque(i, j, 0, 1) && !inJaque(i, j, 0, 2))
                    moves.push({i: 0, j: 1});
                if (board[0][7].color && board[0][7].type === 'tower' && board[0][7].initial === true && !board[0][6].type && !board[0][5].type && !board[0][4].type && !inJaque(i, j, 0, 5) && !inJaque(i, j, 0, 4))
                    moves.push({i: 0, j: 5});
            } else {
                if (!board[7][0].color && board[7][0].type === 'tower' && board[7][0].initial === true && !board[7][1].type && !board[7][2].type && !inJaque(i, j, 7, 1) && !inJaque(i, j, 7, 2))
                    moves.push({i: 7, j: 1});
                if (!board[7][7].color && board[7][7].type === 'tower' && board[7][7].initial === true && !board[7][6].type && !board[7][5].type && !board[7][4].type && !inJaque(i, j, 7, 5) && !inJaque(i, j, 7, 4))
                    moves.push({i: 7, j: 5});
            }
        }
    }
    if (piece.type === "horse") {
        if (board[i + 2] && board[i + 2][j + 1] && board[i + 2][j + 1].color !== piece.color && !inJaque(i, j, i + 2, j + 1))
            moves.push({i: i + 2, j: j + 1});
        if (board[i + 2] && board[i + 2][j - 1] && board[i + 2][j - 1].color !== piece.color && !inJaque(i, j, i + 2, j - 1))
            moves.push({i: i + 2, j: j - 1});
        if (board[i - 2] && board[i - 2][j + 1] && board[i - 2][j + 1].color !== piece.color && !inJaque(i, j, i - 2, j + 1))
            moves.push({i: i - 2, j: j + 1});
        if (board[i - 2] && board[i - 2][j - 1] && board[i - 2][j - 1].color !== piece.color && !inJaque(i, j, i - 2, j - 1))
            moves.push({i: i - 2, j: j - 1});
        if (board[i + 1] && board[i + 1][j - 2] && board[i + 1][j - 2].color !== piece.color && !inJaque(i, j, i + 1, j - 2))
            moves.push({i: i + 1, j: j - 2});
        if (board[i + 1] && board[i + 1][j + 2] && board[i + 1][j + 2].color !== piece.color && !inJaque(i, j, i + 1, j + 2))
            moves.push({i: i + 1, j: j + 2});
        if (board[i - 1] && board[i - 1][j + 2] && board[i - 1][j + 2].color !== piece.color && !inJaque(i, j, i - 1, j + 2))
            moves.push({i: i - 1, j: j + 2});
        if (board[i - 1] && board[i - 1][j - 2] && board[i - 1][j - 2].color !== piece.color && !inJaque(i, j, i - 1, j - 2))
            moves.push({i: i - 1, j: j - 2});
    }
    if (piece.type === "queen" || piece.type === "alfil") {
        var newI = i + 1, newJ = j + 1;
        while (newI <= 7 && newJ <= 7 && !board[newI][newJ].type) {
            if (!inJaque(i, j, newI, newJ))
                moves.push({i: newI, j: newJ});
            newI++;
            newJ++;
        }
        if (board[newI] && board[newJ] && board[newI][newJ].color != piece.color && !inJaque(i, j, newI, newJ))
            moves.push({i: newI, j: newJ});
        newI = i + 1, newJ = j - 1;
        while (newI <= 7 && newJ >= 0 && !board[newI][newJ].type) {
            if (!inJaque(i, j, newI, newJ))
                moves.push({i: newI, j: newJ});
            newI++;
            newJ--;
        }
        if (board[newI] && board[newJ] && board[newI][newJ].color != piece.color && !inJaque(i, j, newI, newJ))
            moves.push({i: newI, j: newJ});
        newI = i - 1, newJ = j + 1;
        while (newI >= 0 && newJ <= 7 && !board[newI][newJ].type) {
            if (!inJaque(i, j, newI, newJ))
                moves.push({i: newI, j: newJ});
            newI--;
            newJ++;
        }
        if (board[newI] && board[newJ] && board[newI][newJ].color != piece.color && !inJaque(i, j, newI, newJ))
            moves.push({i: newI, j: newJ});
        newI = i - 1, newJ = j - 1;
        while (newI >= 0 && newJ >= 0 && !board[newI][newJ].type) {
            if (!inJaque(i, j, newI, newJ))
                moves.push({i: newI, j: newJ});
            newI--;
            newJ--;
        }
        if (board[newI] && board[newJ] && board[newI][newJ].color != piece.color && !inJaque(i, j, newI, newJ))
            moves.push({i: newI, j: newJ});
    }
    if (piece.type === "queen" || piece.type === "tower") {
        newI = i + 1, newJ = j;
        while (newI <= 7 && !board[newI][newJ].type) {
            if (!inJaque(i, j, newI, newJ))
                moves.push({i: newI, j: newJ});
            newI++;
        }
        if (board[newI] && board[newJ] && board[newI][newJ].color != piece.color && !inJaque(i, j, newI, newJ))
            moves.push({i: newI, j: newJ});
        newI = i - 1, newJ = j;
        while (newI >= 0 && !board[newI][newJ].type) {
            if (!inJaque(i, j, newI, newJ))
                moves.push({i: newI, j: newJ});
            newI--;
        }
        if (board[newI] && board[newJ] && board[newI][newJ].color != piece.color && !inJaque(i, j, newI, newJ))
            moves.push({i: newI, j: newJ});
        newI = i, newJ = j + 1;
        while (newJ <= 7 && !board[newI][newJ].type) {
            if (!inJaque(i, j, newI, newJ))
                moves.push({i: newI, j: newJ});
            newJ++;
        }
        if (board[newI] && board[newJ] && board[newI][newJ].color != piece.color && !inJaque(i, j, newI, newJ))
            moves.push({i: newI, j: newJ});
        newI = i, newJ = j - 1;
        while (newJ >= 0 && !board[newI][newJ].type) {
            if (!inJaque(i, j, newI, newJ))
                moves.push({i: newI, j: newJ});
            newJ--;
        }
        if (board[newI] && board[newJ] && board[newI][newJ].color != piece.color && !inJaque(i, j, newI, newJ))
            moves.push({i: newI, j: newJ});
    }
    return moves;
};
this.inJaqueMate = function (board, turn) {
    var inMate = true;
    angular.forEach($board, function (row, i) {
        angular.forEach(row, function (cell, j) {
            if (cell.type && cell.color === turn && getPossiblesPlays(cell, i, j).length) {
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
this.past = function (req, res, next) {
    var _id = req.query._id;
    var from = JSON.parse(req.query.from);
    var to = JSON.parse(req.query.to);
    db.Game.findById(_id, function (error, game) {
        if (error)
            res.send({success: false});
        if (game) {
            var board = game.board;
            var selected = board[from.i][from.j];
            var piece = {
                color: selected.color,
                type: selected.type
            };
            board[from.i][from.j] = {type: false};
            if (selected.color) {
                board[to.i - 1][to.j] = {type: false};
            } else {
                board[to.i + 1][to.j] = {type: false};
            }
            board[to.i][to.j] = piece;
            var move = {
                move: String.fromCharCode(72 - to.j) + (to.i + 1),
                piece: piece.type,
                color: (piece.color) ? 'white' : 'black',
                cell: {i: to.i, j: to.j},
                from: {i: from.i, j: from.j}
            };
            game.moves.push(move);
            game.board = [];
            for (var i = 0; i < 8; i++) {
                game.board.push([]);
                for (var j = 0; j < 8; j++) {
                    game.board[i][j] = board[i][j];
                }
            }
            game.save(function (error, game) {
                if (error)
                    res.send({success: false});
                global.games.boards[game._id].moves.push(move);
                res.send({success: true});
            });
        } else
            res.send({success: false});
    });
};
this.enroque = function (req, res, next) {
    var _id = req.query._id;
    var from = JSON.parse(req.query.from);
    var to = JSON.parse(req.query.to);
    db.Game.findById(_id, function (error, game) {
        if (error)
            res.send({success: false});
        if (game) {
            var board = game.board;
            var selected = board[from.i][from.j];
            var piece = {
                color: selected.color,
                type: selected.type
            };
            board[from.i][from.j] = {type: false};
            piece.initial = false;
            if (piece.color) {
                if (to.i === 0 && to.j === 1) {
                    board[0][1] = piece;
                    var tower = board[0][0];
                    board[0][0] = {type: false};
                    board[0][2] = tower;
                } else if (to.i === 0 && to.j === 5) {
                    board[0][5] = piece;
                    tower = board[0][7];
                    board[0][7] = {type: false};
                    board[0][4] = tower;
                }
            } else {
                if (to.i === 7 && to.j === 1) {
                    board[7][1] = piece;
                    var tower = board[7][0];
                    board[7][0] = {type: false};
                    board[7][2] = tower;
                } else if (to.i === 7 && to.j === 5) {
                    board[7][5] = piece;
                    var tower = board[7][7];
                    board[7][7] = {type: false};
                    board[7][4] = tower;
                }
            }
            var move = {
                move: String.fromCharCode(72 - to.j) + (to.i + 1),
                piece: piece.type,
                color: (piece.color) ? 'white' : 'black',
                cell: {i: to.i, j: to.j},
                from: {i: from.i, j: from.j}
            };
            game.moves.push(move);
            game.board = [];
            for (var i = 0; i < 8; i++) {
                game.board.push([]);
                for (var j = 0; j < 8; j++) {
                    game.board[i][j] = board[i][j];
                }
            }
            game.save(function (error, game) {
                if (error)
                    res.send({success: false});
                global.games.boards[game._id].moves.push(move);
                res.send({success: true});
            });
        } else
            res.send({success: false});
    });
};
this.postpone = function (_id) {
    db.Game.findById(_id, function (error, game) {
        if (!error && game) {
            game.postpone = true;
            game.save();
        }
    });
};
this.updateTime = function (game) {
    db.Game.findById(game._id, function (error, g) {
        if (!error && g) {
            g.white = {time: game.white.time, user: game.white.user};
            g.black = {time: game.black.time, user: game.black.user};
            g.save();
        }
    });
};
this.postponed = function (req, res, next) {
    db.Game.find({
        $or: [{"white.user._id": req.session.user._id}, {"black.user._id": req.session.user._id}],
        postpone: true
    }, function (error, games) {
        if (error)
            res.send([]);
        else
            res.send(games);

    })
};
this.finish = function (_id, win, lost) {
    var me = this;
    db.Game.findById(_id, function (error, game) {
        if (!error && game) {
            game.winner = (win === game.white.user._id) ? game.white.user : game.black.user;
            game.lost = (lost === game.white.user._id) ? game.white.user : game.black.user;
            game.finished = true;

            game.save(function (error, game) {
                if (!error) {
                    db.User.findById(win, function (error, winner) {
                        if (!error) {
                            db.User.findById(lost, function (error, loster) {
                                if (!error) {
                                    winner.elo = me.calculateElo(winner.elo, loster.elo, 1);
                                    winner.save(function (error) {
                                        if (!error) {
                                            loster.elo = me.calculateElo(loster.elo, winner.elo, 0);
                                            loster.save();
                                        }
                                    });
                                }
                            });
                        }
                    });
                }
            });
        }
    });
};
this.calculateElo = function (user, oponent, result) {
    var k = 32;
    var espected = 1 / (1 + Math.pow(100, (oponent - user) / 400));
    return Math.round(user + k * (result - espected));
};
this.decline = function (req, res) {
    var _id = req.query._id;
    db.Game.findById(_id, function (error, game) {
        if (!error && game) {
            game.winner = (req.session.user._id === game.white.user._id) ? game.black.user : game.white.user;
            game.lost = (req.session.user._id === game.white.user._id) ? game.white.user : game.black.user;
            game.finished = true;
            game.postpone = false;
            game.save(function (error, game) {
                if (!error) {
                    db.User.findById(game.winner._id, function (error, winner) {
                        if (!error) {
                            db.User.findById(game.lost._id, function (error, loster) {
                                if (!error) {
                                    winner.elo = _this.calculateElo(winner.elo, loster.elo, 1);
                                    winner.save(function (error) {
                                        if (!error) {
                                            loster.elo = _this.calculateElo(loster.elo, winner.elo, 0);
                                            loster.save(function (error) {
                                                if (!error)
                                                    res.send({success: true});
                                                else
                                                    res.send({success: false, error: error});
                                            });
                                        } else
                                            res.send({success: false, error: error});
                                    });
                                } else
                                    res.send({success: false, error: error});
                            });
                        } else
                            res.send({success: false, error: error});
                    });
                } else
                    res.send({success: false, error: error});
            });
        } else
            res.send({success: false, error: error});
    });
};