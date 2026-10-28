const { ModalSubmitInteraction, MessageFlags, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
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

    const links = interaction.fields.getTextInputValue('links').split('\n').map((line) => line.trim()).filter(Boolean);
    const invalid = links.find((link) => !/^https?:$/.test(URL.parse(link)?.protocol));
    if (invalid) return interaction.reply(notice(config.emojis.no, `Not a valid link: ${invalid}`));

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const version = interaction.fields.getTextInputValue('version').trim();
    const description = interaction.fields.getTextInputValue('description');
    // Labelled with the file name from the URL: propwash-fabric-26.3-0.6.0-dev.10-c4362030.jar
    const downloads = links.map((link) => `📦 [\`${decodeURIComponent(new URL(link).pathname.split('/').pop()) || link}\`](${link})`);

    const separator = new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large);
    const versionsForum = await client.channels.fetch(config.playtest.versionsForum);
    const thread = await versionsForum.threads.create({
      name: version,
      message: {
        flags: MessageFlags.IsComponentsV2,
        components: [new ContainerBuilder()
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(`## 🧪 ${version}`))
          .addSeparatorComponents(separator)
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(description))
          .addSeparatorComponents(separator)
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(downloads.join('\n')))
          .addActionRowComponents(new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('playtest_feedback').setLabel('Give feedback').setEmoji('📝').setStyle(ButtonStyle.Primary)
          ))]
      }
    });

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
