# Propwash Bridge

Server-side Fabric mod that reports server status, race results and records from Propwash to the Discord bot. Contract and design: [`../BRIDGE.md`](../BRIDGE.md).

## Build

Propwash isn't published on any maven, so the build compiles against the local jar:

1. Copy `propwash-fabric-26.3-0.5.1.jar` and the Vanish mod jar (`vanish-1.6.16+26.3.jar`, from Modrinth, compile-only) into `libs/` (gitignored: Propwash is PolyForm Shield).
2. `./gradlew build` → `build/libs/propwash-bridge-<version>.jar`.

The GitHub workflow fails without that jar.

## Install

Drop the jar into `mods/` of every Fabric backend with Propwash (`fpv`, `plots`, `smp`). Not on Velocity, not on the hub, not on clients.

On first start it writes `config/propwash-bridge.json` and stays idle until it has a key:

```json
{
  "apiUrl": "https://pw.itofu.net",
  "apiKey": "<64 hex characters, different on each server>",
  "heartbeatSeconds": 30,
  "batchMs": 1000,
  "queueMax": 200
}
```

`apiKey` is the only setting that differs between servers. The environment variables `PROPWASH_BRIDGE_API_KEY` and `PROPWASH_BRIDGE_API_URL` override `apiKey` and `apiUrl`, which keeps the key out of the file. On startup the log shows `Bridge connected as FPV (fpv)`; a different name means the key belongs to another server.

Players run `/link` in game to get a code for `/link <code>` on Discord.

## Propwash updates

Race events come from mixins on Propwash internals, checked against 0.5.1 (see `BRIDGE.md` §5.4). After updating Propwash, look for Mixin errors mentioning `propwash-bridge` in the server log: the server still starts, but the affected events stop arriving.
