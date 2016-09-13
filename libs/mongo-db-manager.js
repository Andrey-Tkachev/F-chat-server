var mongoose     = require('mongoose');
var deepPopulate = require('mongoose-deep-populate')(mongoose);
var log          = require('./log')(module);
var config       = require('./config');
var crypto       = require('crypto');
var xssFilters   = require('xss-filters');

mongoose.connect(config.get('mongoose:uri'));
var db = mongoose.connection;

db.on('error', function (err) {
    log.error('Connection error:', err.message);
});
db.once('open', function callback () {
    log.info("Connected to " + config.get('mongoose:uri'));
});

var Schema = mongoose.Schema;


var User = new Schema({
  nick : {type: String}
  //users         : [{type: mongoose.Schema.Types.ObjectId, ref: 'User'}],
});

User.virtual('id').get(function() {
  return this._id.toHexString();
});

var Room = new Schema({
  status : {type: String},
  users  : [{type: mongoose.Schema.Types.ObjectId, ref: 'User'}],
});

Room.virtual('id').get(function() {
  return this._id.toHexString();
});


var Message = new Schema({
    user_id       : { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    data          : { type: String, required: true },
    date          : { type: Date, default: Date.now() },
    room_id       : { type: mongoose.Schema.Types.ObjectId, ref: 'Room' } 
});

Message.virtual('id').get(function() {
  return this._id.toHexString();
});

Message.plugin(deepPopulate, {} /* more on options below */);

function mongoStoreConnectionArgs() {
  return { dbname: db.db.databaseName,
           host: db.db.serverConfig.host,
           port: db.db.serverConfig.port};
};



var RoomModel          = mongoose.model('Room', Room);
var MessageModel       = mongoose.model('Message', Message);
var UserModel       = mongoose.model('User', User);


module.exports.MessageModel  = MessageModel;
module.exports.UserModel     = UserModel;
module.exports.RoomModel     = RoomModel;
module.exports.mongoose      = db;