/*jshint esversion: 8 */
$(function () {
    var count = 5;
    var account = null;
    var plan_num = null;
    var history_num = null;

    var get_nums = function (page) {
        $.getJSON('./api/db/plan/count?hash=' + account + '&net=' + d.network).done(function (res) {
            plan_num = res;
        });

        $.getJSON('./api/db/history/count?hash=' + account + '&net=' + d.network).done(function (res) {
            history_num = res;
        });
    };

    var get_plan = function (page) {
        var index = page * count;

        $.getJSON('./api/db/plan?hash=' + account + '&index=' + index + '&count=5' + '&net=' + d.network).done(function (res) {
            if (!res) {
                return;
            }
            res = res.reverse();
            var table = `
            <table class="table table-bordered table-hover bg-light mb-3" style="font-size: 0.8em;">
              <tr role="row">
                <th>${$.i18n('level')}(Cycle)</th>
                <th>${$.i18n('time')}</th>
                <th>${$.i18n('reward')} (${$.i18n('deposit')})</th>
                <th>${$.i18n('priority')}</th>
              </tr>`;

            for (var i = 0; i < res.length; i++) {
                table += `
              <tr class="level_${res[i].level} success_${res[i].success}">
                <td>${res[i].level}(Cycle ${res[i].cycle})</td>
                <td>${res[i].timestamp}(${separate(res[i].level - d.level)}${$.i18n('minutes_later')})</td>
                <td>`;
                if (res[i].kind == "baking") {
                    table += `<i class="fa fa-cube fa-fw"></i> `;
                } else {
                    table += `<i class="fa fa-check-circle fa-fw"></i> `;
                }
                table += `${tz(res[i].reward)} (${tz(res[i].freeze)})</td><td>`;
                if (res[i].priority === null) {
                    table += "-";
                } else {
                    table += res[i].priority;
                }
                table += `</td></tr>\n`;
            }
            table += `</table>\n`;

            $('.data_rights').html(table);

            get_plan_pages(page);
        });
    };

    var get_plan_pages = function (page) {
        var total_page = Math.floor(plan_num / count);

        var next = (page < total_page) ? page + 1 : page;
        var prev = (page > 0) ? page - 1 : page;

        var pagenator = '<li class="page-item"><a href="#title_rights" id="rights_' +
            next + '" class="page-link">«</a></li>';

        for (var i = page + 2; i >= page - 2; i--) {
            if (i < 0 || i > total_page) {
                continue;
            }

            var active = (i === page) ? ' active' : '';
            pagenator +=
                '<li class="page-item' + active + '">' +
                '<a href="#title_rights" id="rights_' + i + '" class="page-link">' + (i + 1) + '</a>' +
                '</li>';
        }

        pagenator += '<li class="page-item"><a href="#title_rights" id="rights_' +
            prev + '" class="page-link">»</a></li>';

        $('.data_rights_pages').html(pagenator);
        enable_pagenator_rights();
    };

    var get_history = function (page) {
        var index = page * count;

        $.getJSON('./api/db/history?hash=' + account + '&index=' + index + '&count=5' + '&net=' + d.network).done(function (res) {
            var table =
                `<table class="table table-bordered table-hover bg-light mb-3" style="font-size: 0.8em;">
                <tr role="row">
                <th>${$.i18n('level')} (Cycle)</th>
                <th>${$.i18n('time')}</th>
                <th>${$.i18n('reward')} (${$.i18n('deposit')})</th>
                <th>${$.i18n('priority')}</th>
                </tr>`;
            for (var i = 0; i < res.length; i++) {
                table += `<tr class="level_${res[i].level} success_${res[i].success}">
                    <td>${res[i].level}(Cycle ${res[i].cycle})</td>
                    <td>${res[i].timestamp}(${separate(d.level - res[i].level)} ${$.i18n('minutes_before')})</td>
                    <td>`;
                if (res[i].kind == "bake") {
                    table += "<i class=\"fa fa-cube fa-fw\"></i> ";
                } else {
                    table += "<i class=\"fa fa-check-circle fa-fw\"></i> ";
                }
                table += `${tz(res[i].reward)} (${tz(res[i].freeze)})</td>
                    <td>${res[i].priority}</td>
                    </tr>`;
            }

            table += "</table>\n";
            $('.data_history').html(table);

            get_history_pages(page);
        });
    };

    var get_history_pages = function (page) {
        var total_page = Math.floor(history_num / count);

        var next = (page < total_page) ? page + 1 : page;
        var prev = (page > 0) ? page - 1 : page;

        var pagenator = '<li class="page-item"><a href="#title_history" id="history_' +
            prev + '" class="page-link">«</a></li>';

        for (var i = page - 2; i <= page + 2; i++) {
            if (i < 0 || i > total_page) {
                continue;
            }

            var active = (i === page) ? ' active' : '';
            pagenator +=
                '<li class="page-item' + active + '">' +
                '<a href="#title_history" id="history_' + i + '" class="page-link">' + (i + 1) + '</a>' +
                '</li>';
        }

        pagenator += '<li class="page-item"><a href="#title_history" id="history_' +
            next + '" class="page-link">»</a></li>';

        $('.data_history_pages').html(pagenator);
        enable_pagenator_history();
    };

    var enable_pagenator_rights = function () {
        $(document).on('click', '[id^=rights_]', function () {
            $(document).off('click', '[id^=rights_]');
            var page = parseInt($(this).attr("id").replace(/rights_/, ''));
            get_plan(page);
        });
    };

    var enable_pagenator_history = function () {
        $(document).on('click', '[id^=history_]', function () {
            $(document).off('click', '[id^=history_]');
            var page = parseInt($(this).attr("id").replace(/history_/, ''));
            get_history(page);
        });
    };

    var load = function () {
        if (!d) {
            setTimeout(load, 100);
            return;
        }
        account = d.address.pkh;
        get_nums(0);
        get_plan(0);
        get_history(0);
    };
    load();
});