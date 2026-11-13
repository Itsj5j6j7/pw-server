const { ChatInputCommandInteraction, ApplicationCommandOptionType } = require("discord.js");
const DiscordBot = require("../../client/DiscordBot");
const ApplicationCommand = require("../../structure/ApplicationCommand");
const config = require("../../config");
const { notice } = require("../../utils/Notice");
const { isStaff } = require("../../utils/Tickets");
const store = require("../../bridge/store");
const { courseTitle } = require("../../bridge/render");
const { setLinked } = require("../../utils/Linked");

const courseOption = { name: 'course', description: 'The course', type: ApplicationCommandOptionType.String, required: true, autocomplete: true };

module.exports = new ApplicationCommand({
    command: {
        name: 'racedata',
        description: 'Delete race data the bot keeps (leaderboards are reset in game)',
        type: 1,
        contexts: [0],
        options: [
            {
                name: 'delete-course',
                description: 'Remove a course from Discord (back when it changes in game or its server restarts)',
                type: ApplicationCommandOptionType.Subcommand,
                options: [courseOption]
            },
            {
                name: 'wipe',
                description: 'Delete every course and leaderboard (each server sends its courses again when it restarts)',
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
            const unlinked = links ? store.links() : [];
            const count = store.wipe(links);
            // After the reply (Discord waits only 3 s for it): the unlinked accounts lose propwash.linked.
            (async () => { for (const { uuid, mcName } of unlinked) await setLinked(uuid, mcName, false); })();
            return interaction.reply(notice(config.emojis.yes, `Deleted **${count}** course${count === 1 ? '' : 's'} and their leaderboards${links ? ' and every account link' : ''}.`));
        }

        const course = store.courseByRef(interaction.options.getString('course'));
        if (!course) return interaction.reply(notice(config.emojis.no, 'Unknown course, pick one from the list.'));

        store.removeCourse(course.server, course.id);
        await interaction.reply(notice(config.emojis.yes, `Deleted **${courseTitle(course)}** and its leaderboards.`));
    }
}).toJSON();
