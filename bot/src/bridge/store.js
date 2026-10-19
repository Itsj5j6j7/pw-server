const crypto = require('crypto');
const { DatabaseSync } = require('node:sqlite');
const config = require('../config');

// Shared by the bot and the API processes: WAL lets one write while the other reads, busy_timeout waits out the other's write.
const db = new DatabaseSync(config.bridge.databasePath);
db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA busy_timeout = 5000;

    CREATE TABLE IF NOT EXISTS courses (
        server TEXT NOT NULL, id INTEGER NOT NULL, name TEXT NOT NULL, dimension TEXT NOT NULL,
        layout INTEGER NOT NULL, laps INTEGER NOT NULL, updated_at INTEGER NOT NULL,
        PRIMARY KEY (server, id)
    );
    CREATE TABLE IF NOT EXISTS laps (
        server TEXT NOT NULL, course_id INTEGER NOT NULL, layout INTEGER NOT NULL,
        uuid TEXT NOT NULL, name TEXT NOT NULL, frame TEXT NOT NULL, nanos INTEGER NOT NULL, date INTEGER NOT NULL,
        PRIMARY KEY (server, course_id, layout, uuid, frame)
    );
    CREATE TABLE IF NOT EXISTS races (
        server TEXT NOT NULL, heat_id TEXT NOT NULL, course_id INTEGER NOT NULL, layout INTEGER NOT NULL,
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
`);

const getSetting = (key) => {
    const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
    return row && JSON.parse(row.value);
};
const setSetting = (key, value) => db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, JSON.stringify(value));

const getCourse = (server, id) => db.prepare('SELECT * FROM courses WHERE server = ? AND id = ?').get(server, id);
const courses = () => db.prepare('SELECT * FROM courses ORDER BY server, id').all();

// Autocomplete values are "server:id".
const courseByRef = (ref) => {
    const [server, id] = String(ref).split(':');
    return getCourse(server, Number(id));
};

// Keeps the newest layout: a late event from an older layout doesn't move the course back.
const upsertCourse = (server, { id, name, dimension, layout, laps }) => db.prepare(`
    INSERT INTO courses (server, id, name, dimension, layout, laps, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT (server, id) DO UPDATE SET name = excluded.name, dimension = excluded.dimension, layout = excluded.layout,
        laps = excluded.laps, updated_at = excluded.updated_at
    WHERE excluded.layout >= courses.layout
`).run(server, id, name, dimension, layout, laps, Date.now());

// One entry per player and frame. Returns false when an equal or better time is already saved (a retried event).
const submitLap = (server, course, player, frame, nanos, date) => db.prepare(`
    INSERT INTO laps (server, course_id, layout, uuid, name, frame, nanos, date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT (server, course_id, layout, uuid, frame) DO UPDATE SET name = excluded.name, nanos = excluded.nanos, date = excluded.date
    WHERE excluded.nanos < laps.nanos
`).run(server, course.id, course.layout, player.uuid, player.name, frame, nanos, date).changes > 0;

// Best time of each player on the current layout, optionally for a single frame.
// SQLite fills the bare columns of a MIN() aggregate from the row holding the minimum.
const topTimes = (course, frame, limit = 10) => db.prepare(`
    SELECT uuid, name, frame, MIN(nanos) AS nanos, date FROM laps
    WHERE server = ? AND course_id = ? AND layout = ? AND (? IS NULL OR frame = ?)
    GROUP BY uuid ORDER BY nanos, date LIMIT ?
`).all(course.server, course.id, course.layout, frame ?? null, frame ?? null, limit);

const frames = (course) => db.prepare(`SELECT DISTINCT frame FROM laps WHERE server = ? AND course_id = ? AND layout = ? AND frame != ''`)
    .all(course.server, course.id, course.layout).map((row) => row.frame);

const resetBoard = (server, courseId, playerName) => {
    const course = getCourse(server, courseId);
    if (!course) return;
    db.prepare('DELETE FROM laps WHERE server = ? AND course_id = ? AND layout = ? AND (? IS NULL OR lower(name) = lower(?))')
        .run(server, course.id, course.layout, playerName ?? null, playerName ?? null);
};

const removeCourse = (server, courseId) => {
    db.prepare('DELETE FROM laps WHERE server = ? AND course_id = ?').run(server, courseId);
    db.prepare('DELETE FROM courses WHERE server = ? AND id = ?').run(server, courseId);
};

// Returns false if that heat was already saved, so it isn't posted twice.
const saveRace = (server, { heatId, course, multiplayer, results }, date) => db.prepare(`
    INSERT OR IGNORE INTO races (server, heat_id, course_id, layout, multiplayer, results, date) VALUES (?, ?, ?, ?, ?, ?, ?)
`).run(server, heatId, course.id, course.layout, multiplayer ? 1 : 0, JSON.stringify(results), date).changes > 0;

// Deletes every course, leaderboard and race, and the account links too if asked. Returns how many courses were removed.
const wipe = (links) => {
    const count = db.prepare('SELECT COUNT(*) AS count FROM courses').get().count;
    db.exec(`DELETE FROM courses; DELETE FROM laps; DELETE FROM races;${links ? ' DELETE FROM links; DELETE FROM link_codes;' : ''}`);
    return count;
};

const getLink = (uuid) => db.prepare('SELECT discord_id AS discordId, mc_name AS mcName FROM links WHERE uuid = ?').get(uuid);

const getLinkByDiscord = (discordId) => db.prepare('SELECT uuid, mc_name AS mcName FROM links WHERE discord_id = ?').get(discordId);

// uuid of the player that last flew under that name (the mod sends only the name of a beaten record).
const uuidByName = (name) => db.prepare('SELECT uuid FROM laps WHERE lower(name) = lower(?) ORDER BY date DESC LIMIT 1').get(name)?.uuid;

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
    getSetting, setSetting, getCourse, courses, courseByRef, upsertCourse, submitLap, topTimes, frames, resetBoard, removeCourse,
    saveRace, wipe, getLink, getLinkByDiscord, uuidByName, link, unlink, createCode, useCode
};
