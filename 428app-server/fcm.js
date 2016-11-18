var express = require('express');
var router = express.Router();
var FCM = require('fcm-push');

var serverkey = 'AIzaSyDliFBpwjZfoMaNuxkN-A8XD8wYPFQzqlo';  
var fcm = new FCM(serverkey);

/* GET users listing. */
// router.get('/', function(req, res, next) {
//   res.send('respond with a resource');
// });
// 

function sendNotification() {
	var message = {  
    to : 'e538K6YOYfw:APA91bGaG8lJq7FS58u3mwl5JyT_12PQu0eL-wncPtsx3JuOK_eqp61VjYenE_gpHBRXn3hd_a_nVW0dil-eYaXaMK15C-mQCQpa6HdZJOtTSNdH2dHJP7vpmzPLMAr_wHrDe09Uflh3',
    priority: 'high',
    data : {
        'uid': '10154079548343170',
        'tid': '2',
        'image' : 'https://scontent.xx.fbcdn.net/v/t1.0-1/12373224_10153942082375757_2547226759416788825_n.jpg?oh=d296ee064445c4b4dc68e353f27a25a4&oe=58CAF1E9',
        'type': 'connection'
    },
    notification : {
        title: 'Topics',
        body: 'Jenny: Hey what\'s up?',
        sound: 'default',
        badge: '1'
    }
};

	fcm.send(message, function(err,response){  
	    if(err) {
	    	console.log(err);
	        console.log("Something has gone wrong !");
	    } else {
	        console.log("Successfully sent with response :",response);
	    }
	});
}


 


module.exports = router;
