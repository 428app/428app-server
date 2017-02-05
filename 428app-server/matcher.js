var admin = require("firebase-admin");
admin.initializeApp({
  credential: admin.credential.cert("./app-abdf9-firebase-adminsdk-rsdcc-8311b31e51.json"),
  databaseURL: "https://app-abdf9.firebaseio.com"
});

var DISCIPLINES = ["Performing arts", "Visual arts", "Geography", "History", "Languages", "Literature", "Philosophy", "Economics", "Law", "Political sciences", "Sports", "Theology", "Biology", "Chemistry", "Earth and Space sciences", "Mathematics", "Physics", "Finance", "Agriculture", "Computer science", "Engineering", "Health", "Psychology", "Culture", "Life hacks", "Education", "Fashion", "Romance"];
var db = admin.database();
var dbName = "/real_db"

// SIMULATOR functions for testing classrooms with some real logins

// simulateClassrooms();

// Puts all the users in all classrooms - one classroom per discipline available
function simulateClassrooms() {

	var timeCreated = Date.now();
	var disciplines = ["Physics", "Biology", "Earth and Space sciences"]; // Type disciplines to look for

	var discipline = "Earth and Space sciences"
	console.log(discipline);
	// Gets all users
	db.ref(dbName + "/users").once("value", function(snap) {
		var uids = [];
		snap.forEach(function(data) {
			uids.push(data.key);
		});

		var memberHasRated = {};
		for (var i = 0; i < uids.length; i++) {
			memberHasRated[uids[i]] = 0;
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
				memberHasRated: memberHasRated,
				questions: questions,
				ratings: null, // No ratings yet
				timeReplied: -1 // Never replied yet
			}).then(function() {
				// Add this classroom to all uids
				var updates = {};
				updates["/classrooms/" + cid + "/discipline"] = discipline;
				updates["/classrooms/" + cid + "/questionNum"] = 1;
				updates["/classrooms/" + cid + "/questionImage"] = question["image"];
				updates["/classrooms/" + cid + "/hasUpdates"] = true;
				updates["/timeOfNextClassroom"] = timeCreated;
				for (uid in memberHasRated) {
					db.ref(dbName + "/users/" + uid).update(updates);
				}
			});

		});
	});

}

// TEST Functions that create dummy data

function createDummyQuestion() {
	var discipline = DISCIPLINES[parseInt(Math.random() * DISCIPLINES.length)];
	writeQuestion(discipline, "https://scontent-sit4-1.xx.fbcdn.net/v/t31.0-8/15039689_1271173046259920_4366784399934560581_o.jpg?oh=22f4ffd1a592e2d0b55bf1208ca9e1d2&oe=58D6797C", discipline + " Question" + Math.random().toString(36).substring(7), discipline + "Answer");
}

function createDummyClassrooms(_disciplines, uid) {
	var _classrooms = [];
	for (var i = 0; i < _disciplines.length; i++) {
		var d = _disciplines[i];
		_classrooms.push({"discipline": d, "questionNum": 2, "questionImage": "https://scontent-sit4-1.xx.fbcdn.net/v/t31.0-8/15039689_1271173046259920_4366784399934560581_o.jpg?oh=22f4ffd1a592e2d0b55bf1208ca9e1d2&oe=58D6797C", "hasUpdates": false})
	}
	return _classrooms;
}

function clearDatabase() {
	db.ref(dbName + "/classrooms/").set(null);
	db.ref(dbName + "/users/").set(null);	
	db.ref(dbName + "/userSettings/").set(null);	
	db.ref(dbName + "/questions/").set(null);	
}

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
		hasNewBadge: false,
		hasNewClassroom: false,
		pushToken: "1",
		pushCount: 0
	});
}

function checkForNoClassroomClassmates() {
	db.ref(dbName + "/users").once("value", function(snap) {
		snap.forEach(function(data) {
			var user = data.val();
			if (user["nextClassroom"] == undefined) {
				if (user["classrooms"] != undefined) {
					var len = user["classrooms"].length;
					if (len != 28) {
						console.log(user["timeOfNextClassroom"]);
					}
				}
				
			}
		});
	});
}

function checkIfSomeClassmatesHaveNewClassroom() {
	db.ref(dbName + "/users/").orderByChild("hasNewClassroom").equalTo(false).once("value", function(snap) {
		console.log(snap.val());
	})
}

// Step 0: Clear database
// clearDatabase();

// Step 1: Create dummy questions first
// for (var i = 0; i < 1000; i++) {
// 	createDummyQuestion();
// }

// Step 2: Create dummy classmates
// for (var i = 0; i < 1000; i++) {
// 	createDummyClassmate();
// }

// --> TEST HERE: Have to create a new user from the app before generating
//  classrooms for him and dummy users

// Step 3: Generate classrooms - assign classmates to classrooms
// generateClassrooms();

// Step 4: Verify that all users have a nextClassroom, 
// and if they don't it's because they have already taken all classrooms
// checkForNoClassroomClassmates();

// Step 5: Transfers users' next classroom to their list of classrooms when the time is right
// transferToNewClassroom();

// Step 6: Check if some classmates really have their hasNewClassroom set to True
// checkIfSomeClassmatesHaveNewClassroom()

/**
 * Function used to write a question to the data store
 * @param  {[String]} classroomTitle Title of the classroom, which is the discipline
 * @param  {[String]} image          Image URL string of the question
 * @param  {[String]} question       Multiline question separated with \n if necessary
 * @param  {[String]} answer         Multiline answer separated with \n if necessary
 * @return {None}                
 */
function writeQuestion(classroomTitle, image, question, answer) {
	var qid = db.ref(dbName + "/questions/" + classroomTitle).push().key;
  db.ref(dbName + "/questions/" + classroomTitle + "/" + qid).set({
	image: image,
	question: question,
	answer: answer
  });
}

/**
 * Writes questions from a tab-separated file and posts them to the Questions Firebase store.
 * @param  {[String]} tsvFile Tab separated file (without header)
 * @return None
 */
function writeQuestionsFromTSVFile(tsvFile) {
	var fs = require('fs'); 
	var parse = require('csv-parse');
	fs.createReadStream(tsvFile)
	    .pipe(parse({delimiter: '\t'}))
	    .on('data', function(csvrow) {
	        console.log(csvrow);
	        writeQuestion(csvrow[0], csvrow[1], csvrow[2], csvrow[3]);
	    })
	    .on('end',function() {
	    });
}

// Test physics question
// writeQuestion(
// 	"Physics", 
// 	"https://encrypted-tbn1.gstatic.com/images?q=tbn:ANd9GcT7yQPn_k7LlZGtO303qG5jgs0evO3pKOxu4yd47Hoi_uxcH8gD", 
// 	"What happens when sperm travel to the speed of light?", 
// 	"Our thought experiment does disprove one theory of relativity, and that is Galilean relativity. Contrary to popular belief, it was Galileo and not Einstein who invented the theory of relativity. Galileo proposed that it was relative velocities that mattered, and not velocities measured relative to the Earth, as Aristotle had previously suggested.\n\n" + 
// 	"The average speed of ejaculation has been measured to be approximately 45 km/hr (just below the allowable speed limit in most suburban areas). This is the average speed of the ejected semen relative to the ejaculatory penis, and can be increased by training the Kegel muscles (by pretending to withhold your urine). Anyway, according to Galilean relativity, if one is to ejaculate whilst thrusting inwards at the speed of light, then the relative speed of their ejaculatory semen will be equal to the sum of the two speeds, namely the speed of light plus 45 km/hr. In other words, Galilean relativity says that the semen will be travelling faster than the speed of light. Einstein’s special theory of relativity showed this to be impossible.\n\n" +
// 	"By assuming that the speed of light is the same in all inertial reference frames, Einstein showed the speed of light to be the cosmic speed limit. Actually, only massless particles can reach this limit, because an infinite amount of energy is needed to accelerate a massive object (and a penis is a massive object) up to the speed of light. It is possible to persist with the calculations at the speed of light, but this invariably leads to paradoxes, such as a penis having no apparent length, and therefore semen travelling through a penis with no apparent length. According to the semen, time stops, and space contracts down to two dimensions. Obviously, it is more realistic to consider the scenario of ejaculation at speeds arbitrarily close to the speed of light.\n\n" + 
// 	"At such speeds, the relativistic velocity addition formula applies. Suppose your boyfriend has been training his Kegel muscles and he can achieve a speed of ejaculation of 2% the speed of light. Then, if he is to ejaculate while thrusting inwards at 99% the speed of light, his semen will be travelling not at 101% the speed of light as common sense would suggest, but rather at 99.04% the speed of light. This relativistic semen will then be decelerated to about 94.2% the speed of light as it escapes the gravitational pull of the penis.\n\n" + 
// 	"An average ejaculation produces approximately two teaspoons of semen (this amount decreases with age, and increases with time since last ejaculation). Anyway, two teaspoons of semen travelling at 94.2% the speed of light will create enormous air resistance, which will heat up the semen in the same fashion as a spaceship re-entering the Earth's atmosphere. The semen will burst into flames almost instantaneously, creating deafening sonic booms in its wake.\n\n" +
// 	"Meanwhile, two teaspoons of flaming semen will generate enormous impact forces, sufficient to rip straight through the structural integrity of an extra-strength Durex condom. But you will have much greater concerns than an unwanted pregnancy. The relativistic flaming semen will pierce a small hole straight through your lower torso, just like a speeding bullet, only incinerating the surrounding tissue as it passes through. Relativistic ejaculation brings true meaning to the question, \"Is that your gun in your pocket, or are you just happy to see me?\" Well it's not a gun baby… it's a rocket launcher!\n\n"
// 	)

/**
 * Checks if a user has already been in a classroom of a certain discipline, or if user is that discipline.
 * Used to ensure users do not get assigned the same classroom previously assigned.
 * @param  {[JSON]} user 			JSON representation of a user
 * @param  {[String]} discipline 	String representation of the discipline to check for
 * @return {[Bool]}            		True if user has the discipline, False otherwise
 */
function _userHasDiscipline(user, discipline) {
	var userDiscipline = user["discipline"];
	var classrooms = user["classrooms"];
	
	if (userDiscipline == undefined || classrooms == undefined || classrooms == null) {
		return false;
	}

	if (userDiscipline == discipline) {
		return true;
	}

	for (cid in classrooms) {
		var d = classrooms[cid]["discipline"];
		if (discipline == d) {
			return true;
		}
	}
	return false;
}

/**
 * Randomize array elements order in-place. Used to shuffle DISCIPLINES before assigning to classrooms.
 * Uses Durstenfeld shuffle algorithm.
 * @param  {[Array]} array Input array
 * @return {[Array]}        Randomly shuffled array
 */
function _shuffleArray(array) {
    for (var i = array.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var temp = array[i];
        array[i] = array[j];
        array[j] = temp;
    }
    return array;
}

/**
 * Checks if a user has taken all disciplines, and therefore have no more new classrooms for this user.
 * @param  {[JSON]} user JSON representation of a user
 * @return {[Bool]}      True if user has taken all disciplines, False otherwise
 */
function _userHasAllDisciplines(user) {
	var classrooms = user["classrooms"];
	if (classrooms == undefined || classrooms == null) {
		return false;
	}
	return classrooms.length >= DISCIPLINES.length - 1; // -1 because the user's own discipline counts as one
}

/**
 * Returns a random question from the specified discipline, to be asked in classrooms.
 * @param  {[type]} discipline 		String of discipline
 * @param  {[Function]} completed   Callback function that takes in Question JSON
 */
function randomQuestionOfDiscipline(discipline, completed) {
	var question_ref = db.ref(dbName + "/questions");
	question_ref.orderByKey().equalTo(discipline).once("value", function(snapshot) {
		var snap = snapshot.child(discipline);
		var n = snap.numChildren();
		if (n == 0) {
			completed(null);
			return;
		}
		var random_index = parseInt(Math.random() * n);
		var i = 0;
		var values = snap.val();
		for (key in values) {
			if (i == random_index) {
				var data = values[key];
				data["qid"] = key;
				completed(data);
			}
			i++;
		}
	});
}

/**
 * Adds one week to input time stamp.
 * @param {Double} timestamp UNIX time in milliseconds
 * @return {Double} UNIX time in milliseconds
 */
function _addWeekToTimestamp(timestamp) {
	return timestamp + (7 * 24 * 60 * 60 * 1000)
}

/**
 * Returns the UNIX timestamp of the upcoming 4:28pm according to the specified timezone.
 * This method is used to assign classroom to a group of new users.
 * @param {[Double]} inputTimezone 
 * @return {[Double]} UNIX timestamp
 */
function _nextDay428(inputTimezone) {
	var nextDate = new Date();
	var currentTimezone = (-nextDate.getTimezoneOffset()) / 60.0;
	var offset = currentTimezone - inputTimezone;
	  
	if ((nextDate.getHours() >= 16 && nextDate.getMinutes() >= 28) ||(nextDate.getHours() >= 17)) {
	  nextDate.setDate(nextDate.getDate() + 1);
	}
	nextDate.setHours(16, 28, 0, 0);
	var timeBeforeOffset = nextDate.getTime();

	// Add timezone offset
	return timeBeforeOffset + offset * 60 * 60 * 1000;
}

/**
 * Assigns classmates to a classroom in Firebase. Used in generateClassrooms.
 * @param  {[Array]} classmates      List of classmate JSON to be assigned
 * @param  {[String]} discipline     String of discipline or classroomTitle
 */
function assignClassroom(classmates, discipline) {
	var cid = db.ref(dbName + "/classrooms").push().key;	
	var timeOfNextClassroom = classmates[0]["timeOfNextClassroom"];
	var timezone = classmates[0]["timezone"];
	// Time created is defaulted to the next 4:28pm in this timezone
	var timeCreated = _nextDay428(timezone); // No classroom previously as classmates are new users
	if (timeOfNextClassroom != undefined) { 
		// Time is not current time, but future time to create this classroom, 
		// which is 1 week after a classmate's date of last classroom
		timeCreated = _addWeekToTimestamp(timeOfNextClassroom);
	}

	var memberHasRated = {};
	for (var i = 0; i < classmates.length; i++) {
		memberHasRated[classmates[i]["uid"]] = 0;
	}

	// Pick a first question for this new classroom
	randomQuestionOfDiscipline(discipline, function(question) {
		if (question == null) {
			console.log("Critical error in assigning classroom for discipline: " + discipline);
			return;
		}

		var questions = {};
		questions[question["qid"]] = timeCreated; // Date of time created - note that this is not 4:28pm

		// Create the classroom
		db.ref(dbName + "/classrooms/" + cid).set({
			title: discipline,
			image: question["image"], // Image is image of question
			timeCreated: timeCreated,
			timezone: timezone,
			memberHasRated: memberHasRated,
			questions: questions,
			ratings: null, // No ratings yet
			timeReplied: -1 // Never replied yet
		}).then(function() {
			// Modify classmates' nextClassroom and dateOfLastClassroom
			var updates = {};
			updates["/nextClassroom"] = cid;
			updates["/timeOfNextClassroom"] = timeCreated;
			for (uid in memberHasRated) {
				db.ref(dbName + "/users/" + uid).update(updates);
			}
		});
	})
}

/**
 * Assigns classmate to available classroom that has 
 * 1) timeCreated in the future, 
 * 2) discipline that classmate has not taken,
 * 3) same timezone as classmate.
 * Used in generateClassrooms.
 * @param {[JSON]} classmate JSON of classmate
 */
function addToAvailableClassroom(classmate) {
	
	// Find all available classrooms of this classmate
	var disciplinesTaken = [classmate["discipline"]];
	var classroomsTaken = classmate["classrooms"];
	if (classroomsTaken != undefined) {
		for (cid in classroomsTaken) {
			disciplinesTaken.push(classroomsTaken[cid]["discipline"]);
		}
	}
	var timezone = classmate["timezone"];
	var disciplinesAvailable = DISCIPLINES.filter(function(x) { return disciplinesTaken.indexOf(x) < 0 });
	// For each of these disciplines, look in classrooms to find the classroom that has timeCreated > now
	var currentTimestamp = Date.now();
	db.ref(dbName + "/classrooms").orderByChild("timeCreated").startAt(currentTimestamp).once("value", function(snap) {
		// Find the classrooms that are included in the disciplines available, and assign to the first one
		snap.forEach(function(data) {
			var classroom = data.val();
			var d = classroom["title"];

			// Must make sure classroom is same time zone as classmate, and is a discipline user has not taken
			if (classroom["timezone"] == timezone && disciplinesAvailable.indexOf(d) > -1) { 
				// Modify classroom
				var cid = data.key;
				var uid = classmate["uid"];
				var classUpdates = {};
				classUpdates["/memberHasRated/" + uid] = 0;
				db.ref(dbName + "/classrooms/" + cid).update(classUpdates);

				// Modify user
				var userUpdates = {};
				userUpdates["/nextClassroom"] = cid;
				userUpdates["/timeOfNextClassroom"] = classroom["timeCreated"];
				db.ref(dbName + "/users/" + uid).update(userUpdates);
			}
		});
	});
}

/**
 * KEY FUNCTION: Algorithm that generates classrooms for users
 * TO BE RUN: Hourly at :00
 * Right now, the algorithm is very primitive and mainly matches 4 or more (most of the time 7) 
 * classmates to one classroom. The classmates will be from the timezone and will receive 
 * their new classroom exactly after a week (or less, though exactly one week most of the time). 
 * Users will only be matched classrooms they have never taken before.
 * TODO: 
 * 1) If two users have been in a classroom before, should not match again
 * 2) Facebook friends should not match with one another
 * 3) Take into account firstReplied of users to make sure every classroom has at least one user that likes to start conversations
 */
function generateClassrooms() {
	db.ref(dbName + "/users").once("value", function(usersSnap) {
		
		/** 
		 * Break users down by timezone, of format "<timestamp of next classroom joined or 0 if none>-<timezone Int>, i.e. 0-8, 1483892880000-12"
		 * This format is crucial as it allows us to sort by ascending order of this format. 
		 * This allows us to assign users that have no classrooms yet, before users who have had classrooms a long time ago, 
		 * and then users who only just got their classrooms.
		 */
		var usersByTimezone = {};

		usersSnap.forEach(function(userSnap) {
			var uid = userSnap.key;
			var user = userSnap.val();
			if (user["nextClassroom"] == undefined || user["nextClassroom"] == null) {
				// Group this user into the right timezone
				var timezone = user["timezone"];
				var timeOfNextClassroom = 0 // 0 is used because it will appear in front of any timestamp lexicographically
				if (user["timeOfNextClassroom"] != undefined && user["timeOfNextClassroom"] != null) {
					timeOfNextClassroom = user["timeOfNextClassroom"];
				}
				var format = timeOfNextClassroom + "-" + timezone;
				var classmates = usersByTimezone[format];
				if (classmates == undefined) {
					classmates = [];
				}
				user["uid"] = uid;
				// Do not push users that have taken all disciplines
				if (!_userHasAllDisciplines(user)) {
					classmates.push(user);	
				}
				if (classmates.length > 0) {
					usersByTimezone[format] = classmates;	
				}
			}
		});
		
		// Most classrooms will have 7 classmates, but can be any number more than or equal to 4
		var IDEAL_CLASS_SIZE = 7
		var SHUFFLED_DISCIPLINES = _shuffleArray(DISCIPLINES);

		for (timezone in usersByTimezone) {	
			
			var classmatesLeft = usersByTimezone[timezone];
			
			var n = classmatesLeft.length;
			var discipline_index = 0; // Repeatedly iterate through disciplines with this index mod number of disciplines
			
			// Track number of classmatesLeft between each discipline cycle
			var currLeft = n;
			var prevLeft = n+1; // Just any number that is more than currLeft

			while (classmatesLeft.length > 0) {
				
				var discipline = DISCIPLINES[discipline_index % DISCIPLINES.length]; 
				discipline_index++;

				var classmates = []; // Temporary buffer to collect classmates until ideal class size reached, then assign a classroom
				var i = 0;
				while (classmates.length < IDEAL_CLASS_SIZE) {
					i++;
					var classmate = classmatesLeft.shift(); // Take from front of queue
					if (classmate == undefined) {
						// No classmates left, break out of this while loop
						break;
					}
					
					if (!_userHasDiscipline(classmate, discipline)) {
						classmates.push(classmate);
					} else {
						classmatesLeft.push(classmate);
					}
					if (i >= n) { // Gone through all classmatesLeft once already, break out of loop
						break;
					}
				}

				if (classmates.length > 3) {
					assignClassroom(classmates, discipline);
				} else {
					classmatesLeft = classmatesLeft.concat(classmates);	
				}

				if (discipline_index % DISCIPLINES.length != 0) { // Not end of discipline cycle
					continue;
				}

				// At the end of each discipline cycle, check number of classmatesLeft
				// If same number, it means remaining users cannot be grouped into classrooms
				prevLeft = currLeft;
				currLeft = classmatesLeft.length;
				if (prevLeft == currLeft) {
					// Inspect each of these remaining users, and put them in classrooms of their available disciplines that is not yet created
					while (classmatesLeft.length > 0) {
						addToAvailableClassroom(classmatesLeft.pop());
					}
				}
			}
		}
	});
}

/**
 * KEY FUNCTION: Transfers users to their new classrooms when 4:28pm arrives.
 * TO BE RUN: :28 and :58 each hour on system time.
 * If user's timeOfNextClassroom is equal to current, and nextClassroom is not null:
 * 1) Add nextClassroom to classrooms and set nextClassroom to null, 
 * 2) Set hasNewClassroom to true, 
 */
function transferToNewClassroom() {
	var currentTimestamp = Date.now();
	var oneHour = 1200 * 60 * 1000; // TODO: two hour leeway, change this to 5min
	db.ref(dbName + "/users")
	.orderByChild("timeOfNextClassroom")
	.startAt(currentTimestamp - oneHour)
	.endAt(currentTimestamp + oneHour).once("value", function(snap) {
		snap.forEach(function(data) {
			var user = data.val();
			var timeOfNextClassroom = user["timeOfNextClassroom"];
			var cid = user["nextClassroom"];
			if (cid != undefined && cid != null) { // Next classroom not yet assigned
				// Time to assign new classroom to user
				var updates = {};
				var uid = data.key;
				// Grab the details of the other classroom
				db.ref(dbName + "/classrooms/" + cid).once("value", function(classSnap) {
					var classroomData = classSnap.val();
					if (classroomData == null) {
						return;
					}
					var classUpdates = {};
					classUpdates["discipline"] = classroomData["title"];
					classUpdates["questionNum"] = 1;
					classUpdates["questionImage"] = classroomData["image"];
					classUpdates["hasUpdates"] = true;
					updates["classrooms/" + cid] = classUpdates;
					// Set next classroom to null, and has new classrooms to true
					updates["nextClassroom"] = null;
					updates["hasNewClassroom"] = true;
					db.ref(dbName + "/users/" + uid).update(updates);
				});

			}
		});
	});
}
