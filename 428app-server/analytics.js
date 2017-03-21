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
var SUPERLATIVES = ["Most friendly", "Most funny", "Most intelligent", "Favorite peer"];

// NOTE: This will be /test_db when you're testing
var dbName = "/real_db"
var db = admin.database();

/**************************************************************************************/
// INSERT COMMAND HERE. One command at a time, because each command will exit the process.
// usersWithMoreThanOnePlaygroup();
// numberOfActiveUsers();
// inspectUser("Iouo0fVW7idBISHUF8uMtG06es82");
// usersFromTimezone(8);
// newUsersNoPlaygroups(-9999);
// aggregateQuestionLikes();
// oldUsersNoPlaygroups();
// mostTalkativeUsersRecently();
// inactiveUsers();
// timezoneShift();
// usersSignedUpToday();

// sendPushNotification("g9z6AtvlShMPGGkHGBPqo8yFclk2", "428 misses you :(", "It's been a while. Drop by 428 if you're free, and start being curious again.");
// startInboxWithMessage("Rhv5cgtjYHY1Nakrp7hEHcUVXNW2", "Hey! Leonard, the co-founder of 428 here. Thanks for downloading 428. :) I was just wondering, how did you manage to hear of 428? I realized you're in the GMT+7 timezone.")
// startInboxWithMessage("lrrnin5flqXl2R3jhxKodZkMDYM2", "Hey! Leonard, the co-founder of 428 here. Thanks for downloading 428. :) I was just wondering, how did you manage to hear of 428? I realized you're in the GMT+0 timezone.")
// startInboxWithMessage("P3Rgo2aONahw7p3rxPlbKnpDLq62", "Hey! Leonard, the co-founder of 428 here. Thanks for downloading 428. :) I was just wondering, how did you manage to hear of 428? I realized you're in the GMT+1 timezone.")
/**************************************************************************************/

// Tim, Jenny, Megan, Tomas, Kamron, Xindi
// 4AWSzWm8qnM43aY2jhnrbUApVmR2: 31
// nlqUciBNfzNPLocp8lzYR2BQVDo1: 25
// V1DcEHnrFHPnimKym49SyDkoJU02: 25
// vvQrB1Z7sIN3kMLZhR41QvjutaG2: 21
// RN2H0hXze4ZPR3iXm9AD0QHIHH93: 21
// uitHoap1o8ahcbpmQtMmuHICwsC2: 20
// ILzu2nUGdVZQ06MFhcAd3rmyvaM2: 11

// function timezoneShift() {
// 	db.ref(dbName + "/users")
// 	.orderByChild("timezone")
// 	.equalTo(-5).once("value", function(snapshot) {
// 		snapshot.forEach(function(data) {
// 			var uid = data.key;
// 			db.ref(dbName + "/users/" + uid + "/timezone").set(-4);
// 		});
// 	});
// 	db.ref(dbName + "/playgroups")
// 	.orderByChild("timezone")
// 	.equalTo(-5).once("value", function(snapshot) {
// 		snapshot.forEach(function(data) {
// 			var pid = data.key;
// 			db.ref(dbName + "/playgroups/" + pid + "/timezone").set(-4);
// 		});
// 	});
// }

function usersSignedUpToday() {
	var now = Date.now();
	var today = now - (24 * 60 * 60 * 1000);
	db.ref(dbName + "/users").orderByChild("timeCreated").startAt(today).once("value", function(snapshot) {
		var affectedUsers = [];
		snapshot.forEach(function(data) {
			var uid = data.key;
			var user = data.val();
			affectedUsers.push({"uid": uid, "timezone": user["timezone"], "name": user["name"]});
		});
		console.log(affectedUsers);
		process.exit(0);
	});
}

// Note: Make sure that this user does not already have a message with us
function startInboxWithMessage(uid, message) {
	var srcUid = "luiijotvxfeh5MzM4mRrLw5c2cj2" // Either Leonard or Yihang's uid
	// var srcUid = "90CAqUlZLbUvd99f8Oqn5MFwjCe2"
	var inboxId = uid > srcUid ? srcUid + ":" + uid : uid + ":" + srcUid;
	var mid = db.ref(dbName + "/inboxMessages/" + inboxId).push().key;
	var timestamp = Date.now();

	db.ref(dbName + "/users/" + uid).once("value", function(snapshot) {
		var user = snapshot.val();
		if (user == undefined) {
			return;
		}
		var discipline = user["discipline"];
		var profilePhoto = user["profilePhoto"];
		var name = user["name"];

		db.ref(dbName + "/inboxMessages/" + inboxId + "/" + mid).set({
			message: message,
			poster: srcUid,
			timestamp: timestamp
		}).then(function() {
			var updates = {};
			updates["hasNew:" + srcUid] = false;
			updates["hasNew:" + uid] = true;
			updates["lastMessage"] = message;
			updates["mid"] = mid;
			updates["poster"] = srcUid;
			updates["timestamp"] = timestamp;
			db.ref(dbName + "/inbox/" + inboxId).update(updates).then(function() {
				// Add to both inboxes
				db.ref(dbName + "/users/" + srcUid + "/inbox/" + uid).set({
					discipline: discipline,
					name: name,
					profilePhoto: profilePhoto
				});
				db.ref(dbName + "/users/" + uid + "/inbox/" + srcUid).set({
					discipline: "Computer Science",
					name: "Leonard",
					profilePhoto: "https://scontent.xx.fbcdn.net/v/t1.0-1/16387943_1364095496967674_2998345762827818925_n.jpg?oh=f0484eee29049fffd385fa446bcae144&oe=596387D4"
				}).then(function() {
					// Send push notification to user for new message
					sendPushNotificationForInbox(uid, "Private Message", message);	
				});
			})
		});
	});
}

function inspectUser(uid) {
	db.ref(dbName + "/users/" + uid).once("value", function(snapshot) {
		console.log(snapshot.val());
		process.exit(0);
	});
}

function numberOfActiveUsers() { // Active users are users that logged in in the past two weeks
	var twoWeeksAgo = Date.now() - (2 * 7 * 24 * 60 * 60 * 1000);
	db.ref(dbName + "/users")
	.orderByChild("lastSeen")
	.startAt(twoWeeksAgo).once("value", function(snapshot) {
		console.log(snapshot.numChildren())
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
function newUsersNoPlaygroups(inputTimezone) {
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
				var timezone = -999
				if (inputTimezone > -999) {
					if (user["timezone"] != undefined && user["timezone"] != inputTimezone) {
						return;
					}
				}
				if (user["timezone"] != undefined) {
					timezone = user["timezone"];
				}
				affectedUsers.push({"uid": uid, "timezone": timezone, "joinedDaysAgo": joinedDaysAgo});
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

function sendPushNotificationForInbox(uid, title, body) {
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
			type: "inbox",
			posterUid: "luiijotvxfeh5MzM4mRrLw5c2cj2",
			// posterUid: "90CAqUlZLbUvd99f8Oqn5MFwjCe2",
			posterName: "Leonard",
			// posterName: "Yihang",
			posterImage: "https://scontent.xx.fbcdn.net/v/t1.0-1/16387943_1364095496967674_2998345762827818925_n.jpg?oh=f0484eee29049fffd385fa446bcae144&oe=596387D4",
			// posterImage: "https://firebasestorage.googleapis.com/v0/b/app-abdf9.appspot.com/o/real_db%2Fuser%2F90CAqUlZLbUvd99f8Oqn5MFwjCe2%2Fprofile_photo?alt=media&token=4a699bca-8057-499f-82e8-a55629de76ec",
			recipientUid: uid,
			pushToken: pushToken,
			pushCount: pushCount,
			inApp: true,
			pid: "",
			title: title,
			body: body
		}).then(function() {
			process.exit(0);
		});
	});
}


// Used to send push notification to individual user, likely an inactive user
// Note that the title prepends the input title with the user's name
function sendPushNotificationForAlert(uid, title, body) {
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
			title: title,
			body: body
		}).then(function() {
			process.exit(0);
		});
	});
}

// Runs manually to aggregate all questions' likes and dislikes across all playgroups and users
function aggregateQuestionLikes() {
	db.ref(dbName + "/playgroups").once("value", function(playgroupsSnap) {
		var qidToLikes = {};
		var qidToDislikes = {};

		// Accumulate likes and dislikes in dictionaries
		
		playgroupsSnap.forEach(function(playgroupData) {
			var playgroup = playgroupData.val()
			var pid = playgroupData.key;
			var discipline = playgroup["title"];
			var questions = playgroup["questions"];
			for (var qid in questions) {
				var questionDict = questions[qid];
				var qidDiscipline = discipline + "," + qid;
				delete questionDict["timestamp"]
				for (var uid in questionDict) {
					if (uid == "timestamp") continue;
					if (questionDict[uid] == 1) {
						var newLikes = qidToLikes[qidDiscipline] == null ? 0 : qidToLikes[qidDiscipline];
						qidToLikes[qidDiscipline] = newLikes + 1;
					} else if (questionDict[uid] == -1) {
						var newDislikes = qidToDislikes[qidDiscipline] == null ? 0 : qidToDislikes[qidDiscipline];
						qidToDislikes[qidDiscipline] = newDislikes + 1;
					}
				}
			}
		});

		// Update database with new likes and dislikes for all questions

		for (var qidDiscipline in qidToLikes) {
			var discipline = qidDiscipline.split(",")[0]
			var qid = qidDiscipline.split(",")[1]
			var likes = qidToLikes[qidDiscipline];
			db.ref(dbName + "/questions/" + discipline + "/" + qid + "/likes").set(likes);
		}

		for (var qidDiscipline in qidToDislikes) {
			var discipline = qidDiscipline.split(",")[0]
			var qid = qidDiscipline.split(",")[1]
			var dislikes = qidToDislikes[qidDiscipline];
			db.ref(dbName + "/questions/" + discipline + "/" + qid + "/dislikes").set(dislikes);
		}
	})
}
