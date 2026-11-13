const crypto = require('crypto');
const { DatabaseSync } = require('node:sqlite');
const config = require('../config');

// Shared by the bot and the API processes: WAL lets one write while the other reads, busy_timeout waits out the other's write.
const db = new DatabaseSync(config.bridge.databasePath);
db.exec('PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;');

// Version 1 (Propwash 0.6.0): courses by UUID and Propwash's boards instead of the bot's own laps table. The old race data
// is dropped: Propwash still has every time and the bridge sends all boards again on startup.
db.exec('BEGIN IMMEDIATE');
if (db.prepare('PRAGMA user_version').get().user_version < 1) {
    db.exec('DROP TABLE IF EXISTS courses; DROP TABLE IF EXISTS laps; DROP TABLE IF EXISTS races; PRAGMA user_version = 1;');
}
db.exec('COMMIT');

db.exec(`
    -- One row per course, keyed by Propwash's course UUID. boards: Propwash's own leaderboards of the current layout (course.board).
    CREATE TABLE IF NOT EXISTS courses (
        server TEXT NOT NULL, id TEXT NOT NULL, number INTEGER NOT NULL, name TEXT NOT NULL, dimension TEXT NOT NULL,
        layout INTEGER NOT NULL, laps INTEGER NOT NULL, mode TEXT NOT NULL, owner_name TEXT, boards TEXT NOT NULL DEFAULT '[]',
        updated_at INTEGER NOT NULL,
        PRIMARY KEY (server, id)
    );
    CREATE TABLE IF NOT EXISTS races (
        server TEXT NOT NULL, heat_id TEXT NOT NULL, course_id TEXT NOT NULL, layout INTEGER NOT NULL,
        multiplayer INTEGER NOT NULL, results TEXT NOT NULL, date INTEGER NOT NULL,
        PRIMARY KEY (server, heat_id)
    );
    CREATE TABLE IF NOT EXISTS links (
        uuid TEXT PRIMARY KEY, discord_id TEXT NOT NULL UNIQUE, mc_name TEXT NOT NULL, linked_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS link_codes (
        code TEXT PRIMARY KEY, uuid TEXT NOT NULL UNIQUE, name TEXT NOT NULL, expires_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
    -- Minecraft accounts the bot gave the supporter group (utils/Ranks), so it only ever takes back its own.
    CREATE TABLE IF NOT EXISTS supporter_ranks (uuid TEXT PRIMARY KEY, given_at INTEGER NOT NULL);
    -- The same for the other role ranks (utils/Ranks, config.roleRanks), per LuckPerms group.
    CREATE TABLE IF NOT EXISTS role_ranks (grp TEXT NOT NULL, uuid TEXT NOT NULL, given_at INTEGER NOT NULL, PRIMARY KEY (grp, uuid));
    -- Supporter time per Discord account: the bot gives the supporter role until expires_at (utils/Supporter).
    CREATE TABLE IF NOT EXISTS supporter_time (discord_id TEXT PRIMARY KEY, expires_at INTEGER NOT NULL);
    -- Every Ko-fi payment (POST /kofi), once; posted: shown in the supporter log channel.
    CREATE TABLE IF NOT EXISTS kofi_payments (
        id TEXT PRIMARY KEY, discord_id TEXT, name TEXT NOT NULL, amount TEXT NOT NULL, currency TEXT NOT NULL,
        type TEXT NOT NULL, months INTEGER NOT NULL, message TEXT, at INTEGER NOT NULL, posted INTEGER NOT NULL DEFAULT 0
    );
    -- Ko-fi shop orders (pets and trails, utils/Shop): the items as sent, granted once; posted: shown to staff once.
    CREATE TABLE IF NOT EXISTS shop_orders (
        id TEXT PRIMARY KEY, discord_id TEXT, name TEXT NOT NULL, items TEXT NOT NULL, at INTEGER NOT NULL,
        done INTEGER NOT NULL DEFAULT 0, posted INTEGER NOT NULL DEFAULT 0
    );
`);

const markSupporter = (uuid) => db.prepare('INSERT OR IGNORE INTO supporter_ranks (uuid, given_at) VALUES (?, ?)').run(uuid, Date.now());
const unmarkSupporter = (uuid) => db.prepare('DELETE FROM supporter_ranks WHERE uuid = ?').run(uuid);
const supporterUuids = () => db.prepare('SELECT uuid FROM supporter_ranks').all().map((row) => row.uuid);
const markRank = (group, uuid) => db.prepare('INSERT OR IGNORE INTO role_ranks (grp, uuid, given_at) VALUES (?, ?, ?)').run(group, uuid, Date.now());
const unmarkRank = (group, uuid) => db.prepare('DELETE FROM role_ranks WHERE grp = ? AND uuid = ?').run(group, uuid);
const rankUuids = (group) => db.prepare('SELECT uuid FROM role_ranks WHERE grp = ?').all(group).map((row) => row.uuid);

// Supporter time: months are calendar months, added after what's left (or from now).
const supporterTime = (discordId) => db.prepare('SELECT expires_at AS expiresAt FROM supporter_time WHERE discord_id = ?').get(discordId)?.expiresAt;
const supporterTimes = () => db.prepare('SELECT discord_id AS discordId, expires_at AS expiresAt FROM supporter_time').all();
const setSupporterTime = (discordId, expiresAt) => db.prepare('INSERT OR REPLACE INTO supporter_time (discord_id, expires_at) VALUES (?, ?)').run(discordId, expiresAt);
const removeSupporterTime = (discordId) => db.prepare('DELETE FROM supporter_time WHERE discord_id = ?').run(discordId).changes > 0;
const addSupporterMonths = (discordId, months) => {
    const until = new Date(Math.max(Date.now(), supporterTime(discordId) ?? 0));
    until.setUTCMonth(until.getUTCMonth() + months);
    setSupporterTime(discordId, until.getTime());
    return until.getTime();
};

// Returns false for a payment that was recorded already (Ko-fi retries).
const addKofiPayment = (p) => db.prepare(`INSERT OR IGNORE INTO kofi_payments (id, discord_id, name, amount, currency, type, months, message, at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(p.id, p.discordId ?? null, p.name, p.amount, p.currency, p.type, p.months, p.message ?? null, Date.now()).changes > 0;
const unpostedKofiPayments = () => db.prepare('SELECT id, discord_id AS discordId, name, amount, currency, type, months, message FROM kofi_payments WHERE posted = 0 ORDER BY at').all();
const markKofiPaymentPosted = (id) => db.prepare('UPDATE kofi_payments SET posted = 1 WHERE id = ?').run(id);
// Shop orders: items is the JSON of the order's lines ({code, known}); done once they're all given.
const addShopOrder = (o) => db.prepare('INSERT OR IGNORE INTO shop_orders (id, discord_id, name, items, at) VALUES (?, ?, ?, ?, ?)')
    .run(o.id, o.discordId, o.name, JSON.stringify(o.items), Date.now()).changes > 0;
const pendingShopOrders = () => db.prepare('SELECT id, discord_id AS discordId, name, items, posted FROM shop_orders WHERE done = 0 ORDER BY at')
    .all().map((row) => ({ ...row, items: JSON.parse(row.items) }));
const markShopOrderDone = (id) => db.prepare('UPDATE shop_orders SET done = 1 WHERE id = ?').run(id);
const markShopOrderPosted = (id) => db.prepare('UPDATE shop_orders SET posted = 1 WHERE id = ?').run(id);

const getSetting = (key) => {
    const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
    return row && JSON.parse(row.value);
};
const setSetting = (key, value) => db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, JSON.stringify(value));

const getCourse = (server, id) => db.prepare('SELECT * FROM courses WHERE server = ? AND id = ?').get(server, id);
const courses = () => db.prepare('SELECT server, id, number, name, dimension FROM courses ORDER BY server, number').all();

// Autocomplete values are "server:uuid".
const courseByRef = (ref) => {
    const [server, id] = String(ref).split(':');
    return getCourse(server, id);
};

// boards: undefined keeps the ones already stored (events other than course.board carry only the course).
const upsertCourse = (server, { id, number, name, dimension, layout, laps, mode, ownerName }, boards) => db.prepare(`
    INSERT INTO courses (server, id, number, name, dimension, layout, laps, mode, owner_name, boards, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT (server, id) DO UPDATE SET number = excluded.number, name = excluded.name, dimension = excluded.dimension,
        layout = excluded.layout, laps = excluded.laps, mode = excluded.mode, owner_name = excluded.owner_name,
        boards = CASE WHEN ? THEN excluded.boards ELSE courses.boards END, updated_at = excluded.updated_at
`).run(server, id, number, name, dimension, layout, laps, mode, ownerName ?? null, JSON.stringify(boards ?? []), Date.now(), boards ? 1 : 0);

// One of Propwash's boards: kind 'lap' (frame: one class, null: all) or 'race' (laps: the race length), category 'clean' or 'assisted'.
const board = (course, { kind = 'lap', category = 'clean', frame = null, laps = null } = {}) => JSON.parse(course.boards)
    .find((b) => b.kind === kind && b.category === category && (b.frame ?? null) === frame && (b.laps ?? null) === laps);

// Classes and race lengths with clean times, for the /leaderboard options.
const frames = (course) => JSON.parse(course.boards).filter((b) => b.kind === 'lap' && b.category === 'clean' && b.frame).map((b) => b.frame);
const raceLaps = (course) => [...new Set(JSON.parse(course.boards).filter((b) => b.kind === 'race').map((b) => b.laps))].sort((a, b) => a - b);

const removeCourse = (server, id) => db.prepare('DELETE FROM courses WHERE server = ? AND id = ?').run(server, id);

// courses.sync: drops this server's courses Propwash doesn't have any more.
const syncCourses = (server, ids) => db.prepare('DELETE FROM courses WHERE server = ? AND id NOT IN (SELECT value FROM json_each(?))').run(server, JSON.stringify(ids)).changes;

// Returns false if that heat was already saved, so it isn't posted twice.
const saveRace = (server, { heatId, course, multiplayer, results }, date) => db.prepare(`
    INSERT OR IGNORE INTO races (server, heat_id, course_id, layout, multiplayer, results, date) VALUES (?, ?, ?, ?, ?, ?, ?)
`).run(server, heatId, course.id, course.layout, multiplayer ? 1 : 0, JSON.stringify(results), date).changes > 0;

// Deletes every course, leaderboard and race, and the account links too if asked. Returns how many courses were removed.
const wipe = (links) => {
    const count = db.prepare('SELECT COUNT(*) AS count FROM courses').get().count;
    db.exec(`DELETE FROM courses; DELETE FROM races;${links ? ' DELETE FROM links; DELETE FROM link_codes;' : ''}`);
    return count;
};

const getLink = (uuid) => db.prepare('SELECT discord_id AS discordId, mc_name AS mcName FROM links WHERE uuid = ?').get(uuid);

const links = () => db.prepare('SELECT uuid, mc_name AS mcName FROM links').all();

const getLinkByDiscord = (discordId) => db.prepare('SELECT uuid, mc_name AS mcName FROM links WHERE discord_id = ?').get(discordId);

// Returns the unlinked uuid, or undefined.
const unlink = (discordId) => db.prepare('DELETE FROM links WHERE discord_id = ? RETURNING uuid').get(discordId)?.uuid;

// REPLACE also drops the previous link of that Discord account (discord_id is UNIQUE).
const link = (uuid, mcName, discordId) => db.prepare('INSERT OR REPLACE INTO links (uuid, discord_id, mc_name, linked_at) VALUES (?, ?, ?, ?)')
    .run(uuid, discordId, mcName, Date.now());

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

// Replaces any active code of that player and drops the expired ones.
const createCode = (uuid, name) => {
    db.prepare('DELETE FROM link_codes WHERE uuid = ? OR expires_at <= ?').run(uuid, Date.now());

    const exists = db.prepare('SELECT 1 FROM link_codes WHERE code = ?');
    let code;
    do code = Array.from({ length: 6 }, () => CODE_ALPHABET[crypto.randomInt(CODE_ALPHABET.length)]).join('');
    while (exists.get(code));

    const expiresAt = Date.now() + config.bridge.link.codeTtlSeconds * 1000;
    db.prepare('INSERT INTO link_codes (code, uuid, name, expires_at) VALUES (?, ?, ?, ?)').run(code, uuid, name, expiresAt);
    return { code, expiresAt };
};

// Single use: the code is gone after this call, valid or not.
const useCode = (code) => {
    const entry = db.prepare('DELETE FROM link_codes WHERE code = ? RETURNING uuid, name, expires_at AS expiresAt').get(code);
    return entry && entry.expiresAt > Date.now() ? entry : null;
};

module.exports = {
    getSetting, setSetting, getCourse, courses, courseByRef, upsertCourse, board, frames, raceLaps, removeCourse, syncCourses,
    saveRace, wipe, getLink, getLinkByDiscord, links, link, unlink, createCode, useCode,
    markSupporter, unmarkSupporter, supporterUuids, markRank, unmarkRank, rankUuids,
    supporterTime, supporterTimes, setSupporterTime, removeSupporterTime, addSupporterMonths,
    addKofiPayment, unpostedKofiPayments, markKofiPaymentPosted,
    addShopOrder, pendingShopOrders, markShopOrderDone, markShopOrderPosted
};
