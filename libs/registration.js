var log 	 	= require('./log')(module);
var UserModel	= require('./mongo-db-manager').UserModel;


function create_user(req, res) {
	var user = new UserModel(req.body);
    user.save();
}

module.exports.create_user = create_user;