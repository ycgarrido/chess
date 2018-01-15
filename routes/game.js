var express = require('express');
var router = express.Router();
var security = require('../controllers/security');
var game = require('../controllers/game');

/* GET home page. */
router.post('/create', security.restrict, game.create);
router.post('/move', security.restrict, game.move);
router.post('/enroque', security.restrict, game.enroque);
router.post('/decline', security.restrict, game.decline);
router.post('/past', security.restrict, game.past);
router.get('/get', security.restrict, game.get);
router.get('/postponed', security.restrict, game.postponed);

module.exports = router;
