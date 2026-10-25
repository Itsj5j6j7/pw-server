const { ChatInputCommandInteraction, ApplicationCommandOptionType, MessageFlags, ContainerBuilder, TextDisplayBuilder } = require("discord.js");
const DiscordBot = require("../../client/DiscordBot");
const ApplicationCommand = require("../../structure/ApplicationCommand");
const config = require("../../config");
const { notice } = require("../../utils/Notice");
const { replyError } = require("../../utils/Tickets");
const { isJobAdmin, applicantOf } = require("../../utils/Jobs");

module.exports = new ApplicationCommand({
    command: {
        name: 'meeting',
        description: 'Schedule a voice meeting with the applicant of this job application',
        type: 1,
        contexts: [0],
        options: [{
            name: 'timestamp',
            description: 'Unix timestamp in seconds, e.g. 1767225600 or <t:1767225600:F>',
            type: ApplicationCommandOptionType.String,
            required: true
        }]
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
        if (!isJobAdmin(interaction.member)) return replyError(interaction, 'You do not have permission to execute this command.');

        const userId = interaction.channel.parentId === config.jobs.category && applicantOf(client, interaction.channelId);
        if (!userId) return replyError(interaction, 'Use this command in a job application channel.');

        const at = Number(interaction.options.getString('timestamp', true).match(/\d+/)?.[0]);
        if (!(at * 1000 > Date.now())) return replyError(interaction, 'The timestamp must be a future Unix timestamp in seconds.');

        client.database.set(`job-meetings.${interaction.channelId}`, { at, userId });

        await interaction.channel.send({
            flags: MessageFlags.IsComponentsV2,
            components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`📅 A meeting will be held on <t:${at}:F> (<t:${at}:R>). A voice channel will be created here at that time.`))]
        });

        await interaction.reply(notice(config.emojis.yes, 'Meeting scheduled.'));
    }
}).toJSON();
