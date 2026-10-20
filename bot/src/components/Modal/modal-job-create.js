const { ModalSubmitInteraction, MessageFlags, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const DiscordBot = require("../../client/DiscordBot");
const Component = require("../../structure/Component");
const config = require("../../config");
const { notice } = require("../../utils/Notice");
const { isJobAdmin, buildJob } = require("../../utils/Jobs");

module.exports = new Component({
  customId: 'job_create',
  type: 'modal',
  /**
   *
   * @param {DiscordBot} client
   * @param {ModalSubmitInteraction} interaction
   */
  run: async (client, interaction) => {
    if (!isJobAdmin(interaction.member)) return interaction.reply(notice(config.emojis.no, 'You do not have permission to do this.'));

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const job = {
      id: interaction.fields.getTextInputValue('id').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'job',
      title: interaction.fields.getTextInputValue('title'),
      description: interaction.fields.getTextInputValue('description'),
      time: interaction.fields.getRadioGroup('time', true),
      type: interaction.fields.getRadioGroup('type', true)
    };

    const forum = await client.channels.fetch(config.jobs.forum);
    const thread = await forum.threads.create({
      name: job.title,
      appliedTags: [config.jobs.tags.time[job.time], config.jobs.tags.type[job.type]],
      message: {
        flags: MessageFlags.IsComponentsV2,
        components: [buildJob(job).addActionRowComponents(new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('job_interest').setLabel("I'm interested").setEmoji('✋').setStyle(ButtonStyle.Primary)
        ))]
      }
    });

    client.database.set(`jobs.${thread.id}`, job);

    await interaction.editReply(notice(config.emojis.yes, `Job posted: <#${thread.id}>`));
  }
}).toJSON();
