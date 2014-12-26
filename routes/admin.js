"use strict";
var async = require("async")
   , util = require('util')
   ;

var Admin = function( mongo ) {

	var self = this;
	if( typeof mongo === 'undefined' ) { console.log( 'Admin( undefined )!'); }

	var AdminUserMongo = require("../libs/AdminUserMongo").AdminUserMongo;
	self._adminUsers = new AdminUserMongo( {mongo:mongo} );

};

exports.initAdmin = function( mongo ){
	return new Admin( mongo );
}

Admin.prototype.admin = function( req, res ){	
	var url = 'admin/login';
	if(req.session.loggedIn){
		url = '/admin/dashboard';
		res.locals.section = 'dashboard';
	}
	return res.redirect(url);
}

Admin.prototype.login = function( req, res ) {
	return res.render('admin/login');
};

Admin.prototype.postLogin = function( req, res ) {
	var self = this;
	var user = req.body['admin'];
	self._adminUsers.authenticate(user.id, user.password, function (error, result) {
		console.log(error + "  !!!!");
		if (error !== null || !result) {
			req.session.admin = {loggedIn:false};
			return res.redirect('/admin/login');
		}
		var url = '/admin/dashboard';
		result.pwd = null;
		req.session.admin = result;
		req.session.loggedIn = true;
		res.redirect(url);
	});
};

Admin.prototype.logOut = function( req, res ) {
	req.session.admin = null;
	req.session.loggedIn = false;
	res.locals.admin = null;
  	res.locals.loggedIn = false;
	res.render('admin/login');
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