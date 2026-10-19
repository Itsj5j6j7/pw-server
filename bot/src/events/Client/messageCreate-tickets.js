const Event = require("../../structure/Event");
const { isTicket } = require("../../utils/Tickets");

module.exports = new Event({
  event: 'messageCreate',
  run: async (client, message) => {
    if (message.author.bot || !message.guild) return;
    if (!isTicket(message.channel)) return;

    const key = `transcript.${message.channel.id}`;

    const member = await message.guild.members.fetch(message.author.id).catch(() => null);

    const data = {
      authorTag: `${message.author.tag}`,
      authorId: message.author.id,
      avatarURL: message.author.displayAvatarURL({ size: 64 }),
      nickname: member?.displayName || message.author.username,
      content: message.content,
      timestamp: message.createdAt.toISOString(),
      attachments: message.attachments.map(a => ({
        url: a.url,
        name: a.name
      }))
    };

    let arr = client.database.get(key);
    if (!Array.isArray(arr)) arr = [];

    arr.push(data);
    client.database.set(key, arr);
  }
}).toJSON();
