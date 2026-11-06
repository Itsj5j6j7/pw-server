const { ChatInputCommandInteraction, MessageFlags } = require("discord.js");
const DiscordBot = require("../../client/DiscordBot");
const ApplicationCommand = require("../../structure/ApplicationCommand");
const config = require("../../config");
const { isStaff } = require("../../utils/Tickets");
const { isJobAdmin } = require("../../utils/Jobs");

const hasAny = (roles) => (member) => roles.some((roleId) => member.roles.cache.has(roleId));

// ponytail: mirrors the checks inside each command's run(); a new restricted command not listed here shows up for everyone (run() still blocks it).
const access = {
    faq: hasAny(config.faq.adminRoles),
    playtest: hasAny(config.playtest.adminRoles),
    'job-application': isJobAdmin, meeting: isJobAdmin, archive: isJobAdmin, unarchive: isJobAdmin,
    honeypot: isStaff, supporter: isStaff, verdict: isStaff, message: isStaff, msg: isStaff,
    racedata: isStaff, username: isStaff,
    'add-role': isStaff, 'add-user': isStaff, 'remove-role': isStaff, 'remove-user': isStaff,
    close: isStaff, measures: isStaff, rename: isStaff, time: isStaff
};

module.exports = new ApplicationCommand({
    command: {
        name: 'help',
        description: 'Replies with a list of available application commands.',
        type: 1,
        options: []
    },
    options: {
        cooldown: 10000
    },
    /**
     *
     * @param {DiscordBot} client
     * @param {ChatInputCommandInteraction} interaction
     */
    run: async (client, interaction) => {
        const names = client.collection.application_commands
            .filter((cmd) => access[cmd.command.name]?.(interaction.member) ?? true)
            .map((cmd) => '`/' + cmd.command.name + '`');

        await interaction.reply({
            content: names.join(', '),
            flags: MessageFlags.Ephemeral
        });
    }
}).toJSON();
