"use strict";
var   async   = require("async")
	, bcrypt  = require('bcrypt-nodejs')
	, util    = require('util')
	, mongodb = require('mongodb')
	, BSON    = mongodb.BSONPure
	;

var Admin = function( mongo ) {

	var self = this;
	if( typeof mongo === 'undefined' ) { console.log( 'Admin( undefined )!'); }

	var AdminUserMongo = require("../libs/AdminUserMongo").AdminUserMongo;
	self._adminUsers = new AdminUserMongo( {mongo:mongo} );

	var EndUserMongo = require("../libs/EndUserMongo").EndUserMongo;
	self._endUsers = new EndUserMongo( {mongo:mongo} );

};

exports.initAdmin = function( mongo ){
	return new Admin( mongo );
}

Admin.prototype.home = function( req, res ) {
	console.log('admin/home');
	res.render( 'admin/home', {
		pageId: 'dash',
		title:  'Dashboard'
	});
};

Admin.prototype.adminUsers = function( req, res ) {
	console.log('admin/users');
	this._adminUsers.findAdmins( {} , function( err, results ){
		// console.log(results);
		res.locals.users = results;
		res.locals.alert = req.flash('alert');
	 	res.render( 'admin/admins', {
			pageId: 'adminUsers',
			title:  'Admins'
		});
	});
	
};

Admin.prototype.endUsers = function( req, res ) {
	console.log('admin/users');
	this._endUsers.findUsers( {} , function( err, results ){
		res.locals.users = results;

	 	res.render( 'admin/users', {
			pageId: 'endUsers',
			title:  'End Users'
		});
	});
	
};

Admin.prototype.login = function( req, res ) {

	//Check if any admins have been created yet.
	this._adminUsers.findAdmins({}, function (error, result) {
		if( result.length <= 0 ) res.locals.adminZero = true;
		res.locals.title = 'Login';
		res.locals.error = req.flash('error');
		res.render('admin/login');
	});
};

Admin.prototype.postLogin = function( req, res ) {
	var self = this;
	var user = req.body['admin'];

	function loginSuccess(result){
		result.pwd = null;
		req.session.admin = result;
		req.session.loggedIn = true;
		if (user.remember) { req.session.cookie.maxAge = 2628000000; }
		else { req.session.cookie.maxAge = 24*60*60*1000; }
		res.redirect('/admin/');
	}

	if(user.confirm_password){

		//create new account and login
		var newAdmin = {
			username: user.username,
			email: user.email,
			pwd: bcrypt.hashSync(user.password, bcrypt.genSaltSync(10)),
		};
		
		//Store new user in DB.
		self._adminUsers.addAdmin( newAdmin , function( err, result ){
			if(result.length == 0){
				res.send({error: true});
			} else {
				loginSuccess(result);
			}
		});


	} else {
		//authenticate and login
		self._adminUsers.authenticate(user.username, user.password, function (error, result) {
			if (error !== null || !result) {
				req.session.admin = {loggedIn:false};
				req.flash('error', error.message);
				res.redirect('/admin/login');

			} else {
				loginSuccess(result);	
			}
			
		});

	}
};


Admin.prototype.addAdmin = function( req, res ) {
	var self = this;
	var user = req.body['admin'];
	var isExisting = false;

	async.series([

		function( callback ){
			self._adminUsers.findAdmins( { $or: [ { username: user.username }, { email: user.email } ] }, function( err, results ){
				// console.log(results);
				if(results.length > 0) 
					isExisting = true;
				callback();
			});

		}

	], function( asyncErr ){

		if(asyncErr) {
			//Error, return to Edit Admin with error.
			res.locals.error = asyncErr;
			req.flash( 'alert', {type: 'danger', message: asyncErr} );

			res.redirect('/admin/admins/');

		} else {
			//Store new user in DB.

			if( isExisting ){

				req.flash( 'alert', {type: 'danger', message: 'Username or email address is already in use.'} );
				res.redirect('/admin/admins/');

			} else {
				self._adminUsers.addAdmin( {

					username: 	user.username,
					email: 		user.email,
					pwd: 		bcrypt.hashSync( user.password, bcrypt.genSaltSync(10) )

				}, function( err, result ){

					if(result.length == 0){
						// res.send({error: true, success: false});
						req.flash( 'alert', {type: 'danger', message: err} );
						res.redirect('/admin/admins/');
					} else {
						console.log(result);
						// res.send({error: false, success: true, admin: result});
						req.flash( 'alert', {type: 'success', message: user.username + ' has been successfully created.'} );
						res.redirect('/admin/admins/');
					}

				});
			}


		}
			
	});

	
	

									
	
};


Admin.prototype.removeAdmin = function( req, res ) {
	// console.log(req.params.id);

	var self = this;
	var user = { _id: new BSON.ObjectID(req.params.id) }

	async.series([

		function( callback ){

			self._adminUsers.findAdmins( user, function( err, results ){
				// console.log(results);
				user = results[0];
				callback();
			});

		}

	], function( asyncErr ){

		self._adminUsers.removeAdmin( user, function( err, result ){

			if(result.length == 0){
				// res.send({error: true, success: false});
				req.flash( 'alert', {type: 'danger', message: err} );
				res.redirect('/admin/admins/');
			} else {
				// res.send({error: err, success: true, admin: result});
				req.flash( 'alert', {type: 'warning', message: user.username + ' has been successfully removed.'} );
				res.redirect('/admin/admins/');
			}

		});

	});

		
};

Admin.prototype.updateAdmin = function( req, res ) {

	var self = this;
	var userNew = req.body['admin'],
		userOld = {},
		userSet = {},
		emailUsed = false, usernameUsed = false,
		emailChanged = false, usernameChanged = false,
		passwordChanged = false;

	userNew._id = new BSON.ObjectID(userNew._id);
	// console.log(userNew);
	async.series([

		function( callback ){

			self._adminUsers.findAdmins( {_id: userNew._id}, function( err, results ){
				// console.log(results);
				userOld = results[0];

				if(userOld.email != userNew.email) emailChanged = true;
				if(userOld.username != userNew.username) usernameChanged = true;


				callback();
			});

		}

		,function( callback ){
			//Email changed? If so then see if someone else has it.
			if(emailChanged){
				console.log("email changed");
				self._adminUsers.findAdmins( {email: userNew.email, options: {"$not": { _id: userNew._id }}}, function( err, results ){
					// console.log(results);
					if(results) if(results.length > 0) emailUsed = true;
					callback();
				});
			} else {
				console.log("email not changed");
				callback();
			}
		}

		,function( callback ){
			//Username changed? If so then see if someone else has it.
			if(usernameChanged){
				console.log("username changed");
				self._adminUsers.findAdmins( {username: userNew.username, options: {"$not": { _id: userNew._id }}}, function( err, results ){
					// console.log(results);
					if(results) if(results.length > 0) usernameUsed = true;
					callback();
				});
			} else {
				console.log("username not changed");
				callback();
			}

		}

		,function( callback ){
			//Password changed?
			if(userNew.password.length > 0){
				console.log("password changed");
				passwordChanged = true;
			} else {
				console.log("password not changed");

			}
			callback();
		}




	], function( asyncErr ){

		if(emailChanged && !emailUsed) 
			userSet.email = userNew.email;
		else if(emailChanged && emailUsed)
			req.flash( 'alert', {type: 'warning', message: "Email address not updated. " + userNew.email + " is in use by another admin account. Please try again!"} );

		if(usernameChanged && !usernameUsed) 
			userSet.username = userNew.username;
		else if(usernameChanged && usernameUsed)
			req.flash( 'alert', {type: 'warning', message: "Username not updated. " + userNew.username + " is in use by another admin account. Please try again!"} );

		if(passwordChanged)
			userSet.pwd = bcrypt.hashSync(userNew.password, bcrypt.genSaltSync(10));

		if(emailChanged || usernameChanged || passwordChanged){

			self._adminUsers.updateAdmin( {_id: userNew._id}, userSet, function( err, result ){

				console.log(result);
				if(result.length == 0){
					// res.send({error: true, success: false});
					
					res.redirect('/admin/admins/');
				} else {
					// res.send({error: err, success: true, admin: result});
					req.flash( 'alert', {type: 'success', message: userNew.username + ' has been successfully updated.'} );
					res.redirect('/admin/admins/');
				}

			});
		} else {
			req.flash( 'alert', {type: 'success', message: userNew.username + ' has been successfully updated, but no changes were detected.'} );
			res.redirect('/admin/admins/');
		}

	});

		
};

Admin.prototype.logOut = function( req, res ) {
	req.session.admin = null;
	req.session.loggedIn = false;
	res.locals.admin = null;
  	res.locals.loggedIn = false;
	res.redirect('/admin/login');

};

Admin.prototype.dashboard = function( req, res ){
	res.locals.loggedIn = req.session.loggedIn;
	res.locals.section = 'dashboard';
	res.render('admin/dashboard');
};

Admin.prototype.createPwd = function( req, res ){
	var pwd = req.params.pwd;
	var bcrypt = require('bcrypt-nodejs');
	var salt = bcrypt.genSaltSync(10);
	var password = bcrypt.hashSync(pwd, salt);
	res.send({string:pwd, password:password});
};

Admin.prototype.privateScript = function( req, res ) {
	var filePath = './private/js/' + req.params.scriptFileName;
	return res.sendfile(filePath);
};

Admin.prototype.privateStyle = function( req, res ) {
	var filePath = './private/css/' + req.params.styleFileName;
	return res.sendfile(filePath);
};

Admin.prototype.privateImage = function( req, res ) {
	var filePath = './private/images/' + req.params.imageFileName;
	return res.sendfile(filePath);
};