/*jshint esversion: 8 */
$(function () {
    var setting = {};

    $.getJSON('./api/setting/get').done(function (data) {
        setting = data;

        if (setting.net) {
            $('#btn_welcome').removeClass('n_setup_update btn btn-primary');
            $('#btn_welcome').addClass('n_setup_ledger btn btn-primary');
            $('#network').val(setting.net);
            $('.network_val').text(setting.net);
        }

        if (setting.lang) {
            $('#language').val(setting.lang);
            var classes = $('#btn_welcome').attr('class').split(' ');
            toggle_view(classes[0].replace('n_', ''));
        } else {
            $('#btn_welcome').removeClass('n_setup_update n_setup_ledger');
            $('#btn_welcome').on('click', function () {
                location.reload(true);
            });

            $('#language').on('change', function () {
                var encoded = encodeURIComponent(JSON.stringify({
                    lang: $('#language').val(),
                }));
                $.getJSON(`./set?params=${encoded}`).done(function (res) { });
            });
        }
    });

    // ようこそ画面
    $('.n_setup_update').click(function () {
        var encoded = encodeURIComponent(JSON.stringify({
            lang: $('#language').val(),
        }));

        $.getJSON(`./set?params=${encoded}`).done(function (res) { });
        $('.language_val').text($('#language').val());
    });

    // Ledger 設定
    $('.n_setup_ledger').click(function () {
        var encoded = encodeURIComponent(JSON.stringify({
            net: $('#network').val()
        }));

        $.getJSON(`./set?params=${encoded}`).done(function (res) {
            $.getJSON(`./api/node/restart`).done(function (res) { });
            $.getJSON(`./api/baker/restart`).done(function (res) { });
        });
        $('.network_val').text($('#network').val());
    });

    // Ledger 紐付画面
    $('.n_setup_initwallet').click(function () {
        var ledger = $('input[name=ledger-options]:checked').val();
        var name = $('#network').val() + '_' + $('input[name=ledger-name]').val();
        var crypt = 'ed25519';
        var path = '/0h/0h';

        switch (ledger) {
            case "nodeco":
                crypt = 'ed25519';
                path = '/0h/0h/1h';
                break;
            case "galleon":
                crypt = 'ed25519';
                path = '/0h/0h/0h';
                break;
            case "tezbox":
                crypt = 'ed25519';
                path = '/0h/0h';
                break;
            case "others":
                crypt = $('input[name=ledger-crypt]').val();
                path = $('input[name=ledger-path]').val();
                break;
        }

        $.getJSON(`./api/init/ledger?name=${name}&crypt=${crypt}&path=${path}`).done(function (address) {
            if (address === false) {
                toggle_view('setup_failure');
                return;
            }

            var encoded = encodeURIComponent(JSON.stringify({
                address: address,
                mode: "delegate"
            }));

            $.getJSON(`./set?params=${encoded}`).done(function (res) {
                if (res) {
                    toggle_view('setup_complete');
                } else {
                    toggle_view('setup_failure');
                }
            });
        });
    });

    // Password 生成画面
    $('.n_setup_generate').click(function () {
        var name = $('input[name=noledger-name]').val();
        var pass = $('input[name=noledger-pass]').val();
        var repass = $('input[name=noledger-repass]').val();

        if (pass !== repass) {
            toggle_view('setup_failure');
            return;
        }

        $.getJSON(`./api/init/account/create?name=${name}&pass=${pass}`).done(function (res) {
            if (!res) {
                toggle_view('setup_failure');
            }

            var encoded = encodeURIComponent(JSON.stringify({
                address: address,
                mode: "delegate"
            }));

            var json = JSON.stringify(res);
            var downLoadLink = document.createElement('a');
            downLoadLink.download = res.pkh + '.json';
            downLoadLink.href = URL.createObjectURL(new Blob([json], {
                type: 'text.plain'
            }));
            downLoadLink.dataset.downloadurl = ['text/plain', downLoadLink.download, downLoadLink.href]
                .join(':');
            downLoadLink.click();

            $('.nodeco-wallet').removeClass('d-none');
            $('.nodeco-wallet .mnemonic').html(res.mnemonic);
            toggle_view('setup_complete');
        });
    });

    var toggle_view = function (next) {
        var nspl = next.split('_');
        var shows = nspl[0];

        $("[class^='s_" + shows + "']").addClass('d-none');

        for (var i = 1; i <= nspl.length; i++) {
            $(".s_" + shows).removeClass('d-none');
            shows = shows + "_" + nspl[i];
        }
    }

    $("[class^='n_']").click(function () {
        var next = $(this).attr('class');
        next = next.replace(/^n_([^\s]+)\s.*/, '$1');
        toggle_view(next);
    });
});