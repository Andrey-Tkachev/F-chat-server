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

var bodyParser        = require('body-parser');
var xssFilters        = require('xss-filters');
var zlib              = require('zlib');
var app               = express();


var server = app.listen(config.get('port'), function(){
   log.info('Server listening on port ' + config.get('port'));
});
var io = require('socket.io').listen(server);

app.use(bodyParser.urlencoded({
    extended: true
}));


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

app.post('/auth', function(req, res) {
  
    UserModel.findOne({username : req.body.username}, 
      function(err, user) {
        if (!user) {
          res.end(JSON.stringify({status:400, message: "User already exists"}));
        } else {
          if (!user.checkPassword(req.body.password)) {
            res.end(JSON.stringify({status : 401, message: "Wrong password"}));
          } else {
            
            AccessTokenModel.remove({ userId: user.username }, function (err) {
              if (err) return done(err);
            });

            var tokenValue = crypto.randomBytes(32).toString('base64');
            var token      = new AccessTokenModel({ 
                                token: tokenValue, 
                                userId: user.username 
                              });

            var response = {
              status : 200,
              message : 'Welcome',
              token : token.token
            };
            res.end(JSON, stringify(response));
          }
        }
    });

});

app.post('/register', function(req, res) {
  log.info("Register request.");
  log.info("Body: " + req.body);
  if (!req.body.username || !req.body.password) {
    response = {
            status  : 500,
            message : 'Invalid login or password'
          };
    res.end(JSON.stringify(response));
    return;
  }
  UserModel.findOne ({username : req.body.username}, 
    function(err, user) {
      if (user) {
        res.end(JSON.stringify({status: 400}));
      } else { 
        var response;
        if (!req.body || !req.body.username || !req.body.password) {
          response = {
            status  : 500,
            message : 'Invalid login or password'
          };
        } else {
          
          createUser(req.body);

          response = {
            status  : 200,
            message : 'Register succesfuly'
          };
         
        }
        res.end(JSON.stringify(response));
        return;
      }
    });

});


io.sockets.on('connection', function(socket){
  
  // USER CONNECTED
  ROOM_DEFAULT = 'general';
//  log.info('New connection from ' + address.address + ':' + address.port);

  socket.room = ROOM_DEFAULT;
  socket.auth = false;

  socket.join(socket.room);

    // INIT
  socket.on('Auth', function(token){
    log.info('Init request.');
    if (!token || !token.token){
      log.error('Trying to init without token.');
      socket.emit('UserId', { user_id: socket.user_id });
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
        socket.emit('UserId', { user_id: socket.user_id });
        log.info('Init success: ' + a_token.userId);
      });
    });
  });


  //  JOIN
  socket.on('JoinRoom', function(room_json){
    if (!socket.auth){
      return;
    }
    log.info('Join room ' + room_json);
    if (!room_json){
      return;
    }
    if (!room_json.room_id){
      return;
    }
    RoomModel.findOne({room: room_json.room_id}, function(err, room) {
      if (!room) {
        log.error('Room ' + room.room_id + ' not found.');
        return;
      }

      socket.room = room.id;
      socket.join(room.id);
      sendDialog(socket, room.id);
    });
  });

  // LEAVE 
  socket.on('Leave', function (){
    if (!socket.auth){
      return;
    }
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
    msg_res = createMessage(msg_json.data, socket.user_id, socket.room);
    
    if(socket.room != ROOM_DEFAULT){
      msg = new MessageModel(msg_res);
      msg.save();
    }
    if (!msg_json.user_id) {
      msg_res.user_id = "undefined";
    }
    
    // Debug resending
    socket.to(socket.room).emit('Message', msg_res);
    socket.emit('Message', msg_res);

  });

});

