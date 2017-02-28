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
 * Checks if a user has already been in a playgroup of a certain discipline, or if user is that discipline.
 * Used to ensure users do not get assigned the same playgroup previously assigned.
 * @param  {[JSON]} user 			JSON representation of a user
 * @param  {[String]} discipline 	String representation of the discipline to check for
 * @return {[Bool]}            		True if user has the discipline, False otherwise
 */
function _userHasDiscipline(user, discipline) {
	var userDiscipline = user["discipline"];
	var playgroups = user["playgroups"];
	if (userDiscipline == undefined) {
		console.log("[Error] User does not have a discipline: " + user["uid"]);
		return false;
	}
	if (userDiscipline == discipline) {
		return true;
	}
	for (var pid in playgroups) {
		var d = playgroups[pid]["discipline"];
		if (discipline == d) {
			return true;
		}
	}
	return false;
}

/**
 * Randomize array elements order in-place. Used to shuffle disciplines before assigning to playgroups.
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
 * Checks if a user has taken all disciplines, and therefore have no more new playgroups for this user.
 * @param  {JSON} user 						JSON representation of a user
 * @param  {[String]} completed		String array of all disciplines
 * @return {Bool} true if user has taken all disciplines, false otherwise
 */
function _userHasAllDisciplines(user, allDisciplines) {
	var userDiscipline = user["discipline"];
	if (userDiscipline == undefined) {
		console.log("[Error] User does not have a discipline: " + user["uid"]);
		return false;
	}
	
	var playgroups = user["playgroups"];
	if (playgroups == undefined || playgroups == null) {
		return false;
	}
	// Grab user disciplines from playgroups dict
	var userDisciplines = [];
	userDisciplines.push(user["discipline"]);
	for (var pid in playgroups) {
		var playgroupDict = playgroups[pid];
		userDisciplines.push(playgroupDict["discipline"]);
	}
	return userDisciplines.sort().join(',') === allDisciplines.sort().join(',');
}

/**
 * Returns a random question from the specified discipline, to be asked in playgroups.
 * Used in choosing the first question of the playgroup.
 * @param  {String} discipline 		String of discipline
 * @param  {Function} completed     Callback function that takes in Question JSON
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
 * @param  {Function} completed     Callback function that takes in did you know id
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
 * Adds 5 days to 7 days to input time stamp.
 * The randomness is to prevent people from the same group from getting the same playgroup.
 * @param {Double} timestamp 		UNIX time in milliseconds
 * @return {Double} UNIX time in milliseconds
 */
function _addRandomDaysToTimestamp(timestamp) {
	var oneDay = 24 * 60 * 60 * 1000;
	var random = Math.round((Math.random() * 2)) + 5
	return timestamp + (0 * oneDay) // TODO: Change to random * oneDay
}

/**
 * Returns the UNIX timestamp of the upcoming 4:28pm according to the specified timezone.
 * This method is used to assign playgroup to a group of new users.
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
 * Creates server playgroup message of a new question for playgroups.
 * @param  {String} pid          playgroup id
 * @param  {String} questionText Text of question
 * @param  {Double} timestamp    UNIX time stamp (milliseconds)
 * @return {JSON}              	 Dictionary of Firebase update from dbName root
 */
function _createPlaygroupMessageForQuestion(pid, questionText, timestamp) {
	var mid = db.ref(dbName + "/playgroupMessages/" + pid).push().key;
	var updates = {};
	updates["/playgroupMessages/" + pid + "/" + mid + "/message"] = questionText
	updates["/playgroupMessages/" + pid + "/" + mid + "/poster"] = "428" // This MUST be "428", String
	updates["/playgroupMessages/" + pid + "/" + mid + "/timestamp"] = timestamp // This MUST be "428", String
	return updates
}

/**
 * Assigns playpeers to a playgroup in Firebase. Used in generatePlaygroups.
 * @param  {[JSON]} playpeers      List of playpeer JSON to be assigned
 * @param  {String} discipline 	   String of discipline or playgroupTitle
 * @return {None} 
 */
function _assignPlaygroup(playpeers, discipline) {
	var pid = db.ref(dbName + "/playgroups").push().key;	
	var timeOfNextPlaygroup = playpeers[0]["timeOfNextPlaygroup"];
	var timezone = playpeers[0]["timezone"];
	
	// Time created is defaulted to the next 4:28pm in this timezone
	var timeCreated = _nextDay428(timezone); // No playgroup previously as playpeers are new users
	if (timeOfNextPlaygroup != undefined) { 
		// Next playgroup will be in 5-7 days after the next day 4:28pm for non-new users
		timeCreated = _addRandomDaysToTimestamp(timeCreated);
	}

	var memberHasVoted = {};
	for (var i = 0; i < playpeers.length; i++) {
		memberHasVoted[playpeers[i]["uid"]] = 0;
	}

	// Pick a first question for this new playgroup
	_randomQuestionOfDiscipline(discipline, function(questionAndDiscipline) {
		var question = questionAndDiscipline["question"];
		var discipline = questionAndDiscipline["discipline"];
		if (question == null) {
			console.log("[Error] Critical error in assigning question for playgroup of discipline: " + discipline);
			return;
		}
		_randomDidYouKnowOfDiscipline(discipline, function(didAndDiscipline) {
			var did = didAndDiscipline["did"];
			var discipline = didAndDiscipline["discipline"];
			if (did == null) {
				console.log("[Error] Critical error in assigning didyouknow for playgroup of discipline: " + discipline);
				return;
			}
			
			var questions = {};
			questions[question["qid"]] = {"timestamp": timeCreated}; // Date of time created - note that this is not 4:28pm

			// Create the playgroup
			db.ref(dbName + "/playgroups/" + pid).set({
				title: discipline,
				image: question["image"], // Image of playgroup is image of question
				timeCreated: timeCreated, // This time created is not now, but the time the playgroup will be transferred
				timezone: timezone,
				memberHasVoted: memberHasVoted, // To assign members to playgroup during transfer
				questions: questions,
				superlatives: null, // No superlatives yet
				didYouKnow: did
			}).then(function() {
				// Add a playgroup message to this playgroup
				var updates = _createPlaygroupMessageForQuestion(pid, question["question"], timeCreated);
				// Modify playpeers' nextPlaygroup, nextPlaygroupDiscipline and timeOfNextPlaygroup
				for (uid in memberHasVoted) {
					updates["/users/" + uid + "/nextPlaygroup"] = pid;
					updates["/users/" + uid + "/nextPlaygroupDiscipline"] = discipline;
					updates["/users/" + uid + "/timeOfNextPlaygroup"] = timeCreated;
				}
				db.ref(dbName).update(updates);
			});
		});
	})
}


/**
 * Assigns playpeer to available playgroup that has 
 * 1) timeCreated in the future, 
 * 2) discipline that playpeer has not taken,
 * 3) same timezone as playpeer.
 * 4) Less than or equal to 11 playpeers.
 * Used in generatePlaygroups.
 * NOTE: Different behavior for a new user. 
 * A new user must get matched the next day 428, regardless of the number of playpeers in the playgroup.
 * @param {JSON} playpeer 		JSON of playpeer
 * @return {None}
 */
function _addToAvailablePlaygroup(playpeer) {	

	// Assemble disciplines taken by this playpeer
	var disciplinesTaken = [playpeer["discipline"]];
	var playgroupsTaken = playpeer["playgroups"];
	if (playgroupsTaken != undefined) {
		for (pid in playgroupsTaken) {
			disciplinesTaken.push(playgroupsTaken[pid]["discipline"]);
		}
	}

	var timezone = playpeer["timezone"];
	var timestampToUse = Date.now();
	// If playpeer has no timeOfNextPlaygroup, this is a new user!
	var isNewUser = playpeer["timeOfNextPlaygroup"] == null;
	if (isNewUser) {
		// For new users, need to assign playgroups of the next day 428, OR just don't assign if cannot find
		timestampToUse = _nextDay428(timezone);
	}
	
	// For each of these disciplines, look in playgroups that have not been assigned yet
	// These have timeCreated > now (or after next day 428)
	var currentTimestamp = Date.now();
	db.ref(dbName + "/playgroups").orderByChild("timeCreated").startAt(timestampToUse).once("value", function(snap) {

		// Shuffle playgroups
		var playgroups = [];
		snap.forEach(function(data) {
			var pid = data.key;
			var playgroup = data.val();
			playgroup["pid"] = pid;
			playgroups.push(playgroup);
		});
		playgroups = _shuffleArray(playgroups);

		// Find the playgroups that are included in the disciplines available, and assign to the first one
		var playgroupFound = false;
		playgroups.forEach(function(playgroup) {
			if (playgroupFound) {
				return;
			}
			var pid = playgroup["pid"];
			var d = playgroup["title"];

			// If new user, can only accept exactly next day 4:28pm
			if (isNewUser && playgroup["timeCreated"] != timestampToUse) {
				return;
			}

			// Make sure playgroup is same time zone as playpeer, and is a discipline user has not taken
			if (playgroup["timezone"] != timezone || disciplinesTaken.indexOf(d) >= 0) {
				return;
			}

			// NOTE: Void this rule if it is a new user, as they NEED a playgroup
			var MAX_playgroup_SIZE = 12
			if (!isNewUser && Object.keys(playgroup["memberHasVoted"]).length >= MAX_playgroup_SIZE) {
				return;
			}

			// Found the right playgroup!
			playgroupFound = true;

			// Modify user
			var updates = {};
			var uid = playpeer["uid"];
			var userPath = "/users/" + uid;
			updates[userPath + "/nextPlaygroup"] = pid;
			updates[userPath + "/nextPlaygroupDiscipline"] = d;
			updates[userPath + "/timeOfNextPlaygroup"] = playgroup["timeCreated"];
			updates["/playgroups/" + pid + "/memberHasVoted/" + uid] = 0;
			db.ref(dbName).update(updates);
		});
	});
}

// Test function used to ungenerate playgroups after generate is run
function _ungeneratePlaygroups() {
	db.ref(dbName + "/users").once("value", function(usersSnap) {
		usersSnap.forEach(function(userData) {
			var uid = userData.key;
			db.ref(dbName + "/users/" + uid + "/playgroups").set(null);
			db.ref(dbName + "/users/" + uid + "/timeOfNextPlaygroup").set(null);
			db.ref(dbName + "/users/" + uid + "/nextPlaygroup").set(null);
			db.ref(dbName + "/users/" + uid + "/nextPlaygroupDiscipline").set(null);
			db.ref(dbName + "/users/" + uid + "/hasNewPlaygroup").set(null);
		});
	});
	db.ref(dbName + "/playgroups").set(null);
}

/***************************************************************************************************
Below are they key functions that are run on cron jobs on the server.
***************************************************************************************************/

/**
 * KEY FUNCTION: Algorithm that generates playgroups for users
 * TO BE RUN: Run every 5 minutes to maximize chances of everyone having a playgroup.
 * Right now, the algorithm is very primitive and mainly matches 4 or more (most of the time 7) 
 * playpeers to one playgroup. The playpeers will be from the timezone and will receive 
 * their new playgroup exactly after a week (or less, though exactly one week most of the time). 
 * Users will only be matched playgroups of disciplines they have never taken before.
 * NOTE: Not all users will be matched, and there is a small possibility a user will not get a playgroup.
 * TODO: 
 * 1) If two users have been in a playgroup before, should not match again
 * 2) Facebook friends should not match with one another
 * 3) Take into account firstReplied of users to make sure every playgroup has at least one user that likes to start conversations
 * 4) Use maximum bipartite graph matching algorithm to optimize matching of users to playgroups
 */
function generatePlaygroups() {
	db.ref(dbName + "/users").once("value", function(usersSnap) {
		
		/** 
		 * Break users down by timezone. Note that new users get grouped together by appending "new" to the timezone key.
		 */

		// First group users from the same timezone, and those who will get a playgroup at the next same time together
		var usersByTimezone = {};
		_availableDisciplines(function(allDisciplines) {
			usersSnap.forEach(function(userSnap) {
				var uid = userSnap.key;
				var user = userSnap.val();
				user["uid"] = uid;

				// If user already has next playgroup, return
				if (user["nextPlaygroup"] != undefined && user["nextPlaygroup"] != null) {
					return;
				}
				// If user already has all disciplines, return
				if (_userHasAllDisciplines(user, allDisciplines)) {
					return;
				}

				// If user hasn't been online for 2 weeks (inactive), do not match user to playgroup
				if (user["lastSeen"] == undefined || user["lastSeen"] < (Date.now() - (2 * 7 * 24 * 60 * 60 * 1000))) {
					return;
				}

				// Group this user into the right timezone
				var timezone = "" + user["timezone"];
				if (user["timeOfNextPlaygroup"] == undefined) { // New users are grouped together
					timezone += "new"
				}
				var playpeers = usersByTimezone[timezone] == undefined ? [] : usersByTimezone[timezone]
				playpeers.push(user);
				usersByTimezone[timezone] = playpeers;
			});

			// Most playgroups will have 7 playpeers, but can be any number more than or equal to 4
			var IDEAL_PLAYGROUP_SIZE = 7
			var MIN_PLAYGROUP_SIZE = 4
			var SHUFFLED_DISCIPLINES = _shuffleArray(allDisciplines);

			for (timezone in usersByTimezone) {	
			
				var playpeersLeft = usersByTimezone[timezone];

				// Shuffle playpeers left to make sure users do not get the same playpeers each time
				playpeersLeft = _shuffleArray(playpeersLeft)
				
				var n = playpeersLeft.length;
				var discipline_index = 0; // Repeatedly iterate through disciplines with this index mod number of disciplines
				
				// Track number of playpeersLeft between each discipline cycle
				var currLeft = n;
				var prevLeft = n+1; // Just any number that is more than currLeft

				while (playpeersLeft.length > 0) {
					var discipline = SHUFFLED_DISCIPLINES[discipline_index % SHUFFLED_DISCIPLINES.length]; 
					discipline_index++;

					var playpeersBuffer = []; // Temporary buffer to collect playpeers until ideal playgroup size reached, then assign a playgroup
					var i = 0;
					while (playpeersBuffer.length < IDEAL_PLAYGROUP_SIZE) {
						i++;
						var playpeer = playpeersLeft.shift(); // Take from front of queue

						if (playpeer == undefined) {
							// No playpeers left, break out of this while loop and assign students in buffer through another way below
							break;
						}

						// Only push this user when he or she has not taken the discipline
						if (!_userHasDiscipline(playpeer, discipline)) {
							playpeersBuffer.push(playpeer);
						} else { // Has taken the discipline, push this user back to playpeers left
							playpeersLeft.push(playpeer);
						}
						if (i >= n) { // Gone through all playpeersLeft once already, break out of loop to avoid infinite loop
							break;
						}
					}

					// Having either assembled ideal playgroup size, or visited all playpeers left:
					if (playpeersBuffer.length >= MIN_PLAYGROUP_SIZE) {
						_assignPlaygroup(playpeersBuffer, discipline);
					} else {
						// Transfer buffer back to playpeers left
						playpeersLeft = playpeersLeft.concat(playpeersBuffer);	
					}

					// Cycle to the next discipline if there are still disciplines left to cycle
					if (discipline_index % SHUFFLED_DISCIPLINES.length != 0) {
						continue;
					}

					// At the end of each discipline cycle, check number of playpeersLeft
					// If same number, it means remaining users cannot be grouped into playgroups
					prevLeft = currLeft;
					currLeft = playpeersLeft.length;
					if (prevLeft == currLeft) {
						// Put these remaining users in playgroups that have already been created
						while (playpeersLeft.length > 0) {
							// NOTE: This does not ensure all remaining users get a playgroup at this time
							_addToAvailablePlaygroup(playpeersLeft.pop());
						}
					}
				}
			}
		});
	});
}

/**
 * Used by transferToNewPlaygroup and assignNewQuestion to notify user, and increment badge count.
 * Specifically, logs a task to the queue for queue_worker server to send out the push notification.
 * @param  {String} posterImage         Image of poster
 * @param  {String} recipientUid        Uid of recipient
 * @param  {String} title               Title of push notification
 * @param  {String} body                Body of push notification
 * @param  {Int} additionalPushCount 	Either 0 or 1, added to the current push count
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
				pid: "",
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
 * KEY FUNCTION: Transfers users to their new playgroups when 4:28pm arrives.
 * TO BE RUN: :28 and :58 each hour on system time.
 * If user's timeOfNextPlaygroup is equal to current, and nextPlaygroup is not null:
 * 1) Add nextPlaygroup to playgroups and set nextPlaygroup and nextPlaygroupDiscipline to null, 
 * 2) Set hasNewPlaygroup to playgroup title, 
 * 3) Transfers users into questions: uid
 * FOR TESTING: Change margin of time to 999999 * 60 * 1000
 */
function transferToNewPlaygroup() {
	var currentTimestamp = Date.now();
	var marginOfTime = 1 * 60 * 1000; // 1min leeway
	db.ref(dbName + "/users")
	.orderByChild("timeOfNextPlaygroup")
	.startAt(currentTimestamp - marginOfTime)
	.endAt(currentTimestamp + marginOfTime).once("value", function(snap) {
		snap.forEach(function(data) {
			var user = data.val();
			var uid = data.key;
			var timeOfNextPlaygroup = user["timeOfNextPlaygroup"];
			var pid = user["nextPlaygroup"];

			if (pid == undefined || pid == null) {
				console.log("[Info] Time has arrived but user has no next playgroup. Likely user has done all disciplines, uid: " + uid);
				return;
			}
			// Time to assign new playgroup to user
			var updates = {};
			// Grab the details of the new playgroup
			db.ref(dbName + "/playgroups/" + pid).once("value", function(playgroupSnap) {
				var playgroupData = playgroupSnap.val();
				if (playgroupData == null) {
					console.log("[Error] User has next playgroup, but playgroup does not exist. uid: " + uid + ", pid: " + pid);
					return;
				}
				var discipline = playgroupData["title"];
				// Get the first question
				var qid = Object.keys(playgroupData["questions"])[0];
				db.ref(dbName + "/questions/" + discipline + "/" + qid).once("value", function(questionSnap) {
					var qData = questionSnap.val();
					var questionText = qData["question"];
					var questionShareImage = qData["shareImage"];
					var userPlaygroupUpdates = {};
					var discipline = playgroupData["title"];

					// Do a multi-path update:

					// Update user fields
					userPlaygroupUpdates["discipline"] = discipline;
					userPlaygroupUpdates["questionNum"] = 1;
					userPlaygroupUpdates["questionImage"] = playgroupData["image"];
					userPlaygroupUpdates["questionText"] = questionText;
					userPlaygroupUpdates["questionShareImage"] = questionShareImage;
					userPlaygroupUpdates["hasUpdates"] = true;
					userPlaygroupUpdates["timeReplied"] = currentTimestamp;
					updates["/users/" + uid + "/playgroups/" + pid] = userPlaygroupUpdates;

					// Set user's next playgroup to null, and has new playgroups to playgroup title
					updates["/users/" + uid + "/nextPlaygroup"] = null;
					updates["/users/" + uid + "/nextPlaygroupDiscipline"] = null;
					updates["/users/" + uid + "/hasNewPlaygroup"] = discipline;

					// Update playgroup memberHasVoted and questions/qid/uid answer votes
					updates["/playgroups/" + pid + "/memberHasVoted/" + uid] = 0
					updates["/playgroups/" + pid + "/questions/" + qid + "/" + uid] = 0

					db.ref(dbName).update(updates).then(function() {
						_sendPushNotification("", uid, "NEW PLAY GROUP", "It's time to bring back memories of " + discipline + "!", 1);
					});
				});
			});
		});
	});
}

/**
 * KEY FUNCTION: Assign new question to all playgroups.
 * TO BE RUN: :28 and :58 each hour on system time.
 * For all playgroups, if based on timezone it is 4:28pm: 
 * 1) Grab a new question with a qid that is not in this playgroups' questions
 * 2) Set playpeers' hasUpdates to true, and questionNum and questionImage
 * If run out of questions, then stop assigning. (Hope this does not happen!)
 * FOR TESTING: Comment out the part about checking if it is time to give new question
 */
function assignNewQuestion(completed) {
	var serverTimezone = (-new Date().getTimezoneOffset()) / 60.0;
	var serverMinute = new Date().getMinutes();
	var currentTimestamp = Date.now()

	// Get all questions first
	db.ref(dbName + "/questions").once("value", function(allQuestionsSnap) {
		var questionsDict = allQuestionsSnap.val();
		// Get playgroups
		db.ref(dbName + "/playgroups").once("value", function(allplaygroupsSnap) {

			allplaygroupsSnap.forEach(function(playgroupData) {
				var playgroup = playgroupData.val();
				var pid = playgroupData.key;
				var playpeerUids = Object.keys(playgroup["memberHasVoted"]);

				// First check if the playgroup is already created for users. If it is not yet created, return.
				var playgroupTimeCreated = playgroup["timeCreated"];
				if (playgroupTimeCreated != null && currentTimestamp <= playgroupTimeCreated + (5 * 60 * 1000)) { // Add 5 min buffer
					// playgroup not created yet (or just created), don't push new question or users will get 2 first questions
					return;
				}
				
				// Check if it is time to give new question
				var playgroupTimezone = playgroup["timezone"];
				var hoursToAdd = playgroupTimezone - serverTimezone; // Assume whole sum
				var serverHour = new Date().getHours();
				var playgroupHour = (serverHour + hoursToAdd) % 24;
				if (!(playgroupHour == 16 && serverMinute == 28) && !(playgroupHour == 15.5 && serverMinute == 58)) {
					// Not time to send a new question yet, skip playgroup
					return;
				}

				// Get question with the correct discipline and not already asked in this playgroup
				var discipline = playgroup["title"];
				var qidsAsked = Object.keys(playgroup["questions"]);
				var questionsAvailable = questionsDict[discipline];
				for (var qid in questionsAvailable) {

					if (qidsAsked.indexOf(qid) >= 0) continue; // Question asked before, skip
					
					// Assign this question
					var questionData = questionsAvailable[qid];
					var questionNum = qidsAsked.length + 1;
					var questionImage = questionData["image"];
					var questionText = questionData["question"];
					var questionShareImage = questionData["shareImage"];

					// Set questions in playgroup and send a new playgroup message containing the question
					
					var updates = _createPlaygroupMessageForQuestion(pid, questionText, currentTimestamp);
					updates["/playgroups/" + pid + "/questions/" + qid + "/timestamp"] = currentTimestamp;
					// Also copy over all members to questions
					for (var x = 0; x < playpeerUids.length; x++) {
						var playpeerUid = playpeerUids[x];
						updates["/playgroups/" + pid + "/questions/" + qid + "/" + playpeerUid] = 0;
					}
					db.ref(dbName).update(updates).then(function() {
						playpeerUids.forEach(function(playpeerUid) {
							// First check if this user has updates for this playgroup to depide if we should increment push count
							db.ref(dbName + "/users/" + playpeerUid + "/playgroups/" + pid + "/hasUpdates").once("value", function(userHasViewedSnap) {
								var userHasViewed = userHasViewedSnap.val()
								var additionalPushCount = userHasViewed == true ? 0 : 1
								var playgroupUpdates = {};
								playgroupUpdates["questionNum"] = questionNum;
								playgroupUpdates["questionImage"] = questionImage;
								playgroupUpdates["questionText"] = questionText;
								playgroupUpdates["questionShareImage"] = questionShareImage;
								playgroupUpdates["hasUpdates"] = true;
								playgroupUpdates["timeReplied"] = currentTimestamp;

								db.ref(dbName + "/users/" + playpeerUid + "/playgroups/" + pid).update(playgroupUpdates).then(function() {
									// Send push notification to this user if needed
									_sendPushNotification(questionImage, playpeerUid, "NEW: " + discipline + " question", "You know you want to open this.", additionalPushCount);
								});
							})
						});
					});

					// This return is important to return from the loop of playgroups after question sent out
					return;
				}
				// End of one playgroup, move on to next playgroup to assign new question
			});
		});
	})
}

/**
 * KEY FUNCTION: Assigns superlatives to playgroups after 1 week.
 * TO BE RUN: :08 every hour.
 * If playgroup's timeCreated is 1 week before current time, then do the following steps:
 * Step 1) Randomly pick 4 superlatives from all superlatives
 * Step 2) For each superlative: initiate all uids and number of votes to 0
 * FOR TESTING: To assign superlatives to all playgroups, just comment out the filters startAt and endAt
 */
function assignSuperlatives() {
	var currentTimestamp = Date.now();
	var oneWeek = DAYS_TO_ASSIGN_SUPERLATIVES * 24 * 60 * 60 * 1000;
	var marginOfTime = 1 * 60 * 60 * 1000; // 1 hour of margin
	db.ref(dbName + "/playgroups")
	.orderByChild("timeCreated") // If time created is about a week ago from current time
	.startAt(currentTimestamp - oneWeek - marginOfTime)
	.endAt(currentTimestamp - oneWeek + marginOfTime)
	.once("value", function(snap) {
		snap.forEach(function(data) {
			var playgroup = data.val();
			if (playgroup["superlatives"] != null) {
				// Superlatives already assigned, return
				return;
			}
			var pid = data.key;
			var NUM_SUPERLATIVES = 4;
			var SHUFFLED_SUPERLATIVES = _shuffleArray(SUPERLATIVES);
			var chosenSuperlatives = SHUFFLED_SUPERLATIVES.slice(0, NUM_SUPERLATIVES);

			// Grab list of uids
			var uidsAndVotedUids = playgroup["memberHasVoted"];
			for (uid in uidsAndVotedUids) {
				uidsAndVotedUids[uid] = ""; // Have not voted for any uid yet so empty string
			}
			
			var superlativesDict = {};
			chosenSuperlatives.forEach(function(sup) {
				superlativesDict[sup] = uidsAndVotedUids;
			});

			var playgroupUpdates = {};
			playgroupUpdates["superlatives"] = superlativesDict;
			db.ref(dbName + "/playgroups/" + pid).update(playgroupUpdates);
		});
	});
}

/**
 * KEY FUNCTION: Swap users' next playgroups randomly.
 * TO BE RUN: :29 and :59, 29 minutes before users get their playgroups
 * Simply get all users who are getting their playgroups in the next 30 minutes, shuffle them, 
 * and iteratively swap their nextPlaygroups.
 * FOR TESTING: Change margin of time to 999999
 */
function swapPlaygroups() {
	var currentTimestamp = Date.now();
	var twentynineminutes = 29 * 60 * 1000;
	var marginOfTime = 2 * 60 * 1000; // 2min leeway
	db.ref(dbName + "/users")
	.orderByChild("timeOfNextPlaygroup")
	.startAt(currentTimestamp + twentynineminutes - marginOfTime)
	.endAt(currentTimestamp + twentynineminutes + marginOfTime).once("value", function(snap) {
		
		// Remove users who have null nextPlaygroup
		var users = [];
		snap.forEach(function(userSnap) {
			var user = userSnap.val();
			var uid = userSnap.key;
			if (user["nextPlaygroup"] == undefined || user["nextPlaygroupDiscipline"] == undefined) {
				return;
			}
			user["uid"] = uid;
			user["originalPlaygroup"] = user["nextPlaygroup"];
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
				
				// Only perform swap if both users have not taken the new playgroup's discipline
				if (_userHasDiscipline(firstUser, secondUser["nextPlaygroupDiscipline"]) || 
					_userHasDiscipline(secondUser, firstUser["nextPlaygroupDiscipline"])) {
					continue;
				}

				// Perform the swap
				var temp = firstUser["nextPlaygroup"];
				var tempDiscipline = firstUser["nextPlaygroupDiscipline"];
				firstUser["nextPlaygroup"] = secondUser["nextPlaygroup"];
				firstUser["nextPlaygroupDiscipline"] = secondUser["nextPlaygroupDiscipline"];
				secondUser["nextPlaygroup"] = temp;
				secondUser["nextPlaygroupDiscipline"] = tempDiscipline;
			}
		}

		// Update with new playgroups
		for (var i = 0; i < n; i++) {
			var user = shuffledUsers[i];
			var uid = user["uid"];
			var updates = {};
			var originalpid = user["originalPlaygroup"];
			var newpid = user["nextPlaygroup"];
			
			if (newpid == originalpid) {
				// This step is important if not it will not work below as setting 
				// newpid and originalpid override each other
				continue;
			}

			updates["/users/" + uid + "/nextPlaygroup"] = newpid;
			updates["/users/" + uid + "/nextPlaygroupDiscipline"] = user["nextPlaygroupDiscipline"];
			updates["/playgroups/" + originalpid + "/memberHasVoted/" + uid] = null
			updates["/playgroups/" + newpid + "/memberHasVoted/" + uid] = 0
			db.ref(dbName).update(updates)
		}
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
