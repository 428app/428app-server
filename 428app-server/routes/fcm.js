var express = require('express');
var router = express.Router();
var FCM = require('fcm-push');

var serverkey = 'AIzaSyDliFBpwjZfoMaNuxkN-A8XD8wYPFQzqlo';  
var fcm = new FCM(serverkey);

/* GET users listing. */
router.get('/', function(req, res, next) {
  res.send('respond with a resource');
});

// Think about how to handle collapse keys
// 4E29E3C99BE6EE7D3278F71F2D0F3F440E1C94896BE936396FA65BCBBA12E7B8
var message = {  
    to : 'eWoynjRawPY:APA91bGMLfzXjTFSONs3rR7tP40YvRxtV-3nnUQh_zrtNRaJhUypjFsRA-Feu2LZoioYbXUMxKgl8bmvT-Kqu-28wwvXMof-9RkvIGOGqjBufAgNddpn4shTHE5B7vRUUn-DSuCRewjL',
    priority: 'high',
    data : {
        'Key1': 'Leonard',
        'Key2' : 'Yihang'
    },
    notification : {
        title : 'FIRST PUSH SENT FROM MY OWN SERVER',
        body : 'WOOHOOO NODE.JS'
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

module.exports = router;
