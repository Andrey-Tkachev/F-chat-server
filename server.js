global.__approot = __dirname;

var express           = require("express");
var path              = require('path'); // модуль для парсинга пути
var log               = require('./libs/log')(module); // обертка для лога winston
var config            = require('./libs/config'); // обертка для nconf

// Database libs
var MessageModel      = require('./libs/mongo-db-manager').MessageModel;
var RoomModel         = require('./libs/mongo-db-manager').RoomModel;
var AccessTokenModel  = require('./libs/mongo-db-manager').AccessTokenModel;
var UserModel         = require('./libs/mongo-db-manager').UserModel;

var mongoose          = require('./libs/mongo-db-manager').mongoose;

var createUser        = require('./libs/user-manager').createUser;
var killUser          = require('./libs/user-manager').killUser;
var setStatus         = require('./libs/room-manager').setStatus;
var createRooms       = require('./libs/room-manager').createRooms;


var xssFilters        = require('xss-filters');
var zlib              = require('zlib');
var app               = express();


var server = app.listen(config.get('port'), function(){
   log.info('Server listening on port ' + config.get('port'));
});
var io = require('socket.io').listen(server);

function createMessage(data, user_id, room_id) {
    Message = { 
                data: data,
                date: Date.now().toString(),
                user_id: user_id,
                room_id: room_id
              };
    return Message;
}

function sendDialog(socket, room_id){
  if (!socket || !room_id) {
    return;
  }
  MessageModel.find({room_id: room_id}, function (err, messages) {
        log.debug("Messages: " + messages + " Room: " + socket.room); 
        if (!messages){ 
          messages = [];
        }
        socket.emit('Dialog', messages);
    });
}

app.get('/', function(req, res) {
  res.send('<h1>Here`ll be Dragons!</h1>');
});

app.get('/auth', function(req, res) {
  
  // TODO

});

app.get('/register', function(req, res) {
  
  // TODO

});


io.sockets.on('connection', function(socket){
  
  // USER CONNECTED
  ROOM_DEFAULT = 'general';
  log.info('New connection from ' + address.address + ':' + address.port);

  socket.room = ROOM_DEFAULT;
  socket.auth = false;

  socket.join(socket.room);

    // INIT
  socket.on('Init', function(token){
    log.info('Init request.');
    if (!token || !token.token){
      log.error('Trying to init without token.');
      return;
    }

    AccessTokenModel.findOne({token: token.token}, function(err, a_token){
      if (!a_token){
        log.error('Token' + token.token +' not found.');
        return;
      }
      if (err){
        log.error(err);
        return;
      }

      UserModel.findOne({username: a_token.userId}, function(err, user) {
        if (!user) { log.error('User' + a_token.userId +' not found.'); return; } 
        if (err){
          log.error(err);
          return;
        }

        socket.auth = true;
        socket.user_id = user.id;
        log.info('Init success: ' + a_token.userId);
      });
    });
  });


  //  JOIN
  socket.on('JoinRoom', function(room_json){
    log.info('Join room ' + room_json);
    if (!room_json){
      return;
    }
    RoomModel.findOne({room: room_json.room_id}, function(err, room) {
      if (!room) {
        log.error('Room ' + room.id + ' not found.');
        return;
      }

      socket.room = room.id;
      socket.join(room.id);
      sendDialog(socket, room.id);
    });
  });

  // LEAVE 
  socket.on('Leave', function (){
    log.info('Leave request from ' + socket.user_id + ' on room ' + socket.room);
    socket.leave(socket.room);
  });
  

  // GET DIALOG
  socket.on('Dialog', function (room_json){
    if (!room_json){
      return;
    }
    sendDialog(socket, room_json.room_id)
  });
  
  // NEW MESSAGE
  socket.on('Message', function(msg_json){
    log.info('Incoming message from ' + socket.user_id);

    if (!msg_json && (!msg_json.data)) {
      msg_json = { data: "" };
    }
    msg_json = createMessage(msg_json.data, socket.user_id, socket.room);

    if(socket.room != ROOM_DEFAULT){
      msg = new MessageModel(msg_json);
      msg.save();
    }

    // Debug resending
    socket.to(socket.room).emit('Message', msg_json);
    socket.emit('Message', msg_json);

  });

});

