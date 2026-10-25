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

// "job-meetings" = { <application channel>: { at (unix seconds), userId, voiceId (once created) } }. Checked every 30 s so it survives restarts.
// The voice channel is created EARLY seconds before `at`, with a heads-up; at `at` the start is announced and the entry removed.
const MEETINGS = 'job-meetings';
const EARLY = 15 * 60;

const scheduleMeeting = (client, channelId, meeting) => client.database.set(MEETINGS, { ...client.database.get(MEETINGS), [channelId]: meeting });

const saveMeeting = (client, channelId, meeting) => {
    const { [channelId]: _, ...rest } = client.database.get(MEETINGS) || {};
    client.database.set(MEETINGS, meeting ? { ...rest, [channelId]: meeting } : rest);
};

const announce = (channel, content) => channel.send({
    flags: MessageFlags.IsComponentsV2,
    components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(content))]
});

const startMeetings = (client) => setInterval(async () => {
    const meetings = client.database.get(MEETINGS) || {};
    for (const [channelId, meeting] of Object.entries(meetings)) {
        const { at, userId } = meeting;
        const now = Date.now() / 1000;
        if (now < at - EARLY) continue;

        try {
            const channel = await client.channels.fetch(channelId).catch(() => null);
            if (!channel) {
                saveMeeting(client, channelId, null);
                continue;
            }

            let voiceId = meeting.voiceId;
            if (!voiceId) {
                const voice = await channel.guild.channels.create({
                    name: `🎤│${channel.name}`,
                    type: ChannelType.GuildVoice,
                    parent: channel.parentId
                });
                voiceId = voice.id;
                saveMeeting(client, channelId, { ...meeting, voiceId });
                await voice.permissionOverwrites.edit(userId, voiceAccess);
                for (const roleId of config.jobs.adminRoles) {
                    await voice.permissionOverwrites.edit(roleId, voiceAccess);
                }
                if (now < at) await announce(channel, `@here the meeting starts in 15 minutes (<t:${at}:R>): <#${voiceId}>`);
            }

            if (now >= at) {
                saveMeeting(client, channelId, null);
                await announce(channel, `@here the meeting is starting now: <#${voiceId}>`);
            }
        } catch (err) {
            saveMeeting(client, channelId, null);
            error(`Meeting in ${channelId}: ${err.message}`);
        }
    }
}, 30000);

module.exports = { TIMES, TYPES, RULES, MAX_QUESTIONS, MAX_QUESTION_LENGTH, isJobAdmin, buildJob, applicantOf, scheduleMeeting, startMeetings };
