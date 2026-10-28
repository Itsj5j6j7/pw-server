const http = require('http');
const crypto = require('crypto');
const config = require('../config');
const store = require('./store');
const servers = require('./servers');
const status = require('./status');
const rest = require('./rest');
const { buildRaceResult, buildRecord } = require('./render');

const API_VERSION = 1;
const MAX_BODY = 64 * 1024;
const MAX_EVENTS = 50;
const HOUR = 3600 * 1000;

const isObj = (v) => typeof v === 'object' && v !== null && !Array.isArray(v);
const isStr = (v, max = 100) => typeof v === 'string' && v.length <= max;
const isId = (v) => isStr(v, 64) && v.length > 0;
const isInt = (v) => Number.isSafeInteger(v) && v >= 0;
const isPositive = (v) => isInt(v) && v > 0;
const isNum = (v) => typeof v === 'number' && Number.isFinite(v) && v >= 0;
const optional = (check) => (v) => v === undefined || v === null || check(v);
const isUuid = (v) => typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(v);
const isDimension = (v) => typeof v === 'string' && /^[a-z0-9_.-]+:[a-z0-9_./-]{1,100}$/.test(v);
const isPlayer = (p) => isObj(p) && isUuid(p.uuid) && typeof p.name === 'string' && /^\w{1,16}$/.test(p.name);
const isCourse = (c) => isObj(c) && isInt(c.id) && isStr(c.name, 64) && isDimension(c.dimension) && isInt(c.layout) && isInt(c.laps);

const VERSION_FIELDS = ['mcVersion', 'loader', 'loaderVersion', 'modVersion', 'propwashVersion'];
const hasVersions = (d) => VERSION_FIELDS.every((field) => optional(isStr)(d[field]));

const isHeartbeat = (b) => isObj(b) && hasVersions(b) && isInt(b.onlinePlayers) && isInt(b.maxPlayers)
    && Array.isArray(b.players) && b.players.length <= 1000 && b.players.every((p) => isPlayer(p) && isDimension(p.dimension))
    && ['tps', 'mspt'].every((field) => optional(isNum)(b[field]))
    && ['uptimeSeconds', 'memoryUsedMb', 'memoryMaxMb'].every((field) => optional(isInt)(b[field]));

const isResult = (r) => isObj(r) && isPlayer(r.player) && typeof r.assisted === 'boolean'
    && (r.status === 'finished' ? isPositive(r.place) && isPositive(r.totalNanos) : r.status === 'dnf' && r.place === null)
    && optional(isPositive)(r.bestLapNanos) && optional(isStr)(r.frame);

const VALIDATORS = {
    'server.started': (d) => hasVersions(d) && optional(isInt)(d.maxPlayers),
    'server.stopping': (d) => optional((v) => ['stop', 'restart', 'unknown'].includes(v))(d.reason),
    'race.best_lap': (d) => isCourse(d.course) && isPlayer(d.player) && isStr(d.frame) && isPositive(d.lapNanos)
        && ['personal_best', 'class_record', 'course_record'].includes(d.outcome)
        && optional((p) => isObj(p) && isStr(p.name) && isPositive(p.nanos))(d.previousRecord),
    'race.result': (d) => isId(d.heatId) && isCourse(d.course) && typeof d.multiplayer === 'boolean'
        && Array.isArray(d.results) && d.results.length >= 1 && d.results.length <= 16 && d.results.every(isResult),
    'leaderboard.reset': (d) => isInt(d.courseId) && optional(isStr)(d.playerName),
    'course.removed': (d) => isInt(d.courseId)
};

// "<server>:<event id>" from the last hour, so retries are answered as duplicates.
const seen = new Map();

// Course ids are only unique within a server: the course carries its server from here on.
const withServer = (server, data) => ({ ...data, course: { ...data.course, server: server.id } });

const HANDLERS = {
    'server.started': (server, { data }) => status.started(server, data),
    'server.stopping': (server) => status.stopping(server),
    'race.best_lap': (server, { data, ts }) => {
        store.upsertCourse(server.id, data.course);
        if (!store.submitLap(server.id, data.course, data.player, data.frame, data.lapNanos, ts)) return;
        if (data.outcome !== 'personal_best') rest.post(config.bridge.channels.records, (isMember) => buildRecord(isMember, withServer(server, data)));
    },
    'race.result': (server, { data, ts }) => {
        store.upsertCourse(server.id, data.course);
        if (!store.saveRace(server.id, data, ts)) return;
        if (data.multiplayer || config.bridge.raceLog.includeSolo) rest.post(config.bridge.channels.races, (isMember) => buildRaceResult(isMember, withServer(server, data)));
    },
    'leaderboard.reset': (server, { data }) => store.resetBoard(server.id, data.courseId, data.playerName),
    'course.removed': (server, { data }) => store.removeCourse(server.id, data.courseId)
};

const send = (res, code, body, headers = {}) => {
    res.writeHead(code, { 'Content-Type': 'application/json', ...headers });
    res.end(JSON.stringify(body));
};

const fail = (res, code, errorCode, message, headers) => send(res, code, { error: { code: errorCode, message, details: [] } }, headers);

const ROUTES = {
    'GET /v1/health': (server, res) => send(res, 200, { ok: true, discord: rest.state.ok }),

    'GET /v1/ping': (server, res) => send(res, 200, { ok: true, server: { id: server.id, name: server.name }, serverTime: Date.now(), apiVersion: API_VERSION }),

    'POST /v1/heartbeat': (server, res, body) => {
        if (!isHeartbeat(body)) return fail(res, 400, 'invalid_body', 'Invalid heartbeat.');
        status.heartbeat(server, body);
        send(res, 200, { ok: true });
    },

    'POST /v1/events': (server, res, body) => {
        if (!isObj(body) || !Array.isArray(body.events) || !body.events.length || body.events.length > MAX_EVENTS) {
            return fail(res, 400, 'invalid_body', `Expected { events: [...] } with 1-${MAX_EVENTS} events.`);
        }

        for (const [id, time] of seen) {
            if (time > Date.now() - HOUR) break;
            seen.delete(id);
        }

        const response = { accepted: [], duplicates: [], rejected: [] };
        for (const event of body.events) {
            const id = isObj(event) && isId(event.id) ? event.id : null;
            const key = `${server.id}:${id}`;
            const reject = (code) => response.rejected.push({ id, code });

            if (!id) reject('invalid_event');
            else if (seen.has(key)) response.duplicates.push(id);
            else if (!VALIDATORS[event.type]) reject('unknown_type');
            else if (!isInt(event.ts) || !isObj(event.data) || !VALIDATORS[event.type](event.data)) reject('invalid_data');
            else {
                HANDLERS[event.type](server, event);
                seen.set(key, Date.now());
                response.accepted.push(id);
            }
        }

        send(res, 200, response);
    },

    'POST /v1/link/start': (server, res, body) => {
        if (!isPlayer(body)) return fail(res, 400, 'invalid_body', 'Expected { uuid, name }.');
        if (store.getLink(body.uuid)) return fail(res, 409, 'already_linked', 'This Minecraft account is already linked.');

        const wait = limited(`link-${body.uuid}`, 5);
        if (wait) return fail(res, 429, 'rate_limited', 'Too many link codes, try again later.', { 'Retry-After': wait });

        const { code, expiresAt } = store.createCode(body.uuid, body.name);
        send(res, 200, { code, expiresAt, ttlSeconds: config.bridge.link.codeTtlSeconds });
    }
};

// Fixed one-minute windows. Returns the seconds to wait, or 0 if the request is allowed.
const windows = new Map();
const limited = (key, max) => {
    const now = Date.now();
    if (windows.size > 1000) for (const [k, w] of windows) if (w.resetAt <= now) windows.delete(k);

    let window = windows.get(key);
    if (!window || window.resetAt <= now) windows.set(key, window = { count: 0, resetAt: now + 60000 });
    return ++window.count > max ? Math.ceil((window.resetAt - now) / 1000) : 0;
};

const sha256 = (value) => crypto.createHash('sha256').update(value).digest();

// Ko-fi's webhook (Ko-fi > Settings > API, URL https://<tunnel host>/kofi): a form field "data" with the
// payment as JSON, and the page's verification token, KOFI_TOKEN in .env. Every config.supporter.eurosPerMonth
// euros of a donation or membership payment is a month of supporter time for the Discord account the
// donor connected on Ko-fi; the bot (utils/Supporter) gives the role and posts each payment for staff.
const kofi = async (req, res) => {
    const wait = limited('kofi', 60);
    if (wait) return fail(res, 429, 'rate_limited', 'Too many requests.', { 'Retry-After': wait });
    const raw = await readBody(req);
    if (raw === null) return fail(res, 413, 'body_too_large', 'Body too large.');
    let data;
    try {
        data = JSON.parse(new URLSearchParams(raw).get('data') ?? '');
    } catch {
        return fail(res, 400, 'invalid_body', 'Expected a form field "data" with JSON.');
    }
    const token = process.env.KOFI_TOKEN ?? '';
    if (!token || typeof data?.verification_token !== 'string'
        || !crypto.timingSafeEqual(sha256(data.verification_token), sha256(token))) {
        return fail(res, 401, 'unauthorized', 'Invalid verification token.');
    }
    const counts = ['Donation', 'Subscription'].includes(data.type) && data.currency === 'EUR';
    const months = counts ? Math.floor(Number(data.amount) / (config.supporter.eurosPerMonth ?? 5)) : 0;
    const discordId = /^\d{15,25}$/.test(data.discord_userid ?? '') ? data.discord_userid : null;
    const payment = {
        id: String(data.kofi_transaction_id || data.message_id), discordId, name: String(data.from_name ?? '?').slice(0, 100),
        amount: String(data.amount), currency: String(data.currency), type: String(data.type), months,
        message: data.is_public === false ? null : (data.message ? String(data.message).slice(0, 500) : null)
    };
    if (store.addKofiPayment(payment) && discordId && months > 0) store.addSupporterMonths(discordId, months);
    send(res, 200, { ok: true });
};
// The key identifies the server. Comparing hashes keeps timingSafeEqual happy with keys of any length.
const keyed = servers.list.filter((server) => server.key).map((server) => ({ server, hash: sha256(server.key) }));
const authenticate = (req) => {
    const hash = sha256(/^Bearer (.+)$/.exec(req.headers.authorization ?? '')?.[1] ?? '');
    return keyed.find((entry) => crypto.timingSafeEqual(hash, entry.hash))?.server;
};

// Reads up to MAX_BODY bytes; null if the body is bigger.
const readBody = (req) => new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (chunk) => {
        size += chunk.length;
        if (size <= MAX_BODY) chunks.push(chunk);
    });
    req.on('end', () => resolve(size > MAX_BODY ? null : Buffer.concat(chunks).toString('utf-8')));
    req.on('error', reject);
});

const start = () => {
    for (const server of servers.list) if (!server.key) console.warn(`No API key for server "${server.id}", it can't report.`);
    if (!keyed.length) return console.warn('No bridge API keys are set, the bridge API is disabled.');

    const httpServer = http.createServer(async (req, res) => {
        try {
            const path = req.url.split('?')[0];
            if (req.method === 'POST' && path === '/kofi') return await kofi(req, res);
            const route = ROUTES[`${req.method} ${path}`];
            if (!route) return fail(res, 404, 'not_found', 'Unknown route.');

            let server;
            if (path !== '/v1/health') {
                server = authenticate(req);
                if (!server) return fail(res, 401, 'unauthorized', 'Missing or invalid API key.');
                const wait = limited(`api-${server.id}`, 300);
                if (wait) return fail(res, 429, 'rate_limited', 'Too many requests.', { 'Retry-After': wait });
            }

            let body;
            if (req.method === 'POST') {
                const raw = await readBody(req);
                if (raw === null) return fail(res, 413, 'body_too_large', `The body must be ${MAX_BODY / 1024} KB or less.`);
                try {
                    body = JSON.parse(raw);
                } catch {
                    return fail(res, 400, 'invalid_json', 'The body is not valid JSON.');
                }
            }

            route(server, res, body);
        } catch (err) {
            console.error(err);
            if (!res.headersSent) fail(res, 500, 'internal_error', 'Internal error.');
        }
    });

    httpServer.on('error', console.error);
    httpServer.listen(config.bridge.port, config.bridge.host, () => console.info(`Bridge API listening on ${config.bridge.host}:${config.bridge.port} for ${keyed.map((entry) => entry.server.id).join(', ')}`));
    status.watch();
};

module.exports = { start };
