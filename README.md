# 428

Multiple files here:

- queue_worker.js: Push server that sends push notifications both for mobile clients and matcher.js
- matcher.js: Main matching algorithm here (in the future, we plan to incorporate ML, NLP)
	- Assigns new questions daily
	- Assigns new classroom weekly
	- Assigns superlatives after one week of being in a classroom
- dummy.js: Dummy test functions for testing matcher.js
- questions.js: Functions to write questions to Firebase

Note: public and routes are here, but not used.
