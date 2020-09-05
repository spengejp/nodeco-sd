/*jshint esversion: 8 */
var store = require('../js/store');

var router = require('express').Router();

router.get('/', (req, res, next) => {
    var items = {};

    items.page = 'setup';
    items.lang = (store.get('lang')) ? store.get('lang') : 'en';

    res.render('setup', { items: items });
});

module.exports = router;