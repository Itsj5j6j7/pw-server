const { MessageFlags, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, escapeMarkdown } = require('discord.js');
const config = require('../config');
const store = require('./store');
const servers = require('./servers');

// propwashfpv.com palette.
const COLORS = { accent: 0xffbb00, online: 0x5bc85b, offline: 0xf2665e };
const MEDALS = ['🥇', '🥈', '🥉'];
const LOADERS = { fabric: 'Fabric', neoforge: 'NeoForge' };

const payload = (container) => ({ flags: MessageFlags.IsComponentsV2, components: [container], allowedMentions: { parse: [] } });
const text = (content) => new TextDisplayBuilder().setContent(content);

// 47900000000 -> "47.900", 143200000000 -> "2:23.200"
const formatTime = (nanos) => {
    const ms = Math.round(nanos / 1e6);
    const minutes = Math.floor(ms / 60000);
    const seconds = ((ms % 60000) / 1000).toFixed(3);
    return minutes ? `${minutes}:${seconds.padStart(6, '0')}` : seconds;
};

const formatDuration = (totalSeconds) => {
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor(totalSeconds % 86400 / 3600);
    const minutes = Math.floor(totalSeconds % 3600 / 60);
    return days ? `${days}d ${hours}h` : hours ? `${hours}h ${minutes}m` : `${minutes}m`;
};

// "propwash:drone_arena" -> "Drone Arena" unless the server's maps or config.bridge.maps name it.
const mapName = (dimension, server) => servers.get(server)?.maps[dimension] ?? config.bridge.maps[dimension]
    ?? dimension.split(':').pop().split(/[_\-/]/).filter(Boolean).map((word) => word[0].toUpperCase() + word.slice(1)).join(' ');

const frameName = (frame) => frame ? escapeMarkdown(config.bridge.frames[frame] ?? frame) : null;
const courseName = (course) => course.name ? escapeMarkdown(course.name) : `Course #${course.number}`;
const plural = (count, word) => `${count} ${word}${count === 1 ? '' : 's'}`;
// "FPV · Drone Arena" with several servers, "Drone Arena" with one.
const courseTitle = (course) => (servers.multi ? `${escapeMarkdown(servers.get(course.server)?.name ?? course.server)} · ` : '') + courseName(course);

// isMember(discordId) -> Promise<boolean>, so this works with a guild (bot) and with the REST API (bridge API).
const guildMembers = (guild) => (id) => guild.members.fetch(id).then(() => true, () => false);

// Mention (shown, never pinged) when the player is linked and still in the server.
const displayPlayer = async (isMember, { uuid, name }) => {
    const link = store.getLink(uuid);
    if (link && await isMember(link.discordId)) return `<@${link.discordId}>`;
    return escapeMarkdown(name);
};

// One block per server: [{ server, online, since, heartbeat, info }]. heartbeat.players is already deduplicated across servers.
const buildStatus = async (isMember, states) => {
    const showNames = config.bridge.statusPlayerNames !== false;
    const anyOnline = states.some((state) => state.online);
    const container = new ContainerBuilder().setAccentColor(anyOnline ? COLORS.online : COLORS.offline);

    if (servers.multi) {
        const total = states.reduce((sum, state) => sum + (state.online && state.heartbeat ? state.heartbeat.players.length : 0), 0);
        container.addTextDisplayComponents(text(`## 👥  ${total} pilot${total === 1 ? '' : 's'} online`));
    }

    for (const [i, { server, online, since, heartbeat, info }] of states.entries()) {
        if (servers.multi || i) container.addSeparatorComponents(new SeparatorBuilder());

        const name = servers.multi ? escapeMarkdown(server.name) : 'Server';
        container.addTextDisplayComponents(
            text(`${servers.multi ? '###' : '##'} ${online ? '🟢' : '🔴'}  ${name} ${online ? 'online' : 'offline'}`),
            text(`-# Since <t:${Math.floor(since / 1000)}:R>`)
        );

        if (!online || !heartbeat) continue;

        const maps = new Map();
        for (const player of heartbeat.players) {
            if (!maps.has(player.dimension)) maps.set(player.dimension, []);
            maps.get(player.dimension).push(showNames ? await displayPlayer(isMember, player) : null);
        }

        const lines = [...maps].sort((a, b) => b[1].length - a[1].length)
            .map(([dimension, names]) => `**${escapeMarkdown(mapName(dimension, server.id))}** · ${names.length}${showNames ? `\n> ${names.join(', ')}` : ''}`);

        const version = { ...info, ...heartbeat };
        const footer = [
            heartbeat.tps !== undefined && `TPS ${heartbeat.tps.toFixed(1)}`,
            heartbeat.uptimeSeconds !== undefined && `Uptime ${formatDuration(heartbeat.uptimeSeconds)}`,
            version.mcVersion && `Minecraft ${version.mcVersion}`,
            version.loader && (LOADERS[version.loader] ?? version.loader),
            version.propwashVersion && `Propwash ${version.propwashVersion}`
        ].filter(Boolean).map(escapeMarkdown).join(' · ');

        container.addTextDisplayComponents(text(`👥  **${heartbeat.players.length}/${heartbeat.maxPlayers}** pilots online`));
        if (lines.length) container.addTextDisplayComponents(text(lines.join('\n')));
        if (footer) container.addTextDisplayComponents(text(`-# ${footer}`));
    }

    return payload(container);
};

const buildRaceResult = async (isMember, { course, results }) => {
    const lines = await Promise.all(results.map(async (result) => {
        const place = result.place ? MEDALS[result.place - 1] ?? `**${result.place}.**` : '❌';
        const parts = [
            `${place} ${await displayPlayer(isMember, result.player)}`,
            result.status === 'finished' ? `\`${formatTime(result.totalNanos)}\`` : '**DNF**'
        ];
        if (result.bestLapNanos) parts.push(`best lap \`${formatTime(result.bestLapNanos)}\``);
        if (result.frame) parts.push(frameName(result.frame));
        if (result.assisted) parts.push('⚠️ assisted');
        return parts.join(' · ');
    }));

    const laps = results[0].laps ?? (course.laps > 0 ? course.laps : 0);
    const details = [mapName(course.dimension, course.server), laps && plural(laps, 'lap'), plural(results.length, 'pilot')];

    return payload(new ContainerBuilder()
        .setAccentColor(COLORS.accent)
        .addTextDisplayComponents(
            text(`### 🏁  Race results · ${courseTitle(course)}`),
            text(`-# ${details.filter(Boolean).map(escapeMarkdown).join(' · ')}`)
        )
        .addSeparatorComponents(new SeparatorBuilder())
        .addTextDisplayComponents(text(lines.join('\n'))));
};

const RECORD_TITLES = { course: '🏆  New course record', class: '🏁  New class record', race: '🏆  New race record' };

// previous: the board entry that held the record, if the bot had that board.
const buildRecord = async (isMember, { course, scope, player, frame, nanos, laps, previous }) => {
    const details = [
        escapeMarkdown(mapName(course.dimension, course.server)),
        scope === 'class' && frameName(frame) && `class ${frameName(frame)}`,
        scope === 'race' && plural(laps, 'lap')
    ];
    const feat = scope === 'race' ? `finished ${plural(laps, 'lap')} in **${formatTime(nanos)}**` : `flew a **${formatTime(nanos)}** lap`;

    const container = new ContainerBuilder()
        .setAccentColor(COLORS.accent)
        .addTextDisplayComponents(
            text(`### ${RECORD_TITLES[scope]} · ${courseTitle(course)}`),
            text(`-# ${details.filter(Boolean).join(' · ')}`)
        )
        .addSeparatorComponents(new SeparatorBuilder())
        .addTextDisplayComponents(text(`${await displayPlayer(isMember, player)} ${feat}`));

    if (previous) {
        container.addTextDisplayComponents(text(`-# Previous: ${await displayPlayer(isMember, previous.player)} · ${formatTime(previous.nanos)} (−${formatTime(previous.nanos - nanos)})`));
    }

    return payload(container);
};

// Propwash's board for the course: laps (one class or all) or races of a given length, clean or assisted times.
const buildLeaderboard = async (isMember, course, { frame = null, laps = null, assisted = false } = {}) => {
    const board = store.board(course, { kind: laps ? 'race' : 'lap', category: assisted ? 'assisted' : 'clean', frame: laps ? null : frame, laps });
    const entries = board?.entries ?? [];
    const lines = await Promise.all(entries.map(async (entry) => [
        `${MEDALS[entry.rank - 1] ?? `**${entry.rank}.**`} ${await displayPlayer(isMember, entry.player)}`,
        `\`${formatTime(entry.nanos)}\``,
        frameName(entry.frame),
        entry.assist.length && `⚠️ ${escapeMarkdown(entry.assist.join(', '))}`,
        entry.otherRules && '⚙️',
        entry.date && `<t:${Math.floor(entry.date / 1000)}:d>`
    ].filter(Boolean).join(' · ')));

    const details = [
        escapeMarkdown(mapName(course.dimension, course.server)),
        course.owner_name && `by ${escapeMarkdown(course.owner_name)}`,
        `Layout ${course.layout}`,
        laps ? `Race · ${plural(laps, 'lap')}` : frame ? `Class ${frameName(frame)}` : 'All classes',
        assisted && 'Assisted'
    ];
    const container = new ContainerBuilder()
        .setAccentColor(COLORS.accent)
        .addTextDisplayComponents(
            text(`### 🏆  Leaderboard · ${courseTitle(course)}`),
            text(`-# ${details.filter(Boolean).join(' · ')}`)
        )
        .addSeparatorComponents(new SeparatorBuilder())
        .addTextDisplayComponents(text(lines.join('\n') || (laps ? 'No race times yet. Go race!' : 'No lap times yet. Go fly!')));
    const footer = [
        board && board.total > entries.length && `Top ${entries.length} of ${plural(board.total, 'pilot')}`,
        entries.some((entry) => entry.otherRules) && '⚙️ flown under different server rules'
    ].filter(Boolean).join(' · ');
    if (footer) container.addTextDisplayComponents(text(`-# ${footer}`));
    return payload(container);
};

module.exports = { formatTime, mapName, frameName, courseName, courseTitle, guildMembers, buildStatus, buildRaceResult, buildRecord, buildLeaderboard };
