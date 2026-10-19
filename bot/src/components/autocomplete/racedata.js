const AutocompleteComponent = require("../../structure/AutocompleteComponent");

// Only the course option autocompletes, same as in /leaderboard.
module.exports = new AutocompleteComponent({
    commandName: 'racedata',
    run: require('./leaderboard').run
}).toJSON();
