const config = require('../config');
const store = require('../bridge/store');
const { rcon } = require('./Rcon');
const { error, info } = require('./Console');

// Ko-fi's own Discord integration gives donors the supporter role; this gives the matching LuckPerms
// group on the Minecraft servers to their linked account (/link), and takes it away with the role.

const hasRole = (member) => member?.roles?.cache?.has(config.supporter.roleId) ?? false;

// add: true gives the group to that Minecraft account, false takes it away.
const setRank = async (uuid, name, add) => {
    if (!process.env.RCON_PORT) return;
    try {
        await rcon(`lp user ${uuid} parent ${add ? 'add' : 'remove'} ${config.supporter.group}`);
        info(`Supporter: ${add ? 'gave' : 'removed'} ${config.supporter.group} ${add ? 'to' : 'from'} ${name} (${uuid})`);
    } catch (err) {
        error(`Supporter: couldn't ${add ? 'give' : 'remove'} ${config.supporter.group} for ${name}: ${err.message}`);
    }
};

// The member's linked Minecraft account gets the group if they have the role, or loses it if not.
const sync = async (member) => {
    const link = store.getLinkByDiscord(member.id);
    if (link) await setRank(link.uuid, link.mcName, hasRole(member));
};

// On start: everyone with the role and a link gets the group (in case a role change was missed while
// the bot was offline). Only adds: someone given the group by hand keeps it.
const syncAll = async (client) => {
    for (const guild of client.guilds.cache.values()) {
        const role = guild.roles.cache.get(config.supporter.roleId);
        if (!role) continue;
        const members = await guild.members.fetch().catch(() => null);
        for (const member of members?.values() ?? []) {
            const link = member.roles.cache.has(role.id) && store.getLinkByDiscord(member.id);
            if (link) await setRank(link.uuid, link.mcName, true);
        }
    }
};

module.exports = { hasRole, setRank, sync, syncAll };
