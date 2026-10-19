const { ChatInputCommandInteraction, ApplicationCommandOptionType, escapeMarkdown } = require("discord.js");
const DiscordBot = require("../../client/DiscordBot");
const ApplicationCommand = require("../../structure/ApplicationCommand");
const config = require("../../config");
const { notice } = require("../../utils/Notice");
const { isStaff } = require("../../utils/Tickets");
const store = require("../../bridge/store");
const { courseTitle } = require("../../bridge/render");

const courseOption = { name: 'course', description: 'The course', type: ApplicationCommandOptionType.String, required: true, autocomplete: true };

module.exports = new ApplicationCommand({
    command: {
        name: 'racedata',
        description: 'Delete race data received from the Minecraft server',
        type: 1,
        contexts: [0],
        options: [
            {
                name: 'reset-leaderboard',
                description: 'Clear the current leaderboard of a course, or only one player\'s times',
                type: ApplicationCommandOptionType.Subcommand,
                options: [courseOption, { name: 'player', description: 'Minecraft name: only clear this player\'s times', type: ApplicationCommandOptionType.String, max_length: 16 }]
            },
            {
                name: 'delete-course',
                description: 'Delete a course and all its leaderboards',
                type: ApplicationCommandOptionType.Subcommand,
                options: [courseOption]
            },
            {
                name: 'wipe',
                description: 'Delete every course and leaderboard',
                type: ApplicationCommandOptionType.Subcommand,
                options: [
                    { name: 'confirm', description: 'This cannot be undone', type: ApplicationCommandOptionType.Boolean, required: true },
                    { name: 'links', description: 'Also delete the Discord <-> Minecraft account links (default: no)', type: ApplicationCommandOptionType.Boolean }
                ]
            }
        ]
    },
    options: {
        cooldown: 5000
    },

    /**
     *
     * @param {DiscordBot} client
     * @param {ChatInputCommandInteraction} interaction
     */
    run: async (client, interaction) => {
        if (!isStaff(interaction.member)) {
            await interaction.reply(notice(config.emojis.no, 'You do not have permission to execute this command.'));

            return setTimeout(() => {
                interaction.deleteReply().catch(() => { });
            }, 2000);
        }

        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'wipe') {
            if (!interaction.options.getBoolean('confirm')) return interaction.reply(notice(config.emojis.no, 'Nothing was deleted: set `confirm` to `True` to wipe the race data.'));

            const links = interaction.options.getBoolean('links') ?? false;
            const count = store.wipe(links);
            return interaction.reply(notice(config.emojis.yes, `Deleted **${count}** course${count === 1 ? '' : 's'} and their leaderboards${links ? ' and every account link' : ''}.`));
        }

        const course = store.courseByRef(interaction.options.getString('course'));
        if (!course) return interaction.reply(notice(config.emojis.no, 'Unknown course, pick one from the list.'));

        if (subcommand === 'delete-course') {
            store.removeCourse(course.server, course.id);
            return interaction.reply(notice(config.emojis.yes, `Deleted **${courseTitle(course)}** and its leaderboards.`));
        }

        const player = interaction.options.getString('player');
        store.resetBoard(course.server, course.id, player);
        await interaction.reply(notice(config.emojis.yes, player
            ? `Cleared **${escapeMarkdown(player)}**'s times on **${courseTitle(course)}**.`
            : `Cleared the leaderboard of **${courseTitle(course)}**.`));
    }
}).toJSON();
