this.getLogin = function (req, res, next) {
    return res.render('security/login');
};
this.login = function (req, res, next) {
    var app = require('../conf/app.json');
    var username = req.param("username");

    if (app && app.auth && app.auth.drivers && app.auth.drivers[app.auth.current]) {
        if (app.auth.current === "ldap") {
            var ldap = require('ldapjs');
            var driver = app.auth.drivers[app.auth.current];
            var client = ldap.createClient({
                url: driver.url
            });
            client.bind('cn=admin', 'secret', function (err, matched) {
                res.send(matched);
            });
        } else if (app.auth.current === "local") {
            const crypto = require('crypto');
            var password = crypto.createHmac('sha256', req.param("password")).digest('hex');

            db.User.findOne({username: username}, function (error, user) {
                    if (error)
                        return res.json(error);
                    if (user)
                        if (user.password === password) {
                            req.session.regenerate(function () {
                                req.session.user = user;
                                delete req.session.user.password;
                                res.redirect("/");
                            });
                        }
                        else
                            res.render('security/login', {error: {password: true}, username: username});
                    else
                        res.render('security/login', {error: {username: true}, username: username});
                }
            );
        }
    }
};
this.logOut = function (req, res, next) {
    req.session.regenerate(function () {
        res.redirect('/login');
    });
};
this.restrict = function (req, res, next) {
    if (req.session.user)
        return next();
    res.redirect('/login');
}