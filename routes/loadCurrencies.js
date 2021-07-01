const express = require('express');
const router = express.Router();
const dataAPI = require('../dataAPI');
/* GET home page. */
router.get('/', async function(req, res, next) {
    res.json(await dataAPI.getCurrencies());
});

module.exports = router;
