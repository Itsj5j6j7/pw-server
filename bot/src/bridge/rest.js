const { REST, Routes } = require('discord.js');

// The API process talks to Discord over REST only: no gateway, so it doesn't depend on the bot process being up.
const rest = new REST().setToken(process.env.CLIENT_TOKEN ?? '');

// For /health: false when the last Discord call failed.
const state = { ok: true };

const toBody = ({ flags, components }) => ({ flags, components: components.map((component) => component.toJSON()), allowed_mentions: { parse: [] } });

const guilds = new Map(); // channelId -> guildId
const memberCheck = async (channelId) => {
    if (!guilds.has(channelId)) guilds.set(channelId, (await rest.get(Routes.channel(channelId))).guild_id);
    const guildId = guilds.get(channelId);
    return (id) => rest.get(Routes.guildMember(guildId, id)).then(() => true, () => false);
};

const send = async (channelId, message) => rest.post(Routes.channelMessages(channelId), { body: toBody(message) });
const edit = async (channelId, messageId, message) => rest.patch(Routes.channelMessage(channelId, messageId), { body: toBody(message) });

// Outside the queue on purpose: Discord allows 2 renames per 10 minutes per channel and waiting would hold up the messages.
const rename = async (channelId, name) => {
    if ((await rest.get(Routes.channel(channelId))).name !== name) await rest.patch(Routes.channel(channelId), { body: { name } });
};

let queue =Promise.resolve();
// Discord work runs one task at a time, so messages show up in the order the events arrived.
const enqueue = (task) => {
    queue = queue.then(task).then(() => state.ok = true, (err) => {
        state.ok = false;
        console.error(err);
    });
};

// build(isMember) returns the message payload.
const post = (channelId, build) => enqueue(async () => send(channelId, await build(await memberCheck(channelId))));

module.exports = { state, memberCheck, send, edit, rename, enqueue, post };
