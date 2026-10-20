const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder } = require('discord.js');
const config = require('../config');

// Keys match config.jobs.tags.time / config.jobs.tags.type.
const TIMES = { short: 'Short term', long: 'Long term', once: 'One time' };
const TYPES = { moderation: 'Moderation', content: 'Content creation', builder: 'Builder', other: 'Other' };

// Shown in the "I'm interested" modal above the checkbox.
const RULES = 'Rules go here.';

const isJobAdmin = (member) => config.jobs.adminRoles.some((roleId) => member.roles.cache.has(roleId));

const buildJob = ({ title, description, time, type }) => {
    const separator = new SeparatorBuilder();

    return new ContainerBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`### 💼 ${title}`))
        .addSeparatorComponents(separator)
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(description))
        .addSeparatorComponents(separator)
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`-# ⏱️ ${TIMES[time]}  ·  🏷️ ${TYPES[type]}`));
};

module.exports = { TIMES, TYPES, RULES, isJobAdmin, buildJob };
