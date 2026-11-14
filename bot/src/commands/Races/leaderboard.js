const { ChatInputCommandInteraction, ApplicationCommandOptionType, MessageFlags } = require("discord.js");
const DiscordBot = require("../../client/DiscordBot");
const ApplicationCommand = require("../../structure/ApplicationCommand");
const config = require("../../config");
const { notice } = require("../../utils/Notice");
const store = require("../../bridge/store");
const { buildLeaderboard, guildMembers } = require("../../bridge/render");

module.exports = new ApplicationCommand({
    command: {
        name: 'leaderboard',
        description: 'Best lap or race times of a course',
        type: 1,
        contexts: [0],
        options: [
            { name: 'course', description: 'The course', type: ApplicationCommandOptionType.String, required: true, autocomplete: true },
            { name: 'class', description: 'Only show this drone class', type: ApplicationCommandOptionType.String, autocomplete: true },
            { name: 'race', description: 'Race times over this many laps instead of lap times (all classes)', type: ApplicationCommandOptionType.Integer, autocomplete: true },
            { name: 'assisted', description: 'Times flown with assists (default: clean times)', type: ApplicationCommandOptionType.Boolean }
        ]
    },
    options: {
        cooldown: 60000
    },

    /**
     *
     * @param {DiscordBot} client
     * @param {ChatInputCommandInteraction} interaction
     */
    run: async (client, interaction) => {
        const course = store.courseByRef(interaction.options.getString('course'));
        if (!course) return interaction.reply(notice(config.emojis.no, 'Unknown course, pick one from the list.'));

        const board = await buildLeaderboard(guildMembers(interaction.guild), course, {
            frame: interaction.options.getString('class'),
            laps: interaction.options.getInteger('race'),
            assisted: interaction.options.getBoolean('assisted') ?? false
        });
        await interaction.reply({ ...board, flags: board.flags | MessageFlags.Ephemeral });
    }
}).toJSON();
