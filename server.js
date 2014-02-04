var dbInfo = {
   name: 'db-name',
   url: 'server.mongohq.com',
   port: 10000,
   username: 'username',
   password: 'password',
   collections: ["admin-sessions", "admin-users"]
} //Update this info with mongohq account info.

var express = require('express')
  , http = require('http')
  , cons = require('consolidate')
  , MongoStore = require( 'connect-mongodb' );

var app = express();
var mongo = new (require('./libs/Mongo').Mongo)(dbInfo);

var sass = require('node-sass');

var conf = (require('fs').existsSync( './dev_conf.js' ) && require('./dev_conf').conf) || 
           { "port":(process.env.PORT || 8008), "base":"" };

//Custom Dust.JS helpers
var dust = require('dustjs-linkedin');
dust.helper = require('dustjs-helpers');
  
if (!dust.helpers)
  dust.helpers = {};

dust.helpers.formatIndex = function (chunk, context, bodies, params) {
  var text = dust.helpers.tap(params.value, chunk, context);
  text = text.split(';'),
  idx  = text[0],
  len  = text[1];
  var reversed = (idx - len) * -1;
  return chunk.write(reversed);
}

mongo.connect(function(err) {

  if(err) console.log(err)
  // assign dust engine to .dust files
  app.engine('dust', cons.dust);

  app.configure(function(){
    app.set('view engine', 'dust');
    app.set('views', __dirname + '/views');
    app.set('view options', { pretty: true });
    app.use(express.favicon(__dirname + '/public/images/favicon.ico')); 
    app.use(express.logger('dev'));
    app.use(express.compress());
    app.use(sass.middleware({ src: __dirname + '/private' , dest: __dirname + '/public' , debug: true , outputStyle: 'compressed' , prefix:  '/prefix' }));        
    app.use(express.static(__dirname + '/public', {redirect: false}));
    app.use(express.bodyParser({ keepExtensions: true, uploadDir: __dirname + "/tmp" }));
    app.use(express.methodOverride());
    app.use(express.cookieParser('RandomNameAdmin'));
    app.use(express.session({
        secret: "superSecretAdminPhrase",
        store: new MongoStore({
            db: mongo.getDB(),
            username: dbInfo.username,
            password: dbInfo.password,
            collection: 'admin-sessions'
        }),
        cookie: { maxAge: 24*60*60*1000 }
    }));
    app.use(app.router);
  });

  app.configure('development', function(){
    app.use(express.errorHandler());
  });

  var routes = {};

  var Main = require('./routes/main.js').initMain;
  routes.Main = new Main(mongo) ;

  var Admin = require('./routes/admin.js').initAdmin;
  routes.Admin = new Admin(mongo);

  /* Middlewares */
  function requiresLogin(req, res, next) {
    if( req.session.admin && req.session.loggedIn ){
        next();
    }
    else{
      res.redirect('/admin/login?returnurl=' + req.url);
    }
  };

  function requiresLoginAjax(req, res, next) {
    if( req.session.admin && req.session.loggedIn ){
      next();
    }
    else {
      res.status(403);
      res.send({success:false, error:'Not logged in'});
    }
  };
  
  // /* Dynamic helpers */
  app.all('/admin/*', function( req, res, next ) {
    if( req.session.admin ){
      res.locals.admin = req.session.admin;
      res.locals.loggedIn = true;
      console.log('loggedIn');
    }
    next();
  });

  app.get( '/', function( req, res, next ) { routes.Main.home( req, res, next ); } );

  //Uncomment and use to create admin password, then comment out.
  app.get( '/createPwd/:pwd', function( req, res, next ) { routes.Admin.createPwd( req, res, next ); } );

  app.get( '/admin', function( req, res, next ) { routes.Admin.admin( req, res, next ); } );
  app.get( '/admin/logout', function( req, res, next ) { routes.Admin.logOut( req, res, next ); } );
  app.get( '/admin/login', function( req, res, next ) { routes.Admin.login( req, res, next ); } );
  app.post('/admin/login', function( req, res, next ) { routes.Admin.postLogin( req, res, next ); });  
  
  app.get( '/admin/dashboard', requiresLogin, function( req, res, next ) { routes.Admin.dashboard( req, res, next ); } );  

  app.get( '/admin/js/:scriptFileName', requiresLoginAjax, function( req, res, next ) { routes.Admin.privateScript( req, res, next ); } ); 
  app.get( '/admin/css/:styleFileName' , requiresLoginAjax, function( req, res, next ) { routes.Admin.privateStyle( req, res, next );  } ); 
  app.get( '/admin/images/:imageFileName' , requiresLoginAjax, function( req, res, next ) { routes.Admin.privateImage( req, res, next );  } ); 

  // app.get("/*", function(req, res, next) { next("Could not find page"); }); //Handle 404

  http.createServer(app).listen(conf.port);
  console.log("Express server listening on port " + conf.port);
  
});

module.exports = app;