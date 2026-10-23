const Event = require("../../structure/Event");
const { hasRole, sync } = require("../../utils/Supporter");

// The Ko-fi supporter role was given or taken away: the same for the Minecraft group.
module.exports = new Event({
    event: 'guildMemberUpdate',
    run: (client, oldMember, newMember) => {
        if (oldMember.partial ? hasRole(newMember) : hasRole(oldMember) !== hasRole(newMember)) sync(newMember);
    }
}).toJSON();
