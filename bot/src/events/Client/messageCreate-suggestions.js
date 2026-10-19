const Event = require("../../structure/Event");
const config = require("../../config");
const { STICKY_KEY, refreshSticky } = require("../../utils/Suggestions");

// Suggestions can only be made through /suggest: anything else written in the channel is deleted.
module.exports = new Event({
  event: 'messageCreate',
  run: async (client, message) => {
    if (message.author.bot || message.channel.id !== config.suggestions.channel) return;

    await message.delete().catch(() => { });

    if (!client.database.has(STICKY_KEY)) await refreshSticky(client, message.channel);
  }
}).toJSON();
