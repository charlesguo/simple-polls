// Connect to MongoDB using Mongoose
var mongoose      = require('mongoose');
var mongoUri =  process.env.MONGODB_URI || 'mongodb://localhost/simplepollsapp';
mongoose.connect(mongoUri);

var Poll = require('../models/Poll.js');

// Main application view
exports.index = function(req, res) {
	res.render('index');
};

// JSON API for list of polls
exports.list = function(req, res) {
	// Query Mongo for polls, just get back the question text
	Poll.find({}, 'question', function(error, polls) {
		res.json(polls);
	});
};

// JSON API for getting a single poll
exports.poll = function(req, res) {
	// Poll ID comes in the URL
	var pollId = req.params.id;

	// Find the poll by its ID, use lean as we won't be changing it
	Poll.findById(pollId, '', { lean: true }, function(err, poll) {
		if(poll) {
			var userVoted = false,
					userChoice,
					totalVotes = 0;

			// Loop through poll choices to determine if user has voted
			// on this poll, and if so, what they selected
			for(c in poll.choices) {
				var choice = poll.choices[c];

				for(v in choice.votes) {
					var vote = choice.votes[v];
					totalVotes++;

          console.log('vote.ip: ' + vote.ip)
          console.log('req.header.x-forwarded: ' + req.header('x-forwarded-for'));
          console.log('req.ip: ' + req.ip);

          // if(vote.ip === (req.header('x-forwarded-for') || req.ip)) {
					if(vote.ip === req.ip) {

						userVoted = true;
						userChoice = { _id: choice._id, text: choice.text };
					}
				}
			}

			// Attach info about user's past voting on this poll
			poll.userVoted = userVoted;
			poll.userChoice = userChoice;

			poll.totalVotes = totalVotes;

			res.json(poll);
		} else {
			res.json({error:true});
		}
	});
};

// JSON API for creating a new poll
exports.create = function(req, res) {
	var reqBody = req.body,
			// Filter out choices with empty text
			choices = reqBody.choices.filter(function(v) { return v.text != ''; }),
			// Build up poll object to save
			pollObj = {question: reqBody.question, choices: choices};

	// Create poll model from built up poll object
	var poll = new Poll(pollObj);

	// Save poll to DB
	poll.save(function(err, doc) {
		if(err || !doc) {
			throw 'Error';
		} else {
			res.json(doc);
		}
	});
};

exports.vote = function(socket) {
	socket.on('send:vote', function(data) {
    var ip = socket.request.connection.remoteAddress;

    console.log('socket.handshake ' + socket.handshake.headers['x-forwarded-for']);
    console.log('remoteAddress: ' + socket.request.connection.remoteAddress);
    console.log('ip: ' + ip);

		Poll.findById(data.poll_id, function(err, poll) {
			var choice = poll.choices.id(data.choice);
			choice.votes.push({ ip: ip });

			poll.save(function(err, doc) {
				var theDoc = {
					question: doc.question, _id: doc._id, choices: doc.choices,
					userVoted: false, totalVotes: 0
				};

				// Loop through poll choices to determine if user has voted
				// on this poll, and if so, what they selected
				for(var i = 0, ln = doc.choices.length; i < ln; i++) {
					var choice = doc.choices[i];

					for(var j = 0, jLn = choice.votes.length; j < jLn; j++) {
						var vote = choice.votes[j];
						theDoc.totalVotes++;
						theDoc.ip = ip;

						if(vote.ip === ip) {
							theDoc.userVoted = true;
							theDoc.userChoice = { _id: choice._id, text: choice.text };
						}
					}
				}

				socket.emit('myvote', theDoc);
				socket.broadcast.emit('vote', theDoc);
			});
		});
	});
};
