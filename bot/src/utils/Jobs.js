const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, ChannelType, MessageFlags } = require('discord.js');
const config = require('../config');
const { error } = require('./Console');

// Keys match config.jobs.tags.time / config.jobs.tags.type.
const TIMES = { short: 'Short term', long: 'Long term', once: 'One time' };
const TYPES = { moderation: 'Moderation', content: 'Content creation', builder: 'Builder', other: 'Other' };

// Shown in the "I'm interested" modal above the checkbox.
const RULES = `**Before you apply, please read:**
- **This is volunteer work.** It is unpaid and there is no contract. We keep it that way so everything stays simple and free of legal paperwork.
- **Be consistent.** If you take something on, see it through. If you can no longer continue, tell the team so we can hand it over.
- **Be respectful.** You represent Propwash, so treat the community and the team with respect.
- **Keep private things private.** Don't share unreleased content, internal discussions or private information.
- **Content stays credited.** Anything you make (videos, builds, trailers) may be used by the project, and we'll credit you whenever it is.
- **Staff decides.** Applying doesn't guarantee a spot, and a role can be removed at any time if the above isn't respected.`;

// The apply modal fits 5 components: rules text + checkbox leave room for 3 questions. A label description holds 100 characters.
const MAX_QUESTIONS = 3;
const MAX_QUESTION_LENGTH = 100;

const isJobAdmin = (member) => config.jobs.adminRoles.some((roleId) => member.roles.cache.has(roleId));

const buildJob = ({ title, description, time, type }) => {
    const separator = new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large);

    return new ContainerBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`## 💼 ${title}`))
        .addSeparatorComponents(separator)
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(description))
        .addSeparatorComponents(separator)
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`-# ⏱️ ${TIMES[time]}  ·  🏷️ ${TYPES[type]}`))
        .addSeparatorComponents(separator);
};

// quick-yaml.db keys are flat ("job-applications.<thread>.<user>" is one key), so search them by prefix.
const applicantOf = (client, channelId) => client.database.entries()
    .find(([key, id]) => key.startsWith('job-applications.') && id === channelId)?.[0].split('.')[2];

const voiceAccess = { ViewChannel: true, Connect: true, Speak: true };

// "job-meetings" = { <application channel>: { at (unix seconds), userId } }. Checked every 30 s so it survives restarts.
const MEETINGS = 'job-meetings';

const scheduleMeeting = (client, channelId, meeting) => client.database.set(MEETINGS, { ...client.database.get(MEETINGS), [channelId]: meeting });

const startMeetings = (client) => setInterval(async () => {
    const meetings = client.database.get(MEETINGS) || {};
    for (const [channelId, { at, userId }] of Object.entries(meetings)) {
        if (at * 1000 > Date.now()) continue;
        const { [channelId]: _, ...rest } = client.database.get(MEETINGS);
        client.database.set(MEETINGS, rest);

        try {
            const channel = await client.channels.fetch(channelId).catch(() => null);
            if (!channel) continue;

            const voice = await channel.guild.channels.create({
                name: `🎤│${channel.name}`,
                type: ChannelType.GuildVoice,
                parent: channel.parentId
            });
            await voice.permissionOverwrites.edit(userId, voiceAccess);
            for (const roleId of config.jobs.adminRoles) {
                await voice.permissionOverwrites.edit(roleId, voiceAccess);
            }

            await channel.send({
                flags: MessageFlags.IsComponentsV2,
                components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`<@${userId}>, the meeting is starting: <#${voice.id}>`))]
            });
        } catch (err) {
            error(`Meeting in ${channelId}: ${err.message}`);
        }
    }
}, 30000);

module.exports = { TIMES, TYPES, RULES, MAX_QUESTIONS, MAX_QUESTION_LENGTH, isJobAdmin, buildJob, applicantOf, scheduleMeeting, startMeetings };
