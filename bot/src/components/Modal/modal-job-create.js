const { ModalSubmitInteraction, MessageFlags, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const DiscordBot = require("../../client/DiscordBot");
const Component = require("../../structure/Component");
const config = require("../../config");
const { notice } = require("../../utils/Notice");
const { MAX_QUESTIONS, MAX_QUESTION_LENGTH, isJobAdmin, buildJob } = require("../../utils/Jobs");

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

    const questions = interaction.fields.getTextInputValue('questions').split('\n').map((line) => line.trim()).filter(Boolean);
    if (questions.length > MAX_QUESTIONS || questions.some((question) => question.length > MAX_QUESTION_LENGTH)) {
      return interaction.reply(notice(config.emojis.no, `Up to ${MAX_QUESTIONS} questions, ${MAX_QUESTION_LENGTH} characters each.`));
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const job = {
      id: interaction.customId.split(':')[1],
      title: interaction.fields.getTextInputValue('title'),
      description: interaction.fields.getTextInputValue('description'),
      time: interaction.fields.getRadioGroup('time', true),
      type: interaction.fields.getRadioGroup('type', true),
      questions
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
