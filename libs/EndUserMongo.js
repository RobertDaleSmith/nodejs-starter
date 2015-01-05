"use strict";
var bcrypt = require('bcrypt-nodejs'); 
var ObjectID = require('mongodb').ObjectID;

/*
This object will take a db object.
It makes assumption that DB connection is established and authenticated.
*/
var EndUserMongo = exports.EndUserMongo = function(spec) {
	this.mongo = spec.mongo;
	this.endUsers = this.mongo.getCollection('end-users');
}

var isEmpty = function (obj) {
	for (var prop in obj) {
		if (obj.hasOwnProperty(prop)) return false;
	}
	return true;
}

EndUserMongo.prototype.authenticate = function (username, password, callback) {
	this.endUsers.findOne({username: username}, function (error, user) {
		if (error !== null || user === null) {
			return callback(new Error("Username and password did not match!"), null);
		}

		if (!bcrypt.compareSync(password, user.pwd)) {
			return callback(new Error("Username and password did not match"));
		}

		callback(error, user);
	})
}

EndUserMongo.prototype.findUsers = function( queryIn, callback ){
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
	self.endUsers.find( query, options, function( err, cursor ){

		if( err ) return callback( err );

		cursor.toArray( function( err, docs ){

			if( err ) return callback( err );

			return callback( err, docs );

		})
	});
}

EndUserMongo.prototype.addUser = function ( admin, callback ){
	if (typeof (admin) === 'function') {
		callback = admin;
		admin = null;
		return callback("Missing arguments");
	}

	this.endUsers.insert( admin, {safe:true}, function (error, admins) {
		console.log(error);
		console.log(admins);
		callback(error, admins);
	});
}