const { ChatInputCommandInteraction, ApplicationCommandOptionType, escapeMarkdown } = require("discord.js");
const DiscordBot = require("../../client/DiscordBot");
const ApplicationCommand = require("../../structure/ApplicationCommand");
const config = require("../../config");
const { notice } = require("../../utils/Notice");
const store = require("../../bridge/store");

module.exports = new ApplicationCommand({
    command: {
        name: 'link',
        description: 'Link your Minecraft account to show up as a mention in race results',
        type: 1,
        contexts: [0],
        options: [
            { name: 'code', description: 'The code you got with /link in game', type: ApplicationCommandOptionType.String, required: true, min_length: 6, max_length: 6 }
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
        const entry = store.useCode(interaction.options.getString('code').toUpperCase());

        if (!entry) return interaction.reply(notice(config.emojis.no, 'That code is invalid or expired. Run `/link` in game to get a new one.'));
        if (store.getLink(entry.uuid)) return interaction.reply(notice(config.emojis.no, 'That Minecraft account is already linked.'));

        store.link(entry.uuid, entry.name, interaction.user.id);
        await interaction.reply(notice(config.emojis.yes, `Linked to **${escapeMarkdown(entry.name)}**. Use \`/unlink\` to undo it.`));
    }
}).toJSON();
