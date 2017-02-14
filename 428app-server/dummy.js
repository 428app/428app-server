var admin = require("firebase-admin");
admin.initializeApp({
  credential: admin.credential.cert("./app-abdf9-firebase-adminsdk-rsdcc-8311b31e51.json"),
  databaseURL: "https://app-abdf9.firebaseio.com"
});

var DISCIPLINES = ["Performing arts", "Visual arts", "Geography", "History", "Languages", "Literature", "Philosophy", "Economics", "Law", "Political sciences", "Sports", "Theology", "Biology", "Chemistry", "Earth and Space sciences", "Mathematics", "Physics", "Finance", "Agriculture", "Computer science", "Engineering", "Health", "Psychology", "Culture", "Life hacks", "Education", "Fashion", "Romance"];
var SUPERLATIVES = ["Most awkward", "Most similar to Bieber", "IQ: 200", "Best personality", "Most good looking", "Most funny", "Biggest dreamer", "Most flirt", "Loudest", "Most quiet", "Most artistic", "Most likely to be arrested", "Most dramatic", "Most money", "Party Animal", "Most lovable"]
var db = admin.database();
var dbName = "/real_db"

simulateClassrooms();
/**
 * TEST FUNCTION
 * Puts all the users in all classrooms - one classroom per discipline available
 */
function simulateClassrooms() {

	var timeCreated = Date.now();

	var discipline = "Biology" // Match all users to Physics classroom
	// Gets all users
	db.ref(dbName + "/users").once("value", function(snap) {
		var uids = [];
		snap.forEach(function(data) {
			uids.push(data.key);
		});

		var memberHasVoted = {};
		for (var i = 0; i < uids.length; i++) {
			memberHasVoted[uids[i]] = 0;
		}

		db.ref(dbName + "/questions/" + discipline).once("value", function(snap) {
			
			// Just pick the first question
			var dict = snap.val();
			var firstKey = Object.keys(dict)[0];
			var question = dict[firstKey];

			var questions = {};
			questions[firstKey] = timeCreated;

			var cid = db.ref(dbName + "/classrooms").push().key;

			// Create the classroom
			db.ref(dbName + "/classrooms/" + cid).set({
				title: discipline,
				image: question["image"],
				timeCreated: timeCreated,
				timezone: -5,
				memberHasVoted: memberHasVoted,
				questions: questions,
				superlatives: null, // No superlatives yet
				timeReplied: -1 // Never replied yet
			}).then(function() {
				// Add this classroom to all uids
				var updates = {};
				updates["/classrooms/" + cid + "/discipline"] = discipline;
				updates["/classrooms/" + cid + "/questionNum"] = 1;
				updates["/classrooms/" + cid + "/questionImage"] = question["image"];
				updates["/classrooms/" + cid + "/hasUpdates"] = true;
				updates["/timeOfNextClassroom"] = timeCreated;
				for (uid in memberHasVoted) {
					db.ref(dbName + "/users/" + uid).update(updates);
				}
			});

		});
	});
}

function clearDatabase() {
	db.ref(dbName + "/classrooms/").set(null);
	db.ref(dbName + "/users/").set(null);	
	db.ref(dbName + "/userSettings/").set(null);	
}

// Used in createDummyClassmate
function _createDummyClassrooms(_disciplines, uid) {
	var _classrooms = [];
	for (var i = 0; i < _disciplines.length; i++) {
		var d = _disciplines[i];
		_classrooms.push({"discipline": d, "questionNum": 2, "questionImage": "https://scontent-sit4-1.xx.fbcdn.net/v/t31.0-8/15039689_1271173046259920_4366784399934560581_o.jpg?oh=22f4ffd1a592e2d0b55bf1208ca9e1d2&oe=58D6797C", "hasUpdates": false})
	}
	return _classrooms;
}

/**
 * TEST FUNCTION
 * Creates one dummy classmate
 */
function createDummyClassmate() {
	// Randomize certain attributes
	var random_discipline = DISCIPLINES[parseInt(Math.random() * DISCIPLINES.length)];
	var random_timezone = parseInt(Math.random() * 11);
	var random_nextClassroom = Math.random() > 0.5 ? "1" : null;
	// Randomize from a few dates
	var times = [null, 1483720080000, 1483806480000, 1483892880000]; // UNIX times of 4:28pm at GMT of dates: 01/06, 01/07, 01/08

	var random_index = parseInt(Math.random() * times.length);
	var random_timeOfNextClassroom = times[random_index];

	var d1 = ["Physics", "Chemistry", "Geography", "History", "Languages"];
	var d2 = ["Physics"];
	var d3 = DISCIPLINES;
	var _classrooms = [null, createDummyClassrooms(d1), createDummyClassrooms(d2), createDummyClassrooms(d3)];
	var random_classrooms = _classrooms[random_index];

	var uid = db.ref(dbName + "/users").push().key;
	db.ref(dbName + "/users/" + uid).set({
		fbid: "1",
		name: "Dummy",
		birthday: "06/11/1991",
		lastSeen: 0,
		location: "42.3601, 71.0942",
		discipline: random_discipline,
		school: "Harvard",
		organization: "428",
		profilePhoto: "https://scontent-sit4-1.xx.fbcdn.net/v/t1.0-9/12360259_1036119596431934_7410932159803664054_n.jpg?oh=84251aca7d9dcc8e428a9ee58c420f57&oe=58E36C07",
		tagline: "I'm a dummy of 428.",
		timezone: random_timezone,
		nextClassroom: null,
		timeOfNextClassroom: random_timeOfNextClassroom,
		classrooms: random_classrooms,
		hasNewClassroom: null,
		pushToken: "1",
		pushCount: 0
	});
}
