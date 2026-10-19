const { ButtonInteraction } = require("discord.js");
const DiscordBot = require("../../client/DiscordBot");
const Component = require("../../structure/Component");
const config = require("../../config");
const { notice } = require("../../utils/Notice");

const exclusiveGroups = ['experience'];

// Handles every "autorole:<group>:<key>" button, see config.autoroles.
module.exports = new Component({
  customId: 'autorole',
  type: 'button',
  /**
   *
   * @param {DiscordBot} client
   * @param {ButtonInteraction} interaction
   */
  run: async (client, interaction) => {
    const [, group, key] = interaction.customId.split(':');
    const roleId = config.autoroles[group][key];
    const roles = interaction.member.roles;

    let text;

    if (roles.cache.has(roleId)) {
      await roles.remove(roleId);
      text = `The role <@&${roleId}> has been removed.`;
    } else {
      const previous = exclusiveGroups.includes(group)
        ? Object.values(config.autoroles[group]).find((id) => roles.cache.has(id))
        : null;

      if (previous) await roles.remove(previous);
      await roles.add(roleId);
      text = previous
        ? `Your role has been changed from <@&${previous}> to <@&${roleId}>.`
        : `The role <@&${roleId}> has been added.`;
    }

    await interaction.reply(notice(config.emojis.yes, text));

    setTimeout(() => {
      interaction.deleteReply().catch(() => { });
    }, 3000);
  }
}).toJSON();
