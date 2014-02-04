var mongoDB = require('mongodb').Db;
var mongoServer = require('mongodb').Server;
var async = require('async');

var Mongo = exports.Mongo = function( dbInfo ) {
	if (typeof(dbInfo) !== 'undefined') {
		this._dbInfo = dbInfo;
		this._db = new mongoDB( dbInfo.name, new mongoServer( dbInfo.url, dbInfo.port, { auto_reconnect:true } ), { safe:true } );
		this._collections = {};
	}
}

Mongo.prototype.getDB = function() {
	return this._db;
}

Mongo.prototype._loadCollection = function(collectionName, callback) {
	var self = this;
	self._db.collection(collectionName, function (err, collection) {
		self._collections[collectionName] = collection;
		callback(err);
	})
}

/* The callback will take two params, an error or null, and the database object*/
Mongo.prototype.connect = function(callback) {
	if (typeof(this._db) === 'undefined') {
		callback(Error("No DB Info provided"));
		return;
	}
	var self = this;
	var iterator = function( collectionName, callback) { 
		self._loadCollection( collectionName, callback ); 
	};
	
	self._db.open(function (err, db) {
		if (err === null) {
			self._db.authenticate(self._dbInfo.username, self._dbInfo.password, function(err, status) {
				if (self._dbInfo.collections) {
					var collections = self._dbInfo.collections;
					async.forEach (collections, iterator, callback);
				} else {
					callback(err, status);
				}
			})
		} else {
			callback(err, false);
		}
	});
}

Mongo.prototype.getCollection = function(collectionName) {
	if (this._collections[collectionName]) {
		return this._collections[collectionName];
	}
	throw new Error(collectionName + " not loaded in Mongo");
}