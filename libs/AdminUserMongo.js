"use strict";
var bcrypt = require('bcrypt-nodejs'); 
var ObjectID = require('mongodb').ObjectID;

/*
This object will take a db object.
It makes assumption that DB connection is established and authenticated.
*/
var AdminUserMongo = exports.AdminUserMongo = function(spec) {
	this.mongo = spec.mongo;
	this.adminUsers = this.mongo.getCollection('admin-users');
	// this.theme = this.mongo.getCollection('theme');
}

var isEmpty = function (obj) {
	for (var prop in obj) {
		if (obj.hasOwnProperty(prop)) return false;
	}
	return true;
}

AdminUserMongo.prototype.authenticate = function (username, password, callback) {
	this.adminUsers.findOne({username: username}, function (error, user) {
		if (error !== null || user === null) {
			return callback(new Error("Username and password did not match"), null);
		}

		if (!bcrypt.compareSync(password, user.pwd)) {
			return callback(new Error("Username and password did not match!"));
		}

		callback(error, user);
	})
}

AdminUserMongo.prototype.findAdmins = function( queryIn, callback ){
	var self = this, query = {}, options = {};

	if( queryIn.options ){
		options = queryIn.options;
		delete queryIn.options;
	}

	if( queryIn && typeof queryIn === 'function' ){
		callback = queryIn;
	}
	else{
		query = queryIn; 
	}

	if( !options.sort ){
		options.sort = { '_id': 1 };
	}
	// console.log(options);
	self.adminUsers.find( query, options, function( err, cursor ){

		if( err ) return callback( err );

		cursor.toArray( function( err, docs ){

			if( err ) return callback( err );

			return callback( err, docs );

		})
	});
}

AdminUserMongo.prototype.addAdmin = function ( admin, callback ){
	if (typeof (admin) === 'function') {
		callback = admin;
		admin = null;
		return callback("Missing arguments");
	}

	this.adminUsers.insert( admin, {safe:true}, function (error, admins) {
		if(error) console.log(error);
		callback(error, admins);
	});
}

AdminUserMongo.prototype.removeAdmin = function ( admin, callback ){
	console.log(admin);
	this.adminUsers.remove( admin, function (error, result) {
		if(error) console.log(error);
		callback(error, result);
	});

}


AdminUserMongo.prototype.updateAdmin = function ( admin, set, callback ){
	// console.log(admin);

	this.adminUsers.update(	{_id: admin._id }, { $set: set }, 
		function(err, result) {
			callback(err, result);
		}
  	);

}