/*jshint esversion: 8 */
var Store = function () {
    Store.prototype.init();
};

Store.prototype.init = function () {
    if (this._d === undefined) {
        this._d = {};
    }
};

Store.prototype.get = function (key) {
    return (this._d[key] !== undefined) ? this._d[key] : false;
};

Store.prototype.getAll = function () {
    return this._d;
};

Store.prototype.set = function (key, val) {
    this._d[key] = val;
};

Store.prototype.setAll = function (obj) {
    Object.keys(obj).forEach(function (key) {
        this._d[key] = obj[key];
    });
};

Store.prototype.action = function (key) {
    var _d = this._d;
    return new Promise(function (res) {
        if (_d[key] === undefined) {
            setTimeout(function () {
                res(false);
            }, 500);
        } else {
            res(_d[key]);
        }
    });
};

Store.prototype.wait = function (key) {
    return this.waitAll([key]);
};

Store.prototype.waitAll = function (keys, i = 0) {
    var self = this;
    return this.action(keys[i]).then(function (res) {
        if (res === false) {
            return self.waitAll(keys, i);
        } else if (i + 1 < keys.length) {
            return self.waitAll(keys, i + 1);
        } else {
            return Promise.resolve();
        }
    });
};

module.exports = new Store();