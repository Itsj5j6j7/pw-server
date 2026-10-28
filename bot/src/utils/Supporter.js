const { escapeMarkdown } = require('discord.js');
const config = require('../config');
const store = require('../bridge/store');
const { rcon } = require('./Rcon');
const { error, info } = require('./Console');

// The supporter role on Discord comes with the LuckPerms supporter group on the Minecraft servers for the
// linked account (/link), and goes with it. The bot gives the role itself while a member has supporter
// time (store.supporter_time: Ko-fi payments through the API's /kofi, or /supporter add), and takes it
// away when the time is up (tick, every minute).

const hasRole = (member) => member?.roles?.cache?.has(config.supporter.roleId) ?? false;

// add: true gives the group to that Minecraft account, false takes it away.
const setRank = async (uuid, name, add) => {
    if (!process.env.RCON_PORT) return;
    try {
        await rcon(`lp user ${uuid} parent ${add ? 'add' : 'remove'} ${config.supporter.group}`);
        if (add) store.markSupporter(uuid);
        else store.unmarkSupporter(uuid);
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

// On start, for role changes missed while the bot was offline: everyone with the role and a link gets
// the group, and those the bot gave it to (supporter_ranks) lose it when they no longer have the role
// or the link. Someone given the group by hand is never touched.
const syncAll = async (client) => {
    const keep = new Set();
    let checked = false;
    for (const guild of client.guilds.cache.values()) {
        const role = guild.roles.cache.get(config.supporter.roleId);
        if (!role) continue;
        const members = await guild.members.fetch().catch(() => null);
        if (!members) return; // without the member list, removing would take ranks from everyone
        checked = true;
        for (const member of members.values()) {
            const link = member.roles.cache.has(role.id) && store.getLinkByDiscord(member.id);
            if (link) {
                keep.add(link.uuid);
                await setRank(link.uuid, link.mcName, true);
            }
        }
    }
    if (!checked) return;
    for (const uuid of store.supporterUuids()) {
        if (!keep.has(uuid)) await setRank(uuid, store.getLink(uuid)?.mcName ?? uuid, false);
    }
};

const MONTH_MIGRATION = 'supporter_time_started';

const guildOf = (client) => client.guilds.cache.find((g) => g.roles.cache.has(config.supporter.roleId));

// Role on while there's time left, off (and the row gone) when it's up. Members who left the server
// keep their time until it runs out.
const applyTimes = async (client) => {
    const guild = guildOf(client);
    if (!guild) return;
    const now = Date.now();
    for (const { discordId, expiresAt } of store.supporterTimes()) {
        const member = await guild.members.fetch(discordId).catch(() => null);
        if (expiresAt > now) {
            if (member && !hasRole(member)) await member.roles.add(config.supporter.roleId, 'Supporter time (Ko-fi)').catch((e) => error(`Supporter: couldn't give the role to ${discordId}: ${e.message}`));
        } else {
            store.removeSupporterTime(discordId);
            if (member && hasRole(member)) await member.roles.remove(config.supporter.roleId, 'Supporter time is up').catch((e) => error(`Supporter: couldn't remove the role from ${discordId}: ${e.message}`));
            info(`Supporter: time is up for ${discordId}`);
        }
    }
};

// What a donor typed (name, message), shown as plain text: no formatting, links, headings or mentions,
// so it can't pass for the bot's own lines.
const plain = (text) => escapeMarkdown(String(text), {
    codeBlock: true, inlineCode: true, bold: true, italic: true, underline: true, strikethrough: true, spoiler: true,
    codeBlockContent: true, inlineCodeContent: true, escape: true, heading: true, bulletedList: true, numberedList: true,
    maskedLink: true
}).replace(/[<@]/g, '\\$&').replace(/https?:\/\//gi, (m) => m.replace('://', ':\u200b//'));

// Every Ko-fi payment once in the log channel, so staff see it and can give time by hand when the
// donor didn't connect Discord on Ko-fi (or paid in another currency).
const postPayments = async (client) => {
    const channel = config.supporter.logChannel && await client.channels.fetch(config.supporter.logChannel).catch(() => null);
    if (!channel) return;
    for (const p of store.unpostedKofiPayments()) {
        const who = p.discordId ? `<@${p.discordId}>` : `**${plain(p.name.replace(/\s+/g, ' '))}** (no Discord on Ko-fi)`;
        const until = p.discordId && store.supporterTime(p.discordId);
        const result = p.discordId && p.months > 0
            ? `+${p.months} month${p.months === 1 ? '' : 's'}, supporter until <t:${Math.floor(until / 1000)}:D>`
            : p.months > 0 ? `worth ${p.months} month${p.months === 1 ? '' : 's'}: give it with \`/supporter add\``
                : `no supporter time (under ${config.supporter.eurosPerMonth ?? 5} EUR, another currency or not a donation): \`/supporter add\` if it should count`;
        // Every line of the message quoted, so a line break can't start a line that looks like the bot's.
        const message = p.message ? '\n' + p.message.split(/\r?\n/).map((line) => `> ${plain(line)}`).join('\n') : '';
        const text = `Ko-fi ${plain(p.type.toLowerCase())} from ${who}: ${plain(p.amount)} ${plain(p.currency)}, ${result}.${message}`;
        const sent = await channel.send({ content: text, allowedMentions: { parse: [] } }).catch(() => null);
        if (sent) store.markKofiPaymentPosted(p.id);
    }
};

// Once: members who had the role before supporter time existed get one month from now.
const migrate = async (client) => {
    if (store.getSetting(MONTH_MIGRATION)) return;
    const guild = guildOf(client);
    const members = guild && await guild.members.fetch().catch(() => null);
    if (!members) return;
    for (const member of members.values()) {
        if (hasRole(member) && !store.supporterTime(member.id)) store.addSupporterMonths(member.id, 1);
    }
    store.setSetting(MONTH_MIGRATION, Date.now());
    info('Supporter: current supporters get one month from now');
};

const startTimer = (client) => {
    const tick = async () => {
        try {
            await migrate(client);
            await applyTimes(client);
            await postPayments(client);
        } catch (err) {
            error(`Supporter: ${err.message}`);
        }
    };
    tick();
    setInterval(tick, 60 * 1000);
};

module.exports = { hasRole, setRank, sync, syncAll, startTimer, applyTimes };
