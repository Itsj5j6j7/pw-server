const config = require('../config');

const KEY = 'voice-channels'; // { channelId: ownerId } of the temporary voice channels.
const timers = new Map();

const tracked = (client) => client.database.get(KEY) || {};

const track = (client, channelId, ownerId) => client.database.set(KEY, { ...tracked(client), [channelId]: ownerId });

const forget = (client, channelId) => {
    clearTimeout(timers.get(channelId));
    timers.delete(channelId);
    const { [channelId]: _, ...rest } = tracked(client);
    client.database.set(KEY, rest);
};

// "Voice N" with the lowest N not used by an existing temporary channel.
const nextName = (client) => {
    const used = new Set(Object.keys(tracked(client)).map((id) => client.channels.cache.get(id)?.name.match(/Voice (\d+)$/)?.[1]));
    let n = 1;
    while (used.has(String(n))) n++;
    return `🎤┃Voice ${n}`;
};

// Starts the delete countdown if the channel is empty, cancels it if someone is in.
const check = (client, channel) => {
    clearTimeout(timers.get(channel.id));
    timers.delete(channel.id);
    if (channel.members.size) return;

    timers.set(channel.id, setTimeout(() => {
        forget(client, channel.id);
        channel.delete('Temporary voice channel empty').catch(() => { });
    }, config.voice.deleteAfterMinutes * 60000));
};

// On startup: drops the channels deleted meanwhile and restarts the countdown of the empty ones.
const sweep = (client) => {
    for (const id of Object.keys(tracked(client))) {
        const channel = client.channels.cache.get(id);
        if (channel) check(client, channel);
        else forget(client, id);
    }
};

module.exports = { tracked, track, forget, nextName, check, sweep };
