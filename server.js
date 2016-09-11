global.__approot = __dirname;

var express           = require("express");
var path              = require('path'); // модуль для парсинга пути
var log               = require('./libs/log')(module); // обертка для лога winston
var config            = require('./libs/config'); // обертка для nconf

// Database libs
var MessageModel      = require('./libs/mongo-db-manager').MessageModel;
var RoomModel         = require('./libs/mongo-db-manager').RoomModel;
var mongoose          = require('./libs/mongo-db-manager').mongoose;

var xssFilters        = require('xss-filters');
var zlib              = require('zlib');
var app               = express();


var server  = app.listen(config.get('port'), function(){
    log.info('Server listening on port ' + config.get('port'));
});
var io      = require('socket.io').listen(server);



io.sockets.on('connection', function(socket){
  // USER CONNECTED

  defaultRoom = 'general';
  socket.room = defaultRoom;
  socket.join(defaultRoom);
  socket.send('connection_succsess', {room_id: "general"});

    // INIT
  socket.on('Init', function(){
    
  });

  //  JOIN
  socket.on('JoinRoom', function(){
    
  }); 

  // LEAVE 
  socket.on('Leave', function(){
    socket.leave(socket.room_id);
  
  });

  // GET DIALOG
  socket.on('GetDialog', function(room_id){
    
  }); 

  // NEW MESSAGE
  socket.on('Message', function(msg){
     
  }); 
});

