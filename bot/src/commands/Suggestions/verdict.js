const { ChatInputCommandInteraction, ApplicationCommandOptionType, MessageFlags } = require("discord.js");
const DiscordBot = require("../../client/DiscordBot");
const ApplicationCommand = require("../../structure/ApplicationCommand");
const config = require("../../config");
const { notice } = require("../../utils/Notice");
const { isStaff, replyError } = require("../../utils/Tickets");
const { buildSuggestion } = require("../../utils/Suggestions");

module.exports = new ApplicationCommand({
  command: {
    name: 'verdict',
    description: 'Approve or reject a suggestion',
    type: 1,
    options: [
      {
        name: 'suggestion_id',
        description: 'Message ID of the suggestion',
        type: ApplicationCommandOptionType.String,
        required: true
      },
      {
        name: 'verdict',
        description: 'Approve or reject',
        type: ApplicationCommandOptionType.String,
        required: true,
        choices: [
          { name: '👍 Approve', value: 'approve' },
          { name: '👎 Reject', value: 'reject' }
        ]
      }
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
    if (!isStaff(interaction.member)) return replyError(interaction, 'You do not have permission to execute this command.');

    const id = interaction.options.getString('suggestion_id');
    const verdict = interaction.options.getString('verdict');
    const suggestion = client.database.get(`suggestions.${id}`);

    const channel = await client.channels.fetch(config.suggestions.channel);
    const message = suggestion && await channel.messages.fetch(id).catch(() => null);

    if (!message) return replyError(interaction, 'Could not find the suggestion.');

    await message.edit({
      flags: MessageFlags.IsComponentsV2,
      components: [buildSuggestion(suggestion, verdict)],
      allowedMentions: { parse: [] }
    });

    await interaction.reply(notice(config.emojis.yes, `Suggestion ${verdict === 'approve' ? 'approved' : 'rejected'}.`));
  }
}).toJSON();
