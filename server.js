global.__approot = __dirname;

var express           = require("express");
var path              = require('path'); // модуль для парсинга пути
var log               = require('./libs/log')(module); // обертка для лога winston
var config            = require('./libs/config'); // обертка для nconf

// Database libs
var MessageModel      = require('./libs/mongo-db-manager').MessageModel;
var RoomModel         = require('./libs/mongo-db-manager').RoomModel;
var mongoose          = require('./libs/mongo-db-manager').mongoose;

var createUser        = require('./libs/user-manager').createUser;
var createRooms       = require('./libs/user-manager').createRooms;

var xssFilters        = require('xss-filters');
var zlib              = require('zlib');
var app               = express();


var server = app.listen(config.get('port'), function(){
   log.info('Server listening on port ' + config.get('port'));
});
var io = require('socket.io').listen(server);



io.sockets.on('connection', function(socket){
  
  // USER CONNECTED
  ROOM_DEFAULT = 'general';
  log.info('Incoming conection');

    // INIT
  socket.on('Init', function(nickname){
    user = createUser(nickname);
    log.info('Init request.');
    log.info('User created: ' + user.id);

    return(user.id);

  });

  //  JOIN
  socket.on('JoinRoom', function(room_id){
    if (! room_id) {
      RoomModel.findOne({status: 'wait'}, {limit: 1},function (err, room) {
        if (err) return handleError(err);
        if (!room) {
          /* TODO finding empty room */
          socket.room = defaultRoom;
          socket.join(defaultRoom);
        }

        socket.room = room.id;
        socket.join(room.id);
        
        socket.emit('RoomId', {room_id: room.id});

        log.info('User ' + socket.user_id + ' has joined to the room ' + room_id + '.');
      });
    }
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

