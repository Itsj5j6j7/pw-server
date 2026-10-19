const { ButtonInteraction, TextDisplayBuilder, ContainerBuilder, SeparatorBuilder, SeparatorSpacingSize } = require("discord.js");
const DiscordBot = require("../../client/DiscordBot");
const Component = require("../../structure/Component");
const { openTicket } = require("../../utils/Tickets");

module.exports = new Component({
  customId: 'ticket_report',
  type: 'button',
  /**
   *
   * @param {DiscordBot} client
   * @param {ButtonInteraction} interaction
   */
  run: async (client, interaction) => {
    const separator2 = new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large);

    const container = new ContainerBuilder()
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(`## 🚨  New report from <@${interaction.user.id}>`))
      .addSeparatorComponents(separator2)
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(`
Only you and the staff team can see this ticket. Please include:

> 1️⃣ Who you are reporting (mention or user ID).
> 2️⃣ What happened and which rule it breaks.
> 3️⃣ Evidence: screenshots or message links.`))
      .addSeparatorComponents(separator2)
      .addTextDisplayComponents(new TextDisplayBuilder().setContent('-# False or joke reports may lead to sanctions.'));

    await openTicket(client, interaction, 'report', '🚨', container);
  }
}).toJSON();
