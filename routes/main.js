"use strict";
var async = require("async")
	, util = require('util')
	, fs = require('fs')
	;

var Main = function( mongo ) {
	var self = this;
	if( typeof mongo === 'undefined' ) { console.log( 'Admin( undefined )!'); }
};

exports.initMain = function( mongo ){
	return new Main( mongo );
};

Main.prototype.home = function( req, res, next ){
	res.locals.randomVar = "look mom it passed to render";
	res.render('index',  { title: "Title of your view", pageName: "home" });	
};