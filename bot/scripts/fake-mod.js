// Simulates the bridge mod against a running bridge API: node scripts/fake-mod.js [api url] [env var with the key, default BRIDGE_API_KEY]
// Run it with BRIDGE_KEY_FREESTYLE, BRIDGE_KEY_RACES and BRIDGE_KEY_PLOTS to simulate several servers.
// Sends boards, records, a heat and heartbeats, asserting the API answers. Ctrl+C simulates a crash (no server.stopping).
require('dotenv').config();
const assert = require('assert');
const crypto = require('crypto');

const API = (process.argv[2] ?? 'http://127.0.0.1:3006') + '/v1';
const KEY = process.env[process.argv[3] ?? 'BRIDGE_API_KEY'];

const call = async (method, path, body, key = KEY) => {
    const res = await fetch(API + path, {
        method,
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: body && JSON.stringify(body)
    });
    return { status: res.status, body: await res.json() };
};

const JAVI = { uuid: '069a79f4-44e9-4726-a5be-fca90e38aaf5', name: 'Javi' };
const ANA = { uuid: '4566e69f-c907-48ee-8d71-d7ba5aa00d20', name: 'Ana' };
const LUIS = { uuid: '853c80ef-3c37-49fd-aa49-938b674adae6', name: 'Luis' };
const COURSE = { id: '5f1c2a9e-3b7d-4e21-9c55-1a2b3c4d5e6f', number: 3, name: 'Drone Arena', dimension: 'propwash:arena', layout: 1, laps: 3, mode: 'laps', ownerName: 'Javi' };
const GONE = { ...COURSE, id: '00000000-0000-4000-8000-0000000000aa', number: 9, name: 'Old Track' };

const event = (type, data, id = crypto.randomUUID()) => ({ id, type, ts: Date.now(), data });
const entry = (rank, player, nanos, frame = '5inch', assist = [], otherRules = false) => ({ rank, player, nanos, date: Date.now(), frame, assist, otherRules });
const board = (kind, category, entries, extra = {}) => ({ kind, category, frame: null, laps: null, total: entries.length, entries, ...extra });
const courseBoard = (course, laps) => ({ course, boards: [
    board('lap', 'clean', laps),
    board('lap', 'clean', laps, { frame: '5inch' }),
    board('lap', 'assisted', [entry(1, LUIS, 51000000000, '3inch', ['angle_limit'])]),
    board('race', 'clean', [entry(1, ANA, 150000000000)], { laps: 3 })
] });

const heartbeat = (players) => call('POST', '/heartbeat', {
    mcVersion: '26.3', loader: 'fabric', modVersion: '0.5.0', propwashVersion: '0.6.0',
    onlinePlayers: players.length, maxPlayers: 20, players,
    tps: 19.8, mspt: 12.4, uptimeSeconds: Math.floor(process.uptime()), memoryUsedMb: 3120, memoryMaxMb: 6144
});

(async () => {
    assert.equal((await call('GET', '/ping', undefined, 'wrong')).status, 401);
    const ping = await call('GET', '/ping');
    assert.equal(ping.status, 200);
    console.log(`Connected as ${ping.body.server.name} (${ping.body.server.id}).`);

    // Startup: a board for a course that's about to go away, then the course list without it.
    let res = await call('POST', '/events', { events: [
        event('server.started', { mcVersion: '26.3', loader: 'fabric', propwashVersion: '0.6.0', maxPlayers: 20 }),
        event('course.board', courseBoard(GONE, [entry(1, JAVI, 60000000000)])),
        event('course.board', courseBoard(COURSE, [entry(1, ANA, 48213000000, '5inch', [], true)])),
        event('courses.sync', { courseIds: [COURSE.id] })
    ] });
    assert.equal(res.status, 200);
    assert.deepEqual(res.body.rejected, []);

    assert.equal((await heartbeat([
        { ...JAVI, dimension: 'propwash:arena' },
        { ...ANA, dimension: 'propwash:arena' },
        { ...LUIS, dimension: 'minecraft:overworld' }
    ])).status, 200);

    // Javi beats Ana's course record (the bot posts it with Ana as the previous record), then the new board; a race record and a heat.
    const record = event('race.record', { course: COURSE, scope: 'course', player: JAVI, frame: '5inch', nanos: 47900000000 });
    res = await call('POST', '/events', { events: [
        record,
        event('course.board', courseBoard(COURSE, [entry(1, JAVI, 47900000000), entry(2, ANA, 48213000000)])),
        event('race.record', { course: COURSE, scope: 'race', player: JAVI, frame: '5inch', nanos: 143200000000, laps: 3 }),
        event('race.result', {
            heatId: crypto.randomUUID(),
            course: COURSE,
            multiplayer: true,
            results: [
                { place: 1, player: JAVI, status: 'finished', totalNanos: 143200000000, bestLapNanos: 47900000000, laps: 3, frame: '5inch', assisted: false },
                { place: 2, player: ANA, status: 'finished', totalNanos: 145800000000, bestLapNanos: 48100000000, laps: 3, frame: '5inch', assisted: true }
            ]
        }),
        event('race.lap_ghost', {}),
        event('course.board', { course: { ...COURSE, id: 'not-a-uuid' }, boards: [] })
    ] });
    assert.equal(res.status, 200);
    assert.deepEqual(res.body.rejected.map((r) => r.code), ['unknown_type', 'invalid_data']);

    // A retry with the same id is a duplicate; the same record with a new id is already on the board and isn't posted again.
    const retry = await call('POST', '/events', { events: [record, event('race.record', record.data)] });
    assert.deepEqual(retry.body.duplicates, [record.id]);
    assert.equal(retry.body.accepted.length, 1);

    res = await call('POST', '/events', { events: [event('course.removed', { courseId: GONE.id })] });
    assert.deepEqual(res.body.accepted.length, 1);

    const link = await call('POST', '/link/start', JAVI);
    console.log(link.status === 409 ? 'Javi is already linked.' : `Link code for Javi: ${link.body.code}`);

    console.log('All checks passed. Heartbeating every 30 s, Luis leaves after the first one. Ctrl+C simulates a crash.');
    setInterval(() => heartbeat([{ ...JAVI, dimension: 'propwash:arena' }, { ...ANA, dimension: 'propwash:arena' }]).catch(console.error), 30000);
})().catch((err) => {
    console.error(err);
    process.exit(1);
});
