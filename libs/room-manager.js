var RoomModel         = require('./mongo-db-manager').RoomModel;

function createRooms(rooms_number){
	if (!rooms_number) {
		rooms_number = 5;
	}
	for (var i=0; i<rooms_number; i++){
		room = new RoomModel({status: "empty"});
		room.save();
	}
}

function findFreeRoom(callback){
	RoomModel.find({status: 'wait'}, function (err) {
        if (err) return handleError(err);
    });
}

function deleteRoom(room_id){
	if (!user_id){
		log.debug('Unvalid room_id to delete.');
		return;		
	}
	RoomModel.remove({_id: room_id}, function (err) {
        if (err) return handleError(err);
    });
}

module.exports.createRooms = createRooms;
module.exports.deleteRoom  = deleteRoom;