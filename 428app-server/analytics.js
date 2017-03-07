/**
 * analytics.js
 * This file is used to inspect the DB for anomalies etc. This file only includes READ functions.
 * To insert, just write a function here, like one of the examples below, then simply run: node analytics.js
 */

var admin = require("firebase-admin");
admin.initializeApp({
  credential: admin.credential.cert("./app-abdf9-firebase-adminsdk-rsdcc-8311b31e51.json"),
  databaseURL: "https://app-abdf9.firebaseio.com"
});
console.log("analytics.js is running...");

var DISCIPLINES = ["Performing Arts", "Visual Arts", "Geography", "History", "Languages", "Literature", "Philosophy", "Economics", "Law", "Political Sciences", "Sports", "Theology", "Biology", "Chemistry", "Astronomy", "Mathematics", "Physics", "Finance", "Agriculture", "Computer Science", "Engineering", "Health", "Psychology", "Culture", "Life Hacks", "Education", "Fashion", "Romance"];
var SUPERLATIVES = ["Most awkward", "Most similar to Bieber", "IQ: 200", "Best personality", "Most good looking", "Most funny", "Biggest dreamer", "Most flirt", "Loudest", "Most quiet", "Most artistic", "Likely to be arrested", "Most dramatic", "Richest right now", "Party animal", "Most lovable", "Future billionaire", "Boyfriend material", "Prime minister to-be", "Trump's best friend", "Sex god", "FBI agent", "Actually a celebrity", "Kim K.'s next BF", "Cat lover", "Most hipster", "Worst driver", "Selfie King/Queen", "Most innocent", "Drunkard"];

// NOTE: This will be /test_db when you're testing
var dbName = "/real_db"
var db = admin.database();

/**************************************************************************************/
// INSERT COMMAND HERE. One command at a time, because each command will exit the process.
usersWithMoreThanOnePlaygroup();
// inspectUser("GAnS6ClGhANQ6W9D8eVp6yFqAIA3");
// usersFromTimezone(-8);
// newUsersNoPlaygroups();
// oldUsersNoPlaygroups();
// mostTalkativeUsersRecently();
// inactiveUsers();
// sendPushNotification("g9z6AtvlShMPGGkHGBPqo8yFclk2", "428 misses you :(", "It's been a while. Drop by 428 if you're free, and start being curious again.");
/**************************************************************************************/

function inspectUser(uid) {
	db.ref(dbName + "/users/" + uid).once("value", function(snapshot) {
		console.log(snapshot.val());
		process.exit(0);
	});
}

function usersWithMoreThanOnePlaygroup() {
	db.ref(dbName + "/users").once("value", function(snapshot) {
		var affectedUsers = [];
		snapshot.forEach(function(data) {
			var uid = data.key;
			var user = data.val();
			if (user["playgroups"] != undefined) {
				var playgroupCount = Object.keys(user["playgroups"]).length
				if (playgroupCount > 0) {
					affectedUsers.push(uid);
				}
			}
		});
		console.log(affectedUsers);
		process.exit(0);
	});
}

// Get users from input timezone (Double)
function usersFromTimezone(timezone) {
	db.ref(dbName + "/users").orderByChild("timezone").equalTo(timezone).once("value", function(snapshot) {
		var affectedUsers = [];
		snapshot.forEach(function(data) {
			var user = data.val();
			affectedUsers.push({"uid": data.key, "name": user["name"]});
		});
		console.log(affectedUsers);
		process.exit(0);
	});
}

// Get users that do not have playgroups AND do not have a next playgroup (new users)
function newUsersNoPlaygroups() {
	var now = Date.now();
	db.ref(dbName + "/users").once("value", function(snapshot) {
		var affectedUsers = [];
		snapshot.forEach(function(data) {
			var user = data.val();
			var uid = data.key;
			if (user["playgroups"] == undefined && user["nextPlaygroup"] == undefined) {
				var joinedDaysAgo = -1;
				if (user["timeCreated"] != undefined) {
					joinedDaysAgo = (now - user["timeCreated"])*1.0 / (1000 * 60 * 60 * 24);
				}
				affectedUsers.push({"uid": uid, "joinedDaysAgo": joinedDaysAgo});
			}
		});
		console.log(affectedUsers);
		process.exit(0);
	});
}

// Get users whose timeOfNextPlaygroup is more than 7 days ago, and still no next playgroup
function oldUsersNoPlaygroups() {
	db.ref(dbName + "/users").once("value", function(snapshot) {
		var affectedUsers = [];
		snapshot.forEach(function(data) {
			var user = data.val();
			var uid = data.key;
			var timeOfNextPlaygroup = user["timeOfNextPlaygroup"];
			var eightDays = 8 * 24 * 60 * 60 * 1000;
			var lastSeen = user["lastSeen"];

			// Eight or more days ago
			if (timeOfNextPlaygroup != undefined && (timeOfNextPlaygroup <= Date.now() - eightDays)) {
				// Check if this is not an inactive user
				var twoWeeks = 2 * 7 * 24 * 60 * 60 * 1000;
				if (user["lastSeen"] >= Date.now() - twoWeeks) {
					affectedUsers.push(uid);
				}
				
			}
		});
		console.log(affectedUsers);
		process.exit(0);
	});
}

// Helper function that sorts a dictionary based on descending order of value and outputs keys
function _getSortedKeys(obj) {
    var keys = []; for(var key in obj) keys.push(key);
    return keys.sort(function(a,b){return obj[b]-obj[a]});
}

// Sort all users based on how much they messaged in playgroups over the past two weeks
function mostTalkativeUsersRecently() {
	var twoWeeksAgo = Date.now() - (2 * 7 * 24 * 60 * 60 * 1000);
	db.ref(dbName + "/playgroupMessages").once("value", function(snapshot) {
		var usersToCount = {};
		snapshot.forEach(function(data) {
			var pg = data.val();
			for (var mid in pg) {
				var msg = pg[mid];
				var uid = msg["poster"];
				if (uid == "428") {
					continue;
				}
				if (msg["timestamp"] > twoWeeksAgo) {
					usersToCount[uid] = (usersToCount[uid] || 0) + 1;
				}
			}
		});
		var sortedUids = _getSortedKeys(usersToCount);
		for (var k = 0; k < sortedUids.length; k++) {
			var uid = sortedUids[k];
			console.log(uid + ": " + usersToCount[uid]);
		}
		process.exit(0);
	});
}

// Users that have not logged in for more than two weeks
// A push notification could be sent to these users
function inactiveUsers() {
	var twoWeeksAgo = Date.now() - (2 * 7 * 24 * 60 * 60 * 1000);
	db.ref(dbName + "/users")
	.orderByChild("lastSeen")
	.endAt(twoWeeksAgo).once("value", function(snapshot) {
		var affectedUsers = [];
		snapshot.forEach(function(data) {
			affectedUsers.push(data.key);
		});
		console.log(affectedUsers);
		process.exit(0);
	});
}

// Used to send push notification to individual user, likely an inactive user
// Note that the title prepends the input title with the user's name
function sendPushNotification(uid, title, body) {
	var tid = db.ref(dbName + "/queue/tasks").push().key;
	// Grab this user's push token and push count first
	db.ref(dbName + "/users/" + uid).once("value", function(snapshot) {
		var user = snapshot.val();
		if (user == null || user == undefined) {
			console.log("User of uid: " + uid + " does not exist");
			process.exit(0);
		}
		var name = user["name"];
		var pushToken = user["pushToken"];
		var pushCount = user["pushCount"];
		db.ref(dbName + "/queue/tasks/" + tid).set({
			type: "alert",
			posterUid: "",
			posterName: "",
			posterImage: "",
			recipientUid: uid,
			pushToken: pushToken,
			pushCount: pushCount,
			inApp: false,
			pid: "",
			title: name + "," + " " + title,
			body: body
		}).then(function() {
			process.exit(0);
		});
	});
}
