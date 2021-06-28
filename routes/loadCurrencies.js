const express = require('express');
const router = express.Router();
const DataCache = require('../dataAPI');
/* GET home page. */
router.get('/', async function(req, res, next) {
    res.json(await DataCache.getCurrencies());
});

module.exports = router;
