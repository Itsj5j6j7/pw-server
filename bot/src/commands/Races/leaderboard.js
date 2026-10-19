const { ChatInputCommandInteraction, ApplicationCommandOptionType } = require("discord.js");
const DiscordBot = require("../../client/DiscordBot");
const ApplicationCommand = require("../../structure/ApplicationCommand");
const config = require("../../config");
const { notice } = require("../../utils/Notice");
const store = require("../../bridge/store");
const { buildLeaderboard, guildMembers } = require("../../bridge/render");

module.exports = new ApplicationCommand({
    command: {
        name: 'leaderboard',
        description: 'Best lap times of a course',
        type: 1,
        contexts: [0],
        options: [
            { name: 'course', description: 'The course', type: ApplicationCommandOptionType.String, required: true, autocomplete: true },
            { name: 'class', description: 'Only show this drone class', type: ApplicationCommandOptionType.String, autocomplete: true }
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
        const course = store.courseByRef(interaction.options.getString('course'));
        if (!course) return interaction.reply(notice(config.emojis.no, 'Unknown course, pick one from the list.'));

        await interaction.reply(await buildLeaderboard(guildMembers(interaction.guild), course, interaction.options.getString('class')));
    }
}).toJSON();
