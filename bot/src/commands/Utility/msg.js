const { ChatInputCommandInteraction, ApplicationCommandOptionType, ChannelType, MessageFlags } = require("discord.js");
const DiscordBot = require("../../client/DiscordBot");
const ApplicationCommand = require("../../structure/ApplicationCommand");
const config = require("../../config");
const { notice } = require("../../utils/Notice");
const { isStaff, replyError } = require("../../utils/Tickets");
const { getMessage, toPayload } = require("../../utils/Messages");

module.exports = new ApplicationCommand({
    command: {
        name: 'msg',
        description: 'Send a message built in the web panel',
        type: 1,
        contexts: [0],
        options: [
            {
                name: 'id',
                description: 'Id of the saved message',
                type: ApplicationCommandOptionType.String,
                required: true,
                autocomplete: true
            },
            {
                name: 'channel',
                description: 'Channel to send it to (defaults to this one)',
                type: ApplicationCommandOptionType.Channel,
                channel_types: [ChannelType.GuildText, ChannelType.GuildAnnouncement, ChannelType.PublicThread, ChannelType.PrivateThread],
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
        if (!isStaff(interaction.member)) return replyError(interaction, 'You do not have permission to execute this command.');

        const id = interaction.options.getString('id', true);
        const channel = interaction.options.getChannel('channel') ?? interaction.channel;
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        // Fetched on every use, so it always sends the message as it is saved right now.
        let data;
        try {
            data = await getMessage(id);
        } catch (err) {
            return interaction.editReply(notice(config.emojis.no, `Could not reach the messages API (${err.message}).`));
        }
        if (!data) return interaction.editReply(notice(config.emojis.no, `There is no message with id \`${id}\`.`));

        try {
            await channel.send({ flags: MessageFlags.IsComponentsV2, ...toPayload(data) });
        } catch (err) {
            return interaction.editReply(notice(config.emojis.no, `Discord rejected the message: ${err.message}`.slice(0, 1900)));
        }

        await interaction.editReply(notice(config.emojis.yes, `Message sent to ${channel}.`));
        setTimeout(() => interaction.deleteReply().catch(() => { }), 2000);
    }
}).toJSON();
