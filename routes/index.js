// Connect to MongoDB using Mongoose
var mongoose = require('mongoose');
var mongoUri =  process.env.MONGODB_URI || 'mongodb://localhost/simplepollsapp';
mongoose.connect(mongoUri);
var Poll = require('../models/Poll.js');

exports.index = function(req, res) {
	res.render('index');
};

// JSON API route for list of polls
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
			var userVoted = false;
			var userChoice;
			var totalVotes = 0;

      console.log('(POLL) user req.ip in entering the poll: ' + req.ip);
			// Loop through poll choices to determine if user has voted
			// on this poll, and if so, what they selected
			for(c in poll.choices) {
				var choice = poll.choices[c];

				for(v in choice.votes) {
					var vote = choice.votes[v];
					totalVotes++;

          console.log('(POLL) ip(s) of past votes: ' + vote.ip + ',  vote.id: ' + vote._id);
          // req.header('x-forwarded-for')
					if(vote.ip ===  req.ip) {
            console.log('vote corresponding to the user existing vote: ' + vote._id);
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

	// Filter out choices with empty text
	var choices = req.body.choices.filter(function(dummy) { return dummy.text != ''; });
			// Build up poll object to save
	var pollObj = {question: req.body.question, choices: choices};

	// Create poll model from built up poll object
	var poll = new Poll(pollObj);

	// Save poll to DB
	poll.save(function(err, pollDoc) {
		if(err || !pollDoc) {
			throw 'Error';
		} else {
			res.json(pollDoc);
		}
	});
};

exports.vote = function(socket) {
	socket.on('send:vote', function(data) {
    var ip =  socket.request.connection.remoteAddress;
    console.log('(VOTE) user trying to vote using: ' + ip);

		Poll.findById(data.poll_id, function(err, poll) {
			var choice = poll.choices.id(data.choice);
			choice.votes.push({ ip: ip });

			poll.save(function(err, doc) {
				var rtnDoc = {
					question: doc.question, _id: doc._id, choices: doc.choices,
					userVoted: false, totalVotes: 0
				};

				// rtnDoc needed to display choice after voting
				for(var i = 0; i < doc.choices.length; i++) {
					var choice = doc.choices[i];

					for(var j = 0; j < choice.votes.length; j++) {
						var vote = choice.votes[j];
						rtnDoc.totalVotes++;
						// rtnDoc.ip = ip;
            console.log('(VOTE) ip(s) of past votes: ' + vote.ip);

						if(vote.ip === ip) {
              console.log('cannot re-vote a question!');
							rtnDoc.userVoted = true;
							rtnDoc.userChoice = { _id: choice._id, text: choice.text };
						}
					}
				}

				socket.emit('myvote', rtnDoc);
				socket.broadcast.emit('vote', rtnDoc);
			});
		});
	});
};
