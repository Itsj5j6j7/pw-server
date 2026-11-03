const store = require('../bridge/store');
const { rcon } = require('./Rcon');
const { error, info } = require('./Console');

// Linked Minecraft accounts (/link) get the LuckPerms permission propwash.linked on the servers, so the
// servers can tell who has linked (the proxy stops its /link reminder for them). /unlink takes it away.
const PERMISSION = 'propwash.linked';

// add: true sets it on that Minecraft account, false unsets it.
const setLinked = async (uuid, name, add) => {
    if (!process.env.RCON_PORT) return;
    try {
        await rcon(`lp user ${uuid} permission ${add ? 'set' : 'unset'} ${PERMISSION}`);
        info(`Linked: ${add ? 'set' : 'unset'} ${PERMISSION} ${add ? 'on' : 'for'} ${name} (${uuid})`);
    } catch (err) {
        error(`Linked: couldn't ${add ? 'set' : 'unset'} ${PERMISSION} for ${name}: ${err.message}`);
    }
};

// On start, for links made before the bot set the permission and any set that failed (hub down): every
// linked account gets it again. Waits up to 10 minutes for the hub's RCON first (a deploy may be
// restarting the hub at the same time).
const syncAllLinked = async () => {
    if (!process.env.RCON_PORT) return;
    for (let tries = 1; ; tries++) {
        try {
            await rcon('list');
            break;
        } catch (err) {
            if (tries >= 60) return error(`Linked: hub RCON not answering (${err.message}), no sync until the next start`);
            await new Promise((resolve) => setTimeout(resolve, 10000));
        }
    }
    const links = store.links();
    for (const { uuid, mcName } of links) await setLinked(uuid, mcName, true);
    info(`Linked: set ${PERMISSION} on ${links.length} linked account${links.length === 1 ? '' : 's'}`);
};

module.exports = { setLinked, syncAllLinked };
