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

    var view_download = function (path, progress_path, next) {
        $('.console').text('');
        var progress = function () {
            $.getJSON(progress_path).done(function (res) {
                if (Object.keys(res).length) {
                    if (res.complete === true) {
                        $(`.n_${next}`).trigger('click');
                        toggle_view(next);
                        return;
                    } else if (res.complete === false) {
                        clearTimeout(progress);
                        toggle_view('setup_failure');
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
                toggle_view('setup_failure');
            }
        })
            .fail(function (jqxhr, textStatus, errorThrown) {
                clearTimeout(progress);
                toggle_view('setup_failure');
            });
    };

    var view_install = function (path, progress_path, next) {
        $('.console').text('');
        $.getJSON(path).done(function (res) {
            if (!res) {
                toggle_view('setup_failure');
                return;
            }
            var progress = function () {
                $.getJSON(progress_path).done(function (res) {
                    if (Object.keys(res).length) {
                        $('.console').text('[' + res.title + '] ' + res.msg);

                        switch (res.title) {
                            case "complete":
                                clearTimeout(progress);
                                $(`.n_${next}`).trigger('click');
                                toggle_view(next);
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
                                }
                                restart_progress();
                                return;

                            case "error":
                                clearTimeout(progress);
                                toggle_view('setup_failure');
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

    // ようこそ画面
    $('.n_setup_update').click(function () {
        var encoded = encodeURIComponent(JSON.stringify({
            lang: $('#language').val(),
        }));

        $.getJSON(`./set?params=${encoded}`).done(function (res) { });
        $('.language_val').text($('#language').val());
    });

    // システムアップデート ダウンロード画面
    $('.n_setup_update1').click(function () {
        view_download(
            './api/release/download?net=' + $('#network').val(),
            './api/release/download/progress',
            'setup_update2'
        );
    });

    // システムアップデート 更新画面
    $('.n_setup_update2').click(function () {
        view_install(
            './api/system/update?net=' + $('#network').val(),
            './api/system/update/progress',
            'setup_update3'
        );
    });

    // スナップショット ダウンロード画面
    $('.n_setup_update3').click(function () {
        view_download(
            './api/snapshot/download?net=' + $('#network').val(),
            './api/snapshot/download/progress',
            'setup_update4'
        );
    });

    // スナップショット インポート画面
    $('.n_setup_update4').click(function () {
        view_install(
            './api/snapshot/import?net=' + $('#network').val(),
            './api/snapshot/import/progress',
            'setup_ledger'
        );
    });

    // Ledger 設定
    $('.n_setup_ledger').click(function () {
        var encoded = encodeURIComponent(JSON.stringify({
            net: $('#network').val()
        }));

        $.getJSON(`./set?params=${encoded}`).done(function (res) { });
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