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


// USER
var User = new Schema({
  username: {
        type: String,
        unique: true,
        required: true
    },

  hashedPassword: {
        type: String,
        required: true
    },
  
  salt: {
        type: String,
        required: true
    },

  rooms_list: [{ 
        type: mongoose.Schema.Types.ObjectId, ref: 'Room'   
    }],
    
  created: {
        type: Date,
        default: Date.now
    }
});

User.virtual('password')
    .set(function(password) {
        this._plainPassword = password;
        this.salt = crypto.randomBytes(32).toString('base64');
        //more secure - this.salt = crypto.randomBytes(128).toString('base64');
        this.hashedPassword = this.encryptPassword(password);
        })
    .get(function() { return this._plainPassword; });


User.methods.checkPassword = function(password) {
    return this.encryptPassword(password) === this.hashedPassword;
};

User.virtual('id').get(function() {
  return this._id.toHexString();
});

var UserModel = mongoose.model('User', User);


// CLIENT
var Client = new Schema({
    name: {
        type: String,
        unique: true,
        required: true
    },
    clientId: {
        type: String,
        unique: true,
        required: true
    },
    clientSecret: {
        type: String,
        required: true
    }
});


var ClientModel = mongoose.model('Client', Client);


// ACCES TOKEN
var AccessToken = new Schema({
    userId: {
        type: String,
        required: true
    },
    clientId: {
        type: String,
        required: true
    },
    token: {
        type: String,
        unique: true,
        required: true
    },
    created: {
        type: Date,
        default: Date.now
    }
});

var AccessTokenModel = mongoose.model('AccessToken', AccessToken);


// REFRESH TOKEN
var RefreshToken = new Schema({
    userId: {
        type: String,
        required: true
    },
    clientId: {
        type: String,
        required: true
    },
    token: {
        type: String,
        unique: true,
        required: true
    },
    created: {
        type: Date,
        default: Date.now
    }
});

var RefreshTokenModel = mongoose.model('RefreshToken', RefreshToken);


// ROOM
var Room = new Schema({
  status : {type: String},
  users  : [{type: mongoose.Schema.Types.ObjectId, ref: 'User'}],
});

Room.virtual('id').get(function() {
  return this._id.toHexString();
});

var RoomModel = mongoose.model('Room', Room);



// MESSAGE
var Message = new Schema({
    user_id       : { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    data          : { type: String, required: true },
    date          : { type: Date, default: Date.now() },
    room_id       : { type: mongoose.Schema.Types.ObjectId, ref: 'Room' } 
});

Message.virtual('id').get(function() {
  return this._id.toHexString();
});

var MessageModel = mongoose.model('Message', Message);



function mongoStoreConnectionArgs() {
  return { dbname: db.db.databaseName,
           host: db.db.serverConfig.host,
           port: db.db.serverConfig.port};
};

module.exports.MessageModel  = MessageModel;
module.exports.UserModel     = UserModel;
module.exports.RoomModel     = RoomModel;

module.exports.ClientModel       = ClientModel;
module.exports.AccessTokenModel  = AccessTokenModel;
module.exports.RefreshTokenModel = RefreshTokenModel;

module.exports.mongoose      = db;