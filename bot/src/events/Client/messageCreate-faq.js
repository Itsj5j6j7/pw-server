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

        const isOther = (user) => user && user.id !== client.user.id && user.id !== message.author.id;
        if (isOther(message.mentions.repliedUser) || message.mentions.users.some(isOther)) return;

        const answer = await findAnswer(message.content).catch((err) => error(err));
        if (answer) await message.reply(answer);
    }
}).toJSON();
