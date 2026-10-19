const { ChatInputCommandInteraction, MessageFlags, ApplicationCommandOptionType, ContainerBuilder, TextDisplayBuilder } = require("discord.js");
const DiscordBot = require("../../client/DiscordBot");
const ApplicationCommand = require("../../structure/ApplicationCommand");
const { canManageTicket } = require("../../utils/Tickets");

module.exports = new ApplicationCommand({
  command: {
    name: 'add-role',
    description: 'Add a role to the ticket',
    type: 1,
    options: [
      {
        name: 'role',
        description: 'Choose the role to add',
        type: ApplicationCommandOptionType.Role,
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

    const target = interaction.options.getRole('role');

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    await interaction.channel.permissionOverwrites.edit(target.id, {
      ViewChannel: true,
      SendMessages: true,
      ReadMessageHistory: true
    });
    await interaction.channel.send({
      flags: MessageFlags.IsComponentsV2,
      components: [new ContainerBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`The role <@&${target.id}> has been added to the ticket.`))]
    });
    interaction.deleteReply().catch(() => { });
  }
}).toJSON();
