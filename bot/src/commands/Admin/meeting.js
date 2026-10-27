const { ChatInputCommandInteraction, ApplicationCommandOptionType } = require("discord.js");
const DiscordBot = require("../../client/DiscordBot");
const ApplicationCommand = require("../../structure/ApplicationCommand");
const config = require("../../config");
const { notice } = require("../../utils/Notice");
const { replyError } = require("../../utils/Tickets");
const { isJobAdmin, applicantOf, getMeetings, scheduleMeeting, announce } = require("../../utils/Jobs");

const timestampOption = {
    name: 'timestamp',
    description: 'Unix timestamp in seconds, e.g. 1767225600 or <t:1767225600:F>',
    type: ApplicationCommandOptionType.String,
    required: true
};

module.exports = new ApplicationCommand({
    command: {
        name: 'meeting',
        description: 'Manage voice meetings with job applicants',
        type: 1,
        contexts: [0],
        options: [
            { name: 'schedule', description: 'Schedule a meeting with the applicant of this job application', type: ApplicationCommandOptionType.Subcommand, options: [timestampOption] },
            { name: 'edit', description: 'Change when the meeting of this job application is held', type: ApplicationCommandOptionType.Subcommand, options: [timestampOption] },
            { name: 'list', description: 'List the pending meetings', type: ApplicationCommandOptionType.Subcommand }
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
        if (!isJobAdmin(interaction.member)) return replyError(interaction, 'You do not have permission to execute this command.');

        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'list') {
            const lines = Object.entries(getMeetings(client))
                .sort(([, a], [, b]) => a.at - b.at)
                .map(([channelId, { at, userId }]) => `- <#${channelId}> · <@${userId}> · <t:${at}:F> (<t:${at}:R>)`);
            return interaction.reply(notice('📅', lines.length ? `Pending meetings:\n${lines.join('\n')}` : 'There are no pending meetings.'));
        }

        const userId = interaction.channel.parentId === config.jobs.category && applicantOf(client, interaction.channelId);
        if (!userId) return replyError(interaction, 'Use this command in a job application channel.');

        const at = Number(interaction.options.getString('timestamp', true).match(/\d+/)?.[0]);
        if (!(at * 1000 > Date.now())) return replyError(interaction, 'The timestamp must be a future Unix timestamp in seconds.');

        if (subcommand === 'edit') {
            const meeting = getMeetings(client)[interaction.channelId];
            if (!meeting) return replyError(interaction, 'There is no pending meeting in this channel. Use `/meeting schedule` instead.');

            scheduleMeeting(client, interaction.channelId, { ...meeting, at });
            await announce(interaction.channel, `✏️ The meeting has been rescheduled to <t:${at}:F> (<t:${at}:R>).`);
            return interaction.reply(notice(config.emojis.yes, 'Meeting rescheduled.'));
        }

        scheduleMeeting(client, interaction.channelId, { at, userId });
        await announce(interaction.channel, `📅 A meeting will be held on <t:${at}:F> (<t:${at}:R>). A voice channel will be created here 15 minutes before.`);
        await interaction.reply(notice(config.emojis.yes, 'Meeting scheduled.'));
    }
}).toJSON();
