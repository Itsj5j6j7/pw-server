const Event = require("../../structure/Event");
const { onMemberUpdate } = require("../../utils/Ranks");

// A rank role (supporter, creator, ...) was given or taken away: the same for the Minecraft group.
module.exports = new Event({
    event: 'guildMemberUpdate',
    run: (client, oldMember, newMember) => {
        onMemberUpdate(oldMember, newMember);
    }
}).toJSON();
