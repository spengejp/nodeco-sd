/*jshint esversion: 8 */
var common = require('../js/common');
var store = require('../js/store');
var i18n = require('i18n');

var router = require('express').Router();

router.get('/get', function (req, res) {
    res.json(store.get(req.query.key));
});

router.get('/getAll', function (req, res) {
    res.json(store.getAll());
});

router.get('/locales', function (req, res) {
    res.json(i18n.getLocales());
});

router.get('/set', function (req, res) {
    common.api('/setting/set?params=' + encodeURIComponent(req.query.params)).then(function (data) {
        if (data !== false) {
            store.setAll(data);
            require('../js/daemon').update();
            res.json(data);
        } else {
            res.json(false);
        }
    });
});

router.get('/api/*', function (req, res) {
    common.api(req.url.replace('/api', '')).then(function (data) {
        res.json(data);
    });
});

router.get('/error', function (req, res) {
    common.api('/setting/get').then(function (data) {
        res.json(common.errors(data.lang));
    });
});

module.exports = router;