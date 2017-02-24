/**
 * matcher-assignSuperlatives.js
 * This file is used to: Assign superlatives to existing classrooms
 * NOTE: Called on 428 server through a cron job.
 */

var admin = require("firebase-admin");
admin.initializeApp({
  credential: admin.credential.cert("/home/ec2-user/428app-server/428app-server/app-abdf9-firebase-adminsdk-rsdcc-8311b31e51.json"),
  databaseURL: "https://app-abdf9.firebaseio.com"
});
console.log("matcher-assignSuperlatives.js is running...");

// NOTE: This will be /test_db when you're testing
var dbName = "/real_db"
var db = admin.database();

// These disciplines are not currently being used, but is the full list of disciplines that could occur
var DISCIPLINES = ["Performing Arts", "Visual Arts", "Geography", "History", "Languages", "Literature", "Philosophy", "Economics", "Law", "Political Sciences", "Sports", "Theology", "Biology", "Chemistry", "Astronomy", "Mathematics", "Physics", "Finance", "Agriculture", "Computer Science", "Engineering", "Health", "Psychology", "Culture", "Education", "Fashion"];
var SUPERLATIVES = ["Most awkward", "Most similar to Bieber", "IQ: 200", "Best personality", "Most good looking", "Most funny", "Biggest dreamer", "Most flirt", "Loudest", "Most quiet", "Most artistic", "Likely to be arrested", "Most dramatic", "Richest right now", "Party animal", "Most lovable", "Future billionaire", "Boyfriend material", "Prime minister to-be", "Trump's best friend", "Sex god", "FBI agent", "Actually a celebrity", "Kim K.'s next BF", "Cat lover", "Most hipster", "Worst driver", "Selfie King/Queen", "Most innocent", "Drunkard"];

// Temporary
var DAYS_TO_ASSIGN_SUPERLATIVES = 1 // TODO: Change back to 7

/********************************************************************************************/
// MAKE THE CALL HERE
assignSuperlatives();
/********************************************************************************************/

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
	if (userDiscipline == undefined) {
		console.log("[Error] User does not have a discipline: " + user["uid"]);
		return false;
	}
	if (userDiscipline == discipline) {
		return true;
	}
	for (var cid in classrooms) {
		var d = classrooms[cid]["discipline"];
		if (discipline == d) {
			return true;
		}
	}
	return false;
}

/**
 * Randomize array elements order in-place. Used to shuffle disciplines before assigning to classrooms.
 * Uses Durstenfeld shuffle algorithm.
 * @param  {[Object]} array Input array
 * @return {[Object]} Randomly shuffled array
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
 * Returns all available disciplines based on what questions there are in Firebase.
 * @param  {Function} completed		callback function, that takes in array of String disciplines
 * @return {None}
 */
function _availableDisciplines(completed) {
	db.ref(dbName + "/questions").once("value", function(questionsSnap) {
		var disciplines = Object.keys(questionsSnap.val());
		completed(disciplines);
	});
}

/**
 * Checks if a user has taken all disciplines, and therefore have no more new classrooms for this user.
 * @param  {JSON} user 						JSON representation of a user
 * @param  {[String]} completed		String array of all disciplines
 * @return {Bool} true if user has taken all disciplines, false otherwise
 */
function _userHasAllDisciplines(user, allDisciplines) {
	var classrooms = user["classrooms"];
	if (classrooms == undefined || classrooms == null) {
		return false;
	}
	// Grab user disciplines from classrooms dict
	var userDisciplines = [];
	for (var cid in classrooms) {
		var classDict = classrooms[cid];
		userDisciplines.push(classDict["discipline"]);
	}
	return userDisciplines.sort().join(',') === allDisciplines.sort().join(',');
}

/**
 * Returns a random question from the specified discipline, to be asked in classrooms.
 * Used in choosing the first question of the classroom.
 * @param  {String} discipline 		String of discipline
 * @param  {Function} completed   Callback function that takes in Question JSON
 */
function _randomQuestionOfDiscipline(discipline, completed) {
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
				completed({"question": data, "discipline": discipline});
				return;
			}
			i++;
		}
	});
}

/**
 * Returns a random did you know from the specified discipline, to be shown in Superlatives.
 * @param  {String} discipline 		String of discipline
 * @param  {Function} completed   Callback function that takes in did you know id
 */
function _randomDidYouKnowOfDiscipline(discipline, completed) {
	var didyouknow_ref = db.ref(dbName + "/didyouknows");
	didyouknow_ref.orderByKey().equalTo(discipline).once("value", function(snapshot) {
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
				completed({"did": key, "discipline": discipline});
				return;
			}
			i++;
		}
	});
}

/**
 * Adds 5 days to 8 days to input time stamp.
 * The randomness is to prevent people from the same group from getting the same classroom.
 * @param {Double} timestamp 		UNIX time in milliseconds
 * @return {Double} UNIX time in milliseconds
 */
function _addRandomDaysToTimestamp(timestamp) {
	var oneDay = 24 * 60 * 60 * 1000;
	var random = Math.round((Math.random() * 3)) + 5
	return timestamp + (0 * oneDay) // TODO: Change to random * oneDay
}

/**
 * Returns the UNIX timestamp of the upcoming 4:32pm according to the specified timezone.
 * This method is used to assign classroom to a group of new users. Note that new classroom is assigned 
 * at 4:32pm and not 4:28pm, because it should come after a question at 4:28pm.
 * @param {Double] inputTimezone 		Time zone
 * @return {Double} UNIX timestamp
 */
function _nextDay428(inputTimezone) {
	var serverDate = new Date();
	var currentTimezone = (-serverDate.getTimezoneOffset()) / 60.0;
	var offset = currentTimezone - inputTimezone;

	var hasHalfHourOffset = offset % 1 != 0
	var hourOffset = Math.floor(offset);
	
	// Set server time to input time
	var inputHour = serverDate.getHours() - hourOffset;
	var inputMinutes = hasHalfHourOffset ? serverDate.getMinutes() - 30 : serverDate.getMinutes();
	inputHour = inputMinutes < 0 ? inputHour - 1 : inputHour;
	inputMinutes = (60 - (-inputMinutes)) % 60;
	
	// If time exceeds 4:28pm in input timezone, then add a day
	if ((inputHour >= 16 && inputMinutes >= 28) ||(inputHour >= 17)) {
	  serverDate.setDate(serverDate.getDate() + 1);
	}

	// Set 4:28pm on server time zone, but add offset below
	serverDate.setHours(16, 28, 0, 0);
	var timeBeforeOffset = serverDate.getTime();

	// Add timezone offset
	return timeBeforeOffset + offset * 60 * 60 * 1000;
}

/**
 * Assigns classmates to a classroom in Firebase. Used in generateClassrooms.
 * @param  {[JSON]} classmates      List of classmate JSON to be assigned
 * @param  {String} discipline 			String of discipline or classroomTitle
 * @return {None} 
 */
function _assignClassroom(classmates, discipline) {
	var cid = db.ref(dbName + "/classrooms").push().key;	
	var timeOfNextClassroom = classmates[0]["timeOfNextClassroom"];
	var timezone = classmates[0]["timezone"];
	
	// Time created is defaulted to the next 4:32pm in this timezone
	var timeCreated = _nextDay428(timezone); // No classroom previously as classmates are new users
	if (timeOfNextClassroom != undefined) { 
		// Here is a group of users who already have a classroom
		timeCreated = _addRandomDaysToTimestamp(timeCreated);
	}

	var classmateUids = [];
	for (var i = 0; i < classmates.length; i++) {
		classmateUids.push(classmates[i]["uid"]);
	}

	// Pick a first question for this new classroom
	_randomQuestionOfDiscipline(discipline, function(questionAndDiscipline) {
		var question = questionAndDiscipline["question"];
		var discipline = questionAndDiscipline["discipline"];
		if (question == null) {
			console.log("[Error] Critical error in assigning question for classroom of discipline: " + discipline);
			return;
		}
		_randomDidYouKnowOfDiscipline(discipline, function(didAndDiscipline) {
			var did = didAndDiscipline["did"];
			var discipline = didAndDiscipline["discipline"];
			if (did == null) {
				console.log("[Error] Critical error in assigning didyouknow for classroom of discipline: " + discipline);
				return;
			}
			
			var questions = {};
			questions[question["qid"]] = timeCreated; // Date of time created - note that this is not 4:28pm

			// Create the classroom
			db.ref(dbName + "/classrooms/" + cid).set({
				title: discipline,
				image: question["image"], // Image of classroom is image of question
				timeCreated: timeCreated, // This time created is not now, but the time the classroom will be transferred
				timezone: timezone,
				memberHasVoted: null, // To assign members to classroom during transfer
				questions: questions,
				superlatives: null, // No superlatives yet
				didYouKnow: did
			}).then(function() {
				// Modify classmates' nextClassroom, nextClassroomDiscipline and timeOfNextClassroom
				var updates = {};
				updates["/nextClassroom"] = cid;
				updates["/nextClassroomDiscipline"] = discipline;
				updates["/timeOfNextClassroom"] = timeCreated;
				for (var k = 0; k < classmateUids.length; k++) {
					var classmateUid = classmateUids[k];
					db.ref(dbName + "/users/" + classmateUid).update(updates);
				}
			});
		});
	})
}


/**
 * Assigns classmate to available classroom that has 
 * 1) timeCreated in the future, 
 * 2) discipline that classmate has not taken,
 * 3) same timezone as classmate.
 * 4) Less than or equal to 12 classmates.
 * Used in generateClassrooms.
 * NOTE: Different behavior for a new user. 
 * A new user must get matched the next day 428, regardless of the number of classmates in the class.
 * @param {[JSON]} classmate 		JSON of classmate
 * @return {None}
 */
function _addToAvailableClassroom(classmate) {	

	// Assemble disciplines taken by this classmate
	var disciplinesTaken = [classmate["discipline"]];
	var classroomsTaken = classmate["classrooms"];
	if (classroomsTaken != undefined) {
		for (cid in classroomsTaken) {
			disciplinesTaken.push(classroomsTaken[cid]["discipline"]);
		}
	}

	var timezone = classmate["timezone"];
	var timestampToUse = Date.now();
	// If classmate has no timeOfNextClassroom, this is a new user!
	var isNewUser = classmate["timeOfNextClassroom"] == null;
	if (isNewUser) {
		// For new users, need to assign classrooms of the next day 428, OR just don't assign if cannot find
		timestampToUse = _nextDay428(timezone);
	}
	
	// For each of these disciplines, look in classrooms that have not been assigned yet
	// These have timeCreated > now (or after next day 428)
	var currentTimestamp = Date.now();
	db.ref(dbName + "/classrooms").orderByChild("timeCreated").startAt(timestampToUse).once("value", function(snap) {

		// Find the classrooms that are included in the disciplines available, and assign to the first one
		var classroomFound = false;
		snap.forEach(function(data) {
			if (classroomFound) {
				return;
			}
			var cid = data.key;
			var classroom = data.val();
			var d = classroom["title"];

			// If new user, can only accept exactly next day 4:28pm
			if (isNewUser && classroom["timeCreated"] != timestampToUse) {
				return;
			}

			// Make sure classroom is same time zone as classmate, and is a discipline user has not taken
			if (classroom["timezone"] != timezone || disciplinesTaken.indexOf(d) >= 0) {
				return;
			}

			// NOTE: Void this rule if it is a new user, as they NEED a classroom
			var MAX_CLASS_SIZE = 12
			if (!isNewUser && Object.keys(classroom["memberHasVoted"]).length >= MAX_CLASS_SIZE) {
				return;
			}

			// Found the right classroom!
			classroomFound = true;

			// Modify user
			var userUpdates = {};
			userUpdates["/nextClassroom"] = cid;
			userUpdates["/nextClassroomDiscipline"] = d;
			userUpdates["/timeOfNextClassroom"] = classroom["timeCreated"];
			db.ref(dbName + "/users/" + uid).update(userUpdates);
		});
	});
}

// Test function used to ungenerate classrooms after generate is run
function _ungenerateClassrooms() {
	db.ref(dbName + "/users").once("value", function(usersSnap) {
		usersSnap.forEach(function(userData) {
			var uid = userData.key;
			db.ref(dbName + "/users/" + uid + "/timeOfNextClassroom").set(null);
			db.ref(dbName + "/users/" + uid + "/nextClassroom").set(null);
			db.ref(dbName + "/users/" + uid + "/nextClassroomDiscipline").set(null);
			db.ref(dbName + "/users/" + uid + "/hasNewClassroom").set(null);
		});
	});
	db.ref(dbName + "/classrooms").set(null);
}

/***************************************************************************************************
Below are they key functions that are run on cron jobs on the server.
***************************************************************************************************/

/**
 * KEY FUNCTION: Algorithm that generates classrooms for users
 * TO BE RUN: Run every 5 minutes to maximize chances of everyone having a classroom.
 * Right now, the algorithm is very primitive and mainly matches 4 or more (most of the time 7) 
 * classmates to one classroom. The classmates will be from the timezone and will receive 
 * their new classroom exactly after a week (or less, though exactly one week most of the time). 
 * Users will only be matched classrooms of disciplines they have never taken before.
 * NOTE: Not all users will be matched, and there is a small possibility a user will not get a classroom.
 * TODO: 
 * 1) If two users have been in a classroom before, should not match again
 * 2) Facebook friends should not match with one another
 * 3) Take into account firstReplied of users to make sure every classroom has at least one user that likes to start conversations
 * 4) Use maximum bipartite graph matching algorithm to optimize matching of users to classrooms
 */
function generateClassrooms() {
	db.ref(dbName + "/users").once("value", function(usersSnap) {
		
		/** 
		 * Break users down by timezone. Note that new users get grouped together by appending "new" to the timezone key.
		 */

		// First group users from the same timezone, and those who will get a classroom at the next same time together
		var usersByTimezone = {};
		_availableDisciplines(function(allDisciplines) {
			usersSnap.forEach(function(userSnap) {
				var uid = userSnap.key;
				var user = userSnap.val();
				user["uid"] = uid;

				// If user already has next classroom, return
				if (user["nextClassroom"] != undefined && user["nextClassroom"] != null) {
					return;
				}
				// If user already has all disciplines, return
				if (_userHasAllDisciplines(user, allDisciplines)) {
					return;
				}

				// If user hasn't been online for 2 weeks (inactive), do not match user to classroom
				if (user["lastSeen"] == undefined || user["lastSeen"] < (Date.now() - (2 * 7 * 24 * 60 * 60 * 1000))) {
					return;
				}

				// Group this user into the right timezone
				var timezone = "" + user["timezone"];
				if (user["timeOfNextClassroom"] == undefined) { // New users are grouped together
					timezone += "new"
				}
				var classmates = usersByTimezone[timezone] == undefined ? [] : usersByTimezone[timezone]
				classmates.push(user);
				usersByTimezone[timezone] = classmates;
			});

			// Most classrooms will have 7 classmates, but can be any number more than or equal to 4
			var IDEAL_CLASS_SIZE = 7
			var MIN_CLASS_SIZE = 4
			var SHUFFLED_DISCIPLINES = _shuffleArray(allDisciplines);

			for (timezone in usersByTimezone) {	
			
				var classmatesLeft = usersByTimezone[timezone];

				// Shuffle classmates left to make sure users do not get the same classmates each time
				classmatesLeft = _shuffleArray(classmatesLeft)
				
				var n = classmatesLeft.length;
				var discipline_index = 0; // Repeatedly iterate through disciplines with this index mod number of disciplines
				
				// Track number of classmatesLeft between each discipline cycle
				var currLeft = n;
				var prevLeft = n+1; // Just any number that is more than currLeft

				while (classmatesLeft.length > 0) {
					var discipline = SHUFFLED_DISCIPLINES[discipline_index % SHUFFLED_DISCIPLINES.length]; 
					discipline_index++;

					var classmatesBuffer = []; // Temporary buffer to collect classmates until ideal class size reached, then assign a classroom
					var i = 0;
					while (classmatesBuffer.length < IDEAL_CLASS_SIZE) {
						i++;
						var classmate = classmatesLeft.shift(); // Take from front of queue

						if (classmate == undefined) {
							// No classmates left, break out of this while loop and assign students in buffer through another way below
							break;
						}

						// Only push this user when he or she has not taken the discipline
						if (!_userHasDiscipline(classmate, discipline)) {
							classmatesBuffer.push(classmate);
						} else { // Has taken the discipline, push this user back to classmates left
							classmatesLeft.push(classmate);
						}
						if (i >= n) { // Gone through all classmatesLeft once already, break out of loop to avoid infinite loop
							break;
						}
					}

					// Having either assembled ideal class size, or visited all classmates left:
					if (classmatesBuffer.length >= MIN_CLASS_SIZE) {
						_assignClassroom(classmatesBuffer, discipline);
					} else {
						// Transfer buffer back to classmates left
						classmatesLeft = classmatesLeft.concat(classmatesBuffer);	
					}

					// Cycle to the next discipline if there are still disciplines left to cycle
					if (discipline_index % SHUFFLED_DISCIPLINES.length != 0) {
						continue;
					}

					// At the end of each discipline cycle, check number of classmatesLeft
					// If same number, it means remaining users cannot be grouped into classrooms
					prevLeft = currLeft;
					currLeft = classmatesLeft.length;
					if (prevLeft == currLeft) {
						// Put these remaining users in classrooms that have already been created
						while (classmatesLeft.length > 0) {
							// NOTE: This does not ensure all remaining users get a classroom at this time
							_addToAvailableClassroom(classmatesLeft.pop());
						}
					}
				}
			}
		});
	});
}

/**
 * Used by transferToNewClassroom and assignNewQuestion to notify user, and increment badge count.
 * Specifically, logs a task to the queue for queue_worker server to send out the push notification.
 * @param  {String} posterImage         Image of poster
 * @param  {String} recipientUid        Uid of recipient
 * @param  {String} title               Title of push notification
 * @param  {String} body                Body of push notification
 * @param  {Int} additionalPushCount 		Either 0 or 1, added to the current push count
 * @return {None}                     
 */
function _sendPushNotification(posterImage, recipientUid, title, body, additionalPushCount) {
	
	// First figure if this user has Daily Alert settings enabled. If not enabled, don't push.
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
				pushCount: pushCount + additionalPushCount, 
				inApp: inApp,
				cid: "",
				title: title,
				body: body
			}).then(function() {
				// Adjust user's push count if necessary
				if (additionalPushCount == 1) {
					db.ref(dbName + "/users/" + recipientUid + "/pushCount").set(pushCount + 1);
				}
			});
		});
	});
}

/**
 * KEY FUNCTION: Transfers users to their new classrooms when 4:28pm arrives.
 * TO BE RUN: :32 and :02 each hour on system time: Have to be run after assignQuestion.
 * If user's timeOfNextClassroom is equal to current, and nextClassroom is not null:
 * 1) Add nextClassroom to classrooms and set nextClassroom and nextClassroomDiscipline to null, 
 * 2) Set hasNewClassroom to classroom title, 
 * 3) Add user to memberHasVoted in classroom
 * FOR TESTING: Change margin of time to 999999 * 60 * 1000
 */
function transferToNewClassroom() {
	var currentTimestamp = Date.now();
	var marginOfTime = 999999 * 60 * 1000; // 1min leeway
	db.ref(dbName + "/users")
	.orderByChild("timeOfNextClassroom")
	.startAt(currentTimestamp - marginOfTime)
	.endAt(currentTimestamp + marginOfTime).once("value", function(snap) {
		snap.forEach(function(data) {
			var user = data.val();
			var uid = data.key;
			var timeOfNextClassroom = user["timeOfNextClassroom"];
			var cid = user["nextClassroom"];

			if (cid == undefined || cid == null) {
				console.log("[Info] Time has arrived but user has no next classroom. Likely user has done all disciplines, uid: " + uid);
				return;
			}
			// Time to assign new classroom to user
			var updates = {};
			// Grab the details of the new classroom
			db.ref(dbName + "/classrooms/" + cid).once("value", function(classSnap) {
				var classroomData = classSnap.val();
				if (classroomData == null) {
					console.log("[Error] User has next classroom, but classroom does not exist. uid: " + uid + ", cid: " + cid);
					return;
				}
				var discipline = classroomData["title"];
				// Get the first question
				var qid = Object.keys(classroomData["questions"])[0];
				db.ref(dbName + "/questions/" + discipline + "/" + qid).once("value", function(questionSnap) {
					var qData = questionSnap.val();
					var questionText = qData["question"];
					var questionShareImage = qData["shareImage"];
					var userClassUpdates = {};
					var discipline = classroomData["title"];

					// Do a multi-path update:

					// Update user fields
					userClassUpdates["discipline"] = discipline;
					userClassUpdates["questionNum"] = 1;
					userClassUpdates["questionImage"] = classroomData["image"];
					userClassUpdates["questionText"] = questionText;
					userClassUpdates["questionShareImage"] = questionShareImage;
					userClassUpdates["hasUpdates"] = true;
					userClassUpdates["timeReplied"] = currentTimestamp;
					updates["/users/" + uid + "/classrooms/" + cid] = userClassUpdates;

					// Set user's next classroom to null, and has new classrooms to classroom title
					updates["/users/" + uid + "/nextClassroom"] = null;
					updates["/users/" + uid + "/nextClassroomDiscipline"] = null;
					updates["/users/" + uid + "/hasNewClassroom"] = discipline;

					// Update classroom memberHasVoted
					updates["/classrooms/" + cid + "/memberHasVoted/" + uid] = 0

					db.ref(dbName).update(updates).then(function() {
						_sendPushNotification("", uid, "NEW: Classroom", "Hey you! Time to learn " + discipline + "!", 1);
					});
				});
			});
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
function assignNewQuestion(completed) {
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

				// First check if the classroom is already created for users. If it is not yet created, return.
				var classTimeCreated = classroom["timeCreated"];
				if (classTimeCreated != null && Date.now() <= classTimeCreated + (5 * 60 * 1000)) { // Add 5 min buffer
					// Class not created yet (or just created), don't push new question or users will get 2 first questions
					return;
				}
				
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
					var questionText = questionData["question"];
					var questionShareImage = questionData["shareImage"];

					db.ref(dbName + "/classrooms/" + cid + "/questions/" + qid).set(currentTimestamp).then(function() {
						classmateUids.forEach(function(classmateUid) {
							// First check if this user has updates for this classroom to decide if we should increment push count
							db.ref(dbName + "/users/" + classmateUid + "/classrooms/" + cid + "/hasUpdates").once("value", function(userHasViewedSnap) {
								var userHasViewed = userHasViewedSnap.val()
								var additionalPushCount = userHasViewed == true ? 0 : 1
								var classUpdates = {};
								classUpdates["questionNum"] = questionNum;
								classUpdates["questionImage"] = questionImage;
								classUpdates["questionText"] = questionText;
								classUpdates["questionShareImage"] = questionShareImage;
								classUpdates["hasUpdates"] = true;
								classUpdates["timeReplied"] = Date.now();
								db.ref(dbName + "/users/" + classmateUid + "/classrooms/" + cid).update(classUpdates).then(function() {
									// Send push notification to this user if needed
									_sendPushNotification(questionImage, classmateUid, "NEW: " + discipline + " question", "You know you want to open this.", additionalPushCount);
								});
							})
						});
					});

					// This return is important to return from the loop of classes after question sent out
					return;
				}
				// End of one classroom, move on to next classroom to assign new question
			});
		});
	})
}

/**
 * KEY FUNCTION: Assigns superlatives to classrooms after 1 week.
 * TO BE RUN: :08 every hour.
 * If classroom's timeCreated is 1 week before current time, then do the following steps:
 * Step 1) Randomly pick 4 superlatives from all superlatives
 * Step 2) For each superlative: initiate all uids and number of votes to 0
 * FOR TESTING: To assign superlatives to all classrooms, just comment out the filters startAt and endAt
 */
function assignSuperlatives() {
	var currentTimestamp = Date.now();
	var oneWeek = DAYS_TO_ASSIGN_SUPERLATIVES * 24 * 60 * 60 * 1000;
	var marginOfTime = 1 * 60 * 60 * 1000; // 1 hour of margin
	db.ref(dbName + "/classrooms")
	.orderByChild("timeCreated") // If time created is about a week ago from current time
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
			var NUM_SUPERLATIVES = 4;
			var SHUFFLED_SUPERLATIVES = _shuffleArray(SUPERLATIVES);
			var chosenSuperlatives = SHUFFLED_SUPERLATIVES.slice(0, NUM_SUPERLATIVES);

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

/**
 * KEY FUNCTION: Swap users' next classrooms randomly.
 * TO BE RUN: :29 and :59, 29 minutes before users get their classrooms
 * Simply get all users who are getting their classrooms in the next 30 minutes, shuffle them, 
 * and iteratively swap their nextClassrooms.
 * FOR TESTING: Change margin of time to 999999
 */
function swapClassrooms() {
	var currentTimestamp = Date.now();
	var twentynineminutes = 29 * 60 * 1000;
	var marginOfTime = 2 * 60 * 1000; // 2min leeway
	db.ref(dbName + "/users")
	.orderByChild("timeOfNextClassroom")
	.startAt(currentTimestamp + twentynineminutes - marginOfTime)
	.endAt(currentTimestamp + twentynineminutes + marginOfTime).once("value", function(snap) {
		
		// Remove users who have null nextClassroom
		var users = [];
		snap.forEach(function(userSnap) {
			var user = userSnap.val();
			var uid = userSnap.key;
			if (user["nextClassroom"] == undefined || user["nextClassroomDiscipline"] == undefined) {
				return;
			}
			user["uid"] = uid;
			users.push(user);
		});

		// Shuffle users
		var shuffledUsers = _shuffleArray(users);

		var n = shuffledUsers.length;
		
		// Run n_sim number of simulations of shuffling and swapping
		var n_sim = 10;
		for (var k = 0; k < n_sim; k++) {
			shuffledUsers = _shuffleArray(shuffledUsers);
			for (var i = 0; i < n/2; i++) {
				var firstUser = shuffledUsers[i];
				var secondUser = shuffledUsers[n - i - 1];
				
				// Only perform swap if both users have not taken the new classroom's discipline
				if (_userHasDiscipline(firstUser, secondUser["nextClassroomDiscipline"]) || 
					_userHasDiscipline(secondUser, firstUser["nextClassroomDiscipline"])) {
					continue;
				}

				// Perform the swap
				var temp = firstUser["nextClassroom"];
				var tempDiscipline = firstUser["nextClassroomDiscipline"];
				firstUser["nextClassroom"] = secondUser["nextClassroom"];
				firstUser["nextClassroomDiscipline"] = secondUser["nextClassroomDiscipline"];
				secondUser["nextClassroom"] = temp;
				secondUser["nextClassroomDiscipline"] = tempDiscipline;
			}
		}

		// Update with new classrooms
		for (var i = 0; i < n; i++) {
			var user = shuffledUsers[i];
			var updates = {};
			updates["/nextClassroom"] = user["nextClassroom"];
			updates["/nextClassroomDiscipline"] = user["nextClassroomDiscipline"];
			db.ref(dbName + "/users/" + user["uid"]).update(updates);
		}
	});
}
