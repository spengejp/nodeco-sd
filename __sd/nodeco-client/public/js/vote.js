/*jshint esversion: 8 */
$(function () {
    var vendor = {};

    $(document).ready(async function () {
        vendor = await $.getJSON('./api/setting/get/vendor');
    });

    var proposal = function (data) {
        proposalsChart(data.proposals,
            '#vote-proposal-chart',
            function (data) {
                var html = '';
                if (data.length === 0) {
                    $('.submit-view').html(`<div>${$.i18n('no_suggestions_yet')}</div>`);
                    $('#vote-proposal-chart').addClass('d-none');
                    $('#vote-proposal-chart-none').removeClass('d-none');
                    /*
                    var context = $('#vote-proposal-chart').get(0).getContext('2d');
                    var img = new Image();
                    img.src = './img/not_found.png';
                    img.addEventListener('load', function () {
                      var c = $('#vote-proposal-chart');
                      context.drawImage(img, 0, 0, Math.floor(c.width()), Math.floor(c.width() / 2));
      
                      $(window).resize(function () {
                        c = $('#vote-proposal-chart');
                        img.scale()
                        context.drawImage(img, 0, 0, Math.floor(c.width()), Math.floor(c.width() / 2));
                      });
                    });*/
                } else {
                    $('#vote-proposal-chart').removeClass('d-none');
                    $('#vote-proposal-chart-none').addClass('d-none');
                    for (var i = 0; i < data.length; i++) {
                        html += `
              <table class="table table-bordered table-hover table_border_radius mb-3">
                <tr role="row">
                  <th>${$.i18n('hash')}</th>
                  <th>${$.i18n('voted')}</th>
                </tr>
                <tr>
                  <td style="max-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${data[i][0]}</td>
                  <td class="text-right" style="width: 200px;">
                    <span class="mr-2">${data[i][1]} Votes</span>
                    <button type="button" id="submit-${data[i][0]}" class="btn-xs btn-primary pull-right">${$.i18n('vote')}</button>
                  </td>
                </tr>
              </table>
              `;
                    }
                    $('.submit-view').html(html);
                }
            });

        $('.vote_period').text(data.period);
        $('.vote_remain').text(separate(data.remain));
        $('.vote_remain_day').text(floor(data.remain / 60 / 24, 2));

        $('.cur_block').text(d.level);
        $('.cur_cycle').text(d.cycle);

        var vote_begin = d.level - d.blocks_per_voting_period + Number(data.remain);
        var vote_end = vote_begin + d.blocks_per_voting_period;
        var vote_per = (d.level - vote_begin) / (vote_end - vote_begin) * 100;

        $('.cur_vote_begin').text(vote_begin);
        $('.cur_vote_end').text(vote_end);
        $('.cur_vote_per').css('width', vote_per + '%');
        $('.cur_vote_per').attr('aria-valuenow', vote_per);
    };

    var exploration = function (data) {
        ballotsChart(data.ballots,
            '#vote-exploration-chart',
            function (data) {
                var html = `
            <div>
            <button type="button" class="btn btn-lg ml-2 pl-3 pr-3" style="color: white; background-color: ${window.chartColors.green};" onmouseover="this.style.opacity='0.8'" onmouseout="this.style.opacity='1'" id="submit-yay">yay!</button>
            <button type="button" class="btn btn-lg ml-2 pl-3 pr-3" style="color: white; background-color: ${window.chartColors.red};" onmouseover="this.style.opacity='0.8'" onmouseout="this.style.opacity='1'" id="submit-nay">nay !</button>
            <button type="button" class="btn btn-lg ml-2 pl-3 pr-3" style="background-color: ${window.chartColors.grey};" onmouseover="this.style.opacity='0.8'" onmouseout="this.style.opacity='1'" id="submit-pass">pass !</button>
            </div>
            `;
                $('.submit-view').html(html);
            }
        );

        $('.vote_period').text(data.period);
        $('.vote_remain').text(separate(data.remain));
        $('.vote_remain_day').text(floor(data.remain / 60 / 24, 2));

        getAll().done(function (d) {
            $('.cur_block').text(d.level);
            $('.cur_cycle').text(d.cycle);

            var vote_begin = d.level - d.blocks_per_voting_period + Number(data.remain);
            var vote_end = vote_begin + d.blocks_per_voting_period;
            var vote_per = (d.level - vote_begin) / (vote_end - vote_begin) * 100;

            $('.cur_vote_begin').text(vote_begin);
            $('.cur_vote_end').text(vote_end);
            $('.cur_vote_per').css('width', vote_per + '%');
            $('.cur_vote_per').attr('aria-valuenow', vote_per);
        });

        var quorum_total = 0;
        var majority_total = 0;
        for (let key in data.ballots) {
            quorum_total += data.ballots[key];
            if (key != 'pass') {
                majority_total += data.ballots[key];
            }
        }

        var yay_per = floor((1 - data.ballots.nay / data.ballots.yay) * 100, 2) + '%';
        var majority = floor(data.supermajority / data.favor * 100, 0) + '%';

        $('.vote_participation_per').text(data.participation);
        $('.vote_quorum_per').text(data.quorum);
        if (parseFloat(data.participation) >= parseFloat(data.quorum)) {
            $('.vote_quorum_reached').text('>');
            $('.vote_quorum').addClass('text-success');
        } else {
            $('.vote_quorum_reached').text('<');
            $('.vote_quorum').addClass('text-danger');
        }

        $('.vote_yay_per').text(yay_per);
        $('.vote_majority_per').text(majority);
        if (parseFloat(yay_per) >= parseFloat(majority)) {
            $('.vote_majority_reached').text('>');
            $('.vote_majority').addClass('text-success');
        } else {
            $('.vote_majority_reached').text('<');
            $('.vote_majority').addClass('text-danger');
        }

        var quorum_yay_per = floor(data.ballots.yay / quorum_total * parseFloat(data.participation), 2);
        var quorum_nay_per = floor(data.ballots.nay / quorum_total * parseFloat(data.participation), 2);
        var quorum_pass_per = floor(data.ballots.pass / quorum_total * parseFloat(data.participation), 2);

        var majority_yay_per = floor(data.ballots.yay / majority_total * 100, 2);
        var majority_nay_per = floor(data.ballots.nay / majority_total * 100, 2);

        $('.progress-quorum').append(
            `<div class="progress-bar" role="progressbar"
            style="width: ${quorum_yay_per}%; background-color: ${window.chartColors.green};"
            aria-valuenow="${quorum_yay_per}" aria-valuemin="0" aria-valuemax="100"></div>`
        );
        $('.progress-quorum').append(
            `<div class="progress-bar" role="progressbar"
            style="width: ${quorum_nay_per}%; background-color: ${window.chartColors.red};"
            aria-valuenow="${quorum_nay_per}" aria-valuemin="0" aria-valuemax="100"></div>`
        );
        $('.progress-quorum').append(
            `<div class="progress-bar" role="progressbar"
            style="width: ${quorum_pass_per}%; background-color: ${window.chartColors.grey};"
            aria-valuenow="${quorum_pass_per}" aria-valuemin="0" aria-valuemax="100"></div>`
        );

        $('.progress-quorum-boarder').css('width', '100%');
        $('.progress-quorum-boarder').append(
            `<span style="font-size: 0.6em; padding-left: ${data.quorum};">| ${data.quorum}</span>`);

        $('.progress-majority').append(
            `<div class="progress-bar" role="progressbar"
            style="width: ${majority_yay_per}%; background-color: ${window.chartColors.green};"
            aria-valuenow="${majority_yay_per}" aria-valuemin="0" aria-valuemax="100"></div>`
        );
        $('.progress-majority').append(
            `<div class="progress-bar" role="progressbar"
            style="width: ${majority_nay_per}%; background-color: ${window.chartColors.red};"
            aria-valuenow="${majority_nay_per}" aria-valuemin="0" aria-valuemax="100"></div>`
        );

        $('.progress-majority-boarder').append(
            `<span style="font-size: 0.6em; padding-left: ${majority};">| ${majority}</span>`);
    };

    var testing = function (data) {
        $('.submit-view').html(`<div>${$.i18n('thare_is_no_need_to_vote_in_this_phase')}</div>`);
    };

    var promotion = function (data) {
        ballotsChart(data.ballots,
            '#vote-promotion-chart',
            function (data) {
                var html = `
            <div>
            <button type="button" class="btn btn-lg ml-2 pl-3 pr-3" style="color: white; background-color: ${window.chartColors.green};" onmouseover="this.style.opacity='0.8'" onmouseout="this.style.opacity='1'" id="submit-yay">yay!</button>
            <button type="button" class="btn btn-lg ml-2 pl-3 pr-3" style="color: white; background-color: ${window.chartColors.red};" onmouseover="this.style.opacity='0.8'" onmouseout="this.style.opacity='1'" id="submit-nay">nay !</button>
            <button type="button" class="btn btn-lg ml-2 pl-3 pr-3" style="background-color: ${window.chartColors.grey};" onmouseover="this.style.opacity='0.8'" onmouseout="this.style.opacity='1'" id="submit-pass">pass !</button>
            </div>
            `;
                $('.submit-view').html(html);
            }
        );

        $('.vote_period').text(data.period);
        $('.vote_remain').text(separate(data.remain));
        $('.vote_remain_day').text(floor(data.remain / 60 / 24, 2));

        getAll().done(function (d) {
            $('.cur_block').text(d.level);
            $('.cur_cycle').text(d.cycle);

            var vote_begin = d.level - d.blocks_per_voting_period + Number(data.remain);
            var vote_end = vote_begin + d.blocks_per_voting_period;
            var vote_per = (d.level - vote_begin) / (vote_end - vote_begin) * 100;

            $('.cur_vote_begin').text(vote_begin);
            $('.cur_vote_end').text(vote_end);
            $('.cur_vote_per').css('width', vote_per + '%');
            $('.cur_vote_per').attr('aria-valuenow', vote_per);
        });

        var quorum_total = 0;
        var majority_total = 0;
        for (let key in data.ballots) {
            quorum_total += data.ballots[key];
            if (key != 'pass') {
                majority_total += data.ballots[key];
            }
        }

        var yay_per = floor((1 - data.ballots.nay / data.ballots.yay) * 100, 2) + '%';
        var majority = floor(data.supermajority / data.favor * 100, 0) + '%';

        $('.vote_participation_per').text(data.participation);
        $('.vote_quorum_per').text(data.quorum);
        if (parseFloat(data.participation) >= parseFloat(data.quorum)) {
            $('.vote_quorum_reached').text('>');
            $('.vote_quorum').addClass('text-success');
        } else {
            $('.vote_quorum_reached').text('<');
            $('.vote_quorum').addClass('text-danger');
        }

        $('.vote_yay_per').text(yay_per);
        $('.vote_majority_per').text(majority);
        if (parseFloat(yay_per) >= parseFloat(majority)) {
            $('.vote_majority_reached').text('>');
            $('.vote_majority').addClass('text-success');
        } else {
            $('.vote_majority_reached').text('<');
            $('.vote_majority').addClass('text-danger');
        }

        var quorum_yay_per = floor(data.ballots.yay / quorum_total * parseFloat(data.participation), 2);
        var quorum_nay_per = floor(data.ballots.nay / quorum_total * parseFloat(data.participation), 2);
        var quorum_pass_per = floor(data.ballots.pass / quorum_total * parseFloat(data.participation), 2);

        var majority_yay_per = floor(data.ballots.yay / majority_total * 100, 2);
        var majority_nay_per = floor(data.ballots.nay / majority_total * 100, 2);

        $('.progress-quorum').append(
            `<div class="progress-bar" role="progressbar"
            style="width: ${quorum_yay_per}%; background-color: ${window.chartColors.green};"
            aria-valuenow="${quorum_yay_per}" aria-valuemin="0" aria-valuemax="100"></div>`
        );
        $('.progress-quorum').append(
            `<div class="progress-bar" role="progressbar"
            style="width: ${quorum_nay_per}%; background-color: ${window.chartColors.red};"
            aria-valuenow="${quorum_nay_per}" aria-valuemin="0" aria-valuemax="100"></div>`
        );
        $('.progress-quorum').append(
            `<div class="progress-bar" role="progressbar"
            style="width: ${quorum_pass_per}%; background-color: ${window.chartColors.grey};"
            aria-valuenow="${quorum_pass_per}" aria-valuemin="0" aria-valuemax="100"></div>`
        );

        $('.progress-quorum-boarder').css('width', '100%');
        $('.progress-quorum-boarder').append(
            `<span style="font-size: 0.6em; padding-left: ${data.quorum};">| ${data.quorum}</span>`);

        $('.progress-majority').append(
            `<div class="progress-bar" role="progressbar"
            style="width: ${majority_yay_per}%; background-color: ${window.chartColors.green};"
            aria-valuenow="${majority_yay_per}" aria-valuemin="0" aria-valuemax="100"></div>`
        );
        $('.progress-majority').append(
            `<div class="progress-bar" role="progressbar"
            style="width: ${majority_nay_per}%; background-color: ${window.chartColors.red};"
            aria-valuenow="${majority_nay_per}" aria-valuemin="0" aria-valuemax="100"></div>`
        );

        $('.progress-majority-boarder').append(
            `<span style="font-size: 0.6em; padding-left: ${majority};">| ${majority}</span>`);
    };

    var toggle_proposal = function (status) {
        var period = '';

        switch (status.period) {
            case 'proposal':
                proposal(status);
                period = 'proposal';
                break;
            case 'testing_vote':
                exploration(status);
                period = 'exploration';
                break;
            case 'testing':
                testing(status);
                period = 'testing';
                break;
            case 'promotion_vote':
                promotion(status);
                period = 'promotion';
                break;
        }

        $("[class^='section-']").addClass('d-none');
        $("[class^='section-" + period + "']").removeClass('d-none');
        $("[class^='period-']").removeClass('bg-gradient-primary');
        $("[class^='period-" + period + "']").addClass('bg-gradient-primary');

        var vote = '';

        // 投票ボタン押下
        $(document).on('click', '[id^=submit-]', function () {
            vote = $(this).attr('id').replace(/^submit-/, '');
            var confirm = window.confirm(`[${vote}] ${$.i18n('will_you_vote_for')}(${$.i18n('this_operation_cannot_cancel')})`);

            if (confirm) {
                $('#modal-wallet').modal({
                    backdrop: 'static',
                    show: true
                });
            }
        });

        $(document).on('click', '[id^=n-wallet-]', function () {
            var next_num = $(this).attr('id').replace(/^n-wallet-/, '');
            $('[class^=modal-wallet-]').addClass('d-none');
            $('[class^=modal-wallet-' + next_num + ']').removeClass('d-none');
        });

        $(document).on('click', '[id=n-wallet-2]', function () {
            $.getJSON('./api/setting/get').done(function (res) {
                var dest = res.address.name;
                var prop = '';
                var ballot = '';

                switch (status.period) {
                    case 'proposal':
                        prop = vote;
                        ballot = null;
                        break;

                    case 'testing_vote':
                        prop = status.proposals;
                        ballot = vote;
                        break;

                    case 'promotion_vote':
                        prop = status.proposals;
                        ballot = vote;
                        break;
                }

                $.getJSON(
                    `/api/vote/submit?period=${status.period}&dest=${dest}&prop=${prop}&ballot=${ballot}`)
                    .then(function (ret) {
                        if (ret) {
                            $('#n-wallet-3').trigger('click');
                        } else {
                            $('#n-wallet-4').trigger('click');
                        }
                    });
            });
        });
    };


    /* TEST CODE */
    /*
    var res = {
      period: 'promotion_vote',
      proposals: {
        'PsAAAAAAA4JhdEv1N1pZbt6m6ccB9BfNqa23iKZcHBh23jmRS9f': 60,
        'PsBABY5nk4JhdEv1N1pZbt6m6ccB9BfNqa23iKZcHBh23jmRS9f': 90,
        'PsCARTHAk4JhdEv1N1pZbt6m6ccB9BfNqa23iKZcHBh23jmRS9f': 40,
        'PsDDDDDDD4JhdEv1N1pZbt6m6ccB9BfNqa23iKZcHBh23jmRS9f': 20,
        'PsEEEEEEE4JhdEv1N1pZbt6m6ccB9BfNqa23iKZcHBh23jmRS9f': 25,
        'PsFFFFFFF4JhdEv1N1pZbt6m6ccB9BfNqa23iKZcHBh23jmRS9f': 30,
        'PsGGGGGGG4JhdEv1N1pZbt6m6ccB9BfNqa23iKZcHBh23jmRS9f': 10
      },
      remain: '10919',
      ballots: {
        'yay': 7610,
        'nay': 100,
        'pass': 50
      },
      participation: '10.77%',
      quorum: '72.91%',
      favor: 7610,
      supermajority: 6088
    };

    toggle_proposal(res);
    */
    /* //TEST CODE */

    $.getJSON('/api/vote/status').done(function (res) {
        (wait => {
            if (!d) {
                setTimeout(wait, 1000);
                return;
            }

            if (!d.address.delegate) {
                $('.motd-message').html(
                    `<div class="alert alert-warning" role="alert">
                    ${$.i18n('delegate_destination_is_not_setting')}${$.i18n('please_set_from_setting_page')}
                        </div>`);
            }

            toggle_proposal(res);
        })();
    });
});