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
        message_commands: false, // If true, the bot will allow users to use message (or prefix) commands.
        application_commands: {
            chat_input: true, // If true, the bot will allow users to use chat input (or slash) commands.
            user_context: true, // If true, the bot will allow users to use user context menu commands.
            message_context: true // If true, the bot will allow users to use message context menu commands.
        }
    },
    faq: {
        channels: ['1552946336112836660'], // Channels where the bot auto-answers FAQ questions.
        adminRoles: ['1552947138693046312', '1560667470711365724', '1557121473263571004', '1561807668950073484'] // Roles allowed to enable/disable the FAQ auto-answer with /faq.
    },
    honeypot: {
        channel: '1559122979344875601', // Trap channel for spam bots. Anyone writing here is kicked or banned while /honeypot is on (staff roles are ignored).
        logChannel: '1557117981895696484' // Each kick or ban is logged here, mentioning the user. Leave it like this (or empty) to disable the log.
    },
    bridge: { // HTTP API the Minecraft bridge mod reports to: server status, race results, records and /leaderboard. Runs as its own process (src/bridge/index.js).
        host: '127.0.0.1', // The mods run on the same machine: keep the API off the network.
        port: 3006,
        databasePath: './bridge.db', // SQLite, shared by the bot and the API processes. Created on first start.
        servers: { // One entry per Minecraft server with the bridge mod; the key of each entry is the server id. Empty: BRIDGE_API_KEY is a single server.
            fpv: {
                name: 'FPV', // Shown in Discord when there is more than one server.
                keyEnv: 'BRIDGE_KEY_FPV', // .env variable holding this server's API key (openssl rand -hex 32).
                maps: { // Dimension -> display name for this server only, takes precedence over bridge.maps.
                    'maps:tutorial': 'Tutorial',
                    'maps:flowmap': 'Flowmap',
                    'maps:driftpark': 'Drift Arena',
                    'maps:motoarena': 'Moto Arena',
                    'maps:greenfield': 'Greenfield',
                    'maps:mattupolis': 'Mattupolis',
                    'maps:mosslorn': 'Mosslorn',
                    'maps:mountains': 'Mountain Range'
                }
            },
            plots: {
                name: 'Plots',
                keyEnv: 'BRIDGE_KEY_PLOTS',
                maps: { 'fabricplots:plots': 'Plots' }
            }
        },
        channels: {
            status: '1561056855013335240', // Fixed status message, edited in place. The channel is renamed 🟢│status / 🔴│status (any server online / all off): the bot needs Manage Channels.
            races: '1561057176959844514', // Race results.
            records: '1561057033321451713' // Course and class records.
        },
        maps: { // Dimension -> display name. Missing ones are derived from the id ("propwash:drone_arena" -> "Drone Arena").
            'minecraft:overworld': 'Overworld'
        },
        frames: {}, // Drone class -> display name, optional.
        statusPlayerNames: true, // Status message: true lists the players of each map, false only shows how many there are.
        raceLog: { includeSolo: false }, // Also post races with a single pilot.
        heartbeat: { offlineAfterSeconds: 90, statusEditSeconds: 60 },
        link: {
            codeTtlSeconds: 600,
            role: '1562157255816650802' // Role given by /link and removed by /unlink. The bot needs Manage Roles and its role must be above this one.
        }
    },
    supporter: { // Ko-fi donors: Ko-fi's Discord integration gives them this role; their linked Minecraft account (/link) gets this LuckPerms group, over RCON (RCON_PORT and RCON_PASSWORD in .env; without them, nothing happens).
        roleId: '1554403775022637077',
        group: 'supporter'
    },
    emojis: { // Custom emojis used in bot replies, format '<:name:id>' or '<a:name:id>' for animated ones.
        yes: '<:pw_yes:1561840403588841542>',
        no: '<:pw_no:1561840427680927834>',
        question: '<:pw_question:1561840456076107836>',
        slash: '<:pw_slash:1561840485587484672>',
        warning: '<:pw_warning:1561840504432492614>'
    },
    channels: { // Channels mentioned in the /message messages.
        rules: '1552712663858028725',
        tickets: '1561806216039108678',
        bugsAndIdeas: '1552946511896248390'
    },
    autoroles: { // Roles given by the buttons of the /message auto-roles message.
        notifications: { // A member can have several.
            updates: '1561828742513295523',
            raceEvents: '1561828764579799072',
            betaTesting: '1558145187287400581'
        },
        experience: { // Only one at a time: picking another one swaps it.
            realPilot: '1561833752253173810',
            simPilot: '1561833804912398416',
            newToFpv: '1561833861606809730'
        },
        loader: { // A member can have several.
            fabric: '1561833929835675778',
            neoforge: '1561833964501602316'
        }
    },
    suggestions: {
        channel: '1561837810116206624' // Suggestions are posted here. Any message not sent through /suggest is deleted.
    },
    tickets: {
        staffRoles: ['1552947138693046312', '1560667470711365724', '1557121473263571004', '1561807668950073484'], // Roles that can see every ticket and use the ticket commands.
        categories: { // Category where each ticket type is created.
            help: '1562434037417513064',
            bug: '1562434037417513064',
            report: '1562434037417513064'
        },
        closedCategory: '1562434168615608361', // Closed tickets are moved here.
        transcriptsChannel: '1562433621191696384' // Transcripts are sent here when a ticket is closed.
    },
    voice: {
        category: '1561838832645578843', // /vc creates the temporary voice channels here. Keep the category private: each channel lets @everyone view and join, so the category only shows while there are channels. The bot needs View Channel, Manage Channels and Move Members.
        deleteAfterMinutes: 3 // A temporary channel is deleted after being empty this long.
    },
    jobs: {
        adminRoles: ['1552947138693046312', '1560667470711365724', '1557121473263571004', '1561807668950073484'], // Roles that can use /job-application and see every applicant channel.
        forum: '1562434714625646652', // Job offers are posted here.
        category: '1562434470022488165', // "I'm interested" creates the applicant channel (<id>-<name>) here. Keep it private: only the applicant and adminRoles get access.
        tags: { // Forum tag IDs applied to each post: available_tags of GET /channels/<forum id>.
            time: { short: '1562434770661548032', long: '1562434902920532098', once: '1562434949389230133' },
            type: { moderation: '1562434983673602049', content: '1562435011636891701', builder: '1562435027495821352', other: '1562435038899863602' }
        }
    },
    playtest: {
        adminRoles: [], // Roles that can post new versions with /playtest (Tom and whoever else).
        testerRoles: ['1558145187287400581'], // Roles that can open feedback posts from a version post.
        versionsForum: '', // "playtest versions": one post per version, with the file and a feedback button. Deny Create Posts to everyone but the bot.
        feedbackForum: '' // "playtest feedback": posts created from the button, tagged with their version. Deny Create Posts, allow Send Messages in Posts to testers. The bot needs Manage Channels here to manage the tags.
    },
    users: {
        ownerId: '265862515420954625', // The bot owner ID, which is you.
        developers: ['265862515420954625', '355529049986301953', '214063863799349249', '742505697127694436'] // The bot developers, remember to include your account ID with the other account IDs.
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