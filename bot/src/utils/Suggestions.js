const { MessageFlags, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder } = require('discord.js');
const config = require('../config');

const STICKY_KEY = 'suggestions-sticky';

// verdict: undefined (pending), 'approve' or 'reject'.
const buildSuggestion = ({ title, description, userId }, verdict) => {
    const separator = new SeparatorBuilder();

    const container = new ContainerBuilder()
        .setAccentColor(verdict === 'approve' ? 0x69e75b : verdict === 'reject' ? 0xe75b5b : 0xffc107)
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`### 💡 ${title}`))
        .addSeparatorComponents(separator)
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(description))
        .addSeparatorComponents(separator)
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`-# From: <@${userId}>`));

    if (verdict) {
        container
            .addSeparatorComponents(separator)
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(verdict === 'approve' ? `${config.emojis.yes} | Approved` : `${config.emojis.no} | Rejected`));
    }

    return container;
};

// Keeps the /suggest reminder as the last message of the channel by deleting and resending it.
const refreshSticky = async (client, channel) => {
    const oldId = client.database.get(STICKY_KEY);
    if (oldId) await channel.messages.delete(oldId).catch(() => { });

    const sticky = await channel.send({
        flags: MessageFlags.IsComponentsV2,
        components: [new ContainerBuilder()
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${config.emojis.warning}  Use \`/suggest\` to open the suggestion form.`))]
    });

    client.database.set(STICKY_KEY, sticky.id);
};

module.exports = { STICKY_KEY, buildSuggestion, refreshSticky };
