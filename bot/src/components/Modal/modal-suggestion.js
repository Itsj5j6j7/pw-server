const { ModalSubmitInteraction, MessageFlags } = require("discord.js");
const DiscordBot = require("../../client/DiscordBot");
const Component = require("../../structure/Component");
const config = require("../../config");
const { notice } = require("../../utils/Notice");
const { buildSuggestion, refreshSticky } = require("../../utils/Suggestions");

module.exports = new Component({
  customId: 'suggestion',
  type: 'modal',
  /**
   *
   * @param {DiscordBot} client
   * @param {ModalSubmitInteraction} interaction
   */
  run: async (client, interaction) => {
    const channel = await client.channels.fetch(config.suggestions.channel);

    const suggestion = {
      title: interaction.fields.getTextInputValue('title'),
      description: interaction.fields.getTextInputValue('description'),
      userId: interaction.user.id
    };

    const message = await channel.send({
      flags: MessageFlags.IsComponentsV2,
      components: [buildSuggestion(suggestion)],
      allowedMentions: { parse: [] }
    });

    await message.react(config.emojis.yes);
    await message.react(config.emojis.no);

    client.database.set(`suggestions.${message.id}`, suggestion);

    await refreshSticky(client, channel);

    await interaction.reply(notice(config.emojis.yes, 'Suggestion sent.'));

    setTimeout(() => {
      interaction.deleteReply().catch(() => { });
    }, 2000);
  }
}).toJSON();
