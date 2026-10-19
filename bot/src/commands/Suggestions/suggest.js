const { ChatInputCommandInteraction } = require("discord.js");
const DiscordBot = require("../../client/DiscordBot");
const ApplicationCommand = require("../../structure/ApplicationCommand");

module.exports = new ApplicationCommand({
  command: {
    name: 'suggest',
    description: 'Make a suggestion',
    type: 1,
    options: []
  },
  options: {
    cooldown: 10000,
  },

  /**
   *
   * @param {DiscordBot} client
   * @param {ChatInputCommandInteraction} interaction
   */
  run: async (client, interaction) => {
    await interaction.showModal(
      {
        custom_id: 'suggestion',
        title: 'Make a suggestion',
        components: [{
          type: 1,
          components: [{
            type: 4,
            custom_id: 'title',
            label: 'Title',
            max_length: 128,
            min_length: 1,
            placeholder: 'Give it a title',
            style: 1,
            required: true
          }]
        }, {
          type: 1,
          components: [{
            type: 4,
            custom_id: 'description',
            label: 'Description',
            max_length: 1024,
            min_length: 1,
            placeholder: 'Describe your suggestion',
            style: 2,
            required: true
          }]
        }]
      }
    )
  }
}).toJSON();
