/*jshint esversion: 8 */
var d;

(async () => {
    d = await $.getJSON('/getAll');
    await i18n_init();
})();

var i18n_init = async function () {
    var locales = await $.getJSON('/locales');
    var paths = {};
    for (var i = 0; i < locales.length; i++) {
        paths[locales[i]] = 'locales/' + locales[i] + '.json';
    }

    await $.i18n().load(paths);
    $.i18n({ locale: d.lang });
};

var separate = function (num) {
    return String(num).replace(/(\d)(?=(\d\d\d)+(?!\d))/g, '$1,');
};

var elemtonum = function (elem) {
    return Number($(elem).text().replace(/,/, '').slice(0, -2));
};

var tz = function (num) {
    return separate(floor(num / 1000000, 3)) + ' ꜩ';
};

var tzfiat = function (num, fiat, coin) {
    return separate(floor(fiat * num / 1000000, 0)) + ' ' + coin.toUpperCase();
};

var tzfloat = function (numstr) {
    var _numstr = numstr;

    while (_numstr.length < 6) {
        _numstr = '0' + _numstr;
    }
    if (_numstr.length <= 6) {
        _numstr = '0.' + _numstr;
    } else {
        var p = _numstr.slice(0, _numstr.length - 6);
        var d = '.';
        var s = _numstr.slice(_numstr.length - 6);
        _numstr = p + d + s;
    }

    return _numstr;
};

var floor = function (num, mul) {
    return Math.floor(num * Math.pow(10, mul)) / Math.pow(10, mul)
};

var round = function (num, mul) {
    return Math.round(num * Math.pow(10, mul)) / Math.pow(10, mul)
};