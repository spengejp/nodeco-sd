/*jshint esversion: 8 */
var moment = require('moment');
var common = require('./common');
var store = require('./store');

async function update() {
    var res = await common.api('/node/active');

    if (!res || !res.active) {
        store.set('error', 'node_unactive');
        return;
    } else {
        store.set('error', '');
    }

    var setting = await common.api('/setting/get');
    if (!setting.address) {
        store.set('address', false);
        return;
    }

    store.set('lang', setting.lang);

    store.set('fiat', setting.fiat);
    store.set('address', setting.address);

    var balance = await common.api('/rpc/balance?dest=' + setting.address.pkh);
    if (balance !== false) {
        store.set('main_balance', String(balance));
        store.set('main_frozen', "0");
        store.set('main_staking', "0");
        store.set('main_useable_per', "100");
    }

    var baker_balance = await common.api('/rpc/balance?dest=baker');
    if (baker_balance !== false) {
        store.set('baker_balance', String(baker_balance));
        store.set('baker_frozen', "0");
        store.set('baker_staking', "0");
        store.set('baker_useable_per', "100");
    }

    var delegates = await common.api('/rpc/delegates?dest=' + setting.address.pkh);
    if (delegates.staking_balance !== undefined &&
        delegates.delegated_balance !== undefined &&
        delegates.frozen_balance !== undefined) {
        store.set('main_balance', (BigInt(delegates.staking_balance) - BigInt(delegates.delegated_balance)).toString());
        store.set('main_frozen', String(delegates.frozen_balance));
        store.set('main_staking', String(delegates.staking_balance));
        store.set('main_useable_per', (Number(store.get('balance')) > 0) ?
            common.floor(1 - Number(store.get('main_frozen')) / Number(store.get('main_balance')), 3) * 100 : "0");
    }

    store.set('balance', store.get('main_balance'));
    store.set('frozen', store.get('main_frozen'));
    store.set('staking', store.get('main_staking'));
    store.set('useable_per', store.get('main_useable_per'));

    var baker_delegates = await common.api('/rpc/delegates?dest=baker');
    if (baker_delegates.staking_balance !== undefined &&
        baker_delegates.delegated_balance !== undefined &&
        baker_delegates.frozen_balance !== undefined) {
        store.set('baker_balance', (BigInt(baker_delegates.staking_balance) - BigInt(baker_delegates.delegated_balance)).toString());
        store.set('baker_frozen', String(baker_delegates.frozen_balance));
        store.set('baker_staking', String(baker_delegates.staking_balance));
        store.set('baker_useable_per', (Number(store.get('baker_balance')) > 0) ?
            common.floor(1 - Number(store.get('baker_frozen')) / Number(store.get('baker_balance')), 3) * 100 : "0");
    }

    if (store.get('baker_balance')) {
        store.set('balance', (BigInt(store.get('main_balance')) + BigInt(store.get('baker_balance'))).toString());
        store.set('frozen', (BigInt(store.get('main_frozen')) + BigInt(store.get('baker_frozen'))).toString());
        store.set('staking', (BigInt(store.get('main_staking')) + BigInt(store.get('baker_staking'))).toString());
        store.set('useable_per', (Number(store.get('main_useable_per')) * Number(store.get('main_balance')) / Number(store.get('balance')) +
            Number(store.get('baker_useable_per')) * Number(store.get('baker_balance')) / Number(store.get('balance'))).toString());
    }

    var cl_timestamp = await common.api('/client/timestamp');
    if (cl_timestamp) {
        store.set('cl_time', cl_timestamp.time);
    }

    var os_timestamp = await common.api('/os/timestamp');
    if (os_timestamp) {
        store.set('os_time', os_timestamp.time);
    }

    var ipaddr = await common.api('/os/ipaddr');
    if (ipaddr) {
        store.set('ipaddr', ipaddr);
    }

    var synced = (moment(os_timestamp.time).diff(cl_timestamp.time) < 120000);
    store.set('synced', synced);

    var network = await common.api('/node/network');
    if (network) {
        store.set('network', network);
    }

    var head = await common.api('/rpc/head');
    var constants = await common.api('/rpc/constants');

    if (head && constants) {
        store.set('level', head.metadata.level.level);
        store.set('cycle', head.metadata.level.cycle);
        store.set('blocks_per_cycle', constants.blocks_per_cycle);
        store.set('cycle_begin', store.get('cycle') * store.get('blocks_per_cycle') + 1);
        store.set('cycle_end', store.get('cycle') * store.get('blocks_per_cycle') + store.get('blocks_per_cycle'));
        store.set('cycle_per', (store.get('level') - store.get('cycle_begin')) / (store.get('cycle_end') - store.get('cycle_begin')) * 100);
        store.set('blocks_per_voting_period', constants.blocks_per_voting_period);
        store.set('tokens_per_roll', constants.tokens_per_roll);
    }

    if (store.get('balance') !== false && store.get('staking') !== false) {
        var price = await common.api('/coingecko/price?coin=' + store.get('fiat'));
        if (price) {
            store.set('price', price[store.get('fiat')]);
        }

        var tip = await common.api('/tzstats/tip');
        if (tip) {
            store.set('total_staking', tip.supply.staking);
            store.set('supply', tip.supply.total);
            store.set('staking_per', common.floor(store.get('total_staking') / store.get('supply'), 1) * 100);
            store.set('od_balance', store.get('staking_per') / 8.25 * store.get('baker_balance'));
            store.set('od_per', store.get('staking') / store.get('od_balance') * 100);
        }
    }

    if (store.get('address') === false) {
        setTimeout(index_loop, 30000);
        return;
    }

    var account = await common.api('/tzstats/account?hash=' + store.get('address').pkh);
    if (account) {
        store.set('next_bake_level', account.next_bake_height);
        store.set('next_endorse_level', account.next_endorse_height);
    }

    var i;
    var ops = await common.api_loop('/db/operations?hash=' + store.get('address').pkh);
    if (ops) {
        var rewards = {};
        for (i = 0; i < ops.length; i++) {
            if (ops[i].change_kind !== 'freezerrewards' || ops[i].change_mutez < 0) {
                continue;
            }
            var date = moment(ops[i].timestamp).format('YYYY-MM-DD');
            if (rewards[date] === undefined) {
                rewards[date] = 0;
            }
            rewards[date] += ops[i].change_mutez;
        }
        store.set('rewards', rewards);
    }

    var start = moment().subtract(30, 'days').format('YYYY-MM-DD');
    var end = moment().format('YYYY-MM-DD');
    var prices = await common.api('/db/price?coin=' + store.get('fiat') + '&start=' + start + '&end=' + end);
    if (prices) {
        var _prices = {};
        for (i = 0; i < prices.length; i++) {
            var key = moment(prices[i].date).format('YYYY-MM-DD');
            _prices[key] = prices[i][store.get('fiat')];
        }
        store.set('prices', _prices);
    }
}

function update_loop() {
    update();
    setTimeout(update_loop, 30000);
}

update_loop();

module.exports.update = update;