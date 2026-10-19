const { MessageFlags, ContainerBuilder, TextDisplayBuilder } = require('discord.js');

// Ephemeral one-line reply inside a container: interaction.reply(notice(config.emojis.yes, 'Done.'))
const notice = (emoji, text) => ({
    flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
    components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji} | ${text}`))],
    allowedMentions: { parse: [] }
});

module.exports = { notice };
