const { ChatInputCommandInteraction, ApplicationCommandOptionType, escapeMarkdown } = require("discord.js");
const DiscordBot = require("../../client/DiscordBot");
const ApplicationCommand = require("../../structure/ApplicationCommand");
const config = require("../../config");
const { notice } = require("../../utils/Notice");
const { isStaff } = require("../../utils/Tickets");
const store = require("../../bridge/store");

module.exports = new ApplicationCommand({
    command: {
        name: 'username',
        description: 'Staff: get the Minecraft username linked to a Discord user',
        type: 1,
        contexts: [0],
        options: [
            { name: 'user', description: 'The Discord user', type: ApplicationCommandOptionType.User, required: true }
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
        if (!isStaff(interaction.member)) {
            await interaction.reply(notice(config.emojis.no, 'You do not have permission to execute this command.'));

            return setTimeout(() => {
                interaction.deleteReply().catch(() => { });
            }, 2000);
        }

        const user = interaction.options.getUser('user');
        const link = store.getLinkByDiscord(user.id);

        await interaction.reply(link
            ? notice(config.emojis.yes, `<@${user.id}> is **${escapeMarkdown(link.mcName)}** in Minecraft.`)
            : notice(config.emojis.no, `<@${user.id}> has not linked a Minecraft account.`));
    }
}).toJSON();
