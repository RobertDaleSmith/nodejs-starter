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

AdminUserMongo.prototype.authenticate = function (id, password, callback) {
	this.adminUsers.findOne({id: id}, function (error, user) {
		if (error !== null || user === null) {
			return callback(new Error("Username and password did not match!"), null);
		}
		// console.log(password);
		// console.log(user.pwd);
		if (!bcrypt.compareSync(password, user.pwd)) {
			return callback(new Error("Username and password did not match"));
		}

		callback(error, user);
	})
}