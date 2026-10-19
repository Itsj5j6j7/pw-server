# Propwash bot

Discord bot for the Propwash FPV community server, plus the HTTP API the [bridge mod](../propwash-bridge) reports to. Two separate processes that share one SQLite file:

| pm2 app | Entry | What it does |
|---------|-------|--------------|
| `propwash` | `src/index.js` | Discord bot: FAQ auto-answers, tickets, suggestions, honeypot, `/vc`, `/leaderboard`, `/link`, `/racedata`. |
| `propwash-api` | `src/bridge/index.js` | HTTP API for the mod (port `3006`): server status, laps, records, `/link` codes. Posts to Discord over REST. |

Either one can restart without the other. The API contract is in [Bridge API](#bridge-api) below.

## Requirements

- Node.js 22.13+ (uses the built-in `node:sqlite`)
- [pnpm](https://pnpm.io)
- [pm2](https://pm2.keymetrics.io): `npm install -g pm2`
- A Discord application with a bot token

## Setup

```bash
cd bot
pnpm install

cp .env.example .env
```

Fill in:

- `.env`: `CLIENT_TOKEN`, `TYPESAFE_API_KEY` (FAQ answers), and one API key per Minecraft server (`BRIDGE_KEY_FPV`, `BRIDGE_KEY_PLOTS`; generate each with `openssl rand -hex 32`). With a single server, use `BRIDGE_API_KEY` and leave `bridge.servers` empty.
- `src/config.js`: channel, role and category IDs; the `bridge` block (port, servers, channels). Versioned: edit it and commit, it holds no secrets (API keys stay in `.env`). Every field is commented in the file.

`.env` is gitignored. Never commit it.

The key a mod sends is what tells the API which server is talking, so the same keys go in each backend's `config/propwash-bridge.json`.

## Run with pm2

```bash
pm2 start ecosystem.config.js                       # bot + API
pm2 start ecosystem.config.js --only propwash       # only the bot
pm2 start ecosystem.config.js --only propwash-api   # only the API

pm2 status
pm2 logs propwash
pm2 logs propwash-api
pm2 restart propwash-api

pm2 save && pm2 startup                             # start on boot (run the command it prints)
```

After changing `.env` or `src/config.js`: `pm2 restart ecosystem.config.js --update-env`.

The API listens on `bridge.host:bridge.port` (default `127.0.0.1:3006`), on the same machine as the Minecraft servers, and the mod's default `apiUrl` already points there. Don't expose the port.

`bridge.db` (SQLite) is created on first start in `bot/`. Back it up if you care about records and `/link` accounts.

## Test the API without the mod

With `propwash-api` running and the keys in `.env`:

```bash
node scripts/fake-mod.js http://127.0.0.1:3006 BRIDGE_KEY_FPV
```

It simulates a server (start, heartbeats, a race, a record) and checks the responses. Ctrl+C simulates a crash: the server shows as offline after 90 s.

FAQ pre-filter self-check: `node src/utils/Faq.js`.

## Bridge API

Contract between the [bridge mod](../propwash-bridge) and `propwash-api`. The mod only sends; the API never calls the mod. Each Minecraft server has its own key, and the key is what tells the API which server is talking.

### Servers

- One key per server: `openssl rand -hex 32`, stored in the bot's `.env` (`BRIDGE_KEY_FPV`, `BRIDGE_KEY_PLOTS`...).
- One entry per server in `config.bridge.servers` (`fpv: { name: 'FPV', keyEnv: 'BRIDGE_KEY_FPV', maps: {...} }`).
- The API runs as its own pm2 process (`propwash-api`, `src/bridge/index.js`), separate from the Discord bot (`propwash`). Restarting the bot doesn't interrupt the mods; both share the SQLite file `bridge.db`.
- Adding the SMP later: new key, new entry, `pm2 restart propwash-api propwash`, and the same `.jar` on the SMP with that key.
- Revoking a leaked key: remove or rotate that server's entry. The other servers keep working.

### Per server and global

| Data | Scope | Why it matters to the mod |
|---|---|---|
| Status, players, TPS, online/offline | **Per server** | Each server sends its own heartbeat. One going down doesn't affect the others |
| Course ids | **Per server** | Every Propwash instance numbers its courses from 1, so `fpv` #3 and `plots` #3 are different courses. Send the id as Propwash has it; the bot stores `(server, id)` |
| Leaderboards and records | **Per server** | Follow the course. `leaderboard.reset` and `course.removed` only touch the server of the key |
| Event `id` and `heatId` deduplication | **Per server** | They only need to be unique within one server |
| Discord ↔ Minecraft links | **Global** | Stored by UUID. `/link` on any server links the account everywhere |
| `/link/start` rate limit | **Global**, per UUID | 5 codes/minute per player across all servers |
| Request rate limit | **Per key** | 300 requests/minute per server; servers don't eat each other's budget |

### Single-server mode

If the bridge only runs on one server, the bot uses one key (`BRIDGE_API_KEY`) and that server gets the id `main`. Discord messages then drop the server label. **The mod is exactly the same**: same `.jar`, same config, same requests.

### Connection

| | |
|---|---|
| Base URL | `http://127.0.0.1:3006/v1` |
| Auth | `Authorization: Bearer <key of this server>` on everything except `/health` |
| Format | JSON UTF-8, `Content-Type: application/json` |
| Max body size | 64 KB |
| Rate limit | 300 requests/minute **per key**, plus 5/minute per UUID on `/link/start` |

The key goes in the server's environment or config and **never** on the client.

#### Conventions

- **Timestamps:** milliseconds since epoch, UTC (`System.currentTimeMillis()`).
- **Race times:** **nanoseconds** as integers, same as Propwash. The bot formats them as `m:ss.mmm`.
- **UUIDs:** hyphenated and lowercase (`UUID#toString()`).
- **Player names:** `^\w{1,16}$`, the Minecraft format.
- **Dimensions:** lowercase `namespace:path` (`propwash:arena`, `minecraft:overworld`).
- **Text:** no formatting codes (`§a`). Up to 100 characters, 64 for a course name.
- **Optional fields:** an optional field can be omitted or sent as `null`.

#### Errors

Every error response has this shape:

```json
{ "error": { "code": "invalid_body", "message": "human readable text", "details": [] } }
```

| HTTP | `code` | What to do |
|---|---|---|
| 400 | `invalid_body`, `invalid_json` | Don't retry: it's a bug in the mod. Just log it |
| 401 | `unauthorized` | Unknown key (wrong, revoked, or this server isn't configured on the bot). Keep the data, wait 60 s and log a warning |
| 404 | `not_found` | Wrong route or method |
| 409 | `already_linked` | Only on `/link/start`: the account is already linked |
| 413 | `body_too_large` | Split the batch in half |
| 429 | `rate_limited` | Wait the seconds given by the `Retry-After` header |
| 5xx / timeout | `internal_error` | Retry the same batch with backoff: 1 s, 2 s, 4 s… up to 60 s |

---

### Endpoints

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/v1/health` | no | External monitoring |
| GET | `/v1/ping` | yes | Check the key and the connection on startup |
| POST | `/v1/heartbeat` | yes | Server status and online players, every 30 s |
| POST | `/v1/events` | yes | Batch of 1 to 50 events |
| POST | `/v1/link/start` | yes | Request a code to link a Discord account |

#### `GET /v1/health`

```json
{ "ok": true, "discord": true }
```

`discord` is `false` when the last message to Discord failed. The API keeps accepting data either way.

#### `GET /v1/ping`

```json
{ "ok": true, "server": { "id": "fpv", "name": "FPV" }, "serverTime": 1760190000000, "apiVersion": 1 }
```

`server` is the server the bot matched to the key. Log it on startup: `Bridge connected as FPV (fpv)`. In single-server mode it's `{ "id": "main", ... }`. Treat it as informational: the mod doesn't need to store it or send it back.

#### `POST /v1/heartbeat`

```json
{
  "mcVersion": "26.3", "loader": "fabric", "loaderVersion": "0.19.5", "modVersion": "0.1.0",
  "propwashVersion": "0.5.0",
  "onlinePlayers": 3, "maxPlayers": 20,
  "players": [
    { "uuid": "069a79f4-44e9-4726-a5be-fca90e38aaf5", "name": "Javi", "dimension": "propwash:arena" }
  ],
  "tps": 19.8, "mspt": 12.4, "uptimeSeconds": 86400,
  "memoryUsedMb": 3120, "memoryMaxMb": 6144
}
```

| Field | Type | Req. | Notes |
|---|---|---|---|
| `onlinePlayers`, `maxPlayers` | integer ≥ 0 | yes | Players on **this** server only |
| `players` | array (max 1000) | yes | `{ uuid, name, dimension }`. Empty if nobody is online |
| `mcVersion`, `loader`, `loaderVersion`, `modVersion`, `propwashVersion` | string | no | `loader`: always `fabric` |
| `tps`, `mspt` | number ≥ 0 | no | `tps = min(20, 1000 / mspt)` |
| `uptimeSeconds`, `memoryUsedMb`, `memoryMaxMb` | integer ≥ 0 | no | |

Response: `{ "ok": true }`.

- The bot keeps one status per server and groups each server's players by `dimension`; a map with no players doesn't show up in Discord.
- **After 90 s without a heartbeat from a server, the bot marks that server as offline**, so a crash is detected without the mod doing anything. The other servers aren't affected.
- When a player switches server through Velocity, the old server's last heartbeat can still list them for up to 30 s. The bot handles it (a UUID is shown only on the server with the most recent heartbeat); the mod doesn't need to do anything.
- A failed heartbeat is not retried: the next one arrives 30 s later.

#### `POST /v1/events`

```json
{ "events": [ { "id": "0b8e6f0e-5d0a-4a52-9a43-0f6f3e1e9a11", "type": "race.best_lap", "ts": 1760190000000, "data": { } } ] }
```

| Field | Type | Notes |
|---|---|---|
| `id` | string (1-64) | Unique per event: `UUID.randomUUID()`. **Kept the same across retries** |
| `type` | string | One of section 4 |
| `ts` | integer | When it happened (ms). Used as the date of leaderboard entries |
| `data` | object | Depends on the type |

`200` response:

```json
{ "accepted": ["id1"], "duplicates": ["id2"], "rejected": [{ "id": "id3", "code": "unknown_type" }] }
```

- `accepted`: processed.
- `duplicates`: that `id` already arrived from this server within the last hour. The mod treats it as delivered.
- `rejected`: invalid (`invalid_event`, `unknown_type`, `invalid_data`). **Not retried**, only logged.
- All three groups are removed from the queue.
- A `400` means the whole batch failed: not JSON, missing `events`, empty, or more than 50 events. Nothing is processed in that case.

#### `POST /v1/link/start`

```json
{ "uuid": "069a79f4-44e9-4726-a5be-fca90e38aaf5", "name": "Javi" }
```

- `200`: `{ "code": "K7M2QX", "expiresAt": 1760190600000, "ttlSeconds": 600 }`
- `409 already_linked`: the account is already linked (from any server). To change it, the player first runs `/unlink` on Discord.
- `429`: more than 5 codes per minute for that UUID, counted across all servers.

A new code invalidates the player's previous one, even if it was requested on another server. Each code works once and expires after 10 minutes. The link is global: linking once on `fpv` also covers `plots` and the SMP.

---

### Events

None of the events carries a server id: the bot takes it from the key.

#### Shared objects

`course`:

| Field | Type | Notes |
|---|---|---|
| `id` | integer ≥ 0 | Course id in **this server's** Propwash. Not unique across servers, and that's fine |
| `name` | string (≤ 64) | Can be **empty** (`""`). The bot then shows `Course #id` |
| `dimension` | string | Map the course belongs to |
| `layout` | integer ≥ 0 | Changes when the track is edited. A higher layout starts a new leaderboard |
| `laps` | integer ≥ 0 | Race laps (0 = free practice) |

`player`: `{ "uuid": "…", "name": "Javi" }`

#### `server.started`

Sent on startup, after a successful `ping`. Sets **this server's** status to online.

```json
{ "mcVersion": "26.3", "loader": "fabric", "loaderVersion": "…", "modVersion": "0.1.0", "propwashVersion": "0.5.0", "maxPlayers": 20 }
```

All fields are optional. Send `propwashVersion` and `modVersion`: with several servers the bot uses them to warn when they run different versions.

#### `server.stopping`

Sent on a clean shutdown. Sets **this server's** status to offline.

```json
{ "reason": "stop" }
```

`reason` is optional and can be `stop`, `restart` or `unknown`.

#### `race.best_lap`

Sent **only when a non-assisted lap improves a time**: the Propwash outcome is not `NONE`. Not sent for every lap.

```json
{
  "course": { "id": 3, "name": "Drone Arena", "dimension": "propwash:arena", "layout": 2, "laps": 3 },
  "player": { "uuid": "069a79f4-44e9-4726-a5be-fca90e38aaf5", "name": "Javi" },
  "frame": "5inch",
  "lapNanos": 47900000000,
  "outcome": "course_record",
  "previousRecord": { "name": "Ana", "nanos": 48213000000 }
}
```

| Field | Type | Req. | Notes |
|---|---|---|---|
| `course`, `player` | objects | yes | |
| `frame` | string | yes | Drone class. `""` if unknown |
| `lapNanos` | integer > 0 | yes | Penalties included |
| `outcome` | string | yes | `personal_best`, `class_record` or `course_record`, as **this server's** Propwash computed it |
| `previousRecord` | `{ name, nanos }` | no | The record that was just beaten. Only meaningful for records |

What the bot does: stores the time in that server's leaderboard for the course (one per player and class) and announces it if it's a `class_record` or `course_record`, labelled with the server name. If it already has an equal or better time for that player and class, it treats it as a retry and does nothing.

#### `race.result`

**Not sent by the mod yet** (waiting for Propwash's race events). The API accepts it.

Sent **once per race**, when it ends: everyone finished or dropped out, or time ran out. For a solo race it's sent when the pilot crosses the line, with a single result.

```json
{
  "heatId": "c1f0a2b4-0000-4000-8000-000000000001",
  "course": { "id": 3, "name": "Drone Arena", "dimension": "propwash:arena", "layout": 2, "laps": 3 },
  "multiplayer": true,
  "results": [
    { "place": 1, "player": { "uuid": "…", "name": "Javi" }, "status": "finished", "totalNanos": 143200000000, "bestLapNanos": 47900000000, "frame": "5inch", "assisted": false },
    { "place": null, "player": { "uuid": "…", "name": "Luis" }, "status": "dnf", "totalNanos": null, "bestLapNanos": null, "frame": null, "assisted": false }
  ]
}
```

| Field | Type | Req. | Notes |
|---|---|---|---|
| `heatId` | string (1-64) | yes | Generated by the mod. The bot never posts the same one twice for a server |
| `course` | object | yes | |
| `multiplayer` | bool | yes | `false` for solo races (not posted by default) |
| `results` | array (1-16) | yes | Sorted by place, `dnf` last |
| `results[].status` | string | yes | `finished` or `dnf` |
| `results[].place` | integer > 0 or `null` | yes | Integer if `finished`; **`null` if `dnf`** |
| `results[].totalNanos` | integer > 0 or `null` | yes | Required if `finished` |
| `results[].bestLapNanos` | integer > 0 | no | Best lap within that race |
| `results[].frame` | string | no | |
| `results[].assisted` | bool | yes | Whether assists were used. The bot flags it |

A race always happens on one server, so a heat never mixes pilots from different servers.

#### `leaderboard.reset` (optional)

```json
{ "courseId": 3, "playerName": null }
```

With `playerName` set to `null`, the whole leaderboard of the current layout of **this server's** course is cleared. With a name, only that player's times. Same as `/propwash race leaderboard reset`.

#### `course.removed` (optional)

```json
{ "courseId": 3 }
```

Deletes **this server's** course and all its leaderboards.

#### Testing with curl

Once per key, each one must answer with its own `server`:

```bash
API=http://127.0.0.1:3006/v1
for KEY in $KEY_FPV $KEY_PLOTS; do
  curl -s -H "Authorization: Bearer $KEY" $API/ping; echo
done

curl -s -X POST -H "Authorization: Bearer $KEY_FPV" -H "Content-Type: application/json" $API/heartbeat \
  -d '{"onlinePlayers":1,"maxPlayers":20,"players":[{"uuid":"069a79f4-44e9-4726-a5be-fca90e38aaf5","name":"Javi","dimension":"propwash:arena"}]}'
```
