const { MessageFlags, ContainerBuilder, TextDisplayBuilder, SectionBuilder, ThumbnailBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const ACTION_KEY = 'honeypot-action'; // 'kick' or 'ban'; missing when the honeypot is off.
const COUNT_KEY = 'honeypot-count';
const MESSAGE_KEY = 'honeypot-message';

const THUMBNAIL = 'https://cdn.jsdelivr.net/gh/jdecked/twemoji@15.1.0/assets/72x72/1f36f.png';

const TEXTS = {
    kick: { result: 'a kick', counter: 'Kicks' },
    ban: { result: 'a ban', counter: 'Bans' }
};

const buildHoneypot = (action, count) => ({
    flags: MessageFlags.IsComponentsV2,
    components: [new ContainerBuilder()
        .addSectionComponents(new SectionBuilder()
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent('## DO NOT SEND MESSAGES IN THIS CHANNEL'),
                new TextDisplayBuilder().setContent(`This channel is used to catch spam bots. Any messages sent here will result in **${TEXTS[action].result}**.`)
            )
            .setThumbnailAccessory(new ThumbnailBuilder().setURL(THUMBNAIL)))
        .addActionRowComponents(new ActionRowBuilder().addComponents(new ButtonBuilder()
            .setStyle(ButtonStyle.Secondary)
            .setCustomId('honeypot-counter')
            .setLabel(`${TEXTS[action].counter}: ${count}`)
            .setEmoji('🍯')
            .setDisabled(true)))]
});

module.exports = { ACTION_KEY, COUNT_KEY, MESSAGE_KEY, buildHoneypot };
