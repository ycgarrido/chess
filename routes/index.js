var express = require('express');
var router = express.Router();
var security = require('../controllers/security');

/* GET home page. */
router.get('/', security.restrict, function (req, res, next) {
    res.render('index', {user: req.session.user});
});
router.get('/login', function (req, res, next) {
    security.getLogin(req, res,
        next)
});
router.post('/login', security.login);
router.get('/logout', security.restrict, security.logOut);
module.exports = router;
