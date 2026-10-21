const { ChatInputCommandInteraction, ButtonStyle, ButtonBuilder, SectionBuilder, ActionRowBuilder, ContainerBuilder, TextDisplayBuilder, MediaGalleryItemBuilder, MediaGalleryBuilder, MessageFlags, ApplicationCommandOptionType, SeparatorBuilder, SeparatorSpacingSize } = require("discord.js");
const DiscordBot = require("../../client/DiscordBot");
const ApplicationCommand = require("../../structure/ApplicationCommand");
const config = require("../../config");
const { notice } = require("../../utils/Notice");
const { isStaff, replyError } = require("../../utils/Tickets");

const banners = {
  rules: 'https://assets.itofu.net/f/propwash-rules.png',
  welcome: 'https://assets.itofu.net/f/propwash-welcome.png',
  donations: 'https://assets.itofu.net/f/propwash-donations.png',
  tickets: 'https://assets.itofu.net/f/propwash-tickets.png',
  autoroles: 'https://assets.itofu.net/f/propwash-autoroles2.png'
}

const links = {
  website: 'https://propwashfpv.com/',
  docs: 'https://propwashfpv.com/docs/',
  github: 'https://github.com/LardTom/propwash-fpv',
  configurator: 'https://propwashfpv.com/configurator/',
  curseforge: 'https://www.curseforge.com/minecraft/mc-mods/propwash-fpv',
  kofi: 'https://ko-fi.com/propwashfpv'
}

module.exports = new ApplicationCommand({
  command: {
    name: 'message',
    description: 'Pre-made messages',
    type: 1,
    options: [
      {
        name: 'message',
        description: 'Select the message',
        type: ApplicationCommandOptionType.String,
        required: true,
        choices: [
          { name: '📘 Rules', value: 'rules' },
          { name: '👋 Welcome', value: 'welcome' },
          { name: '☕ Donations', value: 'donations' },
          { name: '🎫 Tickets', value: 'tickets' },
          { name: '🎭 Auto Roles', value: 'autoroles' },
          { name: '🎤 Voice', value: 'voice' }
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

    const separator2 = new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large);

    const messageType = interaction.options.getString('message');

    if (messageType === 'rules') {
      const container = new ContainerBuilder()
        .addMediaGalleryComponents(new MediaGalleryBuilder()
          .addItems(new MediaGalleryItemBuilder()
            .setURL(banners.rules)
          ))
        .addSeparatorComponents(separator2)
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`## 📘  Rules`))
        .addSeparatorComponents(separator2)
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`
This is the official Discord server for Propwash FPV. By being here you agree to these rules and to Discord's [Terms of Service](https://discord.com/terms) and [Community Guidelines](https://discord.com/guidelines).

1️⃣ Respect above all
> Be kind to staff and other pilots. Insults, harassment, discrimination and drama are not tolerated. Everyone crashed their first whoop once.

2️⃣ English only
> Keep public channels in English so everyone, including staff, can follow the conversation.

3️⃣ No spam or self-promotion
> No spam, flooding, mass pings or unsolicited ads. Don't DM members with invites or promotions.

4️⃣ Use the right channel
> Keep each channel on topic. Bugs and suggestions go in <#${config.channels.bugsAndIdeas}>, and anything private goes in a ticket.

5️⃣ Only download from official sources
> Propwash is only distributed through [CurseForge](${links.curseforge}), the [official GitHub](${links.github}) and, once it's approved, Modrinth. Don't reupload the mod or share modified builds, and be careful with files from anywhere else.

6️⃣ Be patient with updates
> Propwash is actively developed. Asking for ETAs over and over won't make updates come faster: announcements will be posted here when they're ready.

7️⃣ Don't ping or DM the developer for support
> Check the [docs](${links.docs}), the FAQ and the in-game Flight School first (hold \`M\` over any Propwash item). If you still need help, open a ticket.

8️⃣ Keep it safe for everyone
> No NSFW, gore, illegal content, cheats or exploits. Usernames and avatars must follow these rules too.

9️⃣ Staff have the final say
> Moderators may act on anything that breaks the spirit of these rules, even if it isn't listed here.`))
        .addSeparatorComponents(separator2)
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`-# Need to report someone or something? Open a \`🚨 Report\` ticket in <#${config.channels.tickets}>.`))

      await interaction.channel.send({
        flags: MessageFlags.IsComponentsV2,
        components: [container]
      });
    } else if (messageType === 'welcome') {
      const container = new ContainerBuilder()
        .addMediaGalleryComponents(new MediaGalleryBuilder()
          .addItems(new MediaGalleryItemBuilder()
            .setURL(banners.welcome)
          ))
        .addSeparatorComponents(separator2)
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`## 👋  Welcome to Propwash FPV!`))
        .addSeparatorComponents(separator2)
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`
Propwash turns Minecraft into a realistic FPV drone simulator. Build and fully customize your own quadcopter from real drone parts, strap on your goggles, and fly it in first person with a proper flight model, a Betaflight-style flight controller and video that breaks up like a real analog or digital link. Race it through gates, learn the ropes in the built-in Flight School, and craft your way there in survival.

📥 Download
> 🟠 CurseForge: ${links.curseforge}
> 🟢 Modrinth: in review, coming soon
> ⚙️ Minecraft 26.3 · Fabric or NeoForge · Java 25

🚁 First flight
> 1. Build a drone at the Drone Workbench (creative has ready-to-fly presets).
> 2. Bind it: right-click the drone with the FPV Remote.
> 3. Wear goggles that match its video system (analog or digital), hold the radio, right-click into the air and arm.

🎮 Controls
> 📡 RC transmitter (EdgeTX / OpenTX over USB), 🎮 gamepad or ⌨️ keyboard.
> Press \`K\` to open the Configurator and hold \`M\` over any Propwash item for its Flight School lesson.

📖 Before you start
> 📚 Docs: ${links.docs}
> 📘 Rules: <#${config.channels.rules}>
> 🐛 Bugs and ideas: <#${config.channels.bugsAndIdeas}>
> 🎫 Support: <#${config.channels.tickets}>`))
        .addSeparatorComponents(separator2)
        .addActionRowComponents(new ActionRowBuilder()
          .addComponents(new ButtonBuilder()
            .setStyle(ButtonStyle.Link)
            .setLabel('Download on CurseForge')
            .setURL(links.curseforge)
            .setEmoji('📥')
          )
          .addComponents(new ButtonBuilder()
            .setStyle(ButtonStyle.Link)
            .setLabel('Build a drone online')
            .setURL(links.configurator)
            .setEmoji('🛠️')
          )
          .addComponents(new ButtonBuilder()
            .setStyle(ButtonStyle.Link)
            .setLabel('Website')
            .setURL(links.website)
            .setEmoji('🌐')
          )
        )

      await interaction.channel.send({
        flags: MessageFlags.IsComponentsV2,
        components: [container]
      });
    } else if (messageType === 'donations') {
      const container = new ContainerBuilder()
        .addMediaGalleryComponents(new MediaGalleryBuilder()
          .addItems(new MediaGalleryItemBuilder()
            .setURL(banners.donations)
          ))
        .addSeparatorComponents(separator2)
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`## ☕  Support Propwash`))
        .addSeparatorComponents(separator2)
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`
Propwash is free and always will be. If you enjoy flying it and want to support its development, you can buy Tom a coffee on Ko-fi.

💛 Where does it go?
> Every donation helps put more time into Propwash: new parts and frames, flight model improvements, a 1.21.1 backport and the upcoming Propwash: Server add-on.

🙌 Other ways to help
> - Report bugs and share ideas in <#${config.channels.bugsAndIdeas}>.
> - Leave a follow on [CurseForge](${links.curseforge}).
> - Share your best flights and builds with the community.`))
        .addSeparatorComponents(separator2)
        .addSectionComponents(new SectionBuilder()
          .addTextDisplayComponents(new TextDisplayBuilder().setContent('-# Donations are completely optional and don\'t unlock anything in the mod. Thank you for flying with us!'))
          .setButtonAccessory(new ButtonBuilder()
            .setStyle(ButtonStyle.Link)
            .setLabel('Donate on Ko-fi')
            .setURL(links.kofi)
            .setEmoji('☕')
          )
        )

      await interaction.channel.send({
        flags: MessageFlags.IsComponentsV2,
        components: [container]
      });
    } else if (messageType === 'tickets') {
      const container = new ContainerBuilder()
        .addMediaGalleryComponents(new MediaGalleryBuilder()
          .addItems(new MediaGalleryItemBuilder()
            .setURL(banners.tickets)
          ))
        .addSeparatorComponents(separator2)
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`## 🎫  Open a Ticket`))
        .addSeparatorComponents(separator2)
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`
You can post bugs and ideas publicly by opening a post in <#${config.channels.bugsAndIdeas}>. If you'd rather talk in private, pick a category below and a private channel will be created for you and the staff team.

❓ Help
> Questions about installing, controllers, flying or anything else in the mod. Check the FAQ and the in-game Flight School first.

🐛 Bug
> A bug you'd rather not post publicly, or one that needs private follow-up. Include your Minecraft version, loader (Fabric/NeoForge), Propwash version, controller and, if you can, your log or crash report.

🚨 Report
> Report a member or something that breaks the rules. Add screenshots or message links as evidence.`))
        .addSeparatorComponents(separator2)
        .addActionRowComponents(new ActionRowBuilder()
          .addComponents(new ButtonBuilder()
            .setStyle(ButtonStyle.Primary)
            .setLabel('Help')
            .setCustomId('ticket_help')
            .setEmoji('❓')
          )
          .addComponents(new ButtonBuilder()
            .setStyle(ButtonStyle.Secondary)
            .setLabel('Bug')
            .setCustomId('ticket_bug')
            .setEmoji('🐛')
          )
          .addComponents(new ButtonBuilder()
            .setStyle(ButtonStyle.Secondary)
            .setLabel('Report')
            .setCustomId('ticket_report')
            .setEmoji('🚨')
          )
        )
        .addSeparatorComponents(separator2)
        .addTextDisplayComponents(new TextDisplayBuilder().setContent('-# Please open only one ticket per issue. Tickets left without a reply may be closed.'))

      await interaction.channel.send({
        flags: MessageFlags.IsComponentsV2,
        components: [container]
      });
    } else if (messageType === 'autoroles') {
      const button = (group, key, label, emoji) => new ButtonBuilder()
        .setStyle(ButtonStyle.Secondary)
        .setLabel(label)
        .setCustomId(`autorole:${group}:${key}`)
        .setEmoji(emoji);

      const container = new ContainerBuilder()
        .addMediaGalleryComponents(new MediaGalleryBuilder()
          .addItems(new MediaGalleryItemBuilder()
            .setURL(banners.autoroles)
          ))
        .addSeparatorComponents(separator2)
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Pick your roles with the buttons below. Click a role you already have to remove it.`))
        .addSeparatorComponents(separator2)
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`🔔 Notifications\n-# Get pinged only for what you care about. Pick as many as you want.`))
        .addActionRowComponents(new ActionRowBuilder().addComponents(
          button('notifications', 'updates', 'Updates', '📢'),
          button('notifications', 'raceEvents', 'Race Events', '🏁'),
        ))
        .addSeparatorComponents(separator2)
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`🛩️ Experience\n-# What kind of pilot are you?`))
        .addActionRowComponents(new ActionRowBuilder().addComponents(
          button('experience', 'realPilot', 'Real FPV pilot', '🚁'),
          button('experience', 'simPilot', 'Sim pilot', '🎮'),
          button('experience', 'newToFpv', 'New to FPV', '🐣')
        ))
        .addSeparatorComponents(separator2)
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`⚙️ Loader\n-# Which loader do you play Propwash on? Pick one or both.`))
        .addActionRowComponents(new ActionRowBuilder().addComponents(
          button('loader', 'fabric', 'Fabric', '🧵'),
          button('loader', 'neoforge', 'NeoForge', '🦊')
        ))

      await interaction.channel.send({
        flags: MessageFlags.IsComponentsV2,
        components: [container]
      });
    } else if (messageType === 'voice') {
      const container = new ContainerBuilder()
        .addSectionComponents(new SectionBuilder()
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(`## 🎤  Temporary voice channel\nPress the button or use the \`/vc\` command to create a temporary voice channel.`))
          .setButtonAccessory(new ButtonBuilder()
            .setStyle(ButtonStyle.Primary)
            .setLabel('Create')
            .setCustomId('vc_create')
            .setEmoji('🎤')
          )
        )

      await interaction.channel.send({
        flags: MessageFlags.IsComponentsV2,
        components: [container]
      });
    } else {
      await interaction.reply(notice(config.emojis.no, 'Invalid message type.'));
      return setTimeout(() => {
        interaction.deleteReply().catch(() => { });
      }, 2000);
    }

    await interaction.reply(notice(config.emojis.yes, 'Message sent.'));
    setTimeout(() => {
      interaction.deleteReply().catch(() => { });
    }, 2000);
  }
}).toJSON();
