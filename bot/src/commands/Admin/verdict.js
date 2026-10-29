const { ChatInputCommandInteraction, ApplicationCommandOptionType, MessageFlags, ContainerBuilder, TextDisplayBuilder } = require("discord.js");
const DiscordBot = require("../../client/DiscordBot");
const ApplicationCommand = require("../../structure/ApplicationCommand");
const config = require("../../config");
const { isStaff, replyError } = require("../../utils/Tickets");

// Thread names are plain text, so the title prefix can't use the custom emojis.
const VERDICTS = {
  approve: { label: 'Approved', prefix: '✅ [APPROVED]', emoji: config.emojis.yes, color: 0x69e75b },
  reject: { label: 'Denied', prefix: '❌ [DENIED]', emoji: config.emojis.no, color: 0xe75b5b },
  fix: { label: 'Fixed', prefix: '🔧 [FIXED]', emoji: '🔧', color: 0x5b9be7 }
};

const PREFIX = /^\S+ \[(APPROVED|DENIED|FIXED)\] /;

// A Text Display holds 4000 characters: each line is ~25.
const MAX_LISTED = 150;

const fetchAllPosts = async (forum) => {
  const posts = [...(await forum.threads.fetchActive(false)).threads.values()];
  let before;
  for (;;) {
    const { threads, hasMore } = await forum.threads.fetchArchived({ before, limit: 100 }, false);
    posts.push(...threads.values());
    if (!hasMore || !threads.size) return posts;
    before = threads.last();
  }
};

module.exports = new ApplicationCommand({
  command: {
    name: 'verdict',
    description: 'Give a verdict on a bugs and ideas post, or list the pending ones',
    type: 1,
    contexts: [0],
    options: [
      {
        name: 'action',
        description: 'Verdict for this post, or list the posts without one',
        type: ApplicationCommandOptionType.String,
        required: true,
        choices: [
          { name: 'Approve', value: 'approve' },
          { name: 'Deny', value: 'reject' },
          { name: 'Fixed', value: 'fix' },
          { name: 'List pending', value: 'pending' }
        ]
      }
    ]
  },
  options: {
    cooldown: 5000
  },

  /**
   *
   * @param {DiscordBot} client
   * @param {ChatInputCommandInteraction} interaction
   */
  run: async (client, interaction) => {
    if (!isStaff(interaction.member)) return replyError(interaction, 'You do not have permission to execute this command.');

    const action = interaction.options.getString('action');
    const verdictTags = Object.values(config.bugsAndIdeas.tags);

    if (action === 'pending') {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      const forum = await client.channels.fetch(config.channels.bugsAndIdeas);
      const pending = (await fetchAllPosts(forum))
        .filter((post) => !post.appliedTags.some((tagId) => verdictTags.includes(tagId)))
        .sort((a, b) => a.createdTimestamp - b.createdTimestamp);

      const lines = pending.slice(0, MAX_LISTED).map((post) => `- <#${post.id}>`);
      if (pending.length > MAX_LISTED) lines.push(`-# And ${pending.length - MAX_LISTED} more.`);

      return interaction.editReply({
        flags: MessageFlags.IsComponentsV2,
        components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(
          pending.length ? `### ${pending.length} posts pending a verdict\n${lines.join('\n')}` : `${config.emojis.yes} | No posts pending a verdict.`
        ))],
        allowedMentions: { parse: [] }
      });
    }

    if (interaction.channel.parentId !== config.channels.bugsAndIdeas) return replyError(interaction, `Use this inside a post of <#${config.channels.bugsAndIdeas}>.`);

    const verdict = VERDICTS[action];
    const appliedTags = interaction.channel.appliedTags.filter((tagId) => !verdictTags.includes(tagId));

    // A post title holds 100 characters.
    const name = `${verdict.prefix} ${interaction.channel.name.replace(PREFIX, '')}`.slice(0, 100);

    // Locked posts only take messages from members with Manage Threads, which the bot needs too.
    // ponytail: Discord allows 2 renames per post every 10 minutes, a third verdict in a row waits on the rate limit.
    await interaction.channel.edit({ name, appliedTags: [...appliedTags, config.bugsAndIdeas.tags[action]], locked: true });

    await interaction.reply({
      flags: MessageFlags.IsComponentsV2,
      components: [new ContainerBuilder()
        .setAccentColor(verdict.color)
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`### ${verdict.emoji} | ${verdict.label}\n-# By <@${interaction.user.id}>. This post is now locked.`))],
      allowedMentions: { parse: [] }
    });
  }
}).toJSON();
