const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize } = require('discord.js');
const config = require('../config');

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

module.exports = { TIMES, TYPES, RULES, MAX_QUESTIONS, MAX_QUESTION_LENGTH, isJobAdmin, buildJob };
