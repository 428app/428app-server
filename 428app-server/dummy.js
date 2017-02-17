var admin = require("firebase-admin");
admin.initializeApp({
  credential: admin.credential.cert("./app-abdf9-firebase-adminsdk-rsdcc-8311b31e51.json"),
  databaseURL: "https://app-abdf9.firebaseio.com"
});

var DISCIPLINES = ["Performing arts", "Visual arts", "Geography", "History", "Languages", "Literature", "Philosophy", "Economics", "Law", "Political sciences", "Sports", "Theology", "Biology", "Chemistry", "Earth and Space sciences", "Mathematics", "Physics", "Finance", "Agriculture", "Computer science", "Engineering", "Health", "Psychology", "Culture", "Life hacks", "Education", "Fashion", "Romance"];
var SUPERLATIVES = ["Most awkward", "Most similar to Bieber", "IQ: 200", "Best personality", "Most good looking", "Most funny", "Biggest dreamer", "Most flirt", "Loudest", "Most quiet", "Most artistic", "Most likely to be arrested", "Most dramatic", "Most money", "Party Animal", "Most lovable"]
var db = admin.database();

// NOTE: This will be /test_db when you're testing, and /real_db for live server
var dbName = "/test_db"

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
				timeReplied: -1, // Never replied yet,
				didYouKnow: null // No did you know as no superlatives either
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
function createDummyClassrooms(_disciplines, uid) {
	var _classrooms = [];
	for (var i = 0; i < _disciplines.length; i++) {
		var d = _disciplines[i];
		_classrooms.push({"discipline": d, "questionNum": 1, "questionImage": "https://scontent-sit4-1.xx.fbcdn.net/v/t31.0-8/15039689_1271173046259920_4366784399934560581_o.jpg?oh=22f4ffd1a592e2d0b55bf1208ca9e1d2&oe=58D6797C", "hasUpdates": false, "timeReplied": 0})
	}
	return _classrooms;
}

/**
 * TEST FUNCTION
 * Creates one dummy classmate
 */
function createDummyClassmate() {
	
	var random_discipline = DISCIPLINES[parseInt(Math.random() * DISCIPLINES.length)];
	var random_timezone = parseInt(Math.random() * 11);
	random_timezone = Math.random() > 0.5 ? random_timezone * -1 : random_timezone
	
	// Randomize from a few dates
	var times = [null, Date.now() + 5 * 60 * 1000, Date.now() + 2 * 60 * 1000, 1489892880000]; 
	var random_index = parseInt(Math.random() * times.length);
	var random_timeOfNextClassroom = times[random_index];

	// Randomize classrooms already in
	var d1 = ["Astronomy", "Biology", "Earth and Space sciences", "History", "Languages"];
	var d2 = ["Physics", "Astronomy", "Biology"];
	var d3 = ["Earth and Space sciences"];
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

// Functions that probe the data to check its state, and make sure that it is correct


// 1. Check that all users have nextClassroom non null (to be checked after running generateClassrooms)
function check1() {
	db.ref(dbName + "/users").once("value", function(users) {
		users.forEach(function(userData) {
			var user = userData.val();
			var uid = userData.key;
			var nextClassroom = user["nextClassroom"];
			var disciplinesTaken = [user["discipline"]];
			var classrooms = user["classrooms"];
			for (var cid in classrooms) {
				var classDict = classrooms[cid];
				disciplinesTaken.push(classDict["discipline"]);
			}
			if (disciplinesTaken.length <= 4 && nextClassroom == null) {
			// if (nextClassroom == null) {
				console.log("problem: next classroom should not be null, uid: " + uid);
			}
		});		
	});
}

// 2. Check that for all users: if a user's time of next classroom is far into the future, then nextClassroom is not null, else null
function check2() {
	db.ref(dbName + "/users").once("value", function(users) {
		users.forEach(function(userData) {
			var user = userData.val();
			var uid = userData.key;
			var timeOfNextClassroom = user["timeOfNextClassroom"];
			var hasNewClassroom = user["hasNewClassroom"];
			var nextClassroom = user["nextClassroom"];
			
			// If user already has taken all disciplines, then don't check for this user
			var disciplinesTaken = [user["discipline"]];
			var classrooms = user["classrooms"];
			for (var cid in classrooms) {
				var classDict = classrooms[cid];
				disciplinesTaken.push(classDict["discipline"]);
			}
			if (disciplinesTaken.length > 4) {
				return;
			}


			if (timeOfNextClassroom > Date.now() + 60 * 60 * 1000) { // More than 1 hr into the future
				if (nextClassroom == null) {
					console.log("problem: future user should still have non-null next classroom");
				}
				if (hasNewClassroom != null) {
					console.log("problem: future user should have null new classroom");	
				}
			} else {
				if (nextClassroom != null) {
					console.log("problem: current user should have null next classroom");
				}
				if (hasNewClassroom == null) {
					console.log("problem: current user should have non-null new classroom, uid: " + uid);	
				}
			}

		});
	});
}

// 3. 5 people already in a classroom of Astronomy, 2 new users without classroom - See if I match the 2 to that classroom
function check3() {

	// for (var k = 0; k < 5; k++) {
	// 	var random_discipline = DISCIPLINES[parseInt(Math.random() * DISCIPLINES.length)];
	// 	var random_timezone = parseInt(Math.random() * 11);
	// 	random_timezone = Math.random() > 0.5 ? random_timezone * -1 : random_timezone
		
	// 	// Randomize from a few dates
	// 	var times = [null, Date.now() + 5 * 60 * 1000, Date.now() + 2 * 60 * 1000, 1489892880000]; 
	// 	var random_index = parseInt(Math.random() * times.length);
	// 	var random_timeOfNextClassroom = times[random_index];

	// 	// Randomize classrooms already in
	// 	var d1 = ["Astronomy"];

	// 	var uid = db.ref(dbName + "/users").push().key;
	// 	db.ref(dbName + "/users/" + uid).set({
	// 		fbid: "1",
	// 		name: "Dummy",
	// 		birthday: "06/11/1991",
	// 		lastSeen: 0,
	// 		location: "42.3601, 71.0942",
	// 		discipline: "Geography",
	// 		school: "Harvard",
	// 		organization: "428",
	// 		profilePhoto: "https://scontent-sit4-1.xx.fbcdn.net/v/t1.0-9/12360259_1036119596431934_7410932159803664054_n.jpg?oh=84251aca7d9dcc8e428a9ee58c420f57&oe=58E36C07",
	// 		tagline: "I'm a dummy of 428.",
	// 		timezone: -5,
	// 		nextClassroom: null,
	// 		timeOfNextClassroom: Date.now() + 2 * 24 * 60 * 60 * 1000,
	// 		classrooms: createDummyClassrooms(d1),
	// 		hasNewClassroom: null,
	// 		pushToken: "1",
	// 		pushCount: 0
	// 	});
	// }

	for (var k = 0; k < 2; k++) {
		var random_discipline = DISCIPLINES[parseInt(Math.random() * DISCIPLINES.length)];
		var random_timezone = parseInt(Math.random() * 11);
		random_timezone = Math.random() > 0.5 ? random_timezone * -1 : random_timezone
		
		// Randomize from a few dates
		var times = [null, Date.now() + 5 * 60 * 1000, Date.now() + 2 * 60 * 1000, 1489892880000]; 
		var random_index = parseInt(Math.random() * times.length);
		var random_timeOfNextClassroom = times[random_index];

		// Randomize classrooms already in
		var d1 = ["Astronomy"];

		var uid = db.ref(dbName + "/users").push().key;
		db.ref(dbName + "/users/" + uid).set({
			fbid: "2",
			name: "Dummy2",
			birthday: "06/11/1991",
			lastSeen: 0,
			location: "42.3601, 71.0942",
			discipline: "Geography",
			school: "Harvard",
			organization: "428",
			profilePhoto: "https://scontent-sit4-1.xx.fbcdn.net/v/t1.0-9/12360259_1036119596431934_7410932159803664054_n.jpg?oh=84251aca7d9dcc8e428a9ee58c420f57&oe=58E36C07",
			tagline: "I'm a dummy of 428.",
			timezone: -5,
			nextClassroom: null,
			timeOfNextClassroom: null,
			hasNewClassroom: null,
			pushToken: "1",
			pushCount: 0
		});
	}

}

// clearDatabase();
check3();


