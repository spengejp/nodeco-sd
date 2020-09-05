/*jshint esversion: 8 */
const fs = require('fs');
const request = require('request');

var Common = function () { };

Common.prototype.api = function (endpoint) {
    return new Promise(function (resolve) {
        request({
            url: 'http://127.0.0.1:3000' + endpoint,
            method: 'GET',
            json: true
        }, function (err, res, body) {
            resolve(body);
        });
    });
};

Common.prototype.api_loop = function (endpoint, data = []) {
    var self = this;
    var index = data.length;
    var count = 100;
    return this.api(endpoint + '&index=' + index + '&count=' + count).then(function (res) {
        data = data.concat(res);
        if (res.length === count) {
            return self.api_loop(endpoint, data);
        } else {
            return Promise.resolve(data);
        }
    });
};

Common.prototype.floor = function (num, mul) {
    return Math.floor(num * Math.pow(10, mul)) / Math.pow(10, mul);
};

Common.prototype.isEmpty = function (obj) {
    return !Object.keys(obj).length;
};

Common.prototype.isExistFile = function (file) {
    try {
        var stat = fs.statSync(file);
        if (stat.size <= 0) {
            return false;
        }
        return true;
    } catch (err) {
        if (err.code === 'ENOENT') {
            return false;
        }
    }
};

Common.prototype.mergeJsonToFile = function (filepath, json) {
    var append = JSON.parse(json);

    if (common.isExistFile(filepath)) {
        var read = fs.readFileSync(filepath, 'utf8');

        append = append.concat(JSON.parse(read)).filter(function (elem, i, self) {
            for (var j = 0; j < self.length; j++) {
                if (j != i && JSON.stringify(self[j]) === JSON.stringify(elem)) {
                    return false;
                }
            }
            return true;
        });
    }

    fs.writeFile(filepath, JSON.stringify(append), function () { });
    return append;
};

Common.prototype.writeCsvFile = function (csvpath, data) {
    var curcsv = csvpath;
    var tmpcsv = curcsv + '.tmp';

    fs.stat(curcsv, function (error, stats) {
        if (error) {
            if (error.code === 'ENOENT') {
                fs.writeFile(curcsv, data.join(','), function () { });
            }
        } else {
            var ws = fs.createWriteStream(tmpcsv, 'utf8');

            var lines = fs.readFileSync(curcsv, 'utf8').split('\n').filter(Boolean);
            var index = 0;
            lines.forEach(function (line) {
                var item = line.split(',').map(function (value) {
                    return value.replace(/^"+|"+$/g, '');
                });

                if (index == 0 && item[0] != data[0]) {
                    ws.write(data.join(',') + "\n");
                }

                ws.write(item.join(',') + "\n");
                index++;
            });

            try {
                fs.unlink(curcsv, function () {
                    fs.rename(tmpcsv, curcsv, function () {
                        fs.unlink(tmpcsv, function () { });
                    });
                });
            } catch (e) {
                fs.unlink(tmpcsv, function () { });
            }
        }
    });
};

Common.prototype.errors = function (lang = 'ja') {
    const errors = JSON.parse(fs.readFileSync('json/errors.json', 'utf8'));
    const error = JSON.parse(fs.readFileSync('/tmp/error.log', 'utf8'));

    if (error.path === undefined) {
        return {
            "id": "?",
            "text": errors[lang]['/']
        };
    }

    if (errors[lang][error.path] === undefined) {
        return {
            "id": error.path,
            "text": errors[lang]['/']
        };
    }

    if (errors[lang][`${error.path}/${error.errno}`] === undefined) {
        return {
            "id": error.path,
            "text": errors[lang][error.path]
        };
    }

    return {
        "id": `${error.path}/${error.errno}`,
        "text": errors[lang][`${error.path}/${error.errno}`]
    };
};

module.exports = new Common();