const config = require('../config');
const store = require('../bridge/store');
const { rcon } = require('./Rcon');
const { error, info } = require('./Console');

// Discord roles that come with a LuckPerms group on the Minecraft servers for the member's linked account
// (/link), and go with it: the supporter role (utils/Supporter gives and takes the role itself) and those in
// config.roleRanks (given by hand on Discord). The bot remembers which accounts it gave each group, so it
// only ever takes back its own: a group given in game by hand is never touched.
const ranks = [
    {
        name: 'Supporter', roleId: config.supporter.roleId, group: config.supporter.group,
        mark: store.markSupporter, unmark: store.unmarkSupporter, uuids: store.supporterUuids
    },
    ...(config.roleRanks ?? []).filter((rank) => /^\d+$/.test(rank.roleId ?? '') && rank.group).map((rank) => ({
        name: rank.name ?? rank.group, roleId: rank.roleId, group: rank.group,
        mark: (uuid) => store.markRank(rank.group, uuid),
        unmark: (uuid) => store.unmarkRank(rank.group, uuid),
        uuids: () => store.rankUuids(rank.group)
    }))
];

const hasRole = (member, rank) => member?.roles?.cache?.has(rank.roleId) ?? false;

// add: true gives the rank's group to that Minecraft account, false takes it away.
const setRank = async (rank, uuid, name, add) => {
    if (!process.env.RCON_PORT) return;
    try {
        await rcon(`lp user ${uuid} parent ${add ? 'add' : 'remove'} ${rank.group}`);
        if (add) rank.mark(uuid);
        else rank.unmark(uuid);
        info(`${rank.name}: ${add ? 'gave' : 'removed'} ${rank.group} ${add ? 'to' : 'from'} ${name} (${uuid})`);
    } catch (err) {
        error(`${rank.name}: couldn't ${add ? 'give' : 'remove'} ${rank.group} for ${name}: ${err.message}`);
    }
};

// The member's linked Minecraft account gets each rank they have the role for, and loses those the bot
// gave it for roles they no longer have. only: just these ranks.
const sync = async (member, only = ranks) => {
    const link = store.getLinkByDiscord(member.id);
    if (!link) return;
    for (const rank of only) {
        const has = hasRole(member, rank);
        if (has || rank.uuids().includes(link.uuid)) await setRank(rank, link.uuid, link.mcName, has);
    }
};

// A role was given or taken away: the same for the Minecraft group. Without the old member (not cached),
// every rank is synced.
const onMemberUpdate = (oldMember, newMember) => {
    const changed = oldMember.partial ? ranks : ranks.filter((rank) => hasRole(oldMember, rank) !== hasRole(newMember, rank));
    if (changed.length) return sync(newMember, changed);
};

// /unlink: the ranks stay with the Discord account, so the Minecraft account that was linked loses them.
const unlinked = async (member, uuid, name) => {
    for (const rank of ranks) {
        if (hasRole(member, rank) || rank.uuids().includes(uuid)) await setRank(rank, uuid, name, false);
    }
};

// On start, for role changes missed while the bot was offline: everyone with a role and a link gets the
// group, and those the bot gave it to lose it when they no longer have the role or the link.
const syncAll = async (client) => {
    for (const rank of ranks) {
        const keep = new Set();
        let checked = false;
        for (const guild of client.guilds.cache.values()) {
            const role = guild.roles.cache.get(rank.roleId);
            if (!role) continue;
            const members = await guild.members.fetch().catch(() => null);
            if (!members) return; // without the member list, removing would take ranks from everyone
            checked = true;
            for (const member of members.values()) {
                const link = member.roles.cache.has(role.id) && store.getLinkByDiscord(member.id);
                if (link) {
                    keep.add(link.uuid);
                    await setRank(rank, link.uuid, link.mcName, true);
                }
            }
        }
        if (!checked) {
            error(`${rank.name}: role ${rank.roleId} not found on the Discord server, no sync`);
            continue;
        }
        for (const uuid of rank.uuids()) {
            if (!keep.has(uuid)) await setRank(rank, uuid, store.getLink(uuid)?.mcName ?? uuid, false);
        }
    }
};

module.exports = { ranks, sync, onMemberUpdate, unlinked, syncAll };
