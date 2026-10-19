const { ButtonInteraction, MessageFlags, TextDisplayBuilder, ContainerBuilder } = require("discord.js");
const DiscordBot = require("../../client/DiscordBot");
const Component = require("../../structure/Component");
const config = require("../../config");
const { access, isStaff, replyError } = require("../../utils/Tickets");

module.exports = new Component({
  customId: 'ticket_reopen',
  type: 'button',
  /**
   *
   * @param {DiscordBot} client
   * @param {ButtonInteraction} interaction
   */
  run: async (client, interaction) => {
    if (!isStaff(interaction.member)) return replyError(interaction, 'You do not have permission to execute this button.');

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const channel = interaction.channel;
    const [created] = client.database.get(`ticket.info.${channel.id}`);

    await channel.setName(channel.name.replace(/^⛔-closed-/, ''));
    await channel.setParent(created.category, { lockPermissions: true });
    for (const id of [created.createdBy, ...config.tickets.staffRoles]) {
      await channel.permissionOverwrites.edit(id, access);
    }

    await interaction.message.edit({
      flags: MessageFlags.IsComponentsV2,
      components: [new ContainerBuilder()
        .setAccentColor(0xe75b5b)
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`## ⛔  Ticket closed`))]
    });
    await channel.send({
      flags: MessageFlags.IsComponentsV2,
      components: [new ContainerBuilder()
        .setAccentColor(0x69e75b)
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`## 📂  Ticket reopened`))]
    });

    interaction.deleteReply().catch(() => { });
  }
}).toJSON();
