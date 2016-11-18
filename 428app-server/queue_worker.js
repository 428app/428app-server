var admin = require("firebase-admin");
admin.initializeApp({
  credential: admin.credential.cert("./app-abdf9-firebase-adminsdk-rsdcc-7602cc168c.json"),
  databaseURL: "https://app-abdf9.firebaseio.com"
});

var db = admin.database();
var ref = db.ref("/queue");

var Queue = require('firebase-queue');

var options = {
	'numWorkers': 10
};

var queue = new Queue(ref, options, function(data, progress, resolve, reject) {
  // Read and process task data
  console.log(data);
  var body = data.body;
  var posterUid = data.posterUid;
  var tid = data.tid;
  var recipientUid = data.recipientUid;
  var title = data.title;
  var type = data.type;

  if (body == null || posterUid == null || tid == null 
  	|| recipientUid == null || title == null || type == null || posterUid == "") {
  	reject();
  	return;
  }

  // Get poster's name and image
  db.ref("/users/" + posterUid).once("value", function(posterSnapshot) {
  	if (posterSnapshot.val() == null) {
  		reject('Poster does not exist: ' + posterUid);
  		return;
  	}
  	var posterName = posterSnapshot.val().name
  	if (posterName == null) {
  		reject('Poster does not have a name: ' + posterUid);
  		return;
  	}
  	var posterImage = posterSnapshot.val().profilePhoto == null ? "" : posterSnapshot.val().profilePhoto;
  	// Get recipient's user token if it is a connection type
  	if (type == "connection") {
  		db.ref("/users/" + recipientUid).once("value", function(recipientSnapshot) {
  			if (recipientSnapshot.val() == null) {
  				reject('Recipient does not exist: ' + recipientUid);
  				return;
  			}
  			var badgeCount = recipientSnapshot.val().badgeCount == null ? 0 : recipientSnapshot.val().badgeCount
  			var recipientToken = recipientSnapshot.val().pushToken
  			if (recipientToken == null) {
  				reject('No push token for recipient: ' + recipientUid);
  				return;
  			}
  			// Send notification, and resolve without callback
  			sendNotification(recipientToken, type, posterUid, tid, posterImage, posterName, title, body, badgeCount);
  			resolve();
  		});
  	} else if (type == "topic") {

  	}
  	

  });
});


/** FCM Notification logic */
var FCM = require('fcm-push');
var serverkey = 'AIzaSyDliFBpwjZfoMaNuxkN-A8XD8wYPFQzqlo';  
var fcm = new FCM(serverkey);

function sendNotification(pushToken, type, posterUid, tid, posterImage, posterName, title, body, badgeCount) {
	var message = {  
	    to : pushToken,
	    priority: 'high',
	    data : {
	        'uid': posterUid,
	        'tid': tid,
	        'image' : posterImage,
	        'type': type
	    },
	    notification : {
	        title: title,
	        body:  posterName + ": " + body,
	        sound: 'default',
	        badge: badgeCount.toString()
	    }
	};

	fcm.send(message, function(err,response){  
	    if(err) {
	    	console.log(err);
	        console.log("Error!");
	    } else {
	        console.log("Successfully sent with response :",response);
	    }
	});
}