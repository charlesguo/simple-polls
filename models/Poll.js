var mongoose = require('mongoose');

// Subdocument schema for votes
var voteSchema = new mongoose.Schema({
   ip: String
});

// Subdocument schema for poll choices
var choiceSchema = new mongoose.Schema({
	text: String,
	votes: [voteSchema]
});

// Document schema for polls
var pollSchema = new mongoose.Schema({
	question: { type: String, required: true },
	choices: [choiceSchema]
});

module.exports = mongoose.model('Poll', pollSchema);
