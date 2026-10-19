const { MessageFlags, ChannelType } = require('discord.js');
const config = require('../config');
const { notice } = require('./Notice');

const access = { ViewChannel: true, SendMessages: true, ReadMessageHistory: true };

const isStaff = (member) => config.tickets.staffRoles.some((roleId) => member.roles.cache.has(roleId));

const isTicket = (channel) => [...Object.values(config.tickets.categories), config.tickets.closedCategory].includes(channel.parentId);

const replyError = async (interaction, text) => {
    await interaction.reply(notice(config.emojis.no, text));
    setTimeout(() => interaction.deleteReply().catch(() => { }), 2000);
};

// Replies with the error and returns false when the member isn't staff or the channel isn't a ticket.
const canManageTicket = async (interaction) => {
    if (!isStaff(interaction.member)) {
        await replyError(interaction, 'You do not have permission to execute this command.');
        return false;
    }
    if (!isTicket(interaction.channel)) {
        await replyError(interaction, 'This channel is not a ticket.');
        return false;
    }
    return true;
};

const openTicket = async (client, interaction, type, emoji, container) => {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const displayName = interaction.member.displayName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'user';

    const channel = await interaction.guild.channels.create({
        name: `${emoji}-${type}-${displayName}`,
        type: ChannelType.GuildText,
        parent: config.tickets.categories[type]
    });

    await channel.permissionOverwrites.edit(interaction.user.id, access);
    for (const roleId of config.tickets.staffRoles) {
        await channel.permissionOverwrites.edit(roleId, access);
    }

    client.database.set(`ticket.info.${channel.id}`, [{
        createdBy: interaction.user.id,
        createdAt: Date.now(),
        category: channel.parentId
    }]);

    await channel.send({
        flags: MessageFlags.IsComponentsV2,
        components: [container]
    });

    await interaction.editReply(notice(config.emojis.yes, `Ticket created: <#${channel.id}>`));
    setTimeout(() => interaction.deleteReply().catch(() => { }), 5000);
};

module.exports = { access, isStaff, isTicket, replyError, canManageTicket, openTicket };
