const config = require('../config');
const store = require('../bridge/store');
const shopItems = require('../shop-items');
const { itemCommands, orderItems } = require('../shop/items');
const { rcon } = require('./Rcon');
const { error, info } = require('./Console');

// Ko-fi shop orders (pets and drone trails, src/shop-items.js) are given over RCON to the buyer's linked
// Minecraft account (/link), as LuckPerms permissions: propwash.pets.<name>, or propwash.trails.preset.<name>
// and propwash.trails.use. An order waits, and staff are told once in the supporter log channel, while an
// item code is unknown, the buyer isn't on Discord or hasn't linked. Shop orders never give supporter time.
// Every minute: pending orders are retried, and a partly failed grant is retried whole (permission set is
// idempotent).

const post = async (client, text) => {
    const channel = config.supporter.logChannel && await client.channels.fetch(config.supporter.logChannel).catch(() => null);
    if (!channel) return false;
    return Boolean(await channel.send({ content: text, allowedMentions: { parse: [] } }).catch(() => null));
};

// Staff told once per order (posted), whatever is still missing.
const tellStaff = async (client, order, why) => {
    if (order.posted) return;
    if (await post(client, `Ko-fi shop order from ${order.discordId ? `<@${order.discordId}>` : `**${order.name}** (no Discord on Ko-fi)`}: waiting, ${why}.`)) {
        store.markShopOrderPosted(order.id);
    }
};

const giveOrders = async (client) => {
    if (!process.env.RCON_PORT) return;
    for (const order of store.pendingShopOrders()) {
        const { known, unknown } = orderItems({ shop_items: order.items.map(({ code }) => ({ direct_link_code: code })) }, shopItems);
        if (unknown.length) {
            await tellStaff(client, order, `unknown item code${unknown.length > 1 ? 's' : ''} ${unknown.join(', ')} (add ${unknown.length > 1 ? 'them' : 'it'} to src/shop-items.js)`);
            continue;
        }
        const link = order.discordId && store.getLinkByDiscord(order.discordId);
        if (!link) {
            await tellStaff(client, order, order.discordId ? 'the buyer has not linked (/link) yet' : 'no Discord account on Ko-fi, so no linked account');
            continue;
        }
        try {
            for (const { item } of known) {
                for (const command of itemCommands(item, link.uuid)) await rcon(command);
            }
        } catch (err) {
            error(`Shop: couldn't give order ${order.id} to ${link.mcName}: ${err.message}`);
            continue;
        }
        store.markShopOrderDone(order.id);
        const names = known.map(({ item }) => (item.kind === 'pet' ? `pet ${item.name}` : `trail ${item.preset ?? item.name}`)).join(', ');
        info(`Shop: gave ${names} to ${link.mcName} (${link.uuid})`);
        await post(client, `Ko-fi shop order given: ${names} to <@${order.discordId}> (${link.mcName}).`);
    }
};

const startTimer = (client) => {
    const tick = async () => {
        try {
            await giveOrders(client);
        } catch (err) {
            error(`Shop: ${err.message}`);
        }
    };
    tick();
    setInterval(tick, 60 * 1000);
};

module.exports = { giveOrders, startTimer };
