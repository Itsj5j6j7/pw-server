const Event = require("../../structure/Event");
const config = require("../../config");
const { error } = require("../../utils/Console");
const { isStaff } = require("../../utils/Tickets");
const { ACTION_KEY, COUNT_KEY, MESSAGE_KEY, buildHoneypot } = require("../../utils/Honeypot");

const REASON = 'Honeypot: wrote in the honeypot channel';

// Whoever writes in the honeypot channel while it is on gets kicked or banned and the counter is updated.
module.exports = new Event({
    event: 'messageCreate',
    run: async (client, message) => {
        if (message.author.bot || message.channelId !== config.honeypot.channel) return;

        const action = client.database.get(ACTION_KEY);
        const member = message.member;
        if (!action || !member || isStaff(member)) return;
        if (!(action === 'ban' ? member.bannable : member.kickable)) return;

        message.delete().catch(() => { });

        try {
            if (action === 'ban') await member.ban({ deleteMessageSeconds: 3600, reason: REASON });
            else await member.kick(REASON);
        } catch (err) {
            return error(err);
        }

        const logChannel = await client.channels.fetch(config.honeypot.logChannel).catch(() => null);
        logChannel?.send({
            content: `${action === 'ban' ? 'Banned' : 'Kicked'} ${member} (\`${member.id}\`) for writing in ${message.channel}.`,
            allowedMentions: { parse: [] }
        }).catch(() => { });

        const count = (client.database.get(COUNT_KEY) || 0) + 1;
        client.database.set(COUNT_KEY, count);
        await message.channel.messages.edit(client.database.get(MESSAGE_KEY), buildHoneypot(action, count)).catch(() => { });
    }
}).toJSON();
