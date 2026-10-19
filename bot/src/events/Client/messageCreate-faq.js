const Event = require("../../structure/Event");
const config = require("../../config");
const { error } = require("../../utils/Console");
const { looksLikeQuestion, findAnswer } = require("../../utils/Faq");

module.exports = new Event({
    event: 'messageCreate',
    run: async (client, message) => {
        if (message.author.bot || !config.faq.channels.includes(message.channelId)) return;
        if (client.database.has('faq-disabled')) return;
        if (!looksLikeQuestion(message.content)) return;

        const toUser = Boolean(message.reference) || message.mentions.users.some((user) => user.id !== client.user.id);
        const answer = await findAnswer(message.content, toUser).catch((err) => error(err));
        if (answer) await message.reply(answer);
    }
}).toJSON();
