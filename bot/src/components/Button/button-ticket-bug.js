const { ButtonInteraction, TextDisplayBuilder, ContainerBuilder, SeparatorBuilder, SeparatorSpacingSize } = require("discord.js");
const DiscordBot = require("../../client/DiscordBot");
const Component = require("../../structure/Component");
const { openTicket } = require("../../utils/Tickets");

module.exports = new Component({
  customId: 'ticket_bug',
  type: 'button',
  /**
   *
   * @param {DiscordBot} client
   * @param {ButtonInteraction} interaction
   */
  run: async (client, interaction) => {
    const separator2 = new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large);

    const container = new ContainerBuilder()
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(`## 🐛  Thanks for the report, <@${interaction.user.id}>!`))
      .addSeparatorComponents(separator2)
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(`
To track the bug down we need:

> 1️⃣ What happened and what you expected to happen.
> 2️⃣ Steps to reproduce it, if you can.
> 3️⃣ Your Minecraft version, loader (Fabric/NeoForge) and its version, and Propwash version.
> 4️⃣ The other mods you have installed.
> 5️⃣ Your log: \`.minecraft/logs/latest.log\`, or the file in \`.minecraft/crash-reports/\` if the game crashed.
> 6️⃣ Your controller or radio, if the bug is related to the controls.`))
      .addSeparatorComponents(separator2)
      .addTextDisplayComponents(new TextDisplayBuilder().setContent('-# Drag the log file straight into this channel instead of pasting it as text.'));

    await openTicket(client, interaction, 'bug', '🐛', container);
  }
}).toJSON();
