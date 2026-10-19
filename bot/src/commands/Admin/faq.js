const { ChatInputCommandInteraction, ApplicationCommandOptionType } = require("discord.js");
const DiscordBot = require("../../client/DiscordBot");
const ApplicationCommand = require("../../structure/ApplicationCommand");
const config = require("../../config");
const { notice } = require("../../utils/Notice");

module.exports = new ApplicationCommand({
    command: {
        name: 'faq',
        description: 'Turn the FAQ auto-answer system on or off',
        type: 1,
        contexts: [0],
        options: [
            { name: 'on', description: 'Enable the FAQ auto-answer', type: ApplicationCommandOptionType.Subcommand },
            { name: 'off', description: 'Disable the FAQ auto-answer', type: ApplicationCommandOptionType.Subcommand }
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
        if (!config.faq.adminRoles.some((roleId) => interaction.member.roles.cache.has(roleId))) {
            await interaction.reply(notice(config.emojis.no, 'You do not have permission to execute this command.'));

            return setTimeout(() => {
                interaction.deleteReply().catch(() => { });
            }, 2000);
        }

        const enabled = interaction.options.getSubcommand() === 'on';
        // quick-yaml.db rejects falsy values, so only the "off" state is stored.
        if (enabled) client.database.delete('faq-disabled');
        else client.database.set('faq-disabled', true);
        await interaction.reply(notice(config.emojis.yes, `The FAQ auto-answer has been **${enabled ? 'enabled' : 'disabled'}**.`));
    }
}).toJSON();
