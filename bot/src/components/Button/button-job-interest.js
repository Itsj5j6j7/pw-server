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
    if (!client.database.get(`jobs.${interaction.channelId}`)) return replyError(interaction, 'This job offer no longer exists.');

    const channelId = client.database.get(`job-applications.${interaction.channelId}.${interaction.user.id}`);
    if (channelId && await interaction.guild.channels.fetch(channelId).catch(() => null)) {
      return replyError(interaction, `You already applied: <#${channelId}>`);
    }

    await interaction.showModal({
      custom_id: 'job_apply',
      title: 'Job application',
      components: [{
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
