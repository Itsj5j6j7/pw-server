const { ChatInputCommandInteraction } = require("discord.js");
const DiscordBot = require("../../client/DiscordBot");
const ApplicationCommand = require("../../structure/ApplicationCommand");
const config = require("../../config");
const { notice } = require("../../utils/Notice");
const { replyError } = require("../../utils/Tickets");
const { isJobAdmin, applicantOf } = require("../../utils/Jobs");

module.exports = new ApplicationCommand({
    command: {
        name: 'archive',
        description: 'Archive this job application: move it to the archive and remove the applicant\'s access',
        type: 1,
        contexts: [0]
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

        await interaction.deferReply();
        await interaction.channel.permissionOverwrites.delete(userId);
        await interaction.channel.setParent(config.jobs.archivedCategory, { lockPermissions: false });
        await interaction.editReply(notice(config.emojis.yes, 'Application archived.'));
    }
}).toJSON();
