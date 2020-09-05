/*jshint esversion: 8 */
const express = require('express');
const https = require('https');
const http = require('http');
const path = require('path');
const i18n = require('i18n');

const store = require('./js/store');

require('./js/daemon');

//var favicon = require('serve-favicon');
//var logger = require('morgan');
const methodOverride = require('method-override');
const session = require('express-session');
const bodyParser = require('body-parser');
//var errorHandler = require('errorhandler');

const PORT = 8000;
const app = express();

var server;
try {
    var fs = require('fs');
    fs.statSync("./ssl/server.key");
    fs.statSync("./ssl/server.crt");

    var options = {
        key: fs.readFileSync("./ssl/server.key"),
        cert: fs.readFileSync("./ssl/server.crt")
    };
    server = https.createServer(options, app);
} catch (err) {
    server = http.createServer(app);
}

// template engine
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// environments
app.use(methodOverride());
app.use(session({
    resave: true,
    saveUninitialized: true,
    secret: 'uwotm8'
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

i18n.configure({
    locales: ['en', 'ja'],
    defaultLocale: 'en',
    directory: __dirname + "/public/locales",
    objectNotation: true
});

app.use(i18n.init);

app.use(function (req, res, next) {
    if (store.get('lang') !== false) {
        i18n.setLocale(req, store.get('lang'));
    }
    next();
});

app.use(express.static(path.join(__dirname, 'public')));

app.use('/', require('./routes/index'));
app.use('/', require('./routes/api'));
app.use('/data', require('./routes/data'));
app.use('/vote', require('./routes/vote'));
app.use('/dapps', require('./routes/dapps'));
app.use('/dev', require('./routes/dev'));
app.use('/setting', require('./routes/setting'));
app.use('/setup', require('./routes/setup'));

server.listen(PORT);