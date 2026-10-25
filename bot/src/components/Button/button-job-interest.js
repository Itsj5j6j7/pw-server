const { ButtonInteraction } = require("discord.js");
const DiscordBot = require("../../client/DiscordBot");
const Component = require("../../structure/Component");
const config = require("../../config");
const { replyError } = require("../../utils/Tickets");
const { RULES } = require("../../utils/Jobs");

// The button lives in the forum post, so the post id is the job key.
module.exports = new Component({
  customId: 'job_interest',
  type: 'button',
  /**
   *
   * @param {DiscordBot} client
   * @param {ButtonInteraction} interaction
   */
  run: async (client, interaction) => {
    const job = client.database.get(`jobs.${interaction.channelId}`);
    if (!job) return replyError(interaction, 'This job offer no longer exists.');

    const channelId = client.database.get(`job-applications.${interaction.channelId}.${interaction.user.id}`);
    if (channelId && await interaction.guild.channels.fetch(channelId).catch(() => null)) {
      return replyError(interaction, `You already applied: <#${channelId}>`);
    }

    await interaction.showModal({
      custom_id: 'job_apply',
      title: 'Job application',
      // A label holds 45 characters; longer questions go in the description.
      components: [...(job.questions ?? []).map((question, i) => ({
        type: 18,
        ...(question.length <= 45 ? { label: question } : { label: `Question ${i + 1}`, description: question }),
        component: { type: 4, custom_id: `q${i}`, style: 2, max_length: 1000, required: true }
      })), {
        type: 10,
        content: RULES
      }, {
        type: 18,
        label: 'Rules',
        component: { type: 22, custom_id: 'rules', options: [{ value: 'accept', label: 'I have read and accept the rules' }] }
      }]
    });
  }
}).toJSON();
