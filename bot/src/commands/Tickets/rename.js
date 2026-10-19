const { ChatInputCommandInteraction, ApplicationCommandOptionType } = require("discord.js");
const DiscordBot = require("../../client/DiscordBot");
const ApplicationCommand = require("../../structure/ApplicationCommand");
const config = require("../../config");
const { notice } = require("../../utils/Notice");
const { canManageTicket } = require("../../utils/Tickets");

module.exports = new ApplicationCommand({
  command: {
    name: 'rename',
    description: 'Change the name of the ticket',
    type: 1,
    options: [
      {
        name: 'name',
        description: 'Write a new name for the ticket',
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

    const name = interaction.options.getString('name');

    interaction.channel.setName(name);
    await interaction.reply(notice(config.emojis.yes, `The ticket name has been changed to \`\`${name}\`\`.`));
  }
}).toJSON();
