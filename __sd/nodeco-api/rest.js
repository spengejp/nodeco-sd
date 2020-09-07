/*jshint esversion: 8 */
const express = require('express');
const request = require('request');
const fs = require('fs-extra');
const crypt = require('./js/crypt');
const common = require('./js/common');

const app = express();
const os = require('os');

const port = process.env.PORT || 3000;

const this_dir = __dirname;

const api_server = "10.9.0.1";
const api_server_port = 3000;

app.use(function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

/** ----------------------
 * System APIs
 * -------------------- */

/**
 * Get OS Time
 * @returns time: OS timestamp
 */
app.get('/os/timestamp', function (req, res) {
    common.execute('date +%s').then(function (ret) {
        if (ret === false) {
            common.error_log(req.url);
        }
        res.json({
            time: new Date(parseInt(ret.trim(), 10) * 1000)
        });
    });
});

/**
 * Request OS Shutdown
 * @returns success: true or false
 */
app.get('/os/shutdown', function (req, res) {
    common.execute_background('sudo shutdown -h now');
    res.json(true);
});

/**
 * Request OS Restart
 * @returns success: true or false
 */
app.get('/os/restart', function (req, res) {
    common.execute_background('sudo reboot');
    res.json(true);
});

/**
 * Get IP Address
 * @returns IP Addresses
 */
app.get('/os/ipaddr', function (req, res) {
    try {
        var ifacesObj = {};
        ifacesObj.ipv4 = {};
        ifacesObj.ipv6 = {};
        var interfaces = os.networkInterfaces();

        for (var dev in interfaces) {
            if (dev != 'eth0') {
                continue;
            }

            for (var i = 0; i < interfaces[dev].length; i++) {
                var details = interfaces[dev][i];
                if (details.internal) {
                    continue;
                }
                switch (details.family) {
                    case "IPv4":
                        ifacesObj.ipv4 = {
                            name: dev,
                            address: details.address
                        };
                        break;
                    case "IPv6":
                        ifacesObj.ipv6 = {
                            name: dev,
                            address: details.address
                        };
                        break;
                }
            }
        }
        res.json(ifacesObj);
    } catch (e) {
        common.error_log(req.url);
        res.json(false);
    }
});

/**
 * Enable Rescue Mode
 * @returns success: true or false
 */
app.get('/os/rescue', function (req, res) {
    common.execute(`sudo /nodeco/bin/rescue -y`).then(function (ret) {
        if (ret !== false) {
            res.json(true);
        } else {
            res.json(false);
        }
    });
});

/**
 * Generate Encrypted Password
 * @param name: generate filename
 * @param pass: encrypt password
 * @param force: force reganare password
 * @returns success: true or false
 */
app.get('/pass/generate', function (req, res) {
    if (common.check_params(req.query, ['name', 'pass']) === false) {
        common.error_log(req.url);
        res.json(false);
        return;
    }

    var force = "";
    if (req.query.force) {
        force = "-y"
    }

    common.execute(`sudo /nodeco/bin/passgen ${req.query.name} ${req.query.pass} ${force}`).then(function (ret) {
        if (ret !== false) {
            res.json(true);
        } else {
            res.json(false);
        }
    });
});

/**
 * Verify Password
 * @param name: generated filename
 * @param pass: verify password
 * @returns success: true or false
 */
app.get('/pass/verify', function (req, res) {
    if (common.check_params(req.query, ['name', 'pass']) === false) {
        common.error_log(req.url);
        res.json(false);
        return;
    }

    common.execute(`sudo /nodeco/bin/passgen ${req.query.name} ${req.query.pass} -v`).then(function (ret) {
        if (ret !== false) {
            res.json(true);
        } else {
            res.json(false);
        }
    });
});

/**
 * Alive Check for Server
 * @returns success: true or false
 */
app.get('/server/alive', function (req, res) {
    common.execute(`ping -c1 ${api_server}`).then(function (ret) {
        if (ret !== false) {
            res.json(true);
        } else {
            res.json(false);
        }
    });
});

/** ----------------------
 * Tezos APIs
 * -------------------- */

/**
 * Get Current Tezos Network
 * @returns mainnet or othernet or unknown
 */
app.get('/node/network', function (req, res) {
    common.tezos_rpc('/network/version').then(function (ret) {
        if (ret === false) {
            common.error_log(req.url);
            res.json(false);
            return;
        }
        try {
            ret = JSON.parse(ret.trim());
            var m = /^TEZOS_([A-Z]+)_([A-Z]+)_([0-9\-:TZ]+)$/g.exec(ret.chain_name);
            res.json(m[2].toLowerCase() + "net");
        } catch (e) {
            common.error_log(req.url, 1);
            res.json(false);
        }
    });

    /*
    fs.readdir(TEZOS_DIR, function (err, files) {
        if (err) {
            common.error_log(req.url);
            res.json(false);
            return;
        }
        var nets = files.filter(function (file) {
            var path = `${TEZOS_DIR}/${file}`;
            return (fs.statSync(path).isFile() && /^@.*$/.test(file)); //絞り込み
        });
        if (nets[0]) {
            res.json(nets[0].replace('@', ''));
        } else {
            res.json('unknown');
        }
    });*/
});

/**
 * Start Tezos Node Daemon
 * @returns active: true or false
 */
app.get('/node/start', function (req, res) {
    common.execute('systemctl --user start tezos-node').then(function (ret) {
        if (ret === false) {
            common.error_log(req.url);
        }

        common.daemon_isactive('tezos-node').then(function (ret) {
            res.json({
                active: ret
            });
        });
    });
});

/**
 * Restart Tezos Node Daemon
 * @returns active: true or false
 */
app.get('/node/restart', function (req, res) {
    common.execute('systemctl --user restart tezos-node').then(function (ret) {
        if (ret === false) {
            common.error_log(req.url);
        }

        common.daemon_isactive('tezos-node').then(function (ret) {
            res.json({
                active: ret
            });
        });
    });
});

/**
 * Alive Check of Tezos Node Daemon
 * @returns active: true or false
 */
app.get('/node/active', function (req, res) {
    common.daemon_isactive('tezos-node').then(function (ret) {
        res.json({
            active: ret
        });
    });
});

/**
 * Start Tezos Baker Daemons
 * @returns active: true or false
 */
app.get('/baker/start', function (req, res) {
    common.execute('systemctl --user start tezos-daemons').then(function (ret) {
        if (ret === false) {
            common.error_log(req.url);
        }

        common.daemon_isactive('tezos-daemons').then(function (ret) {
            res.json({
                active: ret
            });
        });
    });
});

/**
 * Restart Tezos Baker Daemons
 * @returns active: true or false
 */
app.get('/baker/restart', function (req, res) {
    common.execute('systemctl --user restart tezos-daemons').then(function (ret) {
        if (ret === false) {
            common.error_log(req.url);
        }

        common.daemon_isactive('tezos-daemons').then(function (ret) {
            res.json({
                active: ret
            });
        });
    });
});

/**
 * Alive Check of Tezos Baker Daemons
 * @returns active: true or false
 */
app.get('/baker/active', function (req, res) {
    common.daemon_isactive('tezos-daemons').then(function (ret) {
        res.json({
            active: ret
        });
    });
});

/**
 * Get RPC Head
 * @returns JSON structure or false
 */
app.get('/rpc/head', function (req, res) {
    common.tezos_rpc('/chains/main/blocks/head').then(function (ret) {
        if (ret === false) {
            common.error_log(req.url);
            res.json(false);
            return;
        }
        try {
            res.json(JSON.parse(ret));
        } catch (e) {
            common.error_log(req.url, 1);
            res.json(false);
        }
    });
});

/**
 * Get RPC Block
 * @param id: block level or block hash
 * @returns JSON structure or false
 */
app.get('/rpc/block', function (req, res) {
    if (common.check_params(req.query, ['id']) === false) {
        common.error_log(req.url);
        res.json(false);
        return;
    }

    common.tezos_rpc(`/chains/main/blocks/${req.query.id}`).then(function (ret) {
        if (ret === false) {
            common.error_log(req.url, 1);
            res.json(false);
            return;
        }
        try {
            res.json(JSON.parse(ret));
        } catch (e) {
            common.error_log(req.url, 2);
            res.json(false);
        }
    });
});

/**
 * Get RPC Balance
 * @param dest: destination alias or public key hash
 * @returns balance
 */
app.get('/rpc/balance', function (req, res) {
    if (common.check_params(req.query, ['dest']) === false) {
        common.error_log(req.url);
        res.json(false);
        return;
    }

    var pkh = common.getTezosPkh(req.query.dest);
    if (pkh === false) {
        res.json(false);
        return;
    }
    common.tezos_rpc(`/chains/main/blocks/head/context/contracts/${pkh}/balance`).then(function (ret) {
        if (ret === false) {
            common.error_log(req.url, 1);
            res.json(false);
            return;
        }
        var balance = ret.replace(/"/g, '');
        res.json(balance);
    });
});

/**
 * Get RPC Constants
 * @returns JSON structure or false
 */
app.get('/rpc/constants', function (req, res) {
    common.tezos_rpc('/chains/main/blocks/head/context/constants').then(function (ret) {
        if (ret === false) {
            common.error_log(req.url);
            res.json(false);
            return;
        }
        try {
            res.json(JSON.parse(ret));
        } catch (e) {
            common.error_log(req.url, 1);
            res.json(false);
        }
    });
});

/**
 * Get RPC Delegates
 * @param dest: destination alias or public key hash
 * @returns JSON structure or false
 */
app.get('/rpc/delegates', function (req, res) {
    if (common.check_params(req.query, ['dest']) === false) {
        common.error_log(req.url);
        res.json(false);
        return;
    }

    var pkh = common.getTezosPkh(req.query.dest);
    if (pkh === false) {
        res.json(false);
        return;
    }
    common.tezos_rpc(`/chains/main/blocks/head/context/delegates/${pkh}`).then(function (ret) {
        if (ret === false) {
            common.error_log(req.url, 1);
            res.json(false);
            return;
        }
        try {
            res.json(JSON.parse(ret));
        } catch (e) {
            common.error_log(req.url, 2);
            res.json(false);
        }
    });
});

/**
 * Get RPC Contracts
 * @param dest: destination alias or public key hash
 * @returns JSON structure or false
 */
app.get('/rpc/contracts', function (req, res) {
    if (common.check_params(req.query, ['dest']) === false) {
        common.error_log(req.url);
        res.json(false);
        return;
    }

    var pkh = common.getTezosPkh(req.query.dest);
    common.tezos_rpc(`/chains/main/blocks/head/context/contracts/${pkh}`).then(function (ret) {
        if (ret === false) {
            common.error_log(req.url, 1);
            res.json(false);
            return;
        }
        try {
            res.json(JSON.parse(ret));
        } catch (e) {
            common.error_log(req.url, 2);
            res.json(false);
        }
    });
});

/**
 * Get Known Addresses
 * @returns JSON structure: addresses list
 */
app.get('/client/addresses', function (req, res) {
    common.tezos_client('list known addresses').then(function (ret) {
        if (ret === false) {
            common.error_log(req.url);
            res.json(false);
            return;
        }

        var tmp = ret.split('\n');
        var addresses = {};

        tmp.forEach(element => {
            var res = /([a-zA-Z0-9]+):\s([a-zA-Z0-9]+)\s\(([a-z]+)\s.*\)/.exec(element);
            addresses = {
                name: res[1],
                pkh: res[2],
                device: res[3]
            };
        });

        res.json(addresses);
    });
});

/**
 * Get Block Time
 * @returns time: last block timestamp
 */
app.get('/client/timestamp', function (req, res) {
    common.tezos_client('get timestamp').then(function (ret) {
        if (ret === false) {
            common.error_log(req.url);
            res.json(false);
            return;
        }
        var reg = ret.match(/([0-9\-TZ:]+)/);
        res.json({
            time: new Date(reg[1].trim())
        });
    });
});

/**
 * Send Amount
 * @param qty: transfer tz amount
 * @param src: source account name or address
 * @param dest: destination account name or address
 * @returns true or false
 */
app.get('/client/send', function (req, res) {
    if (common.check_params(req.query, ['qty', 'src', 'dst']) === false) {
        common.error_log(req.url);
        res.json(false);
        return;
    }

    common.tezos_client(`transfer ${req.query.qty} from ${req.query.src} to ${req.query.dest}`).then(function (ret) {
        if (ret === false) {
            common.error_log(req.url, 1);
            res.json(false);
            return;
        }
        res.json(true);
    });
});

/**
 * Get Voting Period Status
 * @return JSON structure: period data or false
 */
app.get('/vote/status', function (req, res) {
    common.tezos_client('show voting period').then(function (ret) {
        if (ret === false) {
            common.error_log(req.url);
            res.json(false);
            return;
        }

        var line = ret.split('\n');
        var data = {};
        var matches;

        data.period = line[0].match(/^Current period: \"([^\"]+)\"/)[1];
        data.remain = line[1].match(/^Blocks remaining until end of period: ([0-9]+)/)[1];

        if (data.period === null || data.remain === null) {
            res.json(false);
            return;
        }

        switch (data.period) {
            case "proposal":
                var proposals = {};
                for (var i = 3; line[i] !== undefined || i < line.length; i++) {
                    matches = line[i].match(/^\* ([A-Za-z0-9]+) ([0-9]+) .*/);
                    proposals[matches[1]] = matches[2];
                }
                data.proposals = proposals;
                break;

            case "testing_vote":
                data.proposals = line[2].match(/^Current proposal: ([A-Za-z0-9]+)/)[1];
                data.ballots = JSON.parse(line[3].match(/^Ballots: ([{}":,A-Za-z0-9\s]+)/)[1]);

                matches = line[4].match(/^Current participation ([0-9\.]+%), necessary quorum ([0-9\.]+%)/);
                data.participation = matches[1];
                data.quorum = matches[2];

                matches = line[5].match(/^Current in favor ([0-9]+), needed supermajority ([0-9]+)/);
                data.favor = matches[1];
                data.supermajority = matches[2];
                break;

            case "testing":
                data.proposals = line[2].match(/^Current proposal: ([A-Za-z0-9]+)/)[1];
                break;

            case "promotion_vote":
                data.proposals = line[2].match(/^Current proposal: ([A-Za-z0-9]+)/)[1];
                data.ballots = JSON.parse(line[3].match(/^Ballots: ([{}":,A-Za-z0-9\s]+)/)[1]);

                matches = line[4].match(/^Current participation ([0-9\.]+%), necessary quorum ([0-9\.]+%)/);
                data.participation = matches[1];
                data.quorum = matches[2];

                matches = line[5].match(/^Current in favor ([0-9]+), needed supermajority ([0-9]+)/);
                data.favor = matches[1];
                data.supermajority = matches[2];
                break;

            default:
                res.json(false);
                return;
        }

        res.json(data);
    });
});

/**
 * Submit Ballot
 * @param period: voting period [proposal|testing_vote|testing|promotion_vote]
 * @param dest: destination account name or address
 * @param prop: proposal address (If period is proposal, multiples with commas are allowed)
 * @param ballot: ballot value [yay|nay|pass]
 * @return true or false
 */
app.get('/vote/submit', function (req, res) {
    if (common.check_params(req.query, ['period', 'dest', 'prop']) === false) {
        common.error_log(req.url);
        res.json(false);
        return;
    }

    var cmd = '';
    switch (req.query.period) {
        case "proposal":
            var props = req.query.prop.split(',').join(' ');
            cmd = `submit proposals for ${req.query.dest} ${props}`;
            break;

        case "testing_vote":
            if (common.check_params(req.query, ['ballot']) === false) {
                common.error_log(req.url, 1);
                res.json(false);
                return;
            }
            cmd = `submit ballot for ${req.query.dest} ${req.query.prop} ${req.query.ballot}`;
            break;

        case "testing":
            common.error_log(req.url, 2);
            res.json(false);
            return;

        case "promotion_vote":
            if (common.check_params(req.query, ['ballot']) === false) {
                common.error_log(req.url, 3);
                res.json(false);
                return;
            }
            cmd = `submit ballot for ${req.query.dest} ${req.query.prop} ${req.query.ballot}`;
            break;

        default:
            common.error_log(req.url, 4);
            res.json(false);
            return;
    }

    common.tezos_client(cmd).then(function (ret) {
        if (ret === false) {
            common.error_log(req.url, 5);
            res.json(false);
            return;
        }
        res.json(true);
    });
});

app.get('/update/snapshot', function (req, res) {
    if (common.check_params(req.query, ['net']) === false) {
        res.json(false);
        return;
    }

    try {
        fs.rmdirSync(`../.tezos-${req.query.net}-node/context`, { recursive: true });
        fs.rmdirSync(`../.tezos-${req.query.net}-node/store`, { recursive: true });
        fs.unlinkSync(`../.tezos-${req.query.net}-node/peers.json`);
        fs.unlinkSync(`../.tezos-${req.query.net}-node/version.json`);

        common.execute('systemctl --user restart tezos-node').then(function (ret) {
            if (ret === false) {
                common.error_log(req.url);
            }
            res.json(ret);
        });
    } catch (e) {
        common.error_log(req.url);
        res.json(false);
        return;
    }
});

/**
 * OS Update
 * Automatically update OS files.
 * @returns true or false
 */
app.get('/update/os', function (req, res) {
    common.execute_background(`mkdir -p ${NODECO_CLIENT_DIR}/log; sudo /nodeco/bin/os-update > ${NODECO_CLIENT_DIR}/log/update_os.log`);
    res.json(true);
});

/**
 * SD Update
 * Automatically update SD files.
 * @returns true or false
 */
app.get('/update/sd', function (req, res) {
    common.execute('systemctl --user restart nodeco-update').then(function (ret) {
        if (ret === false) {
            common.error_log(req.url);
        }
        res.json(ret);
    });
});

/**
 * SD Update Progress
 * Show SD update progress
 * @returns true or false
 */
app.get('/update/sd/progress', function (req, res) {
    res.json(common.getJournalctl("nodeco-update"));
});

/**
 * Init Ledger Account Recognization
 * note: Please move to the Tezos Wallet App before calling this API.
 * @param crypt: crypto algorithm [ed25519(default)|secp256k1|P-256]
 * @param path: ledger derivation path [/0h/0h(default)]
 * @returns true or false
 */
app.get('/init/ledger', function (req, res) {
    if (common.check_params(req.query, ['name', 'crypt', 'path']) === false) {
        common.error_log(req.url);
        res.json(false);
        return;
    }

    common.tezos_client('list connected ledgers').then(function (ret) {
        if (ret === false) {
            common.error_log(req.url, 1);
            res.json(false);
            return;
        }

        if (req.query.crypt === undefined) {
            req.query.crypt = 'ed25519';
        }
        if (req.query.path === undefined) {
            req.query.path = '/0h/0h';
        }

        var uri = ret.split('\n')[0].replace(/## Ledger\s`([^`]+)`.*$/, '$1');
        var addr = '"ledger://' + uri + '/' + req.query.crypt + req.query.path + '"';

        common.tezos_client(`import secret key ${req.query.name} ${addr} --force`).then(function (ret2) {
            if (ret2 === false) {
                common.error_log(req.url, 2);
                res.json(false);
                return;
            }
            var lines = ret2.split('\n');
            var pkh = lines[lines.length - 1].replace(/Tezos address added:\s([a-zA-Z0-9]+)$/, '$1');
            res.json({
                device: "ledger",
                name: req.query.name,
                crypt: req.query.crypt,
                path: req.query.path,
                pkh: pkh
            });
        });
    });
});

/**
 * Create Baker Account
 * @param path: derivation path for ledger (optional)
 * @param pass: baking account password (optional)
 * @param crypt: crypto algorithm [ed25519(default)|secp256k1|P-256]
 * @returns true or false
 */
app.get('/init/baker/create', function (req, res) {
    (async () => {
        try {
            var ret = false;
            var crypt = (req.query.crypt !== undefined) ? req.query.crypt : 'ed25519';
            if (req.query.path !== undefined) {
                ret = await createBakerAccount('ledger', req.query.path, crypt);
            } else if (req.query.pass !== undefined) {
                ret = await createBakerAccount('nodeco', req.query.pass, crypt);
            }
            res.json(ret);
        } catch (e) {
            common.error_log(req.url, e.message);
            res.json(false);
        }
    })();
});

/**
 * Create Baker Account
 * @param {*} device device type [ledger/nodeco]
 * @param {*} delegate_pkh delegate destination address
 * @param {*} path_or_pass derivation path or password
 * @param {*} algo crypto algorithm [ed25519(default)|secp256k1|P-256]
 */
async function createBakerAccount(device, path_or_pass = '', algo = 'ed25519') {
    var setting = {};
    var secrets = {};
    var ret;

    try {
        setting = JSON.parse(fs.readFileSync(`${NODECO_CLIENT_DIR}/setting/nodeco.json`, 'utf8'));
        secrets = JSON.parse(fs.readFileSync(`${TEZOS_CLIENT_DIR}/secret_keys`, 'utf8'));
    } catch (e) {
        throw new Error(1);
    }

    var data = {};
    data.src = setting.address.name;
    data.src_pkh = setting.address.pkh;
    data.device = device;

    switch (device) {
        case 'ledger':
            if (path_or_pass === '') {
                throw new Error(2);
            }
            ret = await common.tezos_client('list connected ledgers');
            if (ret === false) {
                throw new Error(3);
            }
            var uri = ret.split('\n')[0].replace(/## Ledger\s`([^`]+)`.*$/, '$1');
            uri = '"ledger://' + uri + '/' + algo + path_or_pass + '"';
            const secret = secrets.find((secret) => {
                return (secret.name === data.src);
            });
            if (uri === secret.value) {
                throw new Error(4);
            }
            data.sk = uri;
            break;

        case 'nodeco':
            var key = await crypt.generateKeys(crypt.generateRandomMnemonic(), path_or_pass).then(res => {
                return res;
            });
            data.sk = "encrypted:" + key.esk;
            data.key = key;
            break;
    }

    ret = await common.tezos_client(`import secret key baker ${data.sk} --force`);
    if (ret === false) {
        throw new Error(5);
    }

    var lines = ret.split('\n');
    data.pkh = lines[lines.length - 1].replace(/Tezos address added:\s([a-zA-Z0-9]+)$/, '$1');

    if (device === 'ledger') {
        ret = await common.tezos_client(`setup ledger to bake for baker`);
        if (ret === false) {
            throw new Error(6);
        }
    }

    return data;
}

/**
 * Transfer Amount To Baker Account
 * @param data: source data structure
 * @param amount: transfer amount
 * @param fee: burn-cap fee
 */
/*
app.get('/init/baker/transfer', function (req, res) {
    if (common.check_params(req.query, ['amount']) === false) {
        common.error_log(req.url);
        res.json(false);
        return;
    }

    var fee = (req.query.fee === undefined) ? 1 : req.query.fee;
    (async () => {
        try {
            var ret = await transferToBakerAccount(JSON.parse(req.query.data), amount, fee);
            res.json(ret);
        } catch (e) {
            common.error_log(req.url, e.message);
            res.json(false);
        }
    })();
});*/

/** Register Baker Account
 * @returns true or false
 */
app.get('/init/baker/register', function (req, res) {
    common.tezos_client(`register key baker as delegate`).then(function (ret) {
        if (ret === false) {
            common.error_log(req.url);
            res.json(false);
        }
        res.json(true);
    });
});

/**
 * Swap Amount
 * @param a: A address or alias
 * @param a_qty: A amount
 * @param b: B address or alias
 * @param b_qty: B amount
 * @param fee: burn-cap fee
 */
app.get('/transfer/swap', function (req, res) {
    if (common.check_params(req.query, ['a', 'a_qty', 'b', 'b_qty', 'fee']) === false) {
        common.error_log(req.url);
        res.json(false);
        return;
    }

    (async () => {
        try {
            var a_pkh = common.getTezosPkh(req.query.a);
            var b_pkh = common.getTezosPkh(req.query.b);

            var a_assume_qty = Number(req.query.a_qty);
            var b_assume_qty = Number(req.query.b_qty);

            var fee = req.query.fee;

            var a_qty = await common.tezos_rpc(`/chains/main/blocks/head/context/contracts/${a_pkh}/balance`);
            if (a_qty === false) {
                throw new Error(1);
            }
            a_qty = common.tzfloat(a_qty.replace(/"/g, ''));

            var b_qty = await common.tezos_rpc(`/chains/main/blocks/head/context/contracts/${b_pkh}/balance`);
            if (b_qty === false) {
                throw new Error(2);
            }
            b_qty = common.tzfloat(b_qty.replace(/"/g, ''));

            var safe_tz_sub = function (a, b) {
                var sub = a - b;
                var integer = Math.floor(sub);
                var decimal = Math.round((sub - integer) * 1000000) / 1000000;
                return Number(integer + decimal);
            };

            if (safe_tz_sub(a_assume_qty, a_qty) !== safe_tz_sub(b_qty, b_assume_qty)) {
                throw new Error(3);
            }

            var qty, src_name, src, dst_name, dst;
            if (a_assume_qty > a_qty && b_assume_qty < b_qty) {
                qty = safe_tz_sub(a_assume_qty, a_qty);
                src_name = req.query.b;
                src = b_pkh;
                dst_name = req.query.a;
                dst = a_pkh;
            } else if (a_assume_qty < a_qty && b_assume_qty > b_qty) {
                qty = safe_tz_sub(a_qty, a_assume_qty);
                src_name = req.query.a;
                src = a_pkh;
                dst_name = req.query.b;
                dst = b_pkh;
            }

            var sk = common.getTezosSk(src_name);

            switch (sk.type) {
                case 'ledger':
                    /*暫定: tezos-clientのバグで、複数のpublic key hashがありどちらかがsecret keyがない時に送金できないための対応 */
                    /* ここから--------------------------------------------------------------------------------------------- */
                    var obj = [{
                        name: src_name,
                        value: src
                    }, {
                        name: dst_name,
                        value: dst
                    }];
                    var write = `[{"name":"${src_name}","value":"${src}"},{"name":"${dst_name}","value":"${dst}"}]`;
                    fs.writeFileSync(`/tmp/public_key_hashs`, write, 'utf8');
                    fs.copyFileSync(`${TEZOS_CLIENT_DIR}/public_keys`, `/tmp/public_keys`);
                    fs.copyFileSync(`${TEZOS_CLIENT_DIR}/secret_keys`, `/tmp/secret_keys`);
                    ret = await common.tezos_client(`--base-dir /tmp/ transfer ${qty} from ${src_name} to ${dst} --burn-cap ${fee}`);
                    fs.unlinkSync(`/tmp/public_key_hashs`);
                    fs.unlinkSync(`/tmp/public_keys`);
                    fs.unlinkSync(`/tmp/secret_keys`);
                    /* ---------------------------------------------------------------------------------------------ここまで */

                    if (ret === false) {
                        throw new Error(4);
                    }
                    break;

                // TODO:
                case 'encrypted':
                case 'unencrypted':
                    ret = transfer(key, baker, amount);
                    if (ret === false) {
                        throw new Error(5);
                    }
                    break;

                default:
                    throw new Error(6);
            }
            res.json(true);
        } catch (e) {
            common.error_log(req.url, e.message);
            res.json(false);
        }
    })();
});


/**
 * Transfer Amount To Baker Account
 * @param {*} data source data structre
 * @param {*} amount transfer amount
 * @param {*} burn_cap burn-cap
 */
async function transferToBakerAccount(data, amount, burn_cap) {
    var balance_n = await common.tezos_rpc(`/chains/main/blocks/head/context/contracts/${data.src_pkh}/balance`);
    if (balance_n === false) {
        throw new Error(1);
    }
    balance_n = balance_n.replace(/"/g, '');

    var constants = await common.tezos_rpc(`/chains/main/blocks/head/context/constants`);
    if (constants === false) {
        throw new Error(2);
    }

    constants = JSON.parse(constants);

    var baker;
    if (BigInt(balance_n) < BigInt(constants.tokens_per_roll) + BigInt(1000000)) {
        try {
            const pkhs = JSON.parse(fs.readFileSync(`${TEZOS_CLIENT_DIR}/public_key_hashs`, 'utf8'));
            baker = pkhs.find((pkh) => {
                return (pkh.name === 'baker');
            });
        } catch (e) {
            throw new Error(3);
        }
        var baker_n = await common.tezos_rpc(`/chains/main/blocks/head/context/contracts/${baker.value}/balance`);
        baker_n = baker_n.replace(/"/g, '');

        if (BigInt(baker_n) >= BigInt(constants.tokens_per_roll)) {
            return true;
        }

        throw new Error(4);
    }

    switch (data.device) {
        case 'ledger':
            ret = await common.tezos_client(`transfer ${amount} from ${data.src} to baker --burn-cap ${burn_cap}`);
            if (ret === false) {
                throw new Error(5);
            }

            ret = await common.tezos_client(`register key baker as delegate`);
            if (ret === false) {
                throw new Error(6);
            }
            break;

        case 'nodeco':
            //TODO:
            ret = transfer(key, baker, amount);
            if (ret === false) {
                throw new Error(7);
            }

            ret = await common.tezos_client(`register key baker as delegate`);
            if (ret === false) {
                throw new Error(8);
            }
            break;
    }

    return true;
}

function transfer(keys, to, amount, fee = 0, gasLimit = 10200, storageLimit = 300, revealFee = 1269) {
    var ops = [{
        kind: "reveal",
        fee: revealFee.toString(),
        public_key: keys.pk,
        source: keys.pkh,
        gas_limit: gasLimit.toString(),
        storage_limit: storageLimit.toString(),
        //counter: 
    }, {
        kind: "transaction",
        fee: fee.toString(),
        source: keys.pkh,
        gas_limit: gasLimit.toString(),
        storage_limit: storageLimit.toString(),
        amount: amount.toString(),
        destination: to
    }];

    var head = common.tezos_rpc('/chains/main/blocks/head/header');
    var opOb = {
        "branch": head.hash,
        "contents": ops
    };

    var op = common.tezos_rpc('/chains/main/blocks/head/helpers/forge/operations', opOb);
    var signed = crypt.sign(op.opbytes, keys.sk, new Uint8Array([3]));
    //    op.opbytes = signed.sbytes;
    //    op.opOb.signature = signed.edsig;

    common.tezos_rpc('/chains/main/blocks/head/injection/operation', signed.sbytes);
}

/**
 * Set Delegate
 * note: You should move to the Tezos Wallet App before calling this API.
 * @param src: source account name or address
 * @param dest: destination account name or address for delegate
 * @returns true or false
 */
app.get('/init/delegate', function (req, res) {
    if (common.check_params(req.query, ['src', 'dest']) === false) {
        res.json(false);
        return;
    }

    (async () => {
        var ret = false;
        try {
            ret = await common.tezos_client(`add address delegate ${req.query.dest} --force`);
            if (ret === false) {
                throw new Error(1);
            }

            var src_del = await common.tezos_rpc(`/chains/main/blocks/head/context/contracts/${req.query.src}/delegate`);
            if (src_del === false) {
                throw new Error(2);
            }

            var dest_del = await common.tezos_rpc(`/chains/main/blocks/head/context/contracts/${req.query.dest}/delegate`);
            if (dest_del === false) {
                throw new Error(3);
            }

            if (src_del !== dest_del) {
                ret = await common.tezos_client(`set delegate for ${req.query.src} to delegate`);
                if (ret === false) {
                    throw new Error(4);
                }
            }

            res.json(true);
        } catch (e) {
            common.error_log(req.url, e.message);
            res.json(false);
            return;
        }
    })();
});

/**
 * Create New Account
 * @param name: new account name (alias)
 * @returns true or false
 */
app.get('/init/account/create', function (req, res) {
    if (common.check_params(req.query, ['name', 'pass']) === false) {
        res.json(false);
        return;
    }

    crypt.generateKeys(crypt.generateRandomMnemonic(), req.query.pass).then(function (data) {
        common.tezos_client(`import secret key ${name} ${data.sk}`).then(function (ret) {
            if (ret === false) {
                common.error_log(req.url);
                res.json(false);
                return;
            }
            res.json(data);
        });
    });
});

/**
 * Originate Account
 * @param name: new account name (alias)
 * @param src: source account name or address
 * @returns true or false
 */
app.get('/init/account/originate', function (req, res) {
    if (common.check_params(req.query, ['name', 'src']) === false) {
        common.error_log(req.url);
        res.json(false);
        return;
    }

    common.tezos_client(`originate account ${req.query.name} for ${req.query.src} transferring 0 from ${req.query.src}`).then(function (ret) {
        if (ret === false) {
            common.error_log(req.url, 1);
            res.json(false);
            return;
        }
        res.json(true);
    });
});

/**
 * Remember Account
 * @param name: new account name(alias)
 * @param src: source account name or address
 * @returns true or false
 */
app.get('/init/account/remember', function (req, res) {
    if (common.check_params(req.query, ['name', 'src']) === false) {
        common.error_log(req.url);
        res.json(false);
        return;
    }

    common.tezos_client(`remember contract ${req.query.name} ${req.query.src}`).then(function (ret) {
        if (ret === false) {
            common.error_log(req.url, 1);
            res.json(false);
            return;
        }
        res.json(true);
    });
});

/**
 * Get Tezos Fiat Price History
 * @param coin: get fiat type (usd, eur, jpy, etc)
 * @param start: start range date (YYYY-MM-DD)
 * @param end: end range date (YYYY-MM-DD)
 * @returns JSON structure
 */
app.get('/db/price', function (req, res) {
    if (common.check_params(req.query, ['coin', 'start', 'end']) === false) {
        common.error_log(req.url);
        res.json(false);
        return;
    }

    try {
        request({
            url: `http://${api_server}:${api_server_port}/price?coin=${req.query.coin}&start=${req.query.start}&end=${req.query.end}`,
            method: 'GET'
        },
            function (err, resp, body) {
                if (err === true) {
                    common.error_log(req.url, 1);
                    res.json(false);
                } else {
                    res.send(body);
                }
            }
        );
    } catch (e) {
        common.error_log(req.url, 2);
        res.json(false);
    }
});

/**
 * Get Plan
 * @param hash: target address (public key hash)
 * @param index: start index of record
 * @param count: record count from index (max: 100)
 * @param net: network name (mainnet, carthagenet, ...)
 * @returns JSON structure
 */
app.get('/db/plan', function (req, res) {
    if (common.check_params(req.query, ['hash', 'index', 'count']) === false) {
        common.error_log(req.url);
        res.json(false);
        return;
    }

    if (req.query.net === undefined) {
        req.query.net = "mainnet";
    }

    try {
        request({
            url: `http://${api_server}:${api_server_port}/plan?hash=${req.query.hash}&index=${req.query.index}&count=${req.query.count}&db=${req.query.net}`,
            method: 'GET'
        },
            function (err, resp, body) {
                if (err === true) {
                    common.error_log(req.url, 1);
                    res.json(false);
                } else {
                    res.send(body);
                }
            }
        );
    } catch (e) {
        common.error_log(req.url, 2);
        res.json(false);
    }
});

/**
 * Get Plan Count
 * @param hash: target address (public key hash)
 * @param net: network name (mainnet, carthagenet, ...)
 * @returns plan count
 */
app.get('/db/plan/count', function (req, res) {
    if (common.check_params(req.query, ['hash']) === false) {
        common.error_log(req.url);
        res.json(false);
        return;
    }

    if (req.query.net === undefined) {
        req.query.net = "mainnet";
    }

    try {
        request({
            url: `http://${api_server}:${api_server_port}/n_plan?hash=${req.query.hash}&db=${req.query.net}`,
            method: 'GET'
        },
            function (err, resp, body) {
                if (err === true) {
                    common.error_log(req.url, 1);
                    res.json(false);
                } else {
                    res.send(body);
                }
            }
        );
    } catch (e) {
        common.error_log(req.url, 2);
        res.json(false);
    }
});

/**
 * Get History
 * @param hash: target address (public key hash)
 * @param index: start index of record
 * @param count: record count from index (max: 100)
 * @param net: network name (mainnet, carthagenet, ...)
 * @returns JSON structure
 */
app.get('/db/history', function (req, res) {
    if (common.check_params(req.query, ['hash', 'index', 'count']) === false) {
        common.error_log(req.url);
        res.json(false);
        return;
    }

    if (req.query.net === undefined) {
        req.query.net = "mainnet";
    }

    try {
        request({
            url: `http://${api_server}:${api_server_port}/history?hash=${req.query.hash}&index=${req.query.index}&count=${req.query.count}&db=${req.query.net}`,
            method: 'GET'
        },
            function (err, resp, body) {
                if (err === true) {
                    common.error_log(req.url, 1);
                    res.json(false);
                } else {
                    res.send(body);
                }
            }
        );
    } catch (e) {
        common.error_log(req.url, 2);
        res.json(false);
    }
});

/**
 * Get History Count
 * @param hash: target address (public key hash)
 * @param net: network name (mainnet, carthagenet, ...)
 * @returns history count
 */
app.get('/db/history/count', function (req, res) {
    if (common.check_params(req.query, ['hash']) === false) {
        common.error_log(req.url);
        res.json(false);
        return;
    }

    if (req.query.net === undefined) {
        req.query.net = "mainnet";
    }

    try {
        request({
            url: `http://${api_server}:${api_server_port}/n_history?hash=${req.query.hash}&db=${req.query.net}`,
            method: 'GET'
        },
            function (err, resp, body) {
                if (err === true) {
                    common.error_log(req.url, 1);
                    res.json(false);
                } else {
                    res.send(body);
                }
            }
        );
    } catch (e) {
        common.error_log(req.url, 2);
        res.json(false);
    }
});

/**
 * Get Operations
 * @param hash: target address (public key hash)
 * @param index: start index of record
 * @param count: record count from index (max: 100)
 * @param net: network name (mainnet, carthagenet, ...)
 * @returns JSON structure or false
 */
app.get('/db/operations', function (req, res) {
    if (common.check_params(req.query, ['hash', 'index', 'count']) === false) {
        common.error_log(req.url);
        res.json(false);
        return;
    }

    if (req.query.net === undefined) {
        req.query.net = "mainnet";
    }

    try {
        request({
            url: `http://${api_server}:${api_server_port}/operations?hash=${req.query.hash}&index=${req.query.index}&count=${req.query.count}&db=${req.query.net}`,
            method: 'GET'
        },
            function (err, resp, body) {
                if (err === true) {
                    common.error_log(req.url, 1);
                    res.json(false);
                } else {
                    res.send(body);
                }
            }
        );
    } catch (e) {
        common.error_log(req.url, 2);
        res.json(false);
    }
});

/** 
 * Get Tzstats Tip
 * @return JSON structure or false
 */
app.get('/tzstats/tip', function (req, res) {
    common.execute('curl -X GET https://api.tzstats.com/explorer/tip').then(function (ret) {
        try {
            if (ret === false) {
                common.error_log(req.url);
                res.json(false);
                return;
            }
            res.json(JSON.parse(ret));
        } catch (e) {
            common.error_log(req.url, 1);
            res.json(false);
        }
    });
});

/** 
 * Get Tzstats Account Info
 * @param hash: target address(public key hash)
 * @return JSON structure or false
 */
app.get('/tzstats/account', function (req, res) {
    if (common.check_params(req.query, ['hash']) === false) {
        res.json(false);
        return;
    }

    common.execute(`curl -X GET https://api.tzstats.com/explorer/account/${req.query.hash}`).then(function (ret) {
        try {
            if (ret === false) {
                common.error_log(req.url);
                res.json(false);
                return;
            }
            res.json(JSON.parse(ret));
        } catch (e) {
            common.error_log(req.url, 1);
            res.json(false);
        }
    });
});

/**
 * Get Current Price by coingecko
 * @param coin: get fiat type(usd, eur, jpy, etc)
 * @return JSON structure or false
 */
app.get('/coingecko/price', function (req, res) {
    if (common.check_params(req.query, ['coin']) === false) {
        res.json(false);
        return;
    }

    try {
        request({
            url: `https://api.coingecko.com/api/v3/simple/price?ids=tezos&vs_currencies=${req.query.coin}`,
            method: 'GET'
        },
            function (err, resp, body) {
                if (err === true) {
                    common.error_log(req.url);
                    res.json(false);
                } else {
                    try {
                        var json = JSON.parse(body);
                        res.json(json.tezos);
                    } catch (e) {
                        common.error_log(req.url);
                        res.json(false);
                    }
                }
            }
        );
    } catch (e) {
        common.error_log(req.url, 1);
        res.json(false);
    }
});

/**
 * Get Nodeco Setting file
 * @return JSON structure or false
 */
app.get('/setting/get', function (req, res) {
    try {
        console.log(this_dir);
        console.log(`${NODECO_CLIENT_DIR}/setting/nodeco.json`);
        res.json(JSON.parse(fs.readFileSync(`${NODECO_CLIENT_DIR}/setting/nodeco.json`, 'utf8')));
    } catch (e) {
        common.error_log(req.url);
        res.json(false);
    }
});

/**
 * Update Nodeco Setting file
 * @param params: write params (must be object)
 * @return true or false
 */
app.get('/setting/set', function (req, res) {
    var params = {};
    try {
        params = JSON.parse(fs.readFileSync(`${NODECO_CLIENT_DIR}/setting/nodeco.json`, 'utf8'));
    } catch (e) { }

    try {
        var json = JSON.parse(req.query.params);

        Object.keys(json).forEach(function (key) {
            params[key] = json[key];
        });

        fs.mkdirsSync(`${NODECO_CLIENT_DIR}/setting`);
        fs.writeFileSync(`${NODECO_CLIENT_DIR}/setting/nodeco.json`, JSON.stringify(params), 'utf8');
        res.json(true);
    } catch (e) {
        common.error_log(req.url);
        res.json(false);
    }
});

/**
 * Get Vendor Setting File
 * @return JSON structure or false
 */
app.get('/setting/get/vendor', function (req, res) {
    try {
        res.json(JSON.parse(fs.readFileSync(`${NODECO_CLIENT_DIR}/setting/vendor.json`, 'utf8')));
    } catch (e) {
        common.error_log(req.url);
        res.json(false);
    }
});

/**
 * Get Account Setting File
 * @return JSON structure or false
 */
app.get('/setting/get/accounts', function (req, res) {
    try {
        res.json(JSON.parse(fs.readFileSync(`${TEZOS_CLIENT_DIR}/public_key_hashs`, 'utf8')));
    } catch (e) {
        common.error_log(req.url);
        res.json(false);
    }
});

// launch server
app.listen(port);
console.log('listen on port ' + port);
