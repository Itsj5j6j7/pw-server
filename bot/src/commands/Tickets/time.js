const { ChatInputCommandInteraction, MessageFlags, ApplicationCommandOptionType, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize } = require("discord.js");
const DiscordBot = require("../../client/DiscordBot");
const ApplicationCommand = require("../../structure/ApplicationCommand");
const { canManageTicket } = require("../../utils/Tickets");

module.exports = new ApplicationCommand({
  command: {
    name: 'time',
    description: 'Tell the user how much time they have to reply to the ticket',
    type: 1,
    options: [
      {
        name: 'user',
        description: 'Choose the user to notify',
        type: ApplicationCommandOptionType.User,
        required: true,
      },
      {
        name: 'time',
        description: 'Specify the time',
        type: ApplicationCommandOptionType.String,
        required: true,
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
    const time = interaction.options.getString('time');
    const separator2 = new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large);

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const container = new ContainerBuilder()
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(`## 🕒  <@${user.id}>`))
      .addSeparatorComponents(separator2)
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(`If no response is received within **${time}**, this ticket will be closed.`));

    await interaction.channel.send({
      flags: MessageFlags.IsComponentsV2,
      components: [container]
    });
    interaction.deleteReply().catch(() => { });
  }
}).toJSON();
