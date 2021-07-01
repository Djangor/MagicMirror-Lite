const express = require('express');
const router = express.Router();
const dataAPI = require('../dataAPI');
/* GET home page. */
router.get('/', async function(req, res, next) {
    res.json(await dataAPI.getSymbolHistory(req.query.symbol, req.query.isCoin, req.query.entries));
});

module.exports = router;
