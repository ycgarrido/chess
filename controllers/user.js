this.getLogged = function (req, res, next) {
    return res.json({users: sockets.users, pages: sockets.pages});
};
this.invite = function (req, res, next) {
    var _id = req.query._id
    db.User.findById(_id, function (error, user) {
        if (error)
            res.send({success: false, error: error});
        db.User.findById(req.session.user._id, function (error, me) {
            if (error)
                res.send({success: false, error: error});
            user.invites.push({
                from: {
                    _id: me._id,
                    username: me.username,
                    name: me.name,
                },
                options: {
                    color: me.profile.color,
                    time: me.profile.time
                },
                date: new Date()
            });
            user.save(function (error) {
                if (error)
                    res.send({success: false, error: error});
                res.send({success: true});
            });
        });
    });
};
this.getInvites = function (req, res, next) {
    var _id = req.query._id
    db.User.findById(_id, function (error, user) {
        if (error)
            res.send([]);
        res.send(user.invites);
    });
};
this.declineInvite = function (req, res, next) {
    var invite = req.query.invite;
    db.User.findById(req.session.user._id, function (error, user) {
        if (error)
            res.send({success: false, error: error});
        if (user.invites[invite])
            user.invites.splice(invite, 1);
        user.save(function (error) {
            if (error)
                res.send({success: false, error: error});
            res.send({success: true});
        });
    });
};
this.changeColor = function (req, res, next) {
    var color = req.query.color;
    db.User.findById(req.session.user._id, function (error, user) {
        if (error)
            res.send({success: false, error: error});
        user.profile = {
            time: user.profile.time,
            color: color,
            board: user.profile.board,
            promove: user.profile.promove,
            piece: user.profile.piece
        };
        user.save(function (error) {
            if (error)
                res.send({success: false, error: error});
            req.session.user.profile.color = color;
            res.send({success: true});
        });
    });
};
this.changeTime = function (req, res, next) {
    var time = JSON.parse(req.query.time);
    db.User.findById(req.session.user._id, function (error, user) {
        if (error)
            res.send({success: false, error: error});
        user.profile = {
            time: time,
            color: user.profile.color,
            board: user.profile.board,
            promove: user.profile.promove,
            piece: user.profile.piece
        };
        user.save(function (error) {
            if (error)
                res.send({success: false, error: error});
            req.session.user.profile.time = time;
            res.send({success: true});
        });
    });
};
this.changeBoard = function (req, res, next) {
    var board = req.query.board;
    db.User.findById(req.session.user._id, function (error, user) {
        if (error)
            res.send({success: false, error: error});
        user.profile = {
            time: user.profile.time,
            color: user.profile.color,
            board: board,
            promove: user.profile.promove,
            piece: user.profile.piece
        };

        user.save(function (error) {
            if (error)
                res.send({success: false, error: error});
            req.session.user.profile.board = board;
            res.send({success: true});
        });
    });
};
this.changePromove = function (req, res, next) {
    var promove = req.query.promove;
    db.User.findById(req.session.user._id, function (error, user) {
        if (error)
            res.send({success: false, error: error});
        user.profile = {
            time: user.profile.time,
            color: user.profile.color,
            board: user.profile.board,
            piece: user.profile.piece,
            promove: promove
        };

        user.save(function (error) {
            if (error)
                res.send({success: false, error: error});
            req.session.user.profile.promove = promove;
            res.send({success: true});
        });
    });
};
this.verify = function (req, res, next) {
    var value = req.query.value;
    var filter = {};
    filter[req.query.type] = value;
    db.User.findOne(filter, function (error, user) {
        if (user || error)
            res.send({success: false});
        else
            res.send({success: true});
    });
};
this.register = function (req, res, next) {
    const crypto = require('crypto');
    var username = req.body.username;
    var email = req.body.email;
    var password = req.body.password;
    var user = new db.User();
    user.username = username;
    user.email = email;
    user.password = crypto.createHmac('sha256', password).digest('hex');
    user.profile = {
        promove: "queen",
        board: "classic",
        color: "b",
        time: {
            name: "15 minutos",
            value: 900
        }
    };
    user.save(function (error) {
        if (!error)
            res.redirect('login');
        res.render('login');
    });
};