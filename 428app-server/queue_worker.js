var admin = require("firebase-admin");
admin.initializeApp({
	credential: admin.credential.cert("./app-abdf9-firebase-adminsdk-rsdcc-8311b31e51.json"),
	databaseURL: "https://app-abdf9.firebaseio.com"
});


var db = admin.database();
var dbName = "/real_db"
var ref = db.ref(dbName + "/queue");
var Queue = require('firebase-queue');

var options = {
	'specId': 'push_notify',
	'numWorkers': 10
};

var queue = new Queue(ref, options, function(data, progress, resolve, reject) {

	// Read and process task data
	console.log(data);
	var body = data.body;
	var posterUid = data.posterUid;
	var posterName = data.posterName;
	var posterImage = data.posterImage;
	var cid = data.cid;
	var recipientUid = data.recipientUid;
	var title = data.title;
	var type = data.type;

	// Null checks for malformed task
	if (body == null || posterUid == null || cid == null || recipientUid == null 
		|| title == null || type == null || posterUid == "" || posterName == null) {
		reject();
		return;
	}

	// This does not increment badge count, and simply sends what is already there
	
	if (type == "inbox") {
		db.ref(dbName+ "/users/" + recipientUid).once("value", function(recipientSnapshot) {
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

			// Get recipient's settings to see if in app notifications are enabled
			db.ref(dbName + "/userSettings/" + recipientUid + "/inAppNotifications").once("value", function(inAppSnapshot) {
				var inApp = true
				if (inAppSnapshot.val() != null && inAppSnapshot.val() == false) {
					inApp = false
				}
				// Send notification, and resolve without callback
				sendNotification(recipientToken, type, posterUid, cid, posterImage, posterName, title, body, badgeCount, inApp, function(err) {
					if (err != null) {
						reject(err)
					} else {
						resolve();
					}
				});
			})
		});
	}
});


/** Firebase Cloud Messaging */
var FCM = require('fcm-push');
var serverkey = 'AIzaSyDliFBpwjZfoMaNuxkN-A8XD8wYPFQzqlo';  
var fcm = new FCM(serverkey);

/**
 * Uses push token provided to create a push notification message to send out to user.
 * Note that this does not guarantee actual sending - we do not retry even after fcm returns with an error.
 * @param  {String} pushToken   Recipient's push token
 * @param  {String} type        Either "classroom" or "inbox"
 * @param  {String} posterUid   Poster's uid, empty for a new classroom message. Used to transition to appropriate screen on frontend
 * @param  {String} cid         Classroom id, empty for a new inbox message. Used to transition to appropriate screen on frontend
 * @param  {String} posterImage String url of poster's profile picture
 * @param  {String} posterName  Poster's name
 * @param  {String} title       Title of push notification. Either classroom title or "Inbox"
 * @param  {String} body        Body of push notification. Format: "posterName" + ": " + "message"
 * @param  {Int}    badgeCount  Badge count of recipient.
 * @param  {Bool}   inApp       True if recipient's in-app notifications are enabled, false otherwise.
 * @param  {Func} 	completed 	Callback function that takes err as argument, null if there is no error
 * @return {None}             
 */
function sendNotification(pushToken, type, posterUid, cid, posterImage, posterName, title, body, badgeCount, inApp, completed) {
	var message = {  
			to : pushToken,
			priority: 'high',
			data : {
					'uid': posterUid,
					'cid': cid,
					'image' : posterImage,
					'type': type,
					'inApp': inApp
			},
			notification : {
					title: title,
					body:  posterName + ": " + body,
					sound: 'default',
					badge: badgeCount.toString()
			}
	};

	fcm.send(message, function(err,response){  
			if (err) {
				console.log(err);
					completed(err);
			} else {
					console.log("Successfully sent with response :",response);
					completed(null);
			}
	});
}