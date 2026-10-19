const { ButtonInteraction } = require("discord.js");
const DiscordBot = require("../../client/DiscordBot");
const Component = require("../../structure/Component");
const { open } = require("../../utils/Voice");

// Same as /vc without a limit.
module.exports = new Component({
  customId: 'vc_create',
  type: 'button',
  /**
   *
   * @param {DiscordBot} client
   * @param {ButtonInteraction} interaction
   */
  run: async (client, interaction) => {
    await open(client, interaction);
  }
}).toJSON();
