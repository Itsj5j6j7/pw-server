const config = {
    database: {
        path: './database.yml' // The database path.
    },
    development: {
        enabled: false, // If true, the bot will register all application commands to a specific guild (not globally).
        guildId: 'Your bot development guild ID',
    },
    commands: {
        prefix: '?', // For message commands, prefix is required. This can be changed by a database.
        message_commands: true, // If true, the bot will allow users to use message (or prefix) commands.
        application_commands: {
            chat_input: true, // If true, the bot will allow users to use chat input (or slash) commands.
            user_context: true, // If true, the bot will allow users to use user context menu commands.
            message_context: true // If true, the bot will allow users to use message context menu commands.
        }
    },
    faq: {
        channels: ['Channel ID'], // Channels where the bot auto-answers FAQ questions.
        adminRoles: ['Role ID'] // Roles allowed to enable/disable the FAQ auto-answer with /faq.
    },
    honeypot: {
        channel: 'Channel ID' // Trap channel for spam bots. Anyone writing here is kicked or banned while /honeypot is on (staff roles are ignored).
    },
    bridge: { // HTTP API the Minecraft bridge mod reports to: server status, race results, records and /leaderboard. Runs as its own process (src/bridge/index.js).
        host: '127.0.0.1', // The mods run on the same machine: keep the API off the network.
        port: 3006,
        databasePath: './bridge.db', // SQLite, shared by the bot and the API processes. Created on first start.
        servers: { // One entry per Minecraft server with the bridge mod; the key of each entry is the server id. Empty: BRIDGE_API_KEY is a single server.
            fpv: {
                name: 'FPV', // Shown in Discord when there is more than one server.
                keyEnv: 'BRIDGE_KEY_FPV', // .env variable holding this server's API key (openssl rand -hex 32).
                maps: {} // Dimension -> display name for this server only, takes precedence over bridge.maps.
            },
            plots: {
                name: 'Plots',
                keyEnv: 'BRIDGE_KEY_PLOTS',
                maps: { 'minecraft:overworld': 'Plots' }
            }
        },
        channels: {
            status: 'Channel ID', // Fixed status message, edited in place. The channel is renamed 🟢┃status / 🔴┃status (any server online / all off): the bot needs Manage Channels.
            races: 'Channel ID', // Race results.
            records: 'Channel ID' // Course and class records.
        },
        maps: { // Dimension -> display name. Missing ones are derived from the id ("propwash:drone_arena" -> "Drone Arena").
            'minecraft:overworld': 'Overworld'
        },
        frames: {}, // Drone class -> display name, optional.
        statusPlayerNames: true, // Status message: true lists the players of each map, false only shows how many there are.
        raceLog: { includeSolo: false }, // Also post races with a single pilot.
        heartbeat: { offlineAfterSeconds: 90, statusEditSeconds: 60 },
        link: { codeTtlSeconds: 600 }
    },
    emojis: { // Custom emojis used in bot replies, format '<:name:id>' or '<a:name:id>' for animated ones.
        yes: '<:pw_yes:1557747409369440416>',
        no: '<:pw_no:1557747437139918888>',
        question: '<:pw_question:1557747462041772192>',
        slash: '<:pw_slash:1557747481675042866>',
        warning: '<:pw_warning:1557747503552663693>'
    },
    channels: { // Channels mentioned in the /message messages.
        rules: 'Channel ID',
        tickets: 'Channel ID',
        bugsAndIdeas: 'Channel ID'
    },
    autoroles: { // Roles given by the buttons of the /message auto-roles message.
        notifications: { // A member can have several.
            updates: 'Role ID',
            raceEvents: 'Role ID',
            betaTesting: 'Role ID'
        },
        experience: { // Only one at a time: picking another one swaps it.
            realPilot: 'Role ID',
            simPilot: 'Role ID',
            newToFpv: 'Role ID'
        },
        loader: { // A member can have several.
            fabric: 'Role ID',
            neoforge: 'Role ID'
        }
    },
    suggestions: {
        channel: 'Channel ID' // Suggestions are posted here. Any message not sent through /suggest is deleted.
    },
    tickets: {
        staffRoles: ['Role ID'], // Roles that can see every ticket and use the ticket commands.
        categories: { // Category where each ticket type is created.
            help: 'Category ID',
            bug: 'Category ID',
            report: 'Category ID'
        },
        closedCategory: 'Category ID', // Closed tickets are moved here.
        transcriptsChannel: 'Channel ID' // Transcripts are sent here when a ticket is closed.
    },
    voice: {
        category: 'Category ID', // /vc creates the temporary voice channels here. Keep the category private: each channel lets @everyone view and join, so the category only shows while there are channels. The bot needs View Channel, Manage Channels and Move Members.
        deleteAfterMinutes: 5 // A temporary channel is deleted after being empty this long.
    },
    users: {
        ownerId: 'Your account ID', // The bot owner ID, which is you.
        developers: ['Your account ID', 'Another account ID'] // The bot developers, remember to include your account ID with the other account IDs.
    },
    messages: { // Messages configuration for application commands and message commands handler.
        NOT_BOT_OWNER: 'You do not have the permission to run this command because you\'re not the owner of me!',
        NOT_BOT_DEVELOPER: 'You do not have the permission to run this command because you\'re not a developer of me!',
        NOT_GUILD_OWNER: 'You do not have the permission to run this command because you\re not the guild owner!',
        CHANNEL_NOT_NSFW: 'You cannot run this command in a non-NSFW channel!',
        MISSING_PERMISSIONS: 'You do not have the permission to run this command, missing permissions.',
        COMPONENT_NOT_PUBLIC: 'You are not the author of this button!',
        GUILD_COOLDOWN: 'You are currently in cooldown, you have the ability to re-use this command again in \`%cooldown%s\`.'
    }
}

module.exports = config;