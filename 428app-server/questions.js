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

var DISCIPLINES = ["Performing arts", "Visual arts", "Geography", "History", "Languages", "Literature", "Philosophy", "Economics", "Law", "Political sciences", "Sports", "Theology", "Biology", "Chemistry", "Earth and Space sciences", "Mathematics", "Physics", "Finance", "Agriculture", "Computer science", "Engineering", "Health", "Psychology", "Culture", "Life hacks", "Education", "Fashion", "Romance"];
var SUPERLATIVES = ["Most awkward", "Most similar to Bieber", "IQ: 200", "Best personality", "Most good looking", "Most funny", "Biggest dreamer", "Most flirt", "Loudest", "Most quiet", "Most artistic", "Most likely to be arrested", "Most dramatic", "Most money", "Party Animal", "Most lovable"]

// NOTE: This will be /test_db when you're testing
var dbName = "/real_db"
var db = admin.database();

// EXAMPLE: Write a Physics question
// writeQuestion("Physics", "https://scontent.fzty2-1.fna.fbcdn.net/v/t31.0-8/15039689_1271173046259920_4366784399934560581_o.jpg?oh=d9fb327a94d33f79ebc6be5a7947ddca&oe=58FE067C", "What is Physics? What does it mean?", "https://www.youtube.com/embed/HeGPn5zxegY", true)
// 
// EXAMPLE: Write a batch of Physics questions
// writeQuestionsFromTSVFile("/Users/leonardloo/Desktop/428/428-questions/physics.tsv");
// 
// EXAMPLE: Write a did you know
// writeDidYouKnow("Astronomy", "https://www.youtube.com/embed/HeGPn5zxegY", "http://www.428pm.com")

/**
 * Function used to write a question to the data store
 * @param  {String} discipline 		Title of the classroom, which is the discipline
 * @param  {String} image          	Image URL string of the question
 * @param  {String} question       	Multiline question separated with \n if necessary
 * @param  {String} answer         	Multiline answer separated with \n if necessary, or link if this is a video answer
 * @param  {Bool} isVideoAnswer 	True if is video answer, and answer param will be a Youtube link
 * @return {None}                
 */
function writeQuestion(discipline, image, question, answer, isVideoAnswer) {
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
	        if (csvrow.length != 5) {
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
	        writeQuestion(discipline, image, question, answer, isVideoAnswer);
	    })
	    .on('end',function() {
	    });
}

/**
 * Write a did you know. Each classroom, when created, will have a did you know.
 * @param  {String} discipline 		Title of the classroom, which is the discipline
 * @param  {String} videoLink      	Youtube video link of the format, i.e. https://www.youtube.com/embed/xxxxx
 * @param  {String} shareLink      	Link of video on 428pm's website, i.e. https://www.428pm.com/didyouknow/video1
 * @return {None}                
 */
function writeDidYouKnow(discipline, videoLink, shareLink) {
	var did = db.ref(dbName + "/didyouknows/" + discipline).push().key;
	db.ref(dbName + "/didyouknows/" + discipline + "/" + did).set({
		videoLink: videoLink,
		shareLink: shareLink
	});
}
