// var x = {'a': 2, 'b': 3, 'c': 0, 'd': 2}
// for (key in x) {
// 	x[key] = 'hey';
// }
// console.log(x);


// ['Performing arts', 'Visual arts', 'Geography', 'History', 'Languages', 'Literature', 'Philosophy', 'Economics', 'Law', 'Political sciences', 'Sports', 'Theology', 'Biology', 'Chemistry', 'Earth and Space sciences', 'Mathematics', 'Physics', 'Finance', 'Agriculture', 'Computer science', 'Engineering', 'Health', 'Psychology', 'Culture', 'Life hacks', 'Education', 'Fashion', 'Romance']
// 
// 
var currentTimezone = (-new Date().getTimezoneOffset()) / 60.0;
// console.log(currentTimezone);

// console.log(new Date().getMinutes());
// 

// var classHour = 16
// var serverMinute = 
// if (!(classHour == 16 && serverMinute == 28) && !(classHour == 15.5 && serverMinute == 58)) {
// 	console.log('time to not send')
// } else {
// 	console.log('tiem to send')
// }

var x = {"a": 1, "b": 2, "c": 3}
for (var qid in x) {
	console.log(qid);
	console.log(x[qid]);
}