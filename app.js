/*jshint node:true*/
var express = require('express');
var app = express();
var routes = require('./routes');
var http = require('http');
var path = require('path');
// var ejs = require('ejs');

var morgan = require('morgan');
var bodyParser = require('body-parser');
var methodOverride = require('method-override');

var server = http.createServer(app);
var io = require('socket.io').listen(server);

app.set('port', process.env.PORT || 3000);
// app.set('views', path.join(__dirname, 'views'));
// app.set('view engine', 'jade');
app.engine('html', require('ejs').renderFile);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
// app.use(express.favicon());
// app.use(favicon());
// app.use(express.logger('dev'));
app.use(morgan('dev'));
// app.use(express.bodyParser());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
// app.use(express.methodOverride());
app.use(methodOverride());
// app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));

// Main App Page
app.get('/', routes.index);

// MongoDB API Routes
app.get('/polls/polls', routes.list);
app.get('/polls/:id', routes.poll);
app.post('/polls', routes.create);
app.post('/vote', routes.vote);

io.sockets.on('connection', routes.vote);

// Handle Errors gracefully
app.use(function(err, req, res, next) {
	if(!err) return next();
	console.log(err.stack);
	res.json({error: true});
});

server.listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});
