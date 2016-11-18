var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

var app = express();
var host  = 'http://127.0.0.1';
var port = 8000;

var admin = require("firebase-admin");
// FCM that handles getting notifications from the queue and sending them out
var fcm = require('./fcm');


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

function sendNotification() {
	var message = {  
    to : 'e538K6YOYfw:APA91bGaG8lJq7FS58u3mwl5JyT_12PQu0eL-wncPtsx3JuOK_eqp61VjYenE_gpHBRXn3hd_a_nVW0dil-eYaXaMK15C-mQCQpa6HdZJOtTSNdH2dHJP7vpmzPLMAr_wHrDe09Uflh3',
    priority: 'high',
    data : {
        'uid': '10154079548343170',
        'tid': '2',
        'image' : 'https://scontent.xx.fbcdn.net/v/t1.0-1/12373224_10153942082375757_2547226759416788825_n.jpg?oh=d296ee064445c4b4dc68e353f27a25a4&oe=58CAF1E9',
        'type': 'connection'
    },
    notification : {
        title: 'Topics',
        body: 'Jenny: Hey what\'s up?',
        sound: 'default',
        badge: '1'
    }
};

	fcm.send(message, function(err,response){  
	    if(err) {
	    	console.log(err);
	        console.log("Something has gone wrong !");
	    } else {
	        console.log("Successfully sent with response :",response);
	    }
	});
}


// Grab from queue, and send out notification
var db = admin.database();

var Queue = require('firebase-queue'),
    Firebase = require('firebase');
var queueRef = db.ref("/queue");

// Creates the Queue
var options = {
  specId: 'tasks',
  numWorkers: 10
};

var queue = new Queue(queueRef, function(data, progress, resolve, reject) {
  // Read and process task data
  console.log(data);
  console.log("HEY");

  // Do some work
  var percentageComplete = 0;
  var interval = setInterval(function() {
    percentageComplete += 20;
    if (percentageComplete >= 100) {
      clearInterval(interval);
    } else {
      progress(percentageComplete);
    }
  }, 1000);

  // Finish the task
  setTimeout(function() {
    resolve();
  }, 5000);
});



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
