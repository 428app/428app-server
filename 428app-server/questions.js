/**
 * questions.js
 * This file is used to insert questions and did you knows directly into the Firebase DB.
 * To insert, just write a function here, like one of the examples below, then simply run: node questions.js
 */

var admin = require("firebase-admin");
admin.initializeApp({
  credential: admin.credential.cert("./app-abdf9-firebase-adminsdk-rsdcc-8311b31e51.json"),
  databaseURL: "https://app-abdf9.firebaseio.com"
});
console.log("questions.js is running...");

var DISCIPLINES = ["Performing Arts", "Visual Arts", "Geography", "History", "Languages", "Literature", "Philosophy", "Economics", "Law", "Political Sciences", "Sports", "Theology", "Biology", "Chemistry", "Astronomy", "Mathematics", "Physics", "Finance", "Agriculture", "Computer Science", "Engineering", "Health", "Psychology", "Culture", "Life Hacks", "Education", "Fashion", "Romance"];
var SUPERLATIVES = ["Most awkward", "Most similar to Bieber", "IQ: 200", "Best personality", "Most good looking", "Most funny", "Biggest dreamer", "Most flirt", "Loudest", "Most quiet", "Most artistic", "Most likely to be arrested", "Most dramatic", "Most money", "Party Animal", "Most lovable"]

// NOTE: This will be /test_db when you're testing
var dbName = "/test_db"
var db = admin.database();

// EXAMPLE: Write a question
// writeQuestion("Biology", 
// 	"https://firebasestorage.googleapis.com/v0/b/app-abdf9.appspot.com/o/real_db%2Fquestion_images%2Fbiology%2Fbiology22.jpg?alt=media&token=e2fa0485-980e-4541-8c48-1d2295fa03e8", 
// 	"Remember when you first learned about plants and met this monster of an English word you could never quite spell - Photosynthesis? Do you remember how it works? Name the parts involved in photosynthesis.", 
// 	"https://www.youtube.com/embed/sQK3Yr4Sc_k", 
// 	true, "https://firebasestorage.googleapis.com/v0/b/app-abdf9.appspot.com/o/real_db%2Fquestion_images%2Fbiology%2Fbiology22.jpg?alt=media&token=e2fa0485-980e-4541-8c48-1d2295fa03e8")
// 
// EXAMPLE: Write a batch of Physics questions
// writeQuestionsFromTSVFile("/Users/leonardloo/Desktop/428/428-questions/physics.tsv");
// 
// EXAMPLE: Write a did you know
// writeDidYouKnow("Astronomy", "https://www.youtube.com/embed/HeGPn5zxegY")

assignAllQuestionsToAllUsers();

/**
 * Test function that assigns all questions into classrooms to all classmates.
 * Used for seeing how questions/answers/pictures turn out.
 */
function assignAllQuestionsToAllUsers() {
	
	db.ref(dbName + "/users").once("value", function(usersSnap) {
		if (usersSnap.val() == null) {
			return;
		}
		var uids = Object.keys(usersSnap.val());
		db.ref(dbName + "/questions").once("value", function(questionsSnap) {
			if (questionsSnap.val() == null) {
				return;
			}
			var questionsDict = questionsSnap.val();
			for (var discipline in questionsDict) {
				// Write a did you know
				var did = db.ref(dbName + "/didyouknows/" + discipline).push().key;
				db.ref(dbName + "/didyouknows/" + discipline + "/" + did).set({
					videoLink: "http://www.google.com",
					shareLink: "http://www.google.com"
				})

				var qDict = questionsDict[discipline];
				// Get all questions
				var questions = {};

				// Get the latest question's 
				var latestQ = {};
				var dictLength = Object.keys(qDict).length;
				for (var qid in qDict) {
					if (Object.keys(latestQ).length == 0) {
						latestQ = qDict[qid];
					}
					questions[qid] = dictLength;
					dictLength--;
				}

				// Members
				var memberHasVoted = {};
				for (var k = 0; k < uids.length; k++) {
					var uid = uids[k];
					memberHasVoted[uid] = 0;
				}

				// Create a new classroom of this discipline
				var cid = db.ref(dbName + "/classrooms").push().key;
				db.ref(dbName + "/classrooms/" + cid).set({
					title: discipline,
					image: latestQ["image"],
					timeCreated: 0,
					timezone: -5,
					memberHasVoted: memberHasVoted,
					questions: questions,
					superlatives: null,
					didYouKnow: did
				})
				// Insert into users' classrooms
				for (var k = 0; k < uids.length; k++) {
					var uid = uids[k];
					db.ref(dbName + "/users/" + uid + "/classrooms/" + cid).set({
						discipline: discipline,
						questionNum: Object.keys(questions).length,
						questionImage: latestQ["image"],
						questionText: latestQ["question"],
						hasUpdates: true,
						timeReplied: Date.now()
					});
				}
			}
		});
	});
}



/**
 * Function used to write a question to the data store
 * @param  {String} discipline 		Title of the classroom, which is the discipline
 * @param  {String} image          	Image URL string of the question
 * @param  {String} question       	Multiline question separated with \n if necessary
 * @param  {String} answer         	Multiline answer separated with \n if necessary, or link if this is a video answer
 * @param  {Bool} isVideoAnswer 	True if is video answer, and answer param will be a Youtube link
 * @param  {String} shareImage 		Image URL string of question and 428 logo on top of image. Used for FB sharing.
 * @return {None}                
 */
function writeQuestion(discipline, image, question, answer, isVideoAnswer, questionImage) {
	var qid = db.ref(dbName + "/questions/" + discipline).push().key;
	db.ref(dbName + "/questions/" + discipline + "/" + qid).set({
		image: image,
		question: question,
		answer: answer,
		isVideoAnswer: isVideoAnswer
  });
}

/**
 * Writes questions from a tab-separated file and posts them to the Questions Firebase store.
 * Rows are separated by a newline.
 * Columns are: classroomTitle, image, question, answer, isVideoAnswer
 * @param  {String} tsvFile 	Tab separated file (without header)
 * @return None
 */
function writeQuestionsFromTSVFile(tsvFile) {
	var fs = require('fs'); 
	var parse = require('csv-parse');
	fs.createReadStream(tsvFile)
	    .pipe(parse({delimiter: '\t'}))
	    .on('data', function(csvrow) {
	        if (csvrow.length != 6) {
	        	return;
	        }
	        var discipline = csvrow[0];
	        var image = csvrow[1];
	        var question = csvrow[2];
	        var answer = csvrow[3];
	        var isVideoAnswer = false;
	        if (csvrow[4] == 'true') {
	        	isVideoAnswer = true;
	        } else if (csvrow[4] == 'false') {
	        	isVideoAnswer = false;
	        } else {
	        	console.log("isVideoAnswer is neither 'true' or 'false'")
	        	return;
	        }
	        var questionImage = csvrow[5];
	        writeQuestion(discipline, image, question, answer, isVideoAnswer, questionImage);
	    })
	    .on('end',function() {
	    });
}

/**
 * Write a did you know. Each classroom, when created, will have a did you know.
 * @param  {String} discipline 		Title of the classroom, which is the discipline
 * @param  {String} videoLink      	Youtube video link of the format, i.e. https://www.youtube.com/embed/xxxxx. 
 * Video link is also share link.
 * @return {None}                
 */
function writeDidYouKnow(discipline, videoLink) {
	var did = db.ref(dbName + "/didyouknows/" + discipline).push().key;
	db.ref(dbName + "/didyouknows/" + discipline + "/" + did).set({
		videoLink: videoLink
	});
}
