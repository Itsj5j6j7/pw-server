const { ChatInputCommandInteraction } = require("discord.js");
const DiscordBot = require("../../client/DiscordBot");
const ApplicationCommand = require("../../structure/ApplicationCommand");
const config = require("../../config");
const { notice } = require("../../utils/Notice");
const { replyError, access } = require("../../utils/Tickets");
const { isJobAdmin, applicantOf } = require("../../utils/Jobs");

module.exports = new ApplicationCommand({
    command: {
        name: 'unarchive',
        description: 'Unarchive this job application: move it back and give the applicant access again',
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

        const userId = interaction.channel.parentId === config.jobs.archivedCategory && applicantOf(client, interaction.channelId);
        if (!userId) return replyError(interaction, 'Use this command in an archived job application channel.');

        await interaction.deferReply();
        await interaction.channel.setParent(config.jobs.category, { lockPermissions: false });
        await interaction.channel.permissionOverwrites.edit(userId, access);
        await interaction.editReply(notice(config.emojis.yes, 'Application unarchived.'));
    }
}).toJSON();
