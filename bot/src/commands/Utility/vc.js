const { ChatInputCommandInteraction, ApplicationCommandOptionType, ChannelType, PermissionFlagsBits } = require("discord.js");
const DiscordBot = require("../../client/DiscordBot");
const ApplicationCommand = require("../../structure/ApplicationCommand");
const config = require("../../config");
const { notice } = require("../../utils/Notice");
const { tracked, track, forget, nextName, check } = require("../../utils/Voice");

module.exports = new ApplicationCommand({
    command: {
        name: 'vc',
        description: 'Create a temporary voice channel',
        type: 1,
        contexts: [0],
        options: [
            {
                name: 'limit',
                description: 'Maximum number of people in the channel (no limit by default)',
                type: ApplicationCommandOptionType.Integer,
                min_value: 1,
                max_value: 99,
                required: false
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
        const owned = Object.entries(tracked(client)).find(([, ownerId]) => ownerId === interaction.user.id);
        if (owned) {
            if (interaction.guild.channels.cache.has(owned[0])) {
                return interaction.reply(notice(config.emojis.no, `You already have a voice channel: <#${owned[0]}>.`));
            }
            forget(client, owned[0]);
        }

        const channel = await interaction.guild.channels.create({
            name: nextName(client),
            type: ChannelType.GuildVoice,
            parent: config.voice.category,
            permissionOverwrites: [{
                id: interaction.guild.id,
                allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect]
            }],
            userLimit: interaction.options.getInteger('limit') ?? 0,
            reason: `/vc by ${interaction.user.tag}`
        });

        track(client, channel.id, interaction.user.id);
        check(client, channel);
        await interaction.member.voice.setChannel(channel).catch(() => { });

        await interaction.reply(notice(config.emojis.yes, `Your voice channel is ready: <#${channel.id}>. It will be deleted after ${config.voice.deleteAfterMinutes} minutes empty.`));
    }
}).toJSON();
