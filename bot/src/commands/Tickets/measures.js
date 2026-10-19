const { ChatInputCommandInteraction, MessageFlags, ApplicationCommandOptionType, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize } = require("discord.js");
const DiscordBot = require("../../client/DiscordBot");
const ApplicationCommand = require("../../structure/ApplicationCommand");
const config = require("../../config");
const { canManageTicket } = require("../../utils/Tickets");

const measures = {
  yes: `${config.emojis.yes} | After reviewing all the data, the appropriate measures have been taken.\nConfirm you've read this to close the ticket.`,
  no: `${config.emojis.no} | After reviewing the data, it has been decided not to take any measures.\nConfirm you've read this to close the ticket.`
};
const color = {
  yes: 0x69e75b,
  no: 0xe75b5b
};

module.exports = new ApplicationCommand({
  command: {
    name: 'measures',
    description: 'Tell the user whether measures have been taken on their report',
    type: 1,
    options: [
      {
        name: 'user',
        description: 'Choose the user to notify',
        type: ApplicationCommandOptionType.User,
        required: true,
      },
      {
        name: 'option',
        description: 'Have measures been taken?',
        type: ApplicationCommandOptionType.String,
        required: true,
        choices: [
          { name: 'Yes', value: 'yes' },
          { name: 'No', value: 'no' }
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
    if (!await canManageTicket(interaction)) return;

    const user = interaction.options.getUser('user');
    const option = interaction.options.getString('option');
    const separator2 = new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large);

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const container = new ContainerBuilder()
      .setAccentColor(color[option])
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(`## 🛠️  <@${user.id}>`))
      .addSeparatorComponents(separator2)
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(measures[option]));

    await interaction.channel.send({
      flags: MessageFlags.IsComponentsV2,
      components: [container]
    });
    interaction.deleteReply().catch(() => { });
  }
}).toJSON();
