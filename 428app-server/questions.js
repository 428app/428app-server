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
var SUPERLATIVES = ["Most awkward", "Most similar to Bieber", "IQ: 200", "Best personality", "Most good looking", "Most funny", "Biggest dreamer", "Most flirt", "Loudest", "Most quiet", "Most artistic", "Likely to be arrested", "Most dramatic", "Richest right now", "Party animal", "Most lovable", "Future billionaire", "Boyfriend material", "Prime minister to-be", "Trump's best friend", "Sex god", "FBI agent", "Actually a celebrity", "Kim K.'s next BF", "Cat lover", "Most hipster", "Worst driver", "Selfie King/Queen", "Most innocent", "Drunkard"];

// NOTE: This will be /test_db when you're testing
var dbName = "/test_db"
var db = admin.database();

// EXAMPLE: Write a question
// writeQuestion("Computer Science", 
// 	"https://firebasestorage.googleapis.com/v0/b/app-abdf9.appspot.com/o/real_db%2Fquestion_images%2Fphysics%2Fphysics22.jpg?alt=media&token=bd13fdf9-dfb3-4347-bc90-4c6e9853648a", 
// 	"What are databases? What types of databases are there? Discuss how 428 stores your data in our database.", 
// 	"https://www.youtube.com/embed/gfT7EGibry0", 
// 	true, "")
// 
// EXAMPLE: Write a batch of Physics questions
// writeQuestionsFromTSVFile("/Users/leonardloo/Desktop/428/428-questions/physics.tsv");
// 
// EXAMPLE: Write a did you know
// writeDidYouKnow("Astronomy", "https://www.youtube.com/embed/HeGPn5zxegY")

// assignAllQuestionsToAllUsers();

function transferAllQuestionsFromTestToReal() {
	// NOTE: This DOES NOT transfer over qid linkages. Only run this when there are no classrooms!
	db.ref("test_db/questions/").once("value", function(snapshot) {
		db.ref("real_db/questions/").set(snapshot.val());
	})
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
				_randomDidYouKnowOfDiscipline(discipline, function(didAndDiscipline) {
					var discipline = didAndDiscipline["discipline"];
					var did = didAndDiscipline["did"];
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

					var shareImage = latestQ["shareImage"] == null ? "" : latestQ["shareImage"];

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
							questionShareImage: shareImage,
							hasUpdates: true,
							timeReplied: Date.now()
						});
					}

				})
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
function writeQuestion(discipline, image, question, answer, isVideoAnswer, shareImage) {
	var qid = db.ref(dbName + "/questions/" + discipline).push().key;
	db.ref(dbName + "/questions/" + discipline + "/" + qid).set({
		image: image,
		question: question,
		answer: answer,
		isVideoAnswer: isVideoAnswer,
		shareImage: shareImage
  });
}

/**
 * Writes questions from a tab-separated file and posts them to the Questions Firebase store.
 * Rows are separated by a newline.
 * Columns are: classroomTitle, image, question, answer, isVideoAnswer, shareImage
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
	        var shareImage = csvrow[5];
	        writeQuestion(discipline, image, question, answer, isVideoAnswer, shareImage);
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

// 4 didyouknows per discipline - we don't need too many because each classroom will just randomly choose one

// writeDidYouKnow("Astronomy", "https://www.youtube.com/embed/U2HQP08UbZM")
// writeDidYouKnow("Astronomy", "https://www.youtube.com/embed/5sbrpxmq8yk")
// writeDidYouKnow("Astronomy", "https://www.youtube.com/embed/i6DvYhPHZDo")
// writeDidYouKnow("Astronomy", "https://www.youtube.com/embed/bhpijajCDAo")
// writeDidYouKnow("Astronomy", "https://www.youtube.com/embed/YHin6lk4KqU")

// writeDidYouKnow("Biology", "https://www.youtube.com/embed/qFrRebVvj-w")
// writeDidYouKnow("Biology", "https://www.youtube.com/embed/JruDF0uvTVc")
// writeDidYouKnow("Biology", "https://www.youtube.com/embed/Cs1uud8HiCQ")
// writeDidYouKnow("Biology", "https://www.youtube.com/embed/guh7i7tHeZk")
// writeDidYouKnow("Biology", "https://www.youtube.com/embed/zCheAcpFkL8")

// writeDidYouKnow("Chemistry", "https://www.youtube.com/embed/afD6eiKBdD4")
// writeDidYouKnow("Chemistry", "https://www.youtube.com/embed/EelaHwqvB9Q")
// writeDidYouKnow("Chemistry", "https://www.youtube.com/embed/sinQ06YzbJI")
// writeDidYouKnow("Chemistry", "https://www.youtube.com/embed/Q-GWdpMjhdw")
// writeDidYouKnow("Chemistry", "https://www.youtube.com/embed/FofPjj7v414")

// writeDidYouKnow("Computer Science", "https://www.youtube.com/embed/cfYZBgAXyZM")
// writeDidYouKnow("Computer Science", "https://www.youtube.com/embed/3l4qc8aEETw")
// writeDidYouKnow("Computer Science", "https://www.youtube.com/embed/TnUYcTuZJpM")
// writeDidYouKnow("Computer Science", "https://www.youtube.com/embed/CMdHDHEuOUE")
// writeDidYouKnow("Computer Science", "https://www.youtube.com/embed/_GdSC1Z1Kzs")
// writeDidYouKnow("Computer Science", "https://www.youtube.com/embed/PwW0eYRApdM")
// writeDidYouKnow("Computer Science", "https://www.youtube.com/embed/Z7VTeEEl5eA")
// writeDidYouKnow("Computer Science", "https://www.youtube.com/embed/Ksrk3YpvZX0")

// writeDidYouKnow("Economics", "https://www.youtube.com/embed/afBw6FyPf34")
// writeDidYouKnow("Economics", "https://www.youtube.com/embed/d0nERTFo-Sk")
// writeDidYouKnow("Economics", "https://www.youtube.com/embed/j_uvhrZ1tp4")
// writeDidYouKnow("Economics", "https://www.youtube.com/embed/Qp3wP7O8_2o")
// writeDidYouKnow("Economics", "https://www.youtube.com/embed/hABM20X0iZg")
// writeDidYouKnow("Economics", "https://www.youtube.com/embed/XQYclPiLUI4")

// writeDidYouKnow("Fashion", "https://www.youtube.com/embed/YzopOxIxbXo")
// writeDidYouKnow("Fashion", "https://www.youtube.com/embed/SeNjDcMKHyA")
// writeDidYouKnow("Fashion", "https://www.youtube.com/embed/yS7a36Wxu7Q")
// writeDidYouKnow("Fashion", "https://www.youtube.com/embed/VDZ1790Kugs")
// writeDidYouKnow("Fashion", "https://www.youtube.com/embed/g4LopP6oX5Q")

// writeDidYouKnow("Physics", "https://www.youtube.com/embed/HQx5Be9g16U")
// writeDidYouKnow("Physics", "https://www.youtube.com/embed/JadO3RuOJGU")
// writeDidYouKnow("Physics", "https://www.youtube.com/embed/yLZb2s_yANE")
// writeDidYouKnow("Physics", "https://www.youtube.com/embed/NkyEOrQiGMQ")
// writeDidYouKnow("Physics", "https://www.youtube.com/embed/NmUw-ke4D0A")
// writeDidYouKnow("Physics", "https://www.youtube.com/embed/1Xp_imnO6WE")
// writeDidYouKnow("Physics", "https://www.youtube.com/embed/7FfKaIgArJ8")
// writeDidYouKnow("Physics", "https://www.youtube.com/embed/WIyTZDHuarQ")

