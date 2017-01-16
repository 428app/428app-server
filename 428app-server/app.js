var express = require('express');
var path = require('path');
// var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

var app = express();
var host  = 'http://127.0.0.1';
var port = 8000;

var admin = require("firebase-admin");
// FCM that handles getting notifications from the queue and sending them out


app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

admin.initializeApp({
  credential: admin.credential.cert("./app-abdf9-firebase-adminsdk-rsdcc-7602cc168c.json"),
  databaseURL: "https://app-abdf9.firebaseio.com"
});

/** FCM Notification logic */
var FCM = require('fcm-push');
var serverkey = 'AIzaSyDliFBpwjZfoMaNuxkN-A8XD8wYPFQzqlo';  
var fcm = new FCM(serverkey);


// Grab from queue, and send out notification
var db = admin.database();

var Queue = require('firebase-queue'),
    Firebase = require('firebase');
var queueRef = db.ref("/queue");



// queueRef.on("child_added", function(snapshot) {
// 	if (snapshot.val() == null) {
// 		return;
// 	}



	// Grab the head of the queue and delete it
	
	// snapshot.forEach(function(childSnapshot) { 
		// console.log(childSnapshot.val());

	// });

	// var dict = snapshot.val();
	// console.log(dict);
	// var type = dict["type"];
	// var posterUid = dict["posterUid"];
	// var recipientUid = dict["recipientUid"];
	// var recipientTid = dict["recipientTid"];
	// var title = dict["title"];
	// var body = dict["body"];
	// console.log(snapshot.val());
	// If any nulls or empty poster uid, malformed data, so we return
	// if (type == null || posterUid == null || recipientUid == null || recipientTid == null 
	// 	|| title == null || body == null || posterUid == "") {
	// 	return;
	// }

	// if (type == "connection" && recipientUid != "") {
	// 	// Grab recipient uid's userToken
	// 	// Grab poster uid's image and name?
	// 	console.log("yo");
	// 	db.ref("/users/" + recipientUid).once("value", function(userSnapshot) {
	// 		// User does not exist, no notification to send
	// 		if (userSnapshot.val() == null) return;
	// 		var userDict = userSnapshot.val();
	// 		console.log(userDict);

	// 	});
		
	// } else if (type == "topic" && recipientTid != "") {
	// 	// Grab all the users in tid, then their user tokens
	// 	// Grab poster uid's image and name

	// }
	// console.log(snapshot.val())



// });


module.exports = app;
