var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var session = require('express-session')
var debug = require('debug')('chess:server');
var http = require('http');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

// uncomment after placing your favicon in /public
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use(cookieParser());
app.use(session({resave: true, saveUninitialized: true, secret: 'SOMERANDOMSECRETHERE', cookie: {maxAge: 6000000}}));
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', require('./routes/index'));
app.use('/user', require('./routes/users'));
app.use('/game', require('./routes/game'));

// catch 404 and forward to error handler
app.use(function (req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

if (!global.hasOwnProperty('db')) {
    var mongoose = require('mongoose');
    var dbName = 'store';
    mongoose.Promise = global.Promise;
    mongoose.connect('mongodb://127.0.0.1/chess');
    global.db = {
        mongoose: mongoose,
        User: require('./models/user')(mongoose),
        Game: require('./models/game')(mongoose)
    };
}

// error handler
app.use(function (err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    // render the error page
    res.status(err.status || 500);
    res.render('error');
});
/**
 * Get port from environment and store in Express.
 */
var port = normalizePort(process.env.PORT || '3000');
app.set('port', port);
/**
 * Create HTTP server.
 */
var server = http.createServer(app);
server.listen(port);
/*
 * Create socket
 */
if (!global.hasOwnProperty('sockets')) {
    global.sockets = {
        users: {},
        clients: {},
        pages: {},
        //Return the client from user
        find: function (id_user) {
            return this.clients[id_user];
        },
        //Return current route of the user from socket
        getPage: function (id_socket) {
            return this.pages[id_socket];
        },
        //Return user from socketid
        getUser: function (id_socket) {
            return this.users[id_socket];
        }
    };
}
if (!global.hasOwnProperty('games')) {
    global.games = {
        boards: {},
        add: function (game) {
            var me = this;
            var controller = require('./controllers/game');
            game.white.status = {lasttime: new Date().getTime(), connected: true};
            game.black.status = {lasttime: new Date().getTime(), connected: true};
            this.boards[game._id] = game;
            var interval = setInterval(function () {
                var socket_w = global.sockets.find(game.white.user._id);
                if (socket_w && global.sockets.getPage(socket_w.id) === 'game') {
                    game.white.status.lasttime = new Date().getTime();
                    game.white.status.connected = true;
                } else {
                    game.white.status.connected = false;
                }

                var socket_b = global.sockets.find(game.black.user._id);
                if (socket_b && global.sockets.getPage(socket_b.id) === 'game') {
                    game.black.status.lasttime = new Date().getTime();
                    game.black.status.connected = true;
                } else {
                    game.black.status.connected = false;
                }

                if (game.white.status.connected && game.black.status.connected) {
                    if (game.moves.length % 2 === 0) {
                        game.white.time = game.white.time - 1;
                        controller.updateTime(game);
                    }
                    else {
                        game.black.time = game.black.time - 1;
                        controller.updateTime(game);
                    }
                    socket_w.emit("settime", game.white.time, game.black.time, game._id);
                    socket_b.emit("settime", game.white.time, game.black.time, game._id);

                    var winner = false;
                    var lost = false;
                    if (game.white.time <= 0) {
                        winner = game.black.user._id;
                        lost = game.white.user._id;
                    } else if (game.black.time <= 0) {
                        winner = game.white.user._id;
                        lost = game.black.user._id;
                    }

                    if (winner) {
                        socket_w.emit("finish", winner, game._id);
                        socket_b.emit("finish", winner, game._id);
                        controller.finish(game._id, winner, lost);
                        me.remove(game._id);
                        clearInterval(interval);
                    }
                }
                if (!game.black.status.connected && !game.white.status.connected) {
                    if (Math.round((new Date().getTime() - game.white.status.lasttime) / 1000) === 21 || Math.round((new Date().getTime() - game.black.status.lasttime) / 1000) === 21) {
                        controller.postpone(game._id);
                        me.remove(game._id);
                        clearInterval(interval);
                    }
                }
                if (game.black.status.connected) {
                    if (!game.white.status.connected) {
                        if (Math.round((new Date().getTime() - game.white.status.lasttime) / 1000) === 21) {
                            controller.postpone(game._id);
                            socket_b.emit("postpone", game._id);
                            me.remove(game._id);
                            clearInterval(interval);
                        } else
                            socket_b.emit("outofgame", 20 - Math.round((new Date().getTime() - game.white.status.lasttime) / 1000), game._id);
                    } else
                        socket_w.emit("ingame", game._id);
                }
                if (game.white.status.connected) {
                    if (!game.black.status.connected)
                        if (Math.round((new Date().getTime() - game.black.status.lasttime) / 1000) === 21) {
                            controller.postpone(game._id);
                            socket_w.emit("postpone", game._id);
                            me.remove(game._id);
                            clearInterval(interval);
                        } else
                            socket_w.emit("outofgame", 20 - Math.round((new Date().getTime() - game.black.status.lasttime) / 1000), game._id);
                    else
                        socket_b.emit("ingame", game._id);

                }
            }, 1000);
        },
        exist: function (_id) {
            return (this.boards[_id]);
        },
        remove: function (_id) {
            delete this.boards[_id];
        }
    }
}
var io = require('socket.io')(server);
// setup socket connections to have the session on them
io.sockets.on('connection', function (socket) {
    console.log('-> Conndected socket: ' + socket.id);
    socket.on('user-in', function (data) {
        if (data.userid) {
            db.User.findOne({_id: data.userid}, {
                name: true,
                username: true,
                _id: true,
                elo: true
            }, function (error, user) {
                if (!error) {
                    console.log('-> Socket: ' + socket.id + ' as user: ' + user.username);
                    global.sockets.users[socket.id] = user;
                    global.sockets.pages[socket.id] = 'index';
                    global.sockets.clients[user._id] = socket;
                    io.sockets.emit('connected-users', user);
                }
            });
        }
    });
    socket.on('disconnect', function () {
        io.sockets.emit('disconnected-users', global.sockets.users[socket.id]);
        if (global.sockets.users[socket.id])
            delete global.sockets.clients[global.sockets.users[socket.id]._id];
        if (global.sockets.users[socket.id])
            delete global.sockets.users[socket.id];
        if (global.sockets.pages[socket.id])
            delete global.sockets.pages[socket.id];
    });

    socket.on('invite', function (data) {
        var socket = global.sockets.find(data.to._id);
        if (socket)
            socket.emit("invite");
    });
    socket.on('move', function (data) {
        var socket = global.sockets.find(data.oponent.user._id);
        if (socket)
            socket.emit("move", data.from, data.to);
    });
    socket.on('promove', function (data) {
        var socket = global.sockets.find(data.oponent.user._id);
        if (socket)
            socket.emit("promove", data.from, data.to, data.promove);
    });
    socket.on('enroque', function (data) {
        var socket = global.sockets.find(data.oponent.user._id);
        if (socket)
            socket.emit("enroque", data.from, data.to);
    });
    socket.on('past', function (data) {
        var socket = global.sockets.find(data.oponent.user._id);
        if (socket)
            socket.emit("past", data.from, data.to);
    });
    socket.on('game', function (data) {
        var socket = global.sockets.find(data.to);
        if (socket) {
            if (!global.games.exist(data._id)) {
                db.Game.findById(data._id, function (error, game) {
                    if (!error) {
                        game.postpone = false;
                        game.save(function (error, game) {
                            if (!error) {
                                global.games.add(game);
                                socket.emit("game", data._id);
                            }
                        });
                    }
                });
            }
        }
    });
    socket.on('setpage', function (page) {
        global.sockets.pages[socket.id] = page;
        var user = global.sockets.getUser(socket.id);
        if (user)
            io.sockets.emit('setpage', user, page);
    });
    socket.on('selectcell', function (data) {
        var socket = global.sockets.find(data.oponent);
        if (socket)
            socket.emit("selectcell", data.i, data.j);
    });
    socket.on('unselectcell', function (data) {
        var socket = global.sockets.find(data.oponent);
        if (socket)
            socket.emit("unselectcell");
    });
});

/**
 * Listen on provided port, on all network interfaces.
 */

server.on('error', onError);
server.on('listening', onListening);

/**
 * Normalize a port into a number, string, or false.
 */

function normalizePort(val) {
    var port = parseInt(val, 10);

    if (isNaN(port)) {
        // named pipe
        return val;
    }

    if (port >= 0) {
        // port number
        return port;
    }

    return false;
}

/**
 * Event listener for HTTP server "error" event.
 */

function onError(error) {
    if (error.syscall !== 'listen') {
        throw error;
    }

    var bind = typeof port === 'string'
        ? 'Pipe ' + port
        : 'Port ' + port;

    // handle specific listen errors with friendly messages
    switch (error.code) {
        case 'EACCES':
            console.error(bind + ' requires elevated privileges');
            process.exit(1);
            break;
        case 'EADDRINUSE':
            console.error(bind + ' is already in use');
            process.exit(1);
            break;
        default:
            throw error;
    }
}

/**
 * Event listener for HTTP server "listening" event.
 */

function onListening() {
    var addr = server.address();
    var bind = typeof addr === 'string'
        ? 'pipe ' + addr
        : 'port ' + addr.port;
    debug('Listening on ' + bind);
}
