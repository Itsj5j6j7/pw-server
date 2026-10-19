const config = require('../config');
const store = require('./store');
const servers = require('./servers');
const { buildStatus } = require('./render');
const { memberCheck, send, edit, rename, enqueue } = require('./rest');

const STATUS_KEY = 'status-message';

// One state per server. online: null until its first heartbeat or timeout after boot.
const states = new Map(servers.list.map((server) => [server.id, { server, online: null, since: Date.now(), lastBeat: Date.now(), heartbeat: null, info: {} }]));
let lastRendered = null;

// A player who just switched server through Velocity can still be in the old server's last heartbeat:
// each uuid is only shown on the server with the newest heartbeat.
const snapshot = () => {
    const owner = new Map();
    for (const state of [...states.values()].filter((state) => state.online && state.heartbeat).sort((a, b) => a.lastBeat - b.lastBeat)) {
        for (const player of state.heartbeat.players) owner.set(player.uuid, state.server.id);
    }

    return [...states.values()].map((state) => state.online && state.heartbeat
        ? { ...state, heartbeat: { ...state.heartbeat, players: state.heartbeat.players.filter((player) => owner.get(player.uuid) === state.server.id) } }
        : state);
};

// Edits the fixed status message, or sends it again if it was deleted.
const updateMessage = () => enqueue(async () => {
    const channelId = config.bridge.channels.status;
    const saved = store.getSetting(STATUS_KEY);

    const message = await buildStatus(await memberCheck(channelId), snapshot());
    const rendered = JSON.stringify(message.components);

    if (saved) {
        if (rendered === lastRendered) return;
        if (await edit(saved.channelId, saved.messageId, message).then(() => true, () => false)) return lastRendered = rendered;
    }

    const sent = await send(channelId, message);
    store.setSetting(STATUS_KEY, { channelId, messageId: sent.id });
    lastRendered = rendered;
});

// The status channel is named 🟢│status while any server is online and 🔴│status when all are off.
let lastName = null;
const updateChannelName = () => {
    if ([...states.values()].every((state) => state.online === null)) return;

    const name = [...states.values()].some((state) => state.online) ? '🟢│status' : '🔴│status';
    if (name === lastName) return;
    lastName = name;
    rename(config.bridge.channels.status, name).catch(console.error);
};

const setOnline = (state, online) => {
    state.online = online;
    state.since = Date.now();
    if (!online) state.heartbeat = null;
    updateChannelName();
    updateMessage();
};

const heartbeat = (server, data) => {
    const state = states.get(server.id);
    state.lastBeat = Date.now();
    state.heartbeat = data;
    if (state.online !== true) setOnline(state, true);
};

const started = (server, info) => {
    const state = states.get(server.id);
    state.lastBeat = Date.now();
    state.info = info;
    setOnline(state, true);

    const other = [...states.values()].find((s) => s.online && s !== state && s.info.propwashVersion && info.propwashVersion && s.info.propwashVersion !== info.propwashVersion);
    if (other) console.warn(`${server.name} runs Propwash ${info.propwashVersion} but ${other.server.name} runs ${other.info.propwashVersion}.`);
};

const stopping = (server) => setOnline(states.get(server.id), false);

const watch = () => {
    // A crash can't be reported by the mod: it shows up as missing heartbeats.
    setInterval(() => {
        for (const state of states.values()) {
            if (state.online !== false && Date.now() - state.lastBeat > config.bridge.heartbeat.offlineAfterSeconds * 1000) setOnline(state, false);
        }
    }, 15000);

    setInterval(() => {
        if ([...states.values()].some((state) => state.online !== null)) updateMessage();
    }, config.bridge.heartbeat.statusEditSeconds * 1000);
};

module.exports = { heartbeat, started, stopping, watch };
