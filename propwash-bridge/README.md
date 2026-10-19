# Propwash Bridge

Server-side Fabric mod that reports server status, records and course changes from Propwash to the bridge API in [`../bot`](../bot). The API contract (endpoints, events, errors) is in the [bot README](../bot/README.md#bridge-api).

The mod only **sends**; the API never calls the mod. It does three things: a heartbeat every 30 s, a queue of events (start, stop, records, course changes), and the in-game `/link` command.

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
- Nothing server-specific is hardcoded (no server names, course ids or dimensions). A server without courses (`plots`) just sends heartbeats, `server.started` and `server.stopping`.
- Course ids are per server: Propwash numbers each instance's courses from 1, so `fpv` #3 and `plots` #3 are different courses with separate leaderboards. `/link` is global: linking once on any server covers all of them.

## Build

Propwash isn't published on any maven, so the build compiles against the local jar:

1. Copy `propwash-fabric-26.3-0.5.2.jar` and the Vanish mod jar (`vanish-1.6.16+26.3.jar`, from Modrinth, compile-only) into `libs/` (gitignored: Propwash is PolyForm Shield).
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
- **Not a Propwash add-on.** Propwash treats as add-ons every mod that `depends`/`recommends`/`suggests` on it and compares that list with the client's. The bridge only declares `"breaks": { "propwash": "<0.5.0" }` and checks at startup that Propwash is loaded, so players without the bridge join normally.
- No ports opened: the mod only makes outgoing requests to the API.

### Velocity and UUIDs

`/link` and the leaderboards rely on the real player UUID. Behind Velocity:

- `velocity.toml`: `online-mode = true` and `player-info-forwarding-mode = "modern"`.
- Each Fabric backend runs a modern forwarding mod (FabricProxy-Lite) and is reachable only from the proxy.
- Check: on the first real heartbeat from each server, your UUID must match your Mojang UUID.

## How it works

Minecraft data comes from the server: players and dimensions from the player list, TPS/MSPT from tick times, start and stop from `ServerLifecycleEvents`.

Propwash's public API (1.6.0) **has no race events**, so records come from one mixin on internal classes:

| Event | Hook |
|---|---|
| `race.best_lap` | `@WrapMethod` on `CourseRegistry#submitLap(Course, ServerPlayer, String frame, long lapNanos)`: reads the course and class records before and the `Leaderboard.Outcome` after. Sent only when a non-assisted lap improves a time |
| `leaderboard.reset` | `CourseRegistry#resetLeaderboard` |
| `course.removed` | `CourseRegistry#deleteCourse` |

`race.result` isn't sent yet: it needs heats, places and dropouts from internals about to change. It comes back once Propwash publishes race events (expected in 0.6.0); the API already accepts it.

Sender rules (`Sender.java`):

1. No networking on the server thread: hooks only build the event and push it to a concurrent queue.
2. A single sender thread, so events arrive in order. Every `batchMs` it posts up to 50 events; every `heartbeatSeconds`, a heartbeat (on a timer, so it keeps going while an empty server is paused).
3. Each event gets its `id` when created and keeps it across retries. What the API rejects (`400` or `rejected`) isn't retried.
4. API down: the server runs as normal; retries with backoff up to 60 s. `401`: warn and retry every minute. `413`: split the batch. `429`: wait `Retry-After`.
5. Queue full: drop the oldest events first, keeping `race.best_lap` as long as possible.
6. On startup: `GET /v1/ping`, then `server.started`. On shutdown: `server.stopping` and flush the queue for up to ~3 s.

## Propwash updates

The mixin is checked against 0.5.1 and 0.5.2 (`submitLap`, `resetLeaderboard` and `deleteCourse` are identical in both). It's internal code, so it can break in any release: keep every server on the same Propwash version and, after updating, look for Mixin errors mentioning `propwash-bridge` in the server log. The mixin config is `required: false`, so the server still starts; only the affected events stop arriving.

> Propwash (everything except its API) is licensed under PolyForm Shield 1.0.0. Read its `LICENSE` or ask the author before distributing the bridge.

## Testing

Run the API from [`../bot`](../bot) and point a dev server at it: `./gradlew runServer` with the Propwash jar in `run/mods/` and the key of one of the API's servers in `run/config/propwash-bridge.json`.

Once it runs on two servers, check that:

- Each server shows up as its own block in the Discord status message, and stopping one marks only that one offline.
- A course `#3` on `fpv` and a course `#3` on `plots` have separate leaderboards.
- Moving between servers through Velocity doesn't show the player twice for more than one heartbeat.
- `/link` on one server, then a record on the other: the player shows up linked.
