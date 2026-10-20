const { ModalSubmitInteraction, MessageFlags, ChannelType, TextDisplayBuilder, SeparatorBuilder } = require("discord.js");
const DiscordBot = require("../../client/DiscordBot");
const Component = require("../../structure/Component");
const config = require("../../config");
const { notice } = require("../../utils/Notice");
const { access } = require("../../utils/Tickets");
const { buildJob } = require("../../utils/Jobs");

module.exports = new Component({
  customId: 'job_apply',
  type: 'modal',
  /**
   *
   * @param {DiscordBot} client
   * @param {ModalSubmitInteraction} interaction
   */
  run: async (client, interaction) => {
    const job = client.database.get(`jobs.${interaction.channelId}`);
    if (!job) return interaction.reply(notice(config.emojis.no, 'This job offer no longer exists.'));

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const displayName = interaction.member.displayName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'user';

    const channel = await interaction.guild.channels.create({
      name: `${job.id}-${displayName}`,
      type: ChannelType.GuildText,
      parent: config.jobs.category
    });

    await channel.permissionOverwrites.edit(interaction.user.id, access);
    for (const roleId of config.jobs.adminRoles) {
      await channel.permissionOverwrites.edit(roleId, access);
    }

    client.database.set(`job-applications.${interaction.channelId}.${interaction.user.id}`, channel.id);

    await channel.send({
      flags: MessageFlags.IsComponentsV2,
      components: [buildJob(job)
        .addSeparatorComponents(new SeparatorBuilder())
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`<@${interaction.user.id}>, what would you bring to this role?`))]
    });

    await interaction.editReply(notice(config.emojis.yes, `Application channel created: <#${channel.id}>`));
  }
}).toJSON();
