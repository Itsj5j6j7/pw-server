const Event = require("../../structure/Event");
const { tracked, check } = require("../../utils/Voice");

// Starts or cancels the delete countdown of the temporary voice channels when someone leaves or joins.
module.exports = new Event({
    event: 'voiceStateUpdate',
    run: (client, oldState, newState) => {
        const temporary = tracked(client);
        for (const channel of new Set([oldState.channel, newState.channel])) {
            if (channel && channel.id in temporary) check(client, channel);
        }
    }
}).toJSON();
