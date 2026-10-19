const { ButtonInteraction, MessageFlags } = require("discord.js");
const DiscordBot = require("../../client/DiscordBot");
const Component = require("../../structure/Component");
const { isStaff, replyError } = require("../../utils/Tickets");

module.exports = new Component({
  customId: 'ticket_delete',
  type: 'button',
  /**
   *
   * @param {DiscordBot} client
   * @param {ButtonInteraction} interaction
   */
  run: async (client, interaction) => {
    if (!isStaff(interaction.member)) return replyError(interaction, 'You do not have permission to execute this button.');

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    client.database.delete(`ticket.info.${interaction.channel.id}`);
    client.database.delete(`transcript.${interaction.channel.id}`);
    await interaction.channel.delete();
  }
}).toJSON();
