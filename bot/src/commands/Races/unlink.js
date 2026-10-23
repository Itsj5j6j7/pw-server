const { ChatInputCommandInteraction } = require("discord.js");
const DiscordBot = require("../../client/DiscordBot");
const ApplicationCommand = require("../../structure/ApplicationCommand");
const config = require("../../config");
const { notice } = require("../../utils/Notice");
const store = require("../../bridge/store");
const { hasRole, setRank } = require("../../utils/Supporter");

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
        // The supporter group stays with the Discord account, not the Minecraft one.
        if (unlinked && link && hasRole(interaction.member)) await setRank(unlinked, link.mcName, false);
        await interaction.reply(unlinked
            ? notice(config.emojis.yes, 'Your Minecraft account has been **unlinked**.')
            : notice(config.emojis.no, 'You don\'t have a linked Minecraft account.'));
    }
}).toJSON();
