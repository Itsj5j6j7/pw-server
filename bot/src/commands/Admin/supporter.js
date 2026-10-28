const { ChatInputCommandInteraction, ApplicationCommandOptionType } = require("discord.js");
const DiscordBot = require("../../client/DiscordBot");
const ApplicationCommand = require("../../structure/ApplicationCommand");
const config = require("../../config");
const store = require("../../bridge/store");
const { notice } = require("../../utils/Notice");
const { isStaff, replyError } = require("../../utils/Tickets");
const { applyTimes } = require("../../utils/Supporter");

const userOption = { name: 'user', description: 'The Discord member', type: ApplicationCommandOptionType.User, required: true };

module.exports = new ApplicationCommand({
    command: {
        name: 'supporter',
        description: 'Supporter time (Ko-fi): see, add or remove it',
        type: 1,
        contexts: [0],
        options: [
            {
                name: 'add',
                description: 'Give months of supporter time (after what is left), e.g. for a Ko-fi payment without Discord',
                type: ApplicationCommandOptionType.Subcommand,
                options: [userOption, { name: 'months', description: 'How many months', type: ApplicationCommandOptionType.Integer, required: true, min_value: 1, max_value: 120 }]
            },
            { name: 'remove', description: 'End their supporter time now (the role and rank go)', type: ApplicationCommandOptionType.Subcommand, options: [userOption] },
            { name: 'info', description: 'When their supporter time ends', type: ApplicationCommandOptionType.Subcommand, options: [userOption] }
        ]
    },
    options: {
        cooldown: 3000
    },

    /**
     *
     * @param {DiscordBot} client
     * @param {ChatInputCommandInteraction} interaction
     */
    run: async (client, interaction) => {
        if (!isStaff(interaction.member)) return replyError(interaction, 'You do not have permission to execute this command.');

        const user = interaction.options.getUser('user', true);
        const sub = interaction.options.getSubcommand();
        const until = (at) => `<t:${Math.floor(at / 1000)}:D> (<t:${Math.floor(at / 1000)}:R>)`;

        if (sub === 'add') {
            const months = interaction.options.getInteger('months', true);
            const at = store.addSupporterMonths(user.id, months);
            await applyTimes(client);
            const linked = store.getLinkByDiscord(user.id);
            return interaction.reply(notice(config.emojis.yes, `<@${user.id}> is a supporter until ${until(at)}.`
                + (linked ? '' : ' They have no linked Minecraft account yet: the rank comes once they `/link`.')));
        }
        if (sub === 'remove') {
            const had = store.removeSupporterTime(user.id);
            const member = await interaction.guild.members.fetch(user.id).catch(() => null);
            if (member?.roles.cache.has(config.supporter.roleId)) await member.roles.remove(config.supporter.roleId, `/supporter remove by ${interaction.user.tag}`).catch(() => null);
            return interaction.reply(notice(config.emojis.yes, had ? `<@${user.id}>'s supporter time ended.` : `<@${user.id}> had no supporter time; the role is removed if they had it.`));
        }
        const at = store.supporterTime(user.id);
        return interaction.reply(notice(config.emojis.question, at ? `<@${user.id}> is a supporter until ${until(at)}.` : `<@${user.id}> has no supporter time.`));
    }
}).toJSON();
