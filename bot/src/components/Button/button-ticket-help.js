const { ButtonInteraction, TextDisplayBuilder, ContainerBuilder, SeparatorBuilder, SeparatorSpacingSize } = require("discord.js");
const DiscordBot = require("../../client/DiscordBot");
const Component = require("../../structure/Component");
const { openTicket } = require("../../utils/Tickets");

module.exports = new Component({
  customId: 'ticket_help',
  type: 'button',
  /**
   *
   * @param {DiscordBot} client
   * @param {ButtonInteraction} interaction
   */
  run: async (client, interaction) => {
    const separator2 = new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large);

    const container = new ContainerBuilder()
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(`## ❓  How can we help, <@${interaction.user.id}>?`))
      .addSeparatorComponents(separator2)
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(`
Tell us what's going on in as much detail as you can. To help you faster, include:

> 1️⃣ What you're trying to do and what happens instead.
> 2️⃣ Your Minecraft version, loader (Fabric/NeoForge) and Propwash version.
> 3️⃣ What you fly with: RC transmitter (model), gamepad or keyboard.
> 4️⃣ Screenshots or a short video if it helps to show the problem.`))
      .addSeparatorComponents(separator2)
      .addTextDisplayComponents(new TextDisplayBuilder().setContent('-# While you wait, the in-game Flight School might already have the answer: hold `M` over any Propwash item.'));

    await openTicket(client, interaction, 'help', '❓', container);
  }
}).toJSON();
