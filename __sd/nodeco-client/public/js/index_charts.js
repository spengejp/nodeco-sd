function trimMoney(money) {
  var prefix = ['', 'K', 'M', 'G'];
  var ret = money;
  var i = 0;
  while (ret > 1000) {
    ret = ret / 1000;
    i++;
  }
  return ret + prefix[i];
}

var lineConfig = {
  type: 'line',
  data: {
    labels: [],
    datasets: [{
      yAxisID: 'y-axis-1',
      label: 'XTZ',
      borderColor: '#007bff',
      fill: false,
      data: [],
    }, {
      yAxisID: 'y-axis-2',
      label: 'JPY',
      borderColor: '#17a2b8',
      fill: false,
      data: [],
    }]
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    title: {
      text: 'Chart.js Time Scale'
    },
    scales: {
      xAxes: [{
        scaleLabel: {
          display: true,
        }
      }],
      yAxes: [{
        id: "y-axis-1",
        position: "left",
        scaleLabel: {
          display: true,
          labelString: 'Amount(XTZ)'
        },
        ticks: {
          beginAtZero: false,
          callback: function (label, index, labels) {
            return trimMoney(label.toString());
          }
        }
      }, {
        id: "y-axis-2",
        position: "right",
        scaleLabel: {
          display: true,
          labelString: 'Price(JPY)'
        },
        ticks: {
          beginAtZero: false,
          callback: function (label, index, labels) {
            return trimMoney(label.toString());
          }
        }
      }]
    },
  }
}