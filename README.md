# 428

## Explanation of files

Multiple files here:

- queue_worker.js: Push server that sends push notifications both for mobile clients and matcher.js

- matcher.js: Main matching algorithm here (in the future, we plan to incorporate ML, NLP)
	- Assigns new questions daily
	- Generate new classrooms
	- Transfer new classroom to user weekly
	- Assigns superlatives after one week of being in a classroom
Note that the main matcher file is in matcher.js, and there are separate files for each of the four functions.

- dummy.js: Dummy test functions for testing matcher.js

- questions.js: Functions to write questions and did you knows' to Firebase

Note: node.js public and routes are here, but not used.


## Installation instructions

1. Clone the repo: `git clone https://github.com/428app/428app-server.git`
2. Switch to the dev branch: `git checkout -b dev origin/dev`
3. Install all packages via `npm`, as such: `npm install`

You're now set to run the various functions!