const { ChatInputCommandInteraction } = require("discord.js");
const DiscordBot = require("../../client/DiscordBot");
const ApplicationCommand = require("../../structure/ApplicationCommand");
const config = require("../../config");
const { replyError } = require("../../utils/Tickets");

module.exports = new ApplicationCommand({
    command: {
        name: 'playtest',
        description: 'Post a new playtest version',
        type: 1,
        contexts: [0]
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
        if (!config.playtest.adminRoles.some((roleId) => interaction.member.roles.cache.has(roleId))) {
            return replyError(interaction, 'You do not have permission to execute this command.');
        }

        await interaction.showModal({
            custom_id: 'playtest_create',
            title: 'New playtest version',
            components: [{
                type: 18,
                label: 'Version',
                description: 'Post title and feedback tag, e.g. 0.6.0-beta.1',
                // A forum tag name holds 20 characters.
                component: { type: 4, custom_id: 'version', style: 1, min_length: 1, max_length: 20, required: true }
            }, {
                type: 18,
                label: 'Description',
                component: { type: 4, custom_id: 'description', style: 2, min_length: 1, max_length: 3000, required: true }
            }, {
                type: 18,
                label: 'Downloads',
                description: 'One link per line (jar, zip...), shown in the same order',
                component: { type: 4, custom_id: 'links', style: 2, min_length: 1, max_length: 2000, required: true }
            }]
        });
    }
}).toJSON();
