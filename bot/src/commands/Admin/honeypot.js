const { ChatInputCommandInteraction, ApplicationCommandOptionType } = require("discord.js");
const DiscordBot = require("../../client/DiscordBot");
const ApplicationCommand = require("../../structure/ApplicationCommand");
const config = require("../../config");
const { notice } = require("../../utils/Notice");
const { isStaff } = require("../../utils/Tickets");
const { ACTION_KEY, COUNT_KEY, MESSAGE_KEY, buildHoneypot } = require("../../utils/Honeypot");

module.exports = new ApplicationCommand({
    command: {
        name: 'honeypot',
        description: 'Turn the honeypot channel on or off',
        type: 1,
        contexts: [0],
        options: [
            {
                name: 'on',
                description: 'Enable the honeypot and post its message',
                type: ApplicationCommandOptionType.Subcommand,
                options: [{
                    name: 'action',
                    description: 'What happens to whoever writes in the channel (default: kick)',
                    type: ApplicationCommandOptionType.String,
                    choices: [
                        { name: 'Kick', value: 'kick' },
                        { name: 'Ban', value: 'ban' }
                    ]
                }]
            },
            { name: 'off', description: 'Disable the honeypot and remove its message', type: ApplicationCommandOptionType.Subcommand }
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
        const enabled = interaction.options.getSubcommand() === 'on';
        const channel = await interaction.guild.channels.fetch(config.honeypot.channel).catch(() => null);

        const problem = !isStaff(interaction.member)
            ? 'You do not have permission to execute this command.'
            : enabled && !channel ? 'The honeypot channel was not found, check `honeypot.channel` in the config.' : null;

        if (problem) {
            await interaction.reply(notice(config.emojis.no, problem));

            return setTimeout(() => {
                interaction.deleteReply().catch(() => { });
            }, 2000);
        }

        const oldId = client.database.get(MESSAGE_KEY);
        if (oldId) await channel?.messages.delete(oldId).catch(() => { });

        if (enabled) {
            const action = interaction.options.getString('action') ?? 'kick';
            const sent = await channel.send(buildHoneypot(action, 0));
            client.database.set(ACTION_KEY, action);
            client.database.set(MESSAGE_KEY, sent.id);
            client.database.delete(COUNT_KEY);
        } else {
            for (const key of [ACTION_KEY, COUNT_KEY, MESSAGE_KEY]) client.database.delete(key);
        }

        await interaction.reply(notice(config.emojis.yes, `The honeypot has been **${enabled ? 'enabled' : 'disabled'}**.`));
    }
}).toJSON();
