const { ChatInputCommandInteraction } = require("discord.js");
const DiscordBot = require("../../client/DiscordBot");
const ApplicationCommand = require("../../structure/ApplicationCommand");
const config = require("../../config");
const { notice } = require("../../utils/Notice");
const store = require("../../bridge/store");
const { unlinked: ranksUnlinked } = require("../../utils/Ranks");
const { setLinked } = require("../../utils/Linked");

module.exports = new ApplicationCommand({
    command: {
        name: 'unlink',
        description: 'Unlink your Minecraft account',
        type: 1,
        contexts: [0]
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
        const link = store.getLinkByDiscord(interaction.user.id);
        const unlinked = store.unlink(interaction.user.id);
        if (unlinked) await interaction.member.roles.remove(config.bridge.link.role).catch(() => null);
        if (unlinked) await setLinked(unlinked, link?.mcName ?? unlinked, false);
        // The rank groups (supporter, creator, ...) stay with the Discord account, not the Minecraft one.
        if (unlinked) await ranksUnlinked(interaction.member, unlinked, link?.mcName ?? unlinked);
        await interaction.reply(unlinked
            ? notice(config.emojis.yes, 'Your Minecraft account has been **unlinked**.')
            : notice(config.emojis.no, 'You don\'t have a linked Minecraft account.'));
    }
}).toJSON();
