var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

var index = require('./routes/index');
var fcm = require('./routes/fcm');

var app = express();
var host  = 'http://127.0.0.1';
var port = 8000;

var admin = require("firebase-admin");


// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', index);
app.use('/fcm', fcm);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});


admin.initializeApp({
  credential: admin.credential.cert("./app-abdf9-firebase-adminsdk-rsdcc-7602cc168c.json"),
  databaseURL: "https://app-abdf9.firebaseio.com"
});

// Used to communciate with server
// var db = admin.database();
// var ref = db.ref("/users/1250226885021203");
// ref.once("value", function(snapshot) {
//   console.log(snapshot.val());
// });

// app.listen(8000);
// console.log('Listening on: ' + host + ":" + port + "/");

module.exports = app;
