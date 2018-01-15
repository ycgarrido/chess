var express = require('express');
var router = express.Router();
var security = require('../controllers/security');
var user = require('../controllers/user');

/* GET users listing. */
router.get('/logged', security.restrict, user.getLogged);
router.get('/invite/get', security.restrict, user.getInvites);
router.post('/invite', security.restrict, user.invite);
router.post('/invite/decline', security.restrict, user.declineInvite);
router.post('/profile/changeColor', security.restrict, user.changeColor);
router.post('/profile/changeTime', security.restrict, user.changeTime);
router.post('/profile/changeBoard', security.restrict, user.changeBoard);
router.post('/profile/changePromove', security.restrict, user.changePromove);
router.post('/verify', user.verify);
router.post('/register', user.register);

module.exports = router;
