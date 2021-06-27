const express = require('express');
const router = express.Router();
const DataCache = require('../dataCache');
/* GET home page. */
router.get('/', function(req, res, next) {
    res.json(DataCache.getCurrencies());
});

module.exports = router;
