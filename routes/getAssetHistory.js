const express = require('express');
const router = express.Router();
const DataCache = require('../dataCache');
/* GET home page. */
router.get('/', function(req, res, next) {
    res.json(DataCache.getAssetHistory());
});

module.exports = router;
