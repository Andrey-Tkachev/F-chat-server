var UserModel   = require('./mongo-db-manager').UserModel;
var log 	 	= require('./log')(module)

function createUser(json) {
	var user = new UserModel(json);
    console.log(json);
    console.log(user);
    user.save();
}

function killUser(user_id) {
	if (!user_id){
		log.debug('Unvalid user_id to kill');
		return;		
	}
	 UserModel.remove({_id: user_id}, function (err) {
        if (err) return handleError(err);
    });
}

module.exports.createUser = createUser;
module.exports.killUser   = killUser;
