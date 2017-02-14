var admin = require("firebase-admin");
admin.initializeApp({
  credential: admin.credential.cert("/home/ec2-user/428app-server/428app-server/app-abdf9-firebase-adminsdk-rsdcc-8311b31e51.json"),
  databaseURL: "https://app-abdf9.firebaseio.com"
});

var DISCIPLINES = ["Performing arts", "Visual arts", "Geography", "History", "Languages", "Literature", "Philosophy", "Economics", "Law", "Political sciences", "Sports", "Theology", "Biology", "Chemistry", "Earth and Space sciences", "Mathematics", "Physics", "Finance", "Agriculture", "Computer science", "Engineering", "Health", "Psychology", "Culture", "Life hacks", "Education", "Fashion", "Romance"];
var SUPERLATIVES = ["Most awkward", "Most similar to Bieber", "IQ: 200", "Best personality", "Most good looking", "Most funny", "Biggest dreamer", "Most flirt", "Loudest", "Most quiet", "Most artistic", "Most likely to be arrested", "Most dramatic", "Most money", "Party Animal", "Most lovable"]
var db = admin.database();
var dbName = "/real_db"

assignNewQuestion();

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
 * Used in choosing the first question of the classroom.
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

	var memberHasVoted = {};
	for (var i = 0; i < classmates.length; i++) {
		memberHasVoted[classmates[i]["uid"]] = 0;
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
			memberHasVoted: memberHasVoted,
			questions: questions,
			superlatives: null, // No superlatives yet
			timeReplied: -1 // Never replied yet
		}).then(function() {
			// Modify classmates' nextClassroom and dateOfLastClassroom
			var updates = {};
			updates["/nextClassroom"] = cid;
			updates["/timeOfNextClassroom"] = timeCreated;
			for (uid in memberHasVoted) {
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
				classUpdates["/memberHasVoted/" + uid] = 0;
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

/***************************************************************************************************
Below are they key functions that are run on cron jobs on the server.
***************************************************************************************************/

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

// NOTE: Daily alert is notifying new classroom and new question
// This function logs a task to the queue for queue_worker to send out push notification
function _sendPushNotification(posterImage, recipientUid, title, body) {
	// First figure if this user has Daily Alert settings enabled
	db.ref(dbName + "/userSettings/" + recipientUid).once("value", function(settingsSnap) {
		var settings = settingsSnap.val();
		if (settings == null || settings["dailyAlert"] == null || settings["dailyAlert"] == false) {
			return;
		}
		var inApp = settings["inAppNotifications"];
		// Grab this user's push token and push count
		db.ref(dbName + "/users/" + recipientUid).once("value", function(userSnap) {
			var user = userSnap.val();
			if (user == null || user["pushToken"] == null) {
				return;
			}
			var pushToken = user["pushToken"];
			var pushCount = user["pushCount"];
			// Log this task to the queue for queue_worker to send out notification
			var tid = db.ref(dbName + "/queue/tasks").push().key;	
			db.ref(dbName + "/queue/tasks/" + tid).set({
				type: "alert",
				posterUid: "",
				posterName: "",
				posterImage: posterImage,
				recipientUid: recipientUid,
				pushToken: pushToken,
				pushCount: pushCount, // Don't bother incrementing push count for daily alerts	
				inApp: inApp,
				cid: "",
				title: title,
				body: body
			});
		});
	});
}

/**
 * KEY FUNCTION: Transfers users to their new classrooms when 4:28pm arrives.
 * TO BE RUN: :28 and :58 each hour on system time.
 * If user's timeOfNextClassroom is equal to current, and nextClassroom is not null:
 * 1) Add nextClassroom to classrooms and set nextClassroom to null, 
 * 2) Set hasNewClassroom to classroom title, 
 */
function transferToNewClassroom() {
	var currentTimestamp = Date.now();
	var marginOfTime = 1 * 60 * 1000; // 1min leeway
	db.ref(dbName + "/users")
	.orderByChild("timeOfNextClassroom")
	.startAt(currentTimestamp - marginOfTime)
	.endAt(currentTimestamp + marginOfTime).once("value", function(snap) {
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
					var discipline = classroomData["title"];
					classUpdates["discipline"] = discipline;
					classUpdates["questionNum"] = 1;
					classUpdates["questionImage"] = classroomData["image"];
					classUpdates["hasUpdates"] = true;
					updates["classrooms/" + cid] = classUpdates;
					// Set next classroom to null, and has new classrooms to true
					updates["nextClassroom"] = null;
					updates["hasNewClassroom"] = classroomData["title"];
					db.ref(dbName + "/users/" + uid).update(updates).then(function() {
						_sendPushNotification("", uid, "NEW CLASSROOM", "It's time to love " + discipline);
					});
				});

			}
		});
	});
}

/**
 * KEY FUNCTION: Assign new question to all classrooms.
 * TO BE RUN: :28 and :58 each hour on system time.
 * For all classrooms, if based on timezone it is 4:28pm: 
 * 1) Grab a new question with a qid that is not in this classrooms' questions
 * 2) Set classmates' hasUpdates to true, and questionNum and questionImage
 * If run out of questions, then stop assigning. (Hope this does not happen!)
 * FOR TESTING: Comment out the part about checking if it is time to give new question
 */
function assignNewQuestion() {
	var serverTimezone = (-new Date().getTimezoneOffset()) / 60.0;
	var serverMinute = new Date().getMinutes();

	// Get all questions first
	db.ref(dbName + "/questions").once("value", function(allQuestionsSnap) {
		var questionsDict = allQuestionsSnap.val();
		// Get classrooms
		db.ref(dbName + "/classrooms").once("value", function(allClassesSnap) {
			allClassesSnap.forEach(function(classData) {
				var classroom = classData.val();
				var cid = classData.key;
				var classmateUids = Object.keys(classroom["memberHasVoted"]);
				
				// Check if it is time to give new question
				var classTimezone = classroom["timezone"];
				var hoursToAdd = classTimezone - serverTimezone; // Assume whole sum
				var serverHour = new Date().getHours();
				var classHour = (serverHour + hoursToAdd) % 24;
				if (!(classHour == 16 && serverMinute == 28) && !(classHour == 15.5 && serverMinute == 58)) {
					// Not time to send a new question yet, skip classroom
					return;
				}

				// Get question with the correct discipline and not already asked in this classroom
				var discipline = classroom["title"];
				var qidsAsked = Object.keys(classroom["questions"]);
				var questionsAvailable = questionsDict[discipline];
				for (var qid in questionsAvailable) {
					if (qidsAsked.indexOf(qid) >= 0) continue; // Question asked before, skip
					// Assign this question
					var questionData = questionsAvailable[qid];
					var currentTimestamp = Date.now();
					var questionNum = qidsAsked.length + 1;
					var questionImage = questionData["image"];

					db.ref(dbName + "/classrooms/" + cid + "/questions/" + qid).set(currentTimestamp).then(function() {
						classmateUids.forEach(function(classmateUid) {
							var classUpdates = {};
							classUpdates["questionNum"] = questionNum;
							classUpdates["questionImage"] = questionImage;
							classUpdates["hasUpdates"] = true;
							db.ref(dbName + "/users/" + classmateUid + "/classrooms/" + cid).update(classUpdates).then(function() {
								// Send push notification to this user if needed
								_sendPushNotification(questionImage, classmateUid, "NEW: " + discipline + " question", "You know you want to open this.");
							});
						});
					});
					return;
				}
			});
		});
	})
}

/**
 * KEY FUNCTION: Assigns superlatives to classrooms after 1 week.
 * TO BE RUN: Hourly at :00
 * If classroom's timeCreated is 1 week before current time, then do the following steps:
 * Step 1) Randomly pick 4 superlatives from all superlatives
 * Step 2) For each superlative: initiate all uids and number of votes to 0
 * FOR TESTING: To assign superlatives to all classrooms, just comment out the filters startAt and endAt
 */
function assignSuperlatives() {
	var currentTimestamp = Date.now();
	var oneWeek = 7 * 24 * 60 * 60 * 1000;
	var marginOfTime = 1 * 24 * 60 * 60 * 1000; // 1 day of margin
	db.ref(dbName + "/classrooms")
	.orderByChild("timeCreated") // If time created is more than a week from today's date, but less than one week + 
	.startAt(currentTimestamp - oneWeek - marginOfTime)
	.endAt(currentTimestamp - oneWeek + marginOfTime)
	.once("value", function(snap) {
		snap.forEach(function(data) {
			var classroom = data.val();
			if (classroom["superlatives"] != null) {
				// Superlatives already assigned, return
				return;
			}
			var cid = data.key;
			var numSuperlatives = 4;
			var SHUFFLED_SUPERLATIVES = _shuffleArray(SUPERLATIVES);
			var chosenSuperlatives = SHUFFLED_SUPERLATIVES.slice(0, numSuperlatives);

			// Grab list of uids
			var uidsAndVotedUids = classroom["memberHasVoted"];
			for (uid in uidsAndVotedUids) {
				uidsAndVotedUids[uid] = ""; // Have not voted for any uid yet so empty string
			}
			
			var superlativesDict = {};

			chosenSuperlatives.forEach(function(sup) {
				superlativesDict[sup] = uidsAndVotedUids;
			});

			var classUpdates = {};
			classUpdates["superlatives"] = superlativesDict;
			db.ref(dbName + "/classrooms/" + cid).update(classUpdates);
		});
	});
}
