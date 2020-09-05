window.chartColors = {
    red: 'rgb(255, 99, 132)',
    orange: 'rgb(255, 159, 64)',
    yellow: 'rgb(255, 205, 86)',
    green: 'rgb(75, 192, 192)',
    blue: 'rgb(54, 162, 235)',
    purple: 'rgb(153, 102, 255)',
    grey: 'rgb(201, 203, 207)'
};

var proposalsChart = function (data, ctx, callback) {
    array = Object.entries(data);
    array.sort(function (a, b) {
        if (a[1] < b[1]) return 1;
        if (a[1] > b[1]) return -1;
        return 0;
    });

    var counts = [];
    var labels = [];
    for (var i = 0; i < array.length; i++) {
        if (i >= 6) {
            labels[5] = "Others";
            counts[5] += array[i][1];
            array.splice(i, 1);
            i--;
        } else {
            labels[i] = array[i][0].slice(0, 9);
            counts[i] = array[i][1];
        }
    }

    callback(array);

    var config = {
        type: 'pie',
        data: {
            datasets: [{
                data: counts,
                backgroundColor: [
                    window.chartColors.red,
                    window.chartColors.orange,
                    window.chartColors.yellow,
                    window.chartColors.green,
                    window.chartColors.blue,
                    window.chartColors.grey
                ],
                label: 'Dataset'
            }],
            labels: labels
        },
        options: {
            legend: {
                display: true,
                position: 'left'
            },
            responsive: true
        }
    }

    new Chart($(ctx), config);
}

var ballotsChart = function (data, ctx, callback) {
    array = Object.entries(data);

    var counts = [];
    var labels = [];
    for (var i = 0; i < array.length; i++) {
        labels[i] = array[i][0].slice(0, 9);
        counts[i] = array[i][1];
    }

    callback(array);

    var config = {
        type: 'pie',
        data: {
            datasets: [{
                data: counts,
                backgroundColor: [
                    window.chartColors.green,
                    window.chartColors.red,
                    window.chartColors.grey
                ],
                label: 'Dataset'
            }],
            labels: labels
        },
        options: {
            legend: {
                display: true,
                position: 'left'
            },
            responsive: true
        }
    }

    new Chart($(ctx), config);
}