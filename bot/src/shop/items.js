// Pure helpers for Ko-fi shop orders (no database, no RCON), so they can be tested on their own.

// The LuckPerms commands that give one catalogue item to a Minecraft account.
const itemCommands = (item, uuid) => {
    const perms = item.kind === 'pet'
        ? [`propwash.pets.${item.name}`]
        : [`propwash.trails.preset.${item.preset ?? item.name}`, 'propwash.trails.use'];
    return perms.map((perm) => `lp user ${uuid} permission set ${perm}`);
};

// A Ko-fi shop order's lines, split into the catalogue items they name and the codes we don't know.
const orderItems = (data, catalog) => {
    const lines = Array.isArray(data?.shop_items) ? data.shop_items : [];
    const known = [];
    const unknown = [];
    for (const line of lines) {
        const code = String(line?.direct_link_code ?? '');
        const item = Object.prototype.hasOwnProperty.call(catalog, code) ? catalog[code] : null;
        if (item) known.push({ code, item });
        else unknown.push(code || '?');
    }
    return { known, unknown };
};

module.exports = { itemCommands, orderItems };
