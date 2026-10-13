# Propwash bridge mod: API and development guide

This document covers what the server-side mod needs to collect data from Minecraft and Propwash and send it to the Discord bot. If anything here disagrees with `plan_v2.md` or `plan_pw.md`, this document wins.

**Summary:** the mod only **sends**; the bot never calls the mod. The mod does three things: a heartbeat every 30 s, a queue of events (start, stop, laps, races), and the in-game `/link` command.

**One mod, several servers.** The network runs Velocity in front of a Paper hub and two or three backend servers with Propwash: `fpv`, `plots` and, later, an `smp`. The **same `.jar`** goes on every backend with Propwash, each one with **its own API key**. The key is what tells the bot which server is talking. If the bridge ends up on a single server, it uses one key and nothing else changes.

---

## 1. Servers and keys

```
                 ┌─ Velocity (online-mode, modern forwarding) ─┐
                 │                                              │
     ┌───────────┼──────────────┬───────────────┬───────────────┤
     ▼           ▼              ▼               ▼
  Hub (Paper)  fpv            plots           smp (future)
  no bridge    bridge         bridge          bridge
               key "fpv"      key "plots"     key "smp"
                  │              │               │
                  └──────────────┴───────┬───────┘
                                         │ HTTPS, Bearer <key of that server>
                                         ▼
                              https://pw.itofu.net/v1  (bot)
```

### 1.1 The key is the server identity

- Each backend has a **different key** in its `config/propwash-bridge.json`. Everything else in that file can be identical.
- The mod **never sends a server id**. The bot maps key → server (`fpv`, `plots`, `smp`...) and tags everything it stores and posts with it.
- `GET /v1/ping` answers with the server the bot recognised. The mod logs it on startup, so a key copied from the wrong server shows up right away.
- Copying a config from one server to another **without changing the key** makes the second server overwrite the first one's status. Always generate a new key per server.

### 1.2 What is per server and what is global

| Data | Scope | Why it matters to the mod |
|---|---|---|
| Status, players, TPS, online/offline | **Per server** | Each server sends its own heartbeat. One going down doesn't affect the others |
| Course ids | **Per server** | Every Propwash instance numbers its courses from 1, so `fpv` #3 and `plots` #3 are different courses. Send the id as Propwash has it; the bot stores `(server, id)` |
| Leaderboards and records | **Per server** | Follow the course. `leaderboard.reset` and `course.removed` only touch the server of the key |
| Event `id` and `heatId` deduplication | **Per server** | They only need to be unique within one server |
| Discord ↔ Minecraft links | **Global** | Stored by UUID. `/link` on any server links the account everywhere |
| `/link/start` rate limit | **Global**, per UUID | 5 codes/minute per player across all servers |
| Request rate limit | **Per key** | 300 requests/minute per server; servers don't eat each other's budget |

### 1.3 Single-server mode

If the bridge only runs on one server, the bot uses one key (`BRIDGE_API_KEY`) and that server gets the id `main`. Discord messages then drop the server label. **The mod is exactly the same**: same `.jar`, same config, same requests.

### 1.4 Bot side (for whoever runs the bot)

Nothing here affects the mod, it's just so both sides agree.

- One key per server: `openssl rand -hex 32`, stored in the bot's `.env` (`BRIDGE_KEY_FPV`, `BRIDGE_KEY_PLOTS`...).
- One entry per server in `config.bridge.servers` (`fpv: { name: 'FPV', keyEnv: 'BRIDGE_KEY_FPV', maps: {...} }`).
- The API runs as its own pm2 process (`propwash-api`, `src/bridge/index.js`), separate from the Discord bot (`propwash`). Restarting the bot doesn't interrupt the mods; both share the SQLite file `bridge.db`.
- Adding the SMP later: new key, new entry, `pm2 restart propwash-api propwash`, and the same `.jar` on the SMP with that key.
- Revoking a leaked key: remove or rotate that server's entry. The other servers keep working.

---

## 2. Connection

| | |
|---|---|
| Base URL | `https://pw.itofu.net/v1` |
| Auth | `Authorization: Bearer <key of this server>` on everything except `/health` |
| Format | JSON UTF-8, `Content-Type: application/json` |
| Max body size | 64 KB |
| Rate limit | 300 requests/minute **per key**, plus 5/minute per UUID on `/link/start` |

The key goes in the server config and **never** on the client.

### Conventions

- **Timestamps:** milliseconds since epoch, UTC (`System.currentTimeMillis()`).
- **Race times:** **nanoseconds** as integers, same as Propwash. The bot formats them as `m:ss.mmm`.
- **UUIDs:** hyphenated and lowercase (`UUID#toString()`).
- **Player names:** `^\w{1,16}$`, the Minecraft format.
- **Dimensions:** lowercase `namespace:path` (`propwash:arena`, `minecraft:overworld`).
- **Text:** no formatting codes (`§a`). Up to 100 characters, 64 for a course name.
- **Optional fields:** an optional field can be omitted or sent as `null`.

### Errors

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

## 3. Endpoints

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/v1/health` | no | External monitoring |
| GET | `/v1/ping` | yes | Check the key and the connection on startup |
| POST | `/v1/heartbeat` | yes | Server status and online players, every 30 s |
| POST | `/v1/events` | yes | Batch of 1 to 50 events |
| POST | `/v1/link/start` | yes | Request a code to link a Discord account |

### `GET /v1/health`

```json
{ "ok": true, "discord": true }
```

`discord` is `false` when the last message to Discord failed. The API keeps accepting data either way.

### `GET /v1/ping`

```json
{ "ok": true, "server": { "id": "fpv", "name": "FPV" }, "serverTime": 1760190000000, "apiVersion": 1 }
```

`server` is the server the bot matched to the key. Log it on startup: `Bridge connected as FPV (fpv)`. In single-server mode it's `{ "id": "main", ... }`. Treat it as informational: the mod doesn't need to store it or send it back.

### `POST /v1/heartbeat`

```json
{
  "mcVersion": "26.3", "loader": "fabric", "loaderVersion": "0.17.2", "modVersion": "0.1.0",
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
| `mcVersion`, `loader`, `loaderVersion`, `modVersion`, `propwashVersion` | string | no | `loader`: `fabric` or `neoforge` |
| `tps`, `mspt` | number ≥ 0 | no | `tps = min(20, 1000 / mspt)` |
| `uptimeSeconds`, `memoryUsedMb`, `memoryMaxMb` | integer ≥ 0 | no | |

Response: `{ "ok": true }`.

- The bot keeps one status per server and groups each server's players by `dimension`; a map with no players doesn't show up in Discord.
- **After 90 s without a heartbeat from a server, the bot marks that server as offline**, so a crash is detected without the mod doing anything. The other servers aren't affected.
- When a player switches server through Velocity, the old server's last heartbeat can still list them for up to 30 s. The bot handles it (a UUID is shown only on the server with the most recent heartbeat); the mod doesn't need to do anything.
- A failed heartbeat is not retried: the next one arrives 30 s later.

### `POST /v1/events`

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

### `POST /v1/link/start`

```json
{ "uuid": "069a79f4-44e9-4726-a5be-fca90e38aaf5", "name": "Javi" }
```

- `200`: `{ "code": "K7M2QX", "expiresAt": 1760190600000, "ttlSeconds": 600 }`
- `409 already_linked`: the account is already linked (from any server). To change it, the player first runs `/unlink` on Discord.
- `429`: more than 5 codes per minute for that UUID, counted across all servers.

A new code invalidates the player's previous one, even if it was requested on another server. Each code works once and expires after 10 minutes. The link is global: linking once on `fpv` also covers `plots` and the SMP.

---

## 4. Events

None of the events carries a server id: the bot takes it from the key.

### Shared objects

`course`:

| Field | Type | Notes |
|---|---|---|
| `id` | integer ≥ 0 | Course id in **this server's** Propwash. Not unique across servers, and that's fine |
| `name` | string (≤ 64) | Can be **empty** (`""`). The bot then shows `Course #id` |
| `dimension` | string | Map the course belongs to |
| `layout` | integer ≥ 0 | Changes when the track is edited. A higher layout starts a new leaderboard |
| `laps` | integer ≥ 0 | Race laps (0 = free practice) |

`player`: `{ "uuid": "…", "name": "Javi" }`

### `server.started`

Sent on startup, after a successful `ping`. Sets **this server's** status to online.

```json
{ "mcVersion": "26.3", "loader": "fabric", "loaderVersion": "…", "modVersion": "0.1.0", "propwashVersion": "0.5.0", "maxPlayers": 20 }
```

All fields are optional. Send `propwashVersion` and `modVersion`: with several servers the bot uses them to warn when they run different versions.

### `server.stopping`

Sent on a clean shutdown. Sets **this server's** status to offline.

```json
{ "reason": "stop" }
```

`reason` is optional and can be `stop`, `restart` or `unknown`.

### `race.best_lap`

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

### `race.result`

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

### `leaderboard.reset` (optional)

```json
{ "courseId": 3, "playerName": null }
```

With `playerName` set to `null`, the whole leaderboard of the current layout of **this server's** course is cleared. With a name, only that player's times. Same as `/propwash race leaderboard reset`.

### `course.removed` (optional)

```json
{ "courseId": 3 }
```

Deletes **this server's** course and all its leaderboards.

---

## 5. Building the mod

### 5.1 Where it goes

| Where | Bridge? | Why |
|---|---|---|
| Velocity proxy | No | Only sees connections and server switches; no dimensions, no Propwash |
| Hub (Paper) | No | Paper doesn't load Fabric/NeoForge mods, and the hub has no Propwash |
| `fpv`, `plots`, `smp` (Fabric/NeoForge with Propwash) | **Yes** | Runs in the same JVM as Propwash: sees players, dimensions and races |

- **Same `.jar` on every backend.** Only `apiKey` changes between servers. The mod must not hardcode anything server-specific (no server names, no course ids, no dimensions).
- A server without courses (likely `plots`) just sends heartbeats, `server.started` and `server.stopping`; the race hooks simply never fire. No special mode needed.
- Players connected to the hub don't appear anywhere: the hub has no bridge.

### 5.2 Requirements

- Mod for **Minecraft 26.3**, depending on `propwash >= 0.5.0`.
- **Multi-loader from the start** (common module + `fabric` + `neoforge`, like Propwash itself). The current servers can run on one loader and the SMP on the other without duplicating code. If servers ever run different Minecraft versions, each version needs its own build.
- **Server only**: `environment: server` on Fabric, `side = SERVER` on NeoForge. Players don't install it.
- **To verify:** the bridge must not count as a Propwash add-on. Propwash compares the add-on list between server and client, and if the bridge counts, players without it can't join that backend. As long as it doesn't register parts or use the Propwash registry it shouldn't count, but this needs testing on each backend.
- `PropwashApi.requireVersion("<mod_id>", "1.5")` to fail with a clear message if Propwash is too old.
- Only **outgoing HTTPS**: no ports opened on any backend.

### 5.3 Velocity and UUIDs

`/link` and the leaderboards rely on the UUID being the player's real one. Behind Velocity, the backends run with `online-mode=false` and trust the proxy, so:

- `velocity.toml`: `online-mode = true` and `player-info-forwarding-mode = "modern"`.
- Each Fabric backend needs a mod that accepts modern forwarding (e.g. FabricProxy-Lite); NeoForge needs its equivalent. If players already join through Velocity, it's probably there.
- Backends must **not** be reachable from the internet, only from the proxy.
- **Check:** on the first real heartbeat from each server, your UUID must match your Mojang UUID. If it doesn't, linking isn't trustworthy on that server.

### 5.4 Where each piece of data comes from

Minecraft data, no Propwash needed:

| Data | Source |
|---|---|
| Players, UUID and name | `server.getPlayerList().getPlayers()` |
| Each player's dimension | `player.level().dimension().identifier()` |
| TPS and MSPT | Server tick times |
| Start and stop | Loader lifecycle events |

Race data: the Propwash public API (1.5.0) **has no race events**. There are two options:

**A. Ask the author for events (recommended).** The API already follows the `PropwashEvent<T>` pattern with `register`/`fire`. These events would need to be proposed on their Discord or through a PR (the API is MIT and the repo has a `CONTRIBUTING.md`):

| Event | Data | Feeds |
|---|---|---|
| `LAP_COMPLETED` | player, course, class, `lapNanos`, `Outcome`, assisted | `race.best_lap` |
| `RACE_FINISHED` | player, course, laps, `totalNanos`, assisted, place | `race.result` |
| `HEAT_FINISHED` | course, pilots, results, dropouts | multiplayer `race.result` |
| `LEADERBOARD_RESET` | course, optional name | `leaderboard.reset` |
| `COURSE_REMOVED` | id | `course.removed` |

**B. Mixins on internal classes (fallback).** These hook points are from version 0.5.0 (commit `62cff4e`). **They're internal, so they can change in any release.** With several servers, option B forces **every server onto the same Propwash version**, or one build per version.

| What | Where | What it gives |
|---|---|---|
| Lap that improves a time | `CourseRegistry#submitLap(Course, ServerPlayer, String frame, long lapNanos)`, on **return** | Returns `Leaderboard.Outcome`; the arguments give the rest |
| Previous record | Same method, at the **head**: `registry.board(course).record(null)` and `.record(frame)` | `Optional<Entry>` with name and time |
| Pilot finishes | `CourseRegistry#submitRace(Course, ServerPlayer, int laps, long totalNanos)` and `#submitAssistedRace(…, int assist)` | Course, player, time and whether it was assisted |
| Place in the heat | `RaceLobby.Heat#finish(UUID)`, on return | The place (`> 0`) or `-1` |
| Active heat | `RaceServer.heat(int courseId)` | The `Heat` or `null` |
| Heat finished | `heat.done(System.nanoTime())` | `true` once everyone finished or dropped out, or after 15 min |
| Leaderboard reset | `CourseRegistry#resetLeaderboard(Course, String playerName)` | Course and optional name |

Building `race.result` with option B:

1. In `submitRace` or `submitAssistedRace`, store `{ course, player, laps, totalNanos, assisted }`.
2. Check `RaceServer.heat(course.id)`. If it's `null`, if `!heat.multiplayer()`, or if the pilot isn't in `heat.pilots()`, it's a solo race: emit `race.result` with a single result.
3. Otherwise, collect into a per-heat aggregator with `heatId = UUID.randomUUID()` and store the place returned by `Heat#finish`.
4. Every second, check open aggregators with `heat.done(System.nanoTime())`. When done: finishers by place, the rest of `heat.pilots()` as `dnf`. Emit `race.result`.

> The rest of Propwash (everything except the API) is licensed under PolyForm Shield 1.0.0. Before distributing the bridge, read `LICENSE` or ask the author.

### 5.5 Config

`config/propwash-bridge.json`, one per server:

```json
{
  "apiUrl": "https://pw.itofu.net",
  "apiKey": "<64 hex characters, different on each server>",
  "heartbeatSeconds": 30,
  "batchMs": 1000,
  "queueMax": 200
}
```

| Setting | Notes |
|---|---|
| `apiUrl` | Without `/v1`. Same on every server |
| `apiKey` | **The only setting that must differ between servers** |
| `heartbeatSeconds` | Must be under 90 |
| `batchMs` | How often the queue is flushed |
| `queueMax` | In-memory queue cap |

- If `apiKey` is empty, the mod logs one warning and stays idle: the server runs as normal and nothing is sent. This lets the `.jar` be dropped on a server before it has a key.
- Never log the key. If needed, log its last 4 characters.

### 5.6 HTTP client

Rules:

1. **No networking on the server thread.** Hooks only build the event and push it into a concurrent queue.
2. **A single sender thread**, so events arrive in order.
3. **The `id` is generated when the event is created** and kept across every retry.
4. **Don't retry what the bot rejects** (`400` or `rejected`).
5. **If the bot is down, the server keeps running** as normal.
6. **If the queue fills up**, drop the oldest events first, but keep `race.best_lap` and `race.result` for as long as possible.

Lifecycle:

- **On startup:** `GET /v1/ping`. On `200`, log `server.name` and `server.id`. On `401`, log a warning ("key not accepted, check `apiKey` for this server") and retry every minute. Then queue `server.started`.
- **While running:** every `batchMs`, take up to 50 events and `POST /v1/events`. Every `heartbeatSeconds`, `POST /v1/heartbeat`.
- **On shutdown:** queue `server.stopping` and flush the queue with a cap of about 3 s. Velocity restarts of one backend don't need anything else.

In-game `/link`: call `/v1/link/start` off the server thread and go back with `server.execute(...)` to show the message. For example: "Your code is **K7M2QX**. Type `/link K7M2QX` on Discord (expires in 10 min)". On `409`: "Your account is already linked". The command exists on every server with the bridge; the player only needs to run it once on any of them.

Sending from Java with no dependencies, always from the sender thread:

```java
HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(3)).build();

HttpRequest req = HttpRequest.newBuilder(URI.create(apiUrl + "/v1/events"))
    .timeout(Duration.ofSeconds(5))
    .header("Authorization", "Bearer " + apiKey)
    .header("Content-Type", "application/json")
    .header("User-Agent", "propwash-bridge/0.1")
    .POST(HttpRequest.BodyPublishers.ofString(json))
    .build();

HttpResponse<String> res = http.send(req, HttpResponse.BodyHandlers.ofString());
```

Gson ships with Minecraft and works for serialization.

### 5.7 Testing

Test the API with `curl`, once per key:

```bash
API=https://pw.itofu.net/v1
for KEY in $KEY_FPV $KEY_PLOTS; do
  curl -s -H "Authorization: Bearer $KEY" $API/ping; echo
done
# each one must answer with its own "server"

curl -s -X POST -H "Authorization: Bearer $KEY_FPV" -H "Content-Type: application/json" $API/heartbeat \
  -d '{"onlinePlayers":1,"maxPlayers":20,"players":[{"uuid":"069a79f4-44e9-4726-a5be-fca90e38aaf5","name":"Javi","dimension":"propwash:arena"}]}'
```

To see the result on Discord without the mod, from `propwash/` with the keys in `.env`. The second argument is the `.env` variable holding the key (default `BRIDGE_API_KEY`), so two runs simulate two servers:

```bash
node scripts/fake-mod.js https://pw.itofu.net BRIDGE_KEY_FPV
node scripts/fake-mod.js https://pw.itofu.net BRIDGE_KEY_PLOTS
```

The script sends a start, heartbeats, a 3-pilot race, a record and a retry, and checks the responses. Stopping it with Ctrl+C simulates a crash: the server shows as offline after 90 s.

What to check once the real mod runs on two servers:

- Each server shows up as its own block in the status message, and stopping one marks only that one offline.
- A course `#3` on `fpv` and a course `#3` on `plots` have separate leaderboards.
- Moving between servers through Velocity doesn't show the player twice for more than a heartbeat.
- `/link` on one server, then a race on the other: the player shows up linked.
