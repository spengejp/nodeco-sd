/*jshint esversion: 8 */
var view_download = function (path, progress_path, success, failure) {
    $('.console').text('');
    var progress = function () {
        $.getJSON(progress_path).done(function (res) {
            if (Object.keys(res).length) {
                if (res.complete === true) {
                    $(success).trigger('click');
                    return;
                } else if (res.complete === false) {
                    clearTimeout(progress);
                    $(failure).trigger('click');
                    $.getJSON(`/error`).then(function (error) {
                        $('.error_text').text(`[${error.id}] ${error.text}`);
                    });
                    return;
                }
                var per = floor(res.percent * 100, 2);
                $('.console').text(`${$.i18n('download_progress')}： ${res.size.transferred} / ${res.size.total} (${per} %)`);
            }
            setTimeout(progress, 500);
        })
            .fail(function (jqxhr, textStatus, errorThrown) {
                setTimeout(progress, 500);
            });
    };
    progress();

    $.getJSON(path).done(function (res) {
        if (!res) {
            clearTimeout(progress);
            $(failure).trigger('click');
            $.getJSON(`/error`).then(function (error) {
                $('.error_text').text(`[${error.id}] ${error.text}`);
            });
        }
    })
        .fail(function (jqxhr, textStatus, errorThrown) {
            clearTimeout(progress);
            $(failure).trigger('click');
            $.getJSON(`/error`).then(function (error) {
                $('.error_text').text(`[${error.id}] ${error.text}`);
            });
        });
};

var view_install = function (path, progress_path, success, failure) {
    $('.console').text('');
    $.getJSON(path).done(function (res) {
        if (!res) {
            $(failure).trigger('click');
            $.getJSON(`/error`).then(function (error) {
                $('.error_text').text(`[${error.id}] ${error.text}`);
            });
            return;
        }
        var progress = function () {
            $.getJSON(progress_path).done(function (res) {
                if (Object.keys(res).length) {
                    $('.console').text('[' + res.title + '] ' + res.msg);

                    switch (res.title) {
                        case "complete":
                            clearTimeout(progress);
                            $(success).trigger('click');
                            return;

                        case "restart":
                            clearTimeout(progress);
                            $.getJSON('./api/os/restart').done(function (res) { });
                            var restarting = false;
                            var restart_progress = function () {
                                $.getJSON('./api/server/alive')
                                    .done(function (res) {
                                        if (restarting && res.success) {
                                            setTimeout(progress, 500);
                                        } else {
                                            setTimeout(restart_progress, 5000);
                                        }
                                    })
                                    .fail(function (jqxhr, textStatus, errorThrown) {
                                        restarting = true;
                                        setTimeout(restart_progress, 5000);
                                    });
                            };
                            restart_progress();
                            return;

                        case "error":
                            clearTimeout(progress);
                            $(failure).trigger('click');
                            $.getJSON(`/error`).then(function (error) {
                                $('.error_text').text(`[${error.id}] ${error.text}`);
                            });
                            return;
                    }
                }
                setTimeout(progress, 500);
            })
                .fail(function (jqxhr, textStatus, errorThrown) {
                    setTimeout(progress, 500);
                });
        };
        progress();
    });
};

var setting = {};
var vendor = {};
var d = {};


var append_badge_li = function (elem, title, badge_class, value) {
    $(elem).append(`<li class="list-group-item d-flex justify-content-between align-items-center">
                ${title} <span class="badge ${badge_class} badge-pill">${value}</span></li>`);
};

$(document).ready(async function () {
    setting = await $.getJSON('./api/setting/get');
    vendor = await $.getJSON('./api/setting/get/vendor');
    d = await $.getJSON('./getAll');

    switch (vendor.mode) {
        case "unlimited":
            // none
            break;

        case "limited":
            $('.delegate_dest').addClass('d-none');
            break;

        case "delegate":
            $('.balance_adjust').addClass('d-none');
            $('.bakemode_hyblid').addClass('d-none');
            $('.bakemode_self').addClass('d-none');
            $('.delegate_dest').addClass('d-none');
            break;
    }

    if (setting.mode) {
        $('input[value=' + setting.mode + ']').trigger('click');
    }
    if (setting.net) {
        $('#network').val(setting.net);
    }
    if (setting.secure) {
        $('input[value=' + setting.secure + ']').trigger('click');
    }
    if (setting.lang) {
        $('#language').val(setting.lang);
    }
    if (setting.fiat) {
        $('#basefiat').val(setting.fiat);
    }



    append_badge_li('.status', $.i18n('ip_address'), '', d.ipaddr.ipv4.address);
    append_badge_li('.status', $.i18n('network'), 'badge-primary', d.network);
    append_badge_li('.status', $.i18n('baking_mode'), 'badge-primary', setting.mode);

    if (d.synced) {
        $('#submit-bake').prop('disabled', false);
        $('.sync_message').html('');
        append_badge_li('.status', $.i18n('last_updated'), '', d.cl_time);
        append_badge_li('.status', $.i18n('node_synchronization'), 'badge-success', $.i18n('properly'));
    } else {
        $('#submit-bake').prop('disabled', true);
        $('.sync_message').html(`<div class="alert alert-warning" role="alert">${$.i18n('can_be_changed_after_node_synchronization')}</div>`);
        append_badge_li('.status', $.i18n('node_synchronization'), 'badge-warning', $.i18n('synchronizing'));
    }

    if (setting.address.delegate) {
        append_badge_li('.status', $.i18n('delegate_destination'), 'badge-success', $.i18n('setting_progress'));
    } else {
        append_badge_li('.status', $.i18n('delegate_destination'), 'badge-danger', $.i18n('not_set'));
    }

    append_badge_li('.status', $.i18n('balance'), '', `Main ${tz(d.main_balance)} / Baker ${tz(d.baker_balance)}`);
    append_badge_li('.status', $.i18n('license'), 'badge-primary', vendor.mode);

    $('#balance-main').val(tzfloat(d.main_balance));
    $('#balance-baker').val(tzfloat(d.baker_balance));
    $('#balance-fee').val(0);
});

$(document).on('click', '[id=mode-hyblid]', function () {
    if (setting.address.delegate) {
        $('#addr-delegate').val(setting.address.delegate);
    } else {
        $('#addr-delegate').val(vendor.pkh);
    }
    $('#addr-delegate').prop('disabled', false);
    $('.balance_adjust').removeClass('d-none');
});

$(document).on('click', '[id=mode-self]', function () {
    $('#addr-delegate').val(setting.address.pkh);
    $('#addr-delegate').prop('disabled', true);
    $('.balance_adjust').removeClass('d-none');
});

$(document).on('click', '[id=mode-delegate]', function () {
    if (setting.address.delegate) {
        $('#addr-delegate').val(setting.address.delegate);
    } else {
        $('#addr-delegate').val(vendor.pkh);
    }
    $('.balance_adjust').addClass('d-none');
    $('#addr-delegate').prop('disabled', false);

    var balance_fee = 1;
    $('#balance-main').val((tzfloat(d.balance) - balance_fee).toFixed(6));
    $('#balance-baker').val(balance_fee.toFixed(6));
    $('#balance-fee').val(balance_fee);
});

$(document).on('keyup', '[id=balance-main]', function (e) {
    var balance_main = Number($('#balance-main').val());
    $('#balance-baker').val((tzfloat(d.balance) - balance_main).toFixed(6));
});

$(document).on('keyup', '[id=balance-fee]', function (e) {
    var balance_baker = Number($('#balance-baker').val());
    var balance_fee = Number($('#balance-fee').val());
    balance_baker = (balance_baker <= balance_fee) ? balance_fee : balance_baker;
    $('#balance-baker').val(balance_baker.toFixed(6));
    $('#balance-main').val(round(tzfloat(d.balance) - balance_baker, 6).toFixed(6));
});

$(document).on('click', '[id=submit-max-balance]', function () {
    var balance_fee = Number($('#balance-fee').val());
    $('#balance-main').val((tzfloat(d.balance) - balance_fee).toFixed(6));
    $('#balance-baker').val(balance_fee.toFixed(6));
    $('#balance-fee').val(balance_fee);
});

$(document).on('click', '[id=submit-auto-balance]', function () {
    var trans_balance = BigInt(d.balance) - (BigInt(d.balance) % BigInt(d.tokens_per_roll)) + BigInt(1000000);
    var less_balance = BigInt(d.balance) - trans_balance;

    $('#balance-main').val(Number(tzfloat(less_balance.toString())).toFixed(6));
    $('#balance-baker').val(Number(tzfloat(trans_balance.toString())).toFixed(6));
    $('#balance-fee').val(1);
});

// ベーカー設定
$(document).on('click', '[id=submit-bake]', function () {
    $('[class^=modal-wallet-]').addClass('d-none');
    $('[class^=modal-wallet-1]').removeClass('d-none');

    var mode = $('input[name=mode-options]:checked').val();

    if (mode === 'delegate') {
        $('.modal-wallet-1_ledger').addClass('d-none');
        $('.modal-wallet-1_wallet').addClass('d-none');
        $('.modal-wallet-1').addClass('d-none');
        $('.modal-wallet-4').removeClass('d-none');
    } else {
        switch (setting.address.device) {
            case "nodeco":
                $('.modal-wallet-1_ledger').addClass('d-none');
                $('.modal-wallet-1_wallet').removeClass('d-none');
                break;

            case "ledger":
                $('.modal-wallet-1_ledger').removeClass('d-none');
                $('.modal-wallet-1_wallet').addClass('d-none');
                $('input[name=ledger-crypt]').val(setting.address.crypt);
                $('input[name=ledger-path]').val(setting.address.path + '/1h');
                break;
        }
    }

    $('#modal-wallet').modal({
        backdrop: 'static',
        show: true
    });
});

var keydata = {};

$(document).on('click', '[id^=n-wallet-3]', function () {
    var mode = $('input[name=mode-options]:checked').val();
    var secure = $('input[name=secure-options]:checked').val();

    (async () => {
        var ret = false;

        var suffix = '';
        switch (setting.address.device) {
            case "ledger":
                suffix +=
                    'path=' + $('input[name=ledger-path]').val() +
                    '&crypt=' + $('input[name=ledger-crypt]').val();
                break;

            case "nodeco":
                if ($('input[name=noledger-pass]').val() !== $('input[name=noledger-repass]').val()) {
                    $('#n-wallet-0').trigger('click');
                    $('.error_text').text('[Error] Invalid Password.');
                }
                suffix +=
                    'pass=' + $('input[name=noledger-pass]').val() +
                    '&crypt=ed25519';
                break;
        }

        switch (mode) {
            case "hyblid":
            case "self":
                ret = await $.getJSON(`/api/init/baker/create?${suffix}`);
                break;
        }

        if (ret) {
            $('#n-wallet-4').trigger('click');
            keydata = ret;
        } else {
            $('#n-wallet-0').trigger('click');
            var error = await $.getJSON(`/error`);
            $('.error_text').text(`[${error.id}] ${error.text}`);
        }
    })();
});

$(document).on('click', '[id^=n-wallet-5]', function () {
    var mode = $('input[name=mode-options]:checked').val();
    var secure = $('input[name=secure-options]:checked').val();
    var delegate = (mode === 'self') ? keydata.pkh : $('[id=addr-delegate]').val();

    var a = setting.address.name;
    var a_qty = $('#balance-main').val();
    var b = 'baker';
    var b_qty = $('#balance-baker').val();
    var fee = $('#balance-fee').val();

    (async () => {
        var ret = false;
        var error;

        var key_encoded = encodeURIComponent(JSON.stringify(keydata));
        ret = await $.getJSON(`/api/transfer/swap?a=${a}&a_qty=${a_qty}&b=${b}&b_qty=${b_qty}&fee=${fee}`);
        if (!ret) {
            $('#n-wallet-0').trigger('click');
            error = await $.getJSON(`/error`);
            $('.error_text').text(`[${error.id}] ${error.text}`);
            return;
        }

        switch (mode) {
            case "hyblid":
            case "self":
                ret = await $.getJSON(`/api/init/baker/register`);
                if (!ret) {
                    $('#n-wallet-0').trigger('click');
                    error = await $.getJSON(`/error`);
                    $('.error_text').text(`[${error.id}] ${error.text}`);
                    return;
                }
                break;
        }

        ret = await $.getJSON(`/api/init/delegate?src=${setting.address.pkh}&dest=${delegate}`);
        if (ret) {
            var address = setting.address;
            address.delegate = delegate;
            $('#n-wallet-9').trigger('click');
            var encoded = encodeURIComponent(JSON.stringify({
                mode: mode,
                secure: secure,
                address: address
            }));
            $.getJSON('./set?params=' + encoded).done(function (res) { });
        } else {
            $('#n-wallet-0').trigger('click');
            error = await $.getJSON(`/error`);
            $('.error_text').text(`[${error.id}] ${error.text}`);
        }
    })();
});

$(document).on('click', '[id^=n-wallet-]', function () {
    var next_num = $(this).attr('id').replace(/^n-wallet-/, '');
    $('[class^=modal-wallet-]').addClass('d-none');
    $('[class^=modal-wallet-' + next_num + ']').removeClass('d-none');
});

// ノード設定
$(document).on('click', '[id=submit-node]', function () {
    // セキュアノード
    var encoded = encodeURIComponent(JSON.stringify({
        secure: $('#secure').val()
    }));

    $.getJSON('./set?params=' + encoded).done(function (res) {
        alert($.i18n('updated'));
        location.reload();
    });
});

// 表示設定
$(document).on('click', '[id=submit-view]', function () {
    // 表示言語、基軸通貨
    var encoded = encodeURIComponent(JSON.stringify({
        lang: $('#language').val(),
        fiat: $('#basefiat').val()
    }));

    $.getJSON('./set?params=' + encoded).done(function (res) {
        alert($.i18n('updated'));
        location.reload();
    });
});

// ソフトウェア更新
$(document).on('click', '[id=submit-initial]', function () {
    var encoded = encodeURIComponent(JSON.stringify({
        lang: "",
    }));
    $.getJSON('./set?params=' + encoded).done(function (res) {
        window.location.href = './setup';
    });
});

// ソフトウェア更新
$(document).on('click', '[id=submit-update]', function () {
    $('[class^=modal-update-]').addClass('d-none');
    $('[class^=modal-update-1]').removeClass('d-none');

    $('#modal-update').modal({
        backdrop: 'static',
        show: true
    });
});

// システムアップデート ダウンロード画面
$(document).on('click', '[id=n-update-2]', function () {
    view_download(
        './api/release/download?net=' + $('#network').val(),
        './api/release/download/progress',
        '#n-update-3',
        '#n-update-0'
    );
});

// システムアップデート アップデート画面
$(document).on('click', '[id=n-update-3]', function () {
    view_install(
        './api/system/update?net=' + $('#network').val(),
        './api/system/update/progress',
        '#n-update-4',
        '#n-update-0'
    );
});

// スナップショット ダウンロード画面
$(document).on('click', '[id=n-update-4]', function () {
    view_download(
        './api/snapshot/download?net=' + $('#network').val(),
        './api/snapshot/download/progress?net=' + $('#network').val(),
        '#n-update-5',
        '#n-update-0'
    );
});

// スナップショット インポート画面
$(document).on('click', '[id=n-update-5]', function () {
    view_install(
        './api/snapshot/import?net=' + $('#network').val(),
        './api/snapshot/import/progress',
        '#n-update-9',
        '#n-update-0'
    );
});

// ソフトウェア更新 イベント監視
$(document).on('click', '[id^=n-update-]', function () {
    var next_num = $(this).attr('id').replace(/^n-update-/, '');
    $('[class^=modal-update-]').addClass('d-none');
    $('[class^=modal-update-' + next_num + ']').removeClass('d-none');
});

$(window).on('load', function () {
    $('body').css({
        visibility: "visible"
    });
});