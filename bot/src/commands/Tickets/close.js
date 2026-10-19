const { ChatInputCommandInteraction, MessageFlags, ContainerBuilder, TextDisplayBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, SeparatorBuilder, SeparatorSpacingSize, FileBuilder, AttachmentBuilder } = require("discord.js");
const DiscordBot = require("../../client/DiscordBot");
const ApplicationCommand = require("../../structure/ApplicationCommand");
const config = require("../../config");
const { canManageTicket, replyError } = require("../../utils/Tickets");

const escapeHtml = (text) => String(text ?? '').replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

module.exports = new ApplicationCommand({
  command: {
    name: 'close',
    description: 'Close a ticket',
    type: 1,
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
    if (!await canManageTicket(interaction)) return;
    if (interaction.channel.parentId === config.tickets.closedCategory) return replyError(interaction, 'This ticket is already closed.');

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const separator2 = new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large);
    const channel = interaction.channel;
    const key = `ticket.info.${channel.id}`;

    let info = client.database.get(key);
    if (!Array.isArray(info)) info = [];
    info.push({ closedBy: interaction.user.id, closedAt: Date.now() });
    client.database.set(key, info);

    const messages = client.database.get(`transcript.${channel.id}`);

    if (messages?.length) {
      const transcriptHTML = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <title>Transcript - ${escapeHtml(channel.name)}</title>
          <style>
            body { font-family: "Segoe UI", sans-serif; background: #2c2f33; color: #fff; padding: 20px; }
            .message { display: flex; margin-bottom: 15px; }
            .avatar { width: 40px; height: 40px; border-radius: 50%; margin-right: 10px; }
            .content { background: #23272a; padding: 10px 15px; border-radius: 8px; width: 100%; }
            .author { font-weight: bold; }
            .timestamp { font-size: 0.8em; color: #aaa; margin-left: 10px; }
            .attachment { margin-top: 5px; }
            a.attachment-link { color: #00b0f4; text-decoration: underline; }
          </style>
        </head>
        <body>
          <h2>Transcript - ${escapeHtml(channel.name)}</h2>
          ${messages.map(m => `
            <div class="message">
              <img class="avatar" src="${escapeHtml(m.avatarURL)}" alt="avatar" />
              <div class="content">
                <div><span class="author">${escapeHtml(m.nickname)}</span><span class="timestamp">${new Date(m.timestamp).toLocaleString()}</span></div>
                <div>${escapeHtml(m.content)}</div>
                ${m.attachments?.map(att => `<div class="attachment"><a class="attachment-link" href="${escapeHtml(att.url)}" target="_blank">${escapeHtml(att.name)}</a></div>`).join('') || ''}
              </div>
            </div>
          `).join('')}
        </body>
        </html>
        `;

      const filename = `transcript.${channel.name.replace(/[^a-z0-9_-]/gi, '_')}.html`;
      const created = info[0];
      const closed = info.at(-1);

      const containerTranscript = new ContainerBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent('## 💾 Transcript: ``' + channel.name + '``'))
        .addSeparatorComponents(separator2)
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`📂 Created by <@${created.createdBy}> <t:${Math.floor(created.createdAt / 1000)}:f>`))
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`🔒 Closed by <@${closed.closedBy}> <t:${Math.floor(closed.closedAt / 1000)}:f>`))
        .addSeparatorComponents(separator2)
        .addFileComponents(new FileBuilder().setURL(`attachment://${filename}`));

      const transcripts = await client.channels.fetch(config.tickets.transcriptsChannel).catch(() => null);

      await transcripts?.send({
        flags: MessageFlags.IsComponentsV2,
        components: [containerTranscript],
        files: [new AttachmentBuilder(Buffer.from(transcriptHTML, 'utf-8'), { name: filename })],
        allowedMentions: { parse: [] }
      });
    }

    await channel.setName(`⛔-closed-${channel.name}`);
    await channel.setParent(config.tickets.closedCategory, { lockPermissions: true });

    await channel.send({
      flags: MessageFlags.IsComponentsV2,
      components: [new ContainerBuilder()
        .setAccentColor(0xe75b5b)
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`## ⛔  Ticket closed`))
        .addSeparatorComponents(separator2)
        .addActionRowComponents(new ActionRowBuilder()
          .addComponents(new ButtonBuilder()
            .setStyle(ButtonStyle.Success)
            .setLabel('Reopen')
            .setCustomId('ticket_reopen')
            .setEmoji('📂')
          )
          .addComponents(new ButtonBuilder()
            .setStyle(ButtonStyle.Danger)
            .setLabel('Delete')
            .setCustomId('ticket_delete')
            .setEmoji('🗑️')
          )
        )]
    });

    interaction.deleteReply().catch(() => { });
  }
}).toJSON();
