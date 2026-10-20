const { ChatInputCommandInteraction } = require("discord.js");
const DiscordBot = require("../../client/DiscordBot");
const ApplicationCommand = require("../../structure/ApplicationCommand");
const config = require("../../config");
const { notice } = require("../../utils/Notice");
const { TIMES, TYPES, isJobAdmin } = require("../../utils/Jobs");

const radio = (customId, labels) => ({
    type: 21,
    custom_id: customId,
    options: Object.entries(labels).map(([value, label]) => ({ value, label }))
});

module.exports = new ApplicationCommand({
    command: {
        name: 'job-application',
        description: 'Post a job offer in the job applications forum',
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
        if (!isJobAdmin(interaction.member)) {
            await interaction.reply(notice(config.emojis.no, 'You do not have permission to execute this command.'));

            return setTimeout(() => {
                interaction.deleteReply().catch(() => { });
            }, 2000);
        }

        await interaction.showModal({
            custom_id: 'job_create',
            title: 'New job offer',
            components: [{
                type: 18,
                label: 'ID',
                description: 'One word, used to name the applicant channels',
                component: { type: 4, custom_id: 'id', style: 1, min_length: 1, max_length: 20, placeholder: 'builder', required: true }
            }, {
                type: 18,
                label: 'Title',
                component: { type: 4, custom_id: 'title', style: 1, min_length: 1, max_length: 100, required: true }
            }, {
                type: 18,
                label: 'Description',
                component: { type: 4, custom_id: 'description', style: 2, min_length: 1, max_length: 3000, required: true }
            }, {
                type: 18,
                label: 'Time',
                component: radio('time', TIMES)
            }, {
                type: 18,
                label: 'Type',
                component: radio('type', TYPES)
            }]
        });
    }
}).toJSON();
