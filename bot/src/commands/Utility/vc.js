const { ChatInputCommandInteraction, ApplicationCommandOptionType } = require("discord.js");
const DiscordBot = require("../../client/DiscordBot");
const ApplicationCommand = require("../../structure/ApplicationCommand");
const { open } = require("../../utils/Voice");

module.exports = new ApplicationCommand({
    command: {
        name: 'vc',
        description: 'Create a temporary voice channel',
        type: 1,
        contexts: [0],
        options: [
            {
                name: 'limit',
                description: 'Maximum number of people in the channel (no limit by default)',
                type: ApplicationCommandOptionType.Integer,
                min_value: 1,
                max_value: 99,
                required: false
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
        await open(client, interaction, interaction.options.getInteger('limit') ?? 0);
    }
}).toJSON();
