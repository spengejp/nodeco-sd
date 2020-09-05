/*jshint esversion: 8 */
$(function () {
    var balanceChart = new Chart($('#balance-chart'), lineConfig);

    $.getJSON('./api/setting/get').done(function (res) {
        if (!res.address) {
            window.location.href = '/setup';
        }
    });

    var main_loop = function () {
        if (!d) {
            setTimeout(main_loop, 100);
            return;
        }

        if (d.error == 'node_unactive') {
            $('.motd-message').html(
                `<div class="alert alert-danger" role="alert">
                ${$.i18n('node_not_running')}
              </div>`);
        }
        if (d.address) {
            $('.watch_pkh').text(d.address.pkh);
            $('.watch_name').text(d.address.name);
        }

        $('.cl_time').text(d.cl_time);
        $('.os_time').text(d.os_time);
        if (d.synced) {
            $('.synced').html('<span class="badge badge-success">' + $.i18n('properly') + '</span>');

            $.getJSON('./api/setting/get').done(function (res) {
                if (!d.address.delegate) {
                    $('.motd-message').html(
                        `<div class="alert alert-warning" role="alert">
                        ${$.i18n('delegate_destination_is_not_setting')}${$.i18n('please_set_from_setting_page')}
                  </div>`);
                }
            });

        } else {
            $('.synced').html(`<span class="badge badge-warning">${$.i18n('synchronizing')}</span>`);
        }
        $('.network').html('<span class="badge badge-primary">' + d.network + '</span>');
        $('.cur_block').text(d.level);
        $('.cur_cycle').text(d.cycle);
        $('.cur_cycle_begin').text(d.cycle_begin);
        $('.cur_cycle_end').text(d.cycle_end);
        $('.cur_cycle_per').css('width', d.cycle_per + '%');
        $('.cur_cycle_per').attr('aria-valuenow', d.cycle_per);

        var next_bake_remain;
        if (d.next_bake_level != 0) {
            $('.next_bake_level').text(d.next_bake_level);
            next_bake_remain = d.next_bake_level - d.level;
        }
        if (isNaN(next_bake_remain) === false) {
            $('.next_bake_remain').text(separate(next_bake_remain));
        }
        $('.next_endorse_level').text(d.next_endorse_level);
        var next_endorse_remain = d.next_endorse_level - d.level;
        if (isNaN(next_endorse_remain) === false) {
            $('.next_endorse_remain').text(separate(next_endorse_remain));
        }

        $('.total_balance').text(tz(d.balance));
        $('.frozen_balance').text(tz(d.frozen));
        $('.staking_balance').text(tz(d.staking));
        $('.useable_balance_per').css('width', d.useable_per + '%');
        $('.useable_balance_per').css('aria-valuenow', d.useable_per + '%');
        $('.useable_balance_per_txt').text(floor(d.useable_per, 1) + '%');

        $('.over_delegate_per').css('width', d.od_per + '%');
        $('.over_delegate_per').css('aria-valuenow', d.od_per + '%');
        $('.over_delegate_per_txt').text(floor(d.od_per, 1) + '%');
        $('.over_delegate_balance').text(tz(d.od_balance));

        if (d.price) {
            $('.xtz_price').text(d.price + ' ' + d.fiat.toUpperCase());
            $('.total_balance_fiat').text(' / ' + tzfiat(d.balance, d.price, d.fiat));
            $('.staking_balance_fiat').text(' / ' + tzfiat(d.staking, d.price, d.fiat));
            $('.xtz_block').show();
        }

        $.getJSON('./get?key=rewards').done(function () {
            if (!d.price) {
                return;
            }
            var _d = {
                days: [],
                xtz: [],
                fiat: []
            };

            var balance = d.balance;
            var price = d.price;
            for (var i = 0; i <= 30; i++) {
                var dayfmt = moment().subtract(i, 'days').format('YYYY-MM-DD');
                balance = (d.rewards[dayfmt] === undefined) ? balance : balance - d.rewards[dayfmt];
                price = (i === 0) ? d.price : d.prices[dayfmt];
                _d.days.push(dayfmt);
                _d.xtz.push(balance / 1000000);
                _d.fiat.push(balance / 1000000 * price);
            }

            lineConfig.data.labels = _d.days;
            lineConfig.data.datasets[0].data = _d.xtz;
            lineConfig.data.datasets[1].data = _d.fiat;

            var dp_xtz = floor((_d.xtz[0] / _d.xtz[_d.xtz.length - 1] - 1) * 100, 1);
            dp_xtz = isNaN(dp_xtz) ? 0 : dp_xtz;
            var dp_fiat = floor((_d.fiat[0] / _d.fiat[_d.fiat.length - 1] - 1) * 100, 1);
            dp_fiat = isNaN(dp_fiat) ? 0 : dp_fiat;

            $('.xtz_diff').html('<i class="fa fa-square text-primary"></i> ' + tz(d.balance));
            var dp_text = (_d.xtz[0] >= _d.xtz[_d.xtz.length - 1]) ?
                '<span class="text-success"><i class="fa fa-arrow-up"></i> ' + dp_xtz + '%</span>' :
                '<span class="text-danger"><i class="fa fa-arrow-down"></i> ' + dp_xtz + '%</span>';
            $('.xtz_diff_per').html(dp_text);

            var tz_fiat = tzfiat(d.balance, d.price, d.fiat);
            $('.fiat_diff').html('<i class="fa fa-square text-info"></i> ' + tz_fiat);
            dp_text = (_d.fiat[0] >= _d.fiat[_d.fiat.length - 1]) ?
                '<span class="text-success"><i class="fa fa-arrow-up"></i> ' + dp_fiat + '%</span>' :
                '<span class="text-danger"><i class="fa fa-arrow-down"></i> ' + dp_fiat + '%</span>';
            $('.fiat_diff_per').html(dp_text);

            balanceChart.update();
        });

        setTimeout(main_loop, 30000);
    };
    main_loop();
});