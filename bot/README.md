# Propwash bot

Discord bot for the Propwash FPV community server, plus the HTTP API the [bridge mod](../propwash-bridge) reports to. Two separate processes that share one SQLite file:

| pm2 app | Entry | What it does |
|---------|-------|--------------|
| `propwash` | `src/index.js` | Discord bot: FAQ auto-answers, tickets, suggestions, honeypot, `/vc`, `/leaderboard`, `/link`, `/racedata`. |
| `propwash-api` | `src/bridge/index.js` | HTTP API for the mod (port `3006`): server status, laps, records, `/link` codes. Posts to Discord over REST. |

Either one can restart without the other. The API contract is in [BRIDGE.md](../BRIDGE.md).

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
cp src/example.config.js src/config.js
```

Fill in:

- `.env`: `CLIENT_TOKEN`, `TYPESAFE_API_KEY` (FAQ answers), and one API key per Minecraft server (`BRIDGE_KEY_FPV`, `BRIDGE_KEY_PLOTS`; generate each with `openssl rand -hex 32`). With a single server, use `BRIDGE_API_KEY` and leave `bridge.servers` empty.
- `src/config.js`: channel, role and category IDs; the `bridge` block (port, servers, channels). Every field is commented in `src/example.config.js`.

Both files are gitignored. Never commit them.

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

The API listens on `bridge.host:bridge.port` (default `0.0.0.0:3006`). The mod talks to it over HTTP(S) with `Authorization: Bearer <key>`:

- Mod and API on the same machine: set `bridge.host` to `127.0.0.1` and point the mod's `apiUrl` at `http://127.0.0.1:3006`.
- Different machines: put a reverse proxy with TLS in front and expose only that.

`bridge.db` (SQLite) is created on first start in `bot/`. Back it up if you care about records and `/link` accounts.

## Test the API without the mod

With `propwash-api` running and the keys in `.env`:

```bash
node scripts/fake-mod.js http://127.0.0.1:3006 BRIDGE_KEY_FPV
```

It simulates a server (start, heartbeats, a race, a record) and checks the responses. Ctrl+C simulates a crash: the server shows as offline after 90 s.

FAQ pre-filter self-check: `node src/utils/Faq.js`.

## Docs

- [../BRIDGE.md](../BRIDGE.md): API contract and mod guide (canonical).
- `plan_v2.md`: design notes for the multi-server bridge. `plan_pw.md` is the older single-server plan.
