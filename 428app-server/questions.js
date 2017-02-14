var admin = require("firebase-admin");
admin.initializeApp({
  credential: admin.credential.cert("./app-abdf9-firebase-adminsdk-rsdcc-8311b31e51.json"),
  databaseURL: "https://app-abdf9.firebaseio.com"
});

var DISCIPLINES = ["Performing arts", "Visual arts", "Geography", "History", "Languages", "Literature", "Philosophy", "Economics", "Law", "Political sciences", "Sports", "Theology", "Biology", "Chemistry", "Earth and Space sciences", "Mathematics", "Physics", "Finance", "Agriculture", "Computer science", "Engineering", "Health", "Psychology", "Culture", "Life hacks", "Education", "Fashion", "Romance"];
var SUPERLATIVES = ["Most awkward", "Most similar to Bieber", "IQ: 200", "Best personality", "Most good looking", "Most funny", "Biggest dreamer", "Most flirt", "Loudest", "Most quiet", "Most artistic", "Most likely to be arrested", "Most dramatic", "Most money", "Party Animal", "Most lovable"]
var db = admin.database();
var dbName = "/real_db"

// writeQuestion("Physics", "https://scontent.fzty2-1.fna.fbcdn.net/v/t31.0-8/15039689_1271173046259920_4366784399934560581_o.jpg?oh=d9fb327a94d33f79ebc6be5a7947ddca&oe=58FE067C", 
	// "What is Physics? What does it mean?", "https://www.youtube.com/embed/HeGPn5zxegY", true)
// Assign question to classroom
// assignQuestionToClassroom("-KcukNTVkKBFfjBOJZYo", "-KcfwGyXapRkdS8LpAKu")


// Test function
function assignQuestionToClassroom(qid, cid) {
	db.ref(dbName + "/classrooms/" + cid + "/questions/" + qid).set(Date.now());
}

function createDummyQuestion() {
	var discipline = DISCIPLINES[parseInt(Math.random() * DISCIPLINES.length)];
	writeQuestion(discipline, "https://scontent-sit4-1.xx.fbcdn.net/v/t31.0-8/15039689_1271173046259920_4366784399934560581_o.jpg?oh=22f4ffd1a592e2d0b55bf1208ca9e1d2&oe=58D6797C", discipline + " Question" + Math.random().toString(36).substring(7), discipline + "Answer");
}

/**
 * Function used to write a question to the data store
 * @param  {[String]} classroomTitle Title of the classroom, which is the discipline
 * @param  {[String]} image          Image URL string of the question
 * @param  {[String]} question       Multiline question separated with \n if necessary
 * @param  {[String]} answer         Multiline answer separated with \n if necessary, or link if this is a video answer
 * @param  {[Bool]} isVideoAnswer 	 True if is video answer, and answer param will be a Youtube link
 * @return {None}                
 */
function writeQuestion(classroomTitle, image, question, answer, isVideoAnswer) {
	var qid = db.ref(dbName + "/questions/" + classroomTitle).push().key;
	db.ref(dbName + "/questions/" + classroomTitle + "/" + qid).set({
		image: image,
		question: question,
		answer: answer,
		isVideoAnswer: isVideoAnswer
  });
}

/**
 * Writes questions from a tab-separated file and posts them to the Questions Firebase store.
 * Columns are: classroomTitle, image, question, answer, isVideoAnswer
 * @param  {[String]} tsvFile Tab separated file (without header)
 * @return None
 */
function writeQuestionsFromTSVFile(tsvFile) {
	var fs = require('fs'); 
	var parse = require('csv-parse');
	fs.createReadStream(tsvFile)
	    .pipe(parse({delimiter: '\t'}))
	    .on('data', function(csvrow) {
	        if (csvrow.length != 5) {
	        	console.log("Row of data not having length 5");
	        	return;
	        }
	        var classroomTitle = csvrow[0];
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
	        writeQuestion(classroomTitle, image, question, answer, isVideoAnswer);
	    })
	    .on('end',function() {
	    });
}

function writeDidYouKnow(classroomTitle, videoLink) {
	var did = db.ref(dbName + "/didyouknows/" + classroomTitle).push().key;
	db.ref(dbName + "/didyouknows/" + classroomTitle + "/" + did).set(videoLink);
}

writeDidYouKnow("Physics", "https://www.youtube.com/embed/HeGPn5zxegY")
writeDidYouKnow("Biology", "https://www.youtube.com/embed/HeGPn5zxegY")
writeDidYouKnow("Earth and Space sciences", "https://www.youtube.com/embed/HeGPn5zxegY")

