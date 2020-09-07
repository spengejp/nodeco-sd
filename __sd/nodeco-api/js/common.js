
/*jshint esversion: 8 */
const request = require('request');
const child_process = require('child_process');
const fs = require('fs-extra');

global.HOME = process.env[process.platform == "win32" ? "USERPROFILE" : "HOME"];
global.NODECO_CLIENT_DIR = `${HOME}/.nodeco-client`;
global.TEZOS_DIR = `${HOME}/tezos`;
global.TEZOS_CLIENT_DIR = `${HOME}/.tezos-client`;

exports.execute = (command) => {
    return new Promise(function (res) {
        let exec = child_process.exec(command, function (err, sout, serr) {
            if (err) {
                console.log(serr);
                res(false);
            } else {
                res(sout.trim());
            }
        });
    });
};

exports.execute_background = (command) => {
    const child = child_process.spawn(command, [], {
        shell: true,
        //        stdio: 'ignore',
        detached: true,
        env: process.env
    });

    child.unref();
};

exports.tezos_client = (command) => {
    const disclaimer = 'export TEZOS_CLIENT_UNSAFE_DISABLE_DISCLAIMER=Y';
    const client = `${TEZOS_DIR}/tezos-client`;

    if (exports.is_path(client)) {
        console.log(client + ' ' + command);
        return exports.execute(disclaimer + ';' + client + ' ' + command);
    } else {
        return Promise.resolve(false);
    }
};

exports.tezos_rpc = (path, post = null) => {
    console.log('tezos_rpc ' + path);

    return new Promise(function (res) {
        try {
            var req = {
                url: `http://localhost:8732${path}`,
                method: 'GET'
            };

            if (post) {
                req = {
                    url: `http://localhost:8732${path}`,
                    method: 'POST',
                    form: post
                };
            }

            request(req, function (err, resp, body) {
                if (err === true) {
                    exports.error_log('tezos_rpc');
                    res(false);
                } else {
                    try {
                        res(body.trim());
                    } catch (e) {
                        res(body);
                    }
                }
            });
        } catch (e) {
            exports.error_log('tezos_rpc');
            res(false);
        }
    });
};

exports.daemon_isactive = (name) => {
    return new Promise(function (resolve) {
        exports.getSystemctl(name).then(function (ret) {
            if (ret === false || ret.ActiveState !== 'active') {
                resolve(false);
            } else {
                resolve(true);
            }
        });
    });
};

exports.is_path = (filePath) => {
    try {
        fs.statSync(filePath);
        return true;
    } catch (err) {
        return false;
    }
};

exports.check_params = (params, keys) => {
    var reg = new RegExp(/[!"#$%&'()\*\+:;<=>?@\[\\\]^`{|}~]/g);
    for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        if (params[key] === undefined) {
            return false;
        }
        if (reg.test(params[key])) {
            return false;
        }
    }
    return true;
};

exports.getTezosPkh = (source) => {
    var pkh = source;
    var pkhs;

    if (!source.match(/^tz[0-9][a-zA-Z0-9]{33}/g)) {
        try {
            pkhs = JSON.parse(fs.readFileSync(`${TEZOS_CLIENT_DIR}/public_key_hashs`, 'utf8'));
        } catch (e) {
            return false;
        }
        var target = pkhs.find((row) => {
            return (row.name === source);
        });
        if (target !== undefined) {
            pkh = target.value;
        } else {
            pkh = false;
        }
    }

    return pkh;
};

exports.getTezosAlias = (pkh) => {
    var pkhs;
    try {
        pkhs = JSON.parse(fs.readFileSync(`${TEZOS_CLIENT_DIR}/public_key_hashs`, 'utf8'));
    } catch (e) {
        return false;
    }
    var alias = pkhs.find((row) => {
        return (row.value === pkh);
    });
    if (alias !== undefined) {
        return alias.name;
    }
    return false;
};

exports.getTezosSk = (source) => {
    var ret = false;
    var sks, target;

    try {
        sks = JSON.parse(fs.readFileSync(`${TEZOS_CLIENT_DIR}/secret_keys`, 'utf8'));
    } catch (e) {
        return false;
    }

    if (source.match(/^tz[0-9][a-zA-Z0-9]{33}/g)) {
        source = exports.getTezosAlias(source);
        if (source === false) {
            return false;
        }
    }

    if (!source.match(/^(ledger|unencrypted|encrypted)/g)) {
        target = sks.find((row) => {
            return (row.name === source);
        });
    } else {
        target = sks.find((row) => {
            return (row.value === source);
        });
    }

    if (target !== undefined) {
        var type = target.value.match(/^(ledger|unencrypted|encrypted)/g);
        ret = {
            name: target.name,
            sk: target.value,
            type: type[0]
        };
    }

    return ret;
};


exports.tzfloat = (numstr) => {
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


exports.customStackTrace = (err, st) => {
    return {
        Line: st[0].getLineNumber()
    };
};

exports.error_log = (path, errno = 0) => {
    var original = Error.prepareStackTrace;
    Error.prepareStackTrace = exports.customStackTrace;
    var error = {};
    Error.captureStackTrace(error, exports.error_log);
    var ret = error.stack;
    Error.prepareStackTrace = original;
    path = path.split('?')[0];
    console.log(`[Error] Line ${ret.Line}, ${path}/${errno}`);

    fs.writeFileSync('/tmp/error.log', JSON.stringify({
        path: path,
        errno: errno
    }));

    return ret;
};

exports.downloadFile = (file_url, targetPath, progress_callback, end_callback) => {
    var received_bytes = 0;
    var total_bytes = 0;

    var progress = {};
    var headers = [];

    var req = request({
        method: 'GET',
        uri: file_url
    });

    req.on('response', function (data) {
        total_bytes = parseInt(data.headers['content-length']);
        headers = data.headers;
    });

    req.on('data', function (chunk) {
        received_bytes += chunk.length;
        progress.size = {
            transferred: received_bytes,
            total: total_bytes
        };
        progress.percent = received_bytes / total_bytes;
        progress_callback(progress);
    });

    req.on('error', function () {
        exports.error_log('download');
        progress.complete = false;
        progress_callback(progress);
    });

    var stream = req.pipe(fs.createWriteStream(targetPath));

    stream.on('finish', function () {
        progress.complete = true;
        progress_callback(progress);
        end_callback(headers);
    });
};

exports.md5file = (path) => {
    const target = fs.readFileSync(path);
    const md5hash = require('crypto').createHash('md5');
    md5hash.update(target);
    return md5hash.digest('hex');
};

exports.getJournalctl = (process_name, count) => {
    return new Promise(async function (res) {
        var ret = await exports.execute(`journalctl --user -n ${count} -u ${process_name} -o json`);
        res(JSON.parse(ret));
    });
};

exports.getSystemctl = (process_name) => {
    return new Promise(async function (res) {
        var ret = await exports.execute(`systemctl --user show ${process_name} --no-page`);
        if (ret !== false) {
            var lines = ret.split("\n");
            var json = {};
            for (var i = 0; i < lines.length; i++) {
                if (lines[i] === "") {
                    continue;
                }
                var kv = lines[i].split("=");
                json[kv[0]] = kv[1];
            }
            ret = json;
        }
        return res(ret);
    });
};
