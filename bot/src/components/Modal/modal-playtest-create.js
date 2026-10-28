const { ModalSubmitInteraction, MessageFlags, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, FileBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const DiscordBot = require("../../client/DiscordBot");
const Component = require("../../structure/Component");
const config = require("../../config");
const { notice } = require("../../utils/Notice");
const { error } = require("../../utils/Console");

// A forum holds 20 tags at most.
const MAX_TAGS = 20;

module.exports = new Component({
  customId: 'playtest_create',
  type: 'modal',
  /**
   *
   * @param {DiscordBot} client
   * @param {ModalSubmitInteraction} interaction
   */
  run: async (client, interaction) => {
    if (!config.playtest.adminRoles.some((roleId) => interaction.member.roles.cache.has(roleId))) {
      return interaction.reply(notice(config.emojis.no, 'You do not have permission to do this.'));
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const version = interaction.fields.getTextInputValue('version').trim();
    const description = interaction.fields.getTextInputValue('description');
    const file = interaction.fields.getUploadedFiles('file', true).first();
    // attachment:// only matches names Discord keeps as they are.
    const fileName = file.name.replace(/[^\w.-]+/g, '_');

    // The modal upload is temporary: the bot downloads it and re-uploads it to the post, where Discord keeps it.
    const separator = new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large);
    const versionsForum = await client.channels.fetch(config.playtest.versionsForum);
    let thread;
    try {
      thread = await versionsForum.threads.create({
        name: version,
        message: {
          flags: MessageFlags.IsComponentsV2,
          files: [{ attachment: file.url, name: fileName }],
          components: [new ContainerBuilder()
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(`## 🧪 ${version}`))
            .addSeparatorComponents(separator)
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(description))
            .addSeparatorComponents(separator)
            .addFileComponents(new FileBuilder().setURL(`attachment://${fileName}`))
            .addActionRowComponents(new ActionRowBuilder().addComponents(
              new ButtonBuilder().setCustomId('playtest_feedback').setLabel('Give feedback').setEmoji('📝').setStyle(ButtonStyle.Primary)
            ))]
        }
      });
    } catch (err) {
      error(`Playtest version ${version}: ${err.message}`);
      return interaction.editReply(notice(config.emojis.no, `Could not post the version: ${err.message} (a bot can only upload up to this server's upload limit).`));
    }

    // Drop the oldest version tags (only the ones the bot made) so the new one fits.
    const feedbackForum = await client.channels.fetch(config.playtest.feedbackForum);
    const versionTags = new Set(client.database.entries().filter(([key]) => key.startsWith('playtest.')).map(([, { tagId }]) => tagId));
    const tags = [...feedbackForum.availableTags];
    while (tags.length >= MAX_TAGS) {
      const oldest = tags.findIndex((tag) => versionTags.has(tag.id));
      if (oldest === -1) break;
      tags.splice(oldest, 1);
    }

    let tagId;
    try {
      const before = new Set(tags.map((tag) => tag.id));
      const updated = await feedbackForum.setAvailableTags([...tags, { name: version }]);
      tagId = updated.availableTags.find((tag) => !before.has(tag.id))?.id;
    } catch (err) {
      error(`Playtest tag ${version}: ${err.message}`);
    }

    client.database.set(`playtest.${thread.id}`, { version, tagId });

    await interaction.editReply(notice(config.emojis.yes, `Version posted: <#${thread.id}>${tagId ? '' : `\n${config.emojis.warning} Could not create its feedback tag.`}`));
  }
}).toJSON();
