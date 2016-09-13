var UserModel         = require('./mongo-db-manager').UserModel;

function createUser(nickname) {
	if (!nickname){
		nickname = 'noname';		
	}

	user = new UserModel({nick: nickname});
	user.save();
	return(user);
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
