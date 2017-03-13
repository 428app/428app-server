/**
 * queue_worker.js
 * Push server that uses firebase-queue to get tasks from the queue node on Firebase.
 * Uses push_notify spec defined on the queue/specs node.
 * To run, just run: node queue_worker.js
 * NOTE: This can simulatenously be run on multiple machines if we need to scale.
 * NOTE: There is hardly a need to configure this file. Don't bother touching it unless absolutely necessary.
 */

var admin = require("firebase-admin");
admin.initializeApp({
	credential: admin.credential.cert("./app-abdf9-firebase-adminsdk-rsdcc-8311b31e51.json"),
	databaseURL: "https://app-abdf9.firebaseio.com"
});
console.log("Push server running...");


var db = admin.database();

// NOTE: This will be /test_db when you're testing
// var dbName = "/test_db";
var dbName = "/real_db";

var ref = db.ref(dbName + "/queue");
var Queue = require('firebase-queue');

var options = {
	'specId': 'push_notify', // This spec has to match the spec in Firebase
	'numWorkers': 10
};

var queue = new Queue(ref, options, function(data, progress, resolve, reject) {
	
	// Read and process task data
	// console.log(data);
	var body = data.body;
	var posterUid = data.posterUid;
	var posterName = data.posterName;
	var posterImage = data.posterImage;
	var pid = data.pid;
	var recipientUid = data.recipientUid;
	var pushToken = data.pushToken;
	var pushCount = data.pushCount;
	var inApp = data.inApp;
	var title = data.title;
	var type = data.type;

	// Null checks for malformed task
	if (body == null || posterUid == null || pid == null || recipientUid == null || pushToken == null 
		|| inApp == null || title == null || type == null || posterUid == null || posterName == null) {
		reject();
		return;
	}

	if (pushCount == null) {
		pushCount = 0;
	}

	// Send notification immediately, and resolve without callback
	sendNotification(pushToken, type, posterUid, pid, posterImage, posterName, title, body, pushCount, inApp, function(err) {
		if (err != null) {
			reject(err)
		} else {
			resolve();
		}
	});	
});


/** Firebase Cloud Messaging */
var FCM = require('fcm-push');
// var serverkey = 'AIzaSyDliFBpwjZfoMaNuxkN-A8XD8wYPFQzqlo';  
var serverkey = 'AAAAVjHHAyI:APA91bGnwhQoTFf23UV9wITofs5EgRk40X6A3MZ7VI39GIsD8EJOqiwdzAwmZLWrzU0Gy3MON_9Lfw6TZmD9NxUcolQa8ryWZdUF4KW5VOF_7W9CSp5hqluQKxnTSfSnJnwVOWIAyt1-J_h9oiJIYq8ibngvBshKtQ';
var fcm = new FCM(serverkey);

/**
 * Uses push token provided to create a push notification message to send out to user.
 * Note that this does not guarantee actual sending - we do not retry even after fcm returns with an error.
 * @param  {String} pushToken   Recipient's push token
 * @param  {String} type        Either "playgroup" or "inbox"
 * @param  {String} posterUid   Poster's uid, empty for a new playgroup message. Used to transition to appropriate screen on frontend
 * @param  {String} pid         Playgroup id, empty for a new inbox message. Used to transition to appropriate screen on frontend
 * @param  {String} posterImage String url of poster's profile picture
 * @param  {String} posterName  Poster's name
 * @param  {String} title       Title of push notification. Either playgroup discipline or "Inbox"
 * @param  {String} body        Body of push notification. Format: "posterName" + ": " + "message"
 * @param  {Int}    pushCount  	Badge count of recipient.
 * @param  {Bool}   inApp       True if recipient's in-app notifications are enabled, false otherwise.
 * @param  {Func} 	completed 	Callback function that takes err as argument, null if there is no error
 * @return {None}             
 */
function sendNotification(pushToken, type, posterUid, pid, posterImage, posterName, title, body, pushCount, inApp, completed) {
	var bodyText = posterName == "" ? body : posterName + ": " + body;
	var message = {  
			to: pushToken,
			priority: 'high',
			data : {
					'uid': posterUid,
					'pid': pid,
					'image' : posterImage,
					'type': type,
					'inApp': inApp
			},
			notification : {
					title: title,
					body:  bodyText,
					sound: 'sound.aif', // Filename of sound file in XCode project
					badge: pushCount.toString()
			}
	};
	
	fcm.send(message, function(err,response) {  
			if (err) {
				console.log(err);
				completed(err);
			} else {
				console.log("Successfully sent with response :", response);
				completed(null);
			}
	});
}
