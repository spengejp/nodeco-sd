/*jshint esversion: 8 */
var store = require('../js/store');

var router = require('express').Router();

router.get('/', (req, res, next) => {

    (async () => {
        var items = {};

        items.page = 'vote';
        items.lang = (store.get('lang')) ? store.get('lang') : 'en';
        items.d = await store.getAll();
        items.scripts = ['./js/vote.js', './js/vote_charts.js'];

        res.render('frame', { items: items });
    })();

});

module.exports = router;