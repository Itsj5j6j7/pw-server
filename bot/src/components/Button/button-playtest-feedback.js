const { ButtonInteraction } = require("discord.js");
const DiscordBot = require("../../client/DiscordBot");
const Component = require("../../structure/Component");
const config = require("../../config");
const { replyError } = require("../../utils/Tickets");

// The button lives in the version post, so the post id is the version key.
module.exports = new Component({
  customId: 'playtest_feedback',
  type: 'button',
  /**
   *
   * @param {DiscordBot} client
   * @param {ButtonInteraction} interaction
   */
  run: async (client, interaction) => {
    if (![...config.playtest.testerRoles, ...config.playtest.adminRoles].some((roleId) => interaction.member.roles.cache.has(roleId))) {
      return replyError(interaction, 'Only playtesters can give feedback.');
    }

    const playtest = client.database.get(`playtest.${interaction.channelId}`);
    if (!playtest) return replyError(interaction, 'This playtest version no longer exists.');

    await interaction.showModal({
      custom_id: 'playtest_feedback',
      title: `Feedback for ${playtest.version}`,
      components: [{
        type: 18,
        label: 'Title',
        description: 'One post per topic: open another one for something else',
        component: { type: 4, custom_id: 'title', style: 1, min_length: 1, max_length: 100, required: true }
      }, {
        type: 18,
        label: 'Feedback',
        description: 'Bug, comment or idea. You can add screenshots in the post',
        component: { type: 4, custom_id: 'feedback', style: 2, min_length: 1, max_length: 3000, required: true }
      }]
    });
  }
}).toJSON();
