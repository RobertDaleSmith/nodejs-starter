
var bodyParser     = require('body-parser')
  , cons           = require('consolidate')
  , errorHandler   = require('errorhandler')
  , express        = require('express')
  , favicon        = require('serve-favicon')
  , logger         = require('morgan')
  , MongoStore     = require('connect-mongodb')
  , methodOverride = require('method-override')
  , multer         = require('multer')
  , sass           = require('node-sass')
  , session        = require('express-session')
  , dbInfo         = require('./libs/db-info.js').dbInfo(["admin-sessions", "admin-users"])
  ;

if(dbInfo.name == 'DEPLOYMENT_NAME'){ console.log('\n\n MongoDB Info Missing! Create deployment on compose.io and info to /libs/db-info.js.\n\n'); return false; }

var app = express();

var conf = { 'port':(process.env.PORT || 8000), 'base':'' };

var mongo = new (require('./libs/Mongo').Mongo)(dbInfo);

//Custom Dust.JS helpers
var dust = require('dustjs-linkedin');
dust.helper = require('dustjs-helpers');
if (!dust.helpers) dust.helpers = {};

dust.helpers.formatIndex = function (chunk, context, bodies, params) {
  var text = dust.helpers.tap(params.value, chunk, context);
  text = text.split(';'),
  idx  = text[0],
  len  = text[1];
  var reversed = (idx - len) * -1;
  return chunk.write(reversed);
}

mongo.connect(function(err) {

  if(err) console.dir(err)
  // assign dust engine to .dust files
  var template_engine = 'dust';

  app.set('port', conf.port);
  app.use(express.static(__dirname + '/public', {redirect: false}));
  app.use(express.static(__dirname + '/private', {redirect: false}));
  app.set('template_engine', template_engine);
  app.set('view engine', template_engine);
  app.engine(template_engine, cons.dust);
  app.set('views', __dirname + '/views');
  app.use(favicon(__dirname + '/public/images/favicon.ico')); 
  app.use(logger('dev'));
  app.use(methodOverride());
  app.use(session({
    secret: dbInfo.secret,
    store: new MongoStore({
        db: mongo.getDB(),
        username: dbInfo.username,
        password: dbInfo.password,
        collection: 'admin-sessions'
    }),
    cookie: { maxAge: 24*60*60*1000 },
    resave: true,
    saveUninitialized: true
  }));
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({extended:true}));
  app.use(multer());


  if('development' == app.get('env')){
    app.use(errorHandler());
  }

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
  // app.get( '/createPwd/:pwd', function( req, res, next ) { routes.Admin.createPwd( req, res, next ); } );

  app.get( '/admin', function( req, res, next ) { routes.Admin.admin( req, res, next ); } );
  app.get( '/admin/logout', function( req, res, next ) { routes.Admin.logOut( req, res, next ); } );
  app.get( '/admin/login', function( req, res, next ) { routes.Admin.login( req, res, next ); } );
  app.post('/admin/login', function( req, res, next ) { routes.Admin.postLogin( req, res, next ); });  
  
  app.get( '/admin/dashboard', requiresLogin, function( req, res, next ) { routes.Admin.dashboard( req, res, next ); } );  

  app.get( '/admin/js/:scriptFileName', requiresLoginAjax, function( req, res, next ) { routes.Admin.privateScript( req, res, next ); } ); 
  app.get( '/admin/css/:styleFileName' , requiresLoginAjax, function( req, res, next ) { routes.Admin.privateStyle( req, res, next );  } ); 
  app.get( '/admin/images/:imageFileName' , requiresLoginAjax, function( req, res, next ) { routes.Admin.privateImage( req, res, next );  } ); 

  // app.get("/*", function(req, res, next) { next("Could not find page"); }); //Handle 404

  app.listen(conf.port);
  console.log('Express server listening on port ' + conf.port);
  
});

module.exports = app;