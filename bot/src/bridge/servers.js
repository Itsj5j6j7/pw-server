const config = require('../config');

// Minecraft servers that report to the bridge. Without config.bridge.servers, BRIDGE_API_KEY is a single server "main".
const list = Object.keys(config.bridge.servers ?? {}).length
    ? Object.entries(config.bridge.servers).map(([id, server]) => ({ id, name: server.name ?? id, key: process.env[server.keyEnv], maps: server.maps ?? {} }))
    : [{ id: 'main', name: 'Server', key: process.env.BRIDGE_API_KEY, maps: {} }];

const byId = new Map(list.map((server) => [server.id, server]));

// With a single server, Discord messages leave out the server name.
const multi = list.length > 1;

module.exports = { list, get: (id) => byId.get(id), multi };
