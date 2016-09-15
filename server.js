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
createRooms(10);
function createMessage(data, user_id, room_id) {
    Message = { 
                data: data,
                date: Date.now().toString(),
                user_id: user_id,
                room_id: room_id
              };
    return Message;
}



app.get('/', function(req, res) {
  res.send('<h1>Here`ll be Dragons!</h1>');
});

io.sockets.on('connection', function(socket){
  
  // USER CONNECTED
  ROOM_DEFAULT = 'general';
  log.info('Incoming conection');

  socket.room = ROOM_DEFAULT;
  socket.join(socket.room);

    // INIT
  socket.on('Init', function(nickname){
    user = createUser(nickname);

    socket.user_id = user.id;

    log.info('Init request.');
    log.info('User created: ' + user.id);
    socket.emit('UserId', { user_id: user.id });
  });


  //  JOIN
  socket.on('JoinRoom', function(room_id){
    log.info('JoinRoom');
    if (!room_id) {
      RoomModel.findOne({status: 'wait'}, {limit: 1},function (err, wait_room) {
        if (err) return handleError(err);
        if (!wait_room) {

          RoomModel.findOne({status: 'empty'}, {limit: 1},function (err, room) {
            if (room) {
              socket.room = room.id;
              socket.join(socket.room);
              socket.emit('RoomId', {room_id: socket.room});
              room.status = 'wait';
              room.users.push(socket.user_id);
              room.save();
              log.info('User ' + socket.user_id + ' has joined to the room ' + socket.room + '.');
            }
          });

        }
        else {

          socket.room = wait_room.id;
          socket.join(socket.room);
          socket.emit('RoomId', {room_id: socket.room});
          //wait_room.status = 'full';
          //wait_room.users.push(socket.user_id);
          wait_room.save();
          MessageModel.find({room_id: socket.room}, function (err, messages) {
                log.debug("Messages: " + messages + " Room: " + socket.room); 
                if (!messages){ 
                  messages = [];
                }
              socket.emit('Dialog', messages);
          });

          log.info('User ' + socket.user_id + ' has joined to the room ' + socket.room + '.');
        }
      });
    }
    else {
        socket.room = room_id.room_id;
        socket.join(room_id.room_id);
        socket.emit('RoomId', {room_id: socket.room});
        MessageModel.find({room_id: socket.room}, function (err, messages) {
        log.debug("Messages: " + messages + " Room: " + socket.room); 
                if (!messages){ 
                  messages = [];
                }
              socket.emit('Dialog', messages);
          });
    }
  });

  // LEAVE 
  socket.on('Leave', function (){
    log.info('Leave request from ' + socket.user_id + ' on room ' + socket.room);
    socket.leave(socket.room);
    killUser(socket.user_id);
  });
  

  // GET DIALOG
  socket.on('Dialog', function (room_json){
    MessageModel.find({room_id: socket.room}, function (err, messages) {
        log.debug("Messages: " + messages + " Room: " + socket.room); 
        if (!messages){ 
          messages = [];
        }
        socket.emit('Dialog', messages);
    });
  });
  
  // NEW MESSAGE
  socket.on('Message', function(msg_json){
    log.info('Incoming message from ' + socket.user_id);
    

    msg_json.date = Date.now().toString();
    msg_json.user_id = socket.user_id;
    msg_json.room_id = socket.room;
    console.log(msg_json);
    if (!msg_json && (!msg_json.data)) {
      msg_json.data = "";
    }
    msg_json = createMessage(msg_json.data, socket.user_id, socket.room);

    msg = new MessageModel(msg_json);
    msg.save();

    // Debug resending
    socket.to(socket.room).emit('Message', msg_json);
    socket.emit('Message', msg_json);

  });

});

