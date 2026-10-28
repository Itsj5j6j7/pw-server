const { ModalSubmitInteraction, MessageFlags, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize } = require("discord.js");
const DiscordBot = require("../../client/DiscordBot");
const Component = require("../../structure/Component");
const config = require("../../config");
const { notice } = require("../../utils/Notice");

module.exports = new Component({
  customId: 'playtest_feedback',
  type: 'modal',
  /**
   *
   * @param {DiscordBot} client
   * @param {ModalSubmitInteraction} interaction
   */
  run: async (client, interaction) => {
    const playtest = client.database.get(`playtest.${interaction.channelId}`);
    if (!playtest) return interaction.reply(notice(config.emojis.no, 'This playtest version no longer exists.'));

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const separator = new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large);
    const forum = await client.channels.fetch(config.playtest.feedbackForum);
    const thread = await forum.threads.create({
      name: interaction.fields.getTextInputValue('title'),
      // The tag is gone once 20 newer versions pushed it out.
      appliedTags: forum.availableTags.some((tag) => tag.id === playtest.tagId) ? [playtest.tagId] : [],
      message: {
        flags: MessageFlags.IsComponentsV2,
        components: [new ContainerBuilder()
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(`## 📝 ${interaction.fields.getTextInputValue('title')}`))
          .addSeparatorComponents(separator)
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(interaction.fields.getTextInputValue('feedback')))
          .addSeparatorComponents(separator)
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(`-# 🧪 <#${interaction.channelId}>  ·  👤 <@${interaction.user.id}>`))],
        allowedMentions: { parse: [] }
      }
    });

    await interaction.editReply(notice(config.emojis.yes, `Feedback post created: <#${thread.id}>`));
  }
}).toJSON();
