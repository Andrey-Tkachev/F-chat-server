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

function createMessage(data, user_id, room_id) {
    Message = { 
                data: 'Putin - vor!',
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

    // INIT
  socket.on('Init', function(nickname){
    user = createUser(nickname);

    socket.user_id = user.id;
    socket.room = ROOM_DEFAULT;
    socket.join(socket.room);

    log.info('Init request.');
    log.info('User created: ' + user.id);
    socket.emit('UserId', { user_id: user.id });
  });

  //  JOIN
  socket.on('JoinRoom', function(room_id){
    if (! room_id) {
      RoomModel.findOne({status: 'wait'}, {limit: 1},function (err, wait_room) {
        if (err) return handleError(err);
        if (!room) {
          /* TODO finding empty room */
           RoomModel.findOne({status: 'empty'}, {limit: 1},function (err, room) {
              socket.room = room.id;
              socket.join(socket.room);
              room.status = 'wait';
              room.save();
          });
        }
        else {
          socket.room = wait_room.id;
          socket.join(socket.room);
          socket.emit('RoomId', {room_id: socket.room});
          wait_room.status = 'full';

          log.info('User ' + socket.user_id + ' has joined to the room ' + socket.room + '.');
        }
      });
    }
  });   

  // LEAVE 
  socket.on('Leave', function(){
    log.info('Leave request from ' + socket.user_id + ' on room ' + socket.room);
    socket.leave(socket.room);
    killUser(socket.user_id);
  });

  // GET DIALOG
  socket.on('Dialog', function(room_json){
    var dialog = { dialog: [ createMessage('Putin - vor!', '000FFF', ROOM_DEFAULT), 
                             createMessage('Big Brother is watching you!', '000FF1', ROOM_DEFAULT)] }; 
    socket.emit('Dialog', dialog);
  }); 

  // NEW MESSAGE
  socket.on('Message', function(msg_json){
    log.info('Incoming message from ' + socket.user_id);
    msg_json.date = Date.now().toString();
    msg_json.user_id = socket.user_id;
    msg_json.room_id = socket.room;
    console.log(msg_json);

    // Debug resending
    socket.to(socket.room).emit('Message', msg_json);
    socket.emit('Message', msg_json);

  }); 

});

