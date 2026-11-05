# Propwash Bridge

Server-side Fabric mod that reports server status, records, race results and leaderboards from Propwash to the bridge API in [`../bot`](../bot). The API contract (endpoints, events, errors) is in the [bot README](../bot/README.md#bridge-api).

The mod only **sends**; the API never calls the mod. It does three things: a heartbeat every 30 s, a queue of events (start, stop, records, race results, Propwash's leaderboards), and the in-game `/link` command.

## Servers and keys

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
                                         │ HTTP, Bearer <key of that server>
                                         ▼
                              http://127.0.0.1:3006/v1  (bridge API, same machine)
```

- The **same `.jar`** goes on every Fabric backend with Propwash (`fpv`, `plots`, `smp`). Not on Velocity (no dimensions, no Propwash), not on the hub (Paper), not on clients.
- Each backend has a **different API key**. The key is the server identity: the mod never sends a server id, the API maps key → server and tags everything with it. Copying a config to another server without changing the key makes the second one overwrite the first one's status.
- Nothing server-specific is hardcoded (no server names, course ids or dimensions). A server without courses (`plots`) just sends heartbeats, `server.started`, `server.stopping` and an empty `courses.sync`.
- Courses are identified by Propwash's course UUID (0.6.0+), stable across renumbering; the number (`#3`) is only for display, so `fpv` #3 and `plots` #3 never mix. `/link` is global: linking once on any server covers all of them.

## Build

Propwash isn't published on any maven, so the build compiles against the local jar:

1. Copy `propwash-fabric-26.3-0.6.0-rc.2.jar` (or the 0.6.0 release, only one Propwash jar) and the Vanish mod jar (`vanish-1.6.16+26.3.jar`, from Modrinth, compile-only) into `libs/` (gitignored: Propwash is PolyForm Shield).
2. `./gradlew build` → `build/libs/propwash-bridge-<version>.jar`.

The GitHub workflow fails without that jar.

## Install

Drop the jar into `mods/` of every Fabric backend with Propwash. On first start it writes `config/propwash-bridge.json` and stays idle until it has a key:

```json
{
  "apiUrl": "http://127.0.0.1:3006",
  "apiKey": "<64 hex characters, different on each server>",
  "heartbeatSeconds": 30,
  "batchMs": 1000,
  "queueMax": 200
}
```

| Setting | Notes |
|---|---|
| `apiUrl` | Without `/v1`. Same on every server. The default is the API on the same machine |
| `apiKey` | **The only setting that must differ between servers** |
| `heartbeatSeconds` | Clamped to 5-85: the API marks a server offline after 90 s without one |
| `batchMs` | How often the event queue is flushed |
| `queueMax` | In-memory queue cap |

- `PROPWASH_BRIDGE_API_KEY` and `PROPWASH_BRIDGE_API_URL`, when set in the server's environment, win over `apiKey` and `apiUrl`. The community server's deploy puts the key there, so it never sits in a file.
- On startup the log shows `Bridge connected as FPV (fpv)`; a different name means the key belongs to another server. An empty key logs one warning and the mod stays idle.
- The key is never logged, only its last 4 characters.
- Players hidden with Vanish (`/vanish`) are left out of the heartbeat, `onlinePlayers` included.

Players run `/link` in game to get a code for `/link <code>` on Discord ("already linked" if they did it before; `/unlink` on Discord to change it).

## Requirements

- **Minecraft 26.3, Fabric only** (Loader 0.19.5+, Fabric API), Java 25. Server only (`"environment": "server"`).
- **Propwash 0.6.0 or newer** (race API 1.7.0; the RCs count). Older Propwash: use bridge 0.4.0.
- **Not a Propwash add-on.** Propwash treats as add-ons every mod that `depends`/`recommends`/`suggests` on it and compares that list with the client's. The bridge only declares `"breaks": { "propwash": "<0.6.0-" }` and checks at startup that Propwash is loaded with API 1.7.0+, so players without the bridge join normally.
- No ports opened: the mod only makes outgoing requests to the API.

### Velocity and UUIDs

`/link` and the leaderboards rely on the real player UUID. Behind Velocity:

- `velocity.toml`: `online-mode = true` and `player-info-forwarding-mode = "modern"`.
- Each Fabric backend runs a modern forwarding mod (FabricProxy-Lite) and is reachable only from the proxy.
- Check: on the first real heartbeat from each server, your UUID must match your Mojang UUID.

## How it works

Minecraft data comes from the server: players and dimensions from the player list, TPS/MSPT from tick times, start and stop from `ServerLifecycleEvents`.

Race data comes from Propwash's public race API (`PropwashApi.race()` and `RaceEvents`, API 1.7.0), with no mixins:

| Event | Source |
|---|---|
| `race.record` | `LAP_COMPLETED` with `classRecord` (scope `class`, or `course` with `courseRecord`), and `PERSONAL_BEST` of a clean race time that ranks 1st (scope `race`, not on point-to-point courses, where the run is the lap) |
| `race.result` | `RACE_FINISHED`, one per pilot with their heat place. The mod groups them per course: place 1 opens a heat, and it's sent once nobody finished it for 60 s (or on shutdown). Place 0 (no lobby) is sent at once as a solo race. Best lap of each pilot from their `LAP_COMPLETED` events |
| `course.board` | `RaceData#leaderboard`: top 10 of the current layout, lap times (all classes and each class, clean; all classes, assisted) and race times per lap count (clean and assisted). Sent at the end of the tick in which `PERSONAL_BEST` or a course event touched it, so after its `race.record`, and every 30 s for any board whose content changed (a leaderboard reset has no event) |
| `courses.sync` | 5 s after startup: every course UUID on this server, so the bot drops the ones deleted or renumbered while the bridge was off |
| `course.removed` | `COURSE_DELETED` |

Propwash doesn't say when a heat is over nor who crashed out, so heats list only finishers, and a 2-pilot heat with a single finisher goes out as a solo race.

Sender rules (`Sender.java`):

1. No networking on the server thread: hooks only build the event and push it to a concurrent queue.
2. A single sender thread, so events arrive in order. Every `batchMs` it posts up to 50 events; every `heartbeatSeconds`, a heartbeat (on a timer, so it keeps going while an empty server is paused).
3. Each event gets its `id` when created and keeps it across retries. What the API rejects (`400` or `rejected`) isn't retried.
4. API down: the server runs as normal; retries with backoff up to 60 s. `401`: warn and retry every minute. `413`: split the batch. `429`: wait `Retry-After`.
5. Queue full: drop the oldest events first, keeping `race.record` and `race.result` as long as possible.
6. On startup: `GET /v1/ping`, then `server.started`. On shutdown: pending heats, `server.stopping` and flush the queue for up to ~3 s.

## Propwash updates

Only the public API is used, so Propwash updates that keep API 1.x don't need a new bridge. Checked against 0.6.0-rc.2. Propwash also writes its own copy of this data to `world/propwash/race-data/` (`courses.json` and `leaderboards/<uuid>.json`); the bridge doesn't read it.

> Propwash (everything except its API) is licensed under PolyForm Shield 1.0.0. Read its `LICENSE` or ask the author before distributing the bridge.

## Testing

Run the API from [`../bot`](../bot) and point a dev server at it: `./gradlew runServer` with the Propwash jar in `run/mods/` and the key of one of the API's servers in `run/config/propwash-bridge.json` (`PROPWASH_BRIDGE_API_*` don't reach the server started by Gradle's daemon). Courses from an older world get their UUID on the first start and their board arrives 5 s later.

Once it runs on two servers, check that:

- Each server shows up as its own block in the Discord status message, and stopping one marks only that one offline.
- A course `#3` on `fpv` and a course `#3` on `plots` have separate leaderboards.
- Moving between servers through Velocity doesn't show the player twice for more than one heartbeat.
- `/link` on one server, then a record on the other: the player shows up linked.
