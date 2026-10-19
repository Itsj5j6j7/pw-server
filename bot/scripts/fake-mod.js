// Simulates the bridge mod against a running bridge API: node scripts/fake-mod.js [api url] [env var with the key, default BRIDGE_API_KEY]
// Run it with BRIDGE_KEY_FPV and then BRIDGE_KEY_PLOTS to simulate two servers.
// Sends a race, records and heartbeats, asserting the API answers. Ctrl+C simulates a crash (no server.stopping).
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
const COURSE = { id: 3, name: 'Drone Arena', dimension: 'propwash:arena', layout: 1, laps: 3 };

const event = (type, data, id = crypto.randomUUID()) => ({ id, type, ts: Date.now(), data });
const lap = (player, nanos, outcome, previousRecord) => ({ course: COURSE, player, frame: '5inch', lapNanos: nanos, outcome, previousRecord });

const heartbeat = (players) => call('POST', '/heartbeat', {
    mcVersion: '26.3', loader: 'fabric', modVersion: '0.1.0', propwashVersion: '0.5.0',
    onlinePlayers: players.length, maxPlayers: 20, players,
    tps: 19.8, mspt: 12.4, uptimeSeconds: Math.floor(process.uptime()), memoryUsedMb: 3120, memoryMaxMb: 6144
});

(async () => {
    assert.equal((await call('GET', '/ping', undefined, 'wrong')).status, 401);
    const ping = await call('GET', '/ping');
    assert.equal(ping.status, 200);
    console.log(`Connected as ${ping.body.server.name} (${ping.body.server.id}).`);

    await call('POST', '/events', { events: [event('server.started', { mcVersion: '26.3', loader: 'fabric', propwashVersion: '0.5.0', maxPlayers: 20 })] });
    assert.equal((await heartbeat([
        { ...JAVI, dimension: 'propwash:arena' },
        { ...ANA, dimension: 'propwash:arena' },
        { ...LUIS, dimension: 'minecraft:overworld' }
    ])).status, 200);

    const record = event('race.best_lap', lap(JAVI, 47900000000, 'course_record', { name: 'Ana', nanos: 48213000000 }));
    const first = await call('POST', '/events', { events: [
        event('race.best_lap', lap(ANA, 48213000000, 'personal_best')),
        record,
        event('race.result', {
            heatId: 'c1f0a2b4-0000-4000-8000-000000000001',
            course: COURSE,
            multiplayer: true,
            results: [
                { place: 1, player: JAVI, status: 'finished', totalNanos: 143200000000, bestLapNanos: 47900000000, frame: '5inch', assisted: false },
                { place: 2, player: ANA, status: 'finished', totalNanos: 145800000000, bestLapNanos: 48100000000, frame: '5inch', assisted: true },
                { place: null, player: LUIS, status: 'dnf', totalNanos: null, bestLapNanos: null, frame: null, assisted: false }
            ]
        }),
        event('race.lap_ghost', {})
    ] });
    assert.equal(first.status, 200);
    assert.equal(first.body.rejected[0]?.code, 'unknown_type');

    // Retry with the same id, then the same lap with a new id: neither must be announced again.
    const retry = await call('POST', '/events', { events: [record, event('race.best_lap', record.data)] });
    assert.deepEqual(retry.body.duplicates, [record.id]);

    const link = await call('POST', '/link/start', JAVI);
    console.log(link.status === 409 ? 'Javi is already linked.' : `Link code for Javi: ${link.body.code}`);

    console.log('All checks passed. Heartbeating every 30 s, Luis leaves after the first one. Ctrl+C simulates a crash.');
    setInterval(() => heartbeat([{ ...JAVI, dimension: 'propwash:arena' }, { ...ANA, dimension: 'propwash:arena' }]).catch(console.error), 30000);
})().catch((err) => {
    console.error(err);
    process.exit(1);
});
