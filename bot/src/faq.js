// `topic` is what Jev reads: keep it short and in English (better accuracy, fewer tokens).
// `answer` is what the bot replies with.
// Sources: propwash_messages/faq.json, the CurseForge page, propwashfpv.com (docs, roadmap, changelog) and GitHub releases (0.5.2). `volatile` entries must be reviewed on the next release or port.
module.exports = {
    download_install: { // volatile: Modrinth release
        topic: 'Where to download or how to install the mod (CurseForge, Modrinth)',
        answer: 'Download it from CurseForge: https://www.curseforge.com/minecraft/mc-mods/propwash-fpv (Minecraft 26.3, Fabric or NeoForge, Java 25). Easiest way for beginners: install the CurseForge app, search "propwash", install it and launch the game from the CurseForge app. The Modrinth page (https://modrinth.com/mod/propwash-fpv) is still in review.'
    },
    versions: { // volatile: ports/backports
        topic: 'Required Minecraft version or loader, or ports/backports to 26.2, 1.21.1 or other versions',
        answer: 'Propwash (latest: 0.5.2) needs Minecraft 26.3 and Java 25, with Fabric (Loader 0.19.5+ and Fabric API 0.161.0+) or NeoForge (26.3.0.10-beta or newer). Only 26.3 is supported for now; a Minecraft 1.21.1 backport (Fabric and NeoForge) is planned for after 0.6.0, with no date yet. Roadmap: https://propwashfpv.com/roadmap/'
    },
    getting_started: {
        topic: 'How to get started: building a first drone, which parts it needs, or learning to fly FPV as a beginner',
        answer: '1. Place a Drone Workbench and build a drone: frame, flight controller, four matching motors, four props, a video unit and a battery (in creative there are five ready-to-fly presets).\n2. Place the drone and right-click it with the FPV Remote to bind it.\n3. Put on goggles that match the drone\'s video system (analog or digital; creative goggles receive both), hold the radio and right-click into the air. Arm with a switch or Z and take off.\nNew to FPV? Press M for the Flight School and its 20 hands-on flight training lessons (from hovering to gates and flips), or hold M over any Propwash item for its lesson. Angle mode keeps the drone level, which is easier to learn. Full guide: https://propwashfpv.com/docs/guide/'
    },
    controller_supported: {
        topic: 'Whether a controller or radio is compatible (Xbox, PS4/PS5, Radiomaster, DJI, keyboard, mouse), not connection problems',
        answer: 'You can fly with an RC transmitter, a gamepad, mouse + keyboard or the keyboard alone.\n- Radios (EdgeTX/OpenTX, Radiomaster...): plug them in over USB in joystick (HID) mode. There is no direct receiver/protocol support.\n- Gamepads (Xbox, PS4/PS5...): detected automatically, Mode 2 layout by default; stick modes 1-4 are selectable in the receiver wizard or K > Receiver.\n- Mouse + keyboard: the mouse steers like aiming in a shooter, W/S or the mouse wheel set the throttle. Pick it in K > Receiver.\n- Keyboard: always works, starts in Angle mode. W/S throttle, A/D yaw, arrow keys pitch and roll.\nA real radio is much better than a gamepad. Use a USB cable that carries data, not a charge-only one.'
    },
    controller_not_detected: {
        topic: 'Controller or radio not detected, not connecting or SDL error',
        answer: 'Try this in order:\n1. Set your radio to USB Joystick (HID) mode instead of Automatic.\n2. Use a USB cable that transfers data and the radio\'s USB port for sims.\n3. Restart Minecraft, load into a world FIRST, then connect the controller.\n4. Press K > Receiver > Receiver Wizard to set it up manually.\n5. Check whether another launcher/client or other mods cause it (an SDL error was solved by switching away from Dawn Client/Feather).\nIf it works in other sims but not here, open a ticket in #bugs-and-ideas with your OS, launcher and controller.'
    },
    recalibrate_controls: {
        topic: 'Wrong or mixed sticks, drone drifting or flying backwards, how to calibrate or configure the controller',
        answer: 'Run K > Receiver > Receiver Wizard. Correct mapping (Mode 2): left stick up/down = throttle, left stick left/right = yaw, right stick up/down = pitch, right stick left/right = roll. On the check page throttle down must read 1000 and up 2000. If one stick movement does two things, the controller is mis-calibrated. For gamepads with axis conflicts raise the deadband. Pitch inverted? Use K > Receiver > Invert pitch, and pick your stick mode (1-4) there too.\nIf the controls are right but the drone still drifts or won\'t fly straight, you probably have chipped props: swap them in the field (see the repair answer).'
    },
    throttle_not_low_arm: {
        topic: '"Throttle not low" message, how to arm or take off',
        answer: 'Hold the radio and right-click into the air, then ARM with your arm switch or Z (Y on QWERTZ). The throttle must be at the lowest position before arming. If it still says "Throttle not low" with the stick at the bottom:\n1. Update to 0.5.0 (the wizard used to store the throttle the wrong way round) and recalibrate with K > Receiver > Receiver Wizard.\n2. Relaunch Minecraft, disconnect/reconnect the controller and recalibrate.'
    },
    flight_modes: {
        topic: 'How to switch flight mode (Acro, Angle, Horizon), R key not switching, cannot flip or do a 360',
        answer: 'Keys: R cycles the modes, Numpad 1 = Acro, Numpad 2 = Angle, Numpad 3 = Horizon. On a radio, AUX2 is the mode switch by default (low Acro, middle Horizon, high Angle); you can map switches by hand in K > Modes. Flips and rolls need Acro (or Horizon at full stick). Keyboard flight starts in Angle mode. The bug where mode keys sometimes didn\'t switch is fixed in 0.5.0.'
    },
    upside_down: {
        topic: 'Drone landed or stuck upside down, flip it back over, turtle mode, or 3D mode to fly inverted',
        answer: 'Since 0.5.2 a drone that landed upside down can flip itself back over with its props (turtle mode): put it on a radio switch or Numpad 8 in K > Modes. You can also press U (Flip upright) or pick it up with an empty hand. With 3D mode the motors spin backwards below center throttle, so you can fly inverted and take off upside down: unlock it once in K > Modes (row 3D mode), then put it on a switch or Numpad 6. Servers can forbid it with the world rule propwash:allow_3d_mode.'
    },
    camera_angle: {
        topic: 'How to change the drone camera tilt / uptilt angle',
        answer: 'Shift + right-click the placed drone without a battery in hand to open the drone\'s service menu - the camera angle is saved per drone there.'
    },
    goggles: {
        topic: 'Whether goggles are needed, using real FPV goggles, wrong goggles or NO SIGNAL, or how to see through the drone',
        answer: 'Real goggles can\'t be linked: you use the in-game goggles item. Goggles aren\'t bound since 0.5.0, they just have to match the drone\'s video system: analog goggles for analog video, digital for digital, creative goggles for both. Right-click the drone with the goggles in hand to check. With wrong goggles the remote refuses to connect and in flight you get NO SIGNAL (noise or black). Without goggles you fly line of sight with a compact radio HUD.'
    },
    open_menu: {
        topic: 'How to open the Propwash menu, configurator, settings or keybinds',
        answer: 'Press K to open the Configurator: tuning, rates, receiver, modes, keys, video, OSD, LED strip, racing, rescue, world rules, blackbox and more. Ctrl+F searches every setting. Press M for the Flight School, or hold it over any Propwash item for its lesson. Docs: https://propwashfpv.com/docs/'
    },
    survival_crafting: {
        topic: 'Survival mode: crafting recipes, crafting materials, or finding parts and drones in chests',
        answer: 'Everything except the creative goggles can be crafted at a normal crafting table. Recipes unlock as soon as you hold an ingredient - search "propwash" in the recipe book. A whoop, the radio and analog goggles only need copper, iron and redstone; high-end parts need gold, diamonds, quartz, amethyst, glowstone and echo shards. Loot chests (villages, mineshafts, dungeons, ancient cities, bandos...) can hold parts, batteries and rarely a ready-to-fly whoop.'
    },
    battery: {
        topic: 'Charging or swapping drone batteries, battery not fitting',
        answer: 'Every battery is its own item with its own charge. Charge it in the Battery Charger (four bays, faster with redstone). To swap the pack, hold the new battery and Shift + right-click the drone. Each pack only fits the frames it suits, unless the world rule "Parts must fit" is off.'
    },
    repair_parts: {
        topic: 'Repairing a crashed or damaged drone, replacing broken props or parts',
        answer: 'Every crash wears parts down: props go first, and a really hard hit puffs up the battery. Swap props right where you crashed (Shift + right-click the drone without a battery in hand to open its service menu); other parts are replaced at the Drone Workbench. Two damaged props of the same kind can be crafted together or joined in a grindstone (both conditions add up, plus 5%). Crash damage can be turned off with the world rules.'
    },
    world_rules: {
        topic: 'Infinite battery, no crash damage, gravity, wind, Simulation tab missing, or world rules / gamerules and presets',
        answer: 'Since 0.5.0 these are world rules that apply to everyone: K > World rules. The singleplayer/LAN host, server operators and admins allowed to use /gamerule can change them; everyone else sees them read-only. One click sets a preset: Realistic (default), Training (infinite battery, no wear) or Arcade (also any part fits, no wind, infinite range). Or with commands, e.g. `/gamerule propwash:battery_scale 0` (infinite battery) or `/gamerule propwash:crash_damage false`. Since 0.5.2, parts of the world can also have their own simulation settings (e.g. infinite battery or zero gravity) with zones, made with a zone editor or `/propwash zone` (World rules tab). Flights with changed physics rules don\'t count for leaderboards. All rules: https://propwashfpv.com/docs/gamerules/'
    },
    range_limit: {
        topic: 'Signal range limit, video breaking up, or losing signal behind walls, trees or hills',
        answer: 'Video range depends on your video unit, and obstacles weaken the signal by what they are made of: leaves and glass a little, masonry a lot, earth, rock, water and metal block it. Signal repeaters (128 blocks each, up to four in a row) carry video and control through walls and stairwells. The world rules "Infinite range (analog/digital)" remove the limit, and creative goggles have unlimited range. Servers can also cap the pilot-to-drone distance. Since 0.5.2 the video degrades gradually (analog turns to static, digital to blocks and lag) before NO SIGNAL, and you can raise the VTX power (25-1600 mW) in K > Video channel or in flight with a switch or F10: more range, but more battery drain and heat.'
    },
    return_home: {
        topic: 'Getting a lost drone back, return to home (RTH), GPS Rescue or teleporting the drone',
        answer: 'GPS Rescue climbs to a safe height, flies home around trees and buildings and lands - set it up in K > Rescue. It also brings the drone home on its own if you stop flying, leave the game or lose the signal (servers can turn that off). Without a remote connection, right-clicking into the air connects to the nearest drone you bound within 128 blocks. The drone is an entity, so you can also use /tp. Since 0.5.1 drones are tagged with their owner, e.g. `/tp @e[type=propwash:drone,tag=pw_owner_<name>] @s`.'
    },
    servers: { // volatile: update when a public server exists
        topic: 'Whether it works in multiplayer or on servers, or if there is an official, community or racing server',
        answer: 'Propwash works in multiplayer: install the same version on the server and on every client (0.5.0 and 0.5.1 can mix, but 0.5.2 can\'t join a 0.5.0/0.5.1 server or the other way round). Add-ons the server has (like Just More Parts) are needed by everyone; add-ons only you have just stay off there. The server loads chunks around your drone, so render distance doesn\'t hold you back, and press F7 to watch other pilots\' video. There is no official public server yet, but several members are organising a community server - watch the announcements. A "Propwash: Server" add-on is planned for 0.6.0.'
    },
    racing: {
        topic: 'How to set up race gates, courses, lap timing or leaderboards',
        answer: 'Place gates and course elements (flags, slalom poles, dive cubes) and link them into a course with the Course Tool: click them in order, the first gate is start and finish. Right-click any opening in the blocks to make a freeform gate, and Adjust gate turns and scales gates. You get lap timing with splits, a ghost of your best lap and a leaderboard per course and drone class (only server-verified laps count). Right-click the air with the Course Tool to edit the course: name, laps, gate order. Since 0.5.2 Reset (Backspace or a radio switch) puts the drone back at its home point, level and disarmed, and cancels a running race; it replaces Restart race. Four kinds of race courses also generate in the world.'
    },
    flight_assist_lap: {
        topic: 'Race lap flagged as assisted or not counting on the leaderboard',
        answer: 'Since 0.5.0 the race tells you why a lap doesn\'t count, and since 0.5.2 the "Why is my lap assisted?" check in the Race tab lists the exact reasons (e.g. gravity at 130% instead of 100%). Flight aids that flag a lap: altitude/position hold, GPS rescue, world rules that change the physics (e.g. infinite battery), a creative drone, a drone that only fits with "Parts must fit" off, or creative goggles set to less latency than the drone\'s video unit. Creative goggles\' unlimited range and clean picture are fine. With the world rule "Save assisted laps" they are kept in a separate Assisted section, never as records.'
    },
    pilot_body: {
        topic: 'Player died, drowned or took damage while flying the drone, or invulnerable pilot',
        answer: 'Since 0.5.0 your body is no longer invulnerable while you fly: it can fall, burn, drown and die like any player. A red edge, a sound and a notice in FPV warn you, and if you die the drone goes into failsafe. Park yourself somewhere safe before flying. Servers can protect pilots with the world rule propwash:invulnerable_pilots.'
    },
    drone_size: {
        topic: 'Drones look smaller after updating, or how to change the drone display size',
        answer: 'Since 0.5.0 drones are shown at their real size by default, so their speed looks right. You can change it back in K > Display > Drone size.'
    },
    maps: {
        topic: 'Where to get or share maps or tracks for flying',
        answer: 'Any normal Minecraft map works - castle and village worlds have good flying spots, four kinds of race courses generate in the world, and bandos (abandoned barns, factories, piers, oil rigs, mine heads) are made for freestyle. Bando maps are sold by journeyman cartographers and found in bando chests. Share and find maps in the #maps channel.'
    },
    addons_parts: {
        topic: 'Add-on API, making add-ons, more drone parts, or sharing drone builds',
        answer: 'Anyone can make add-ons with the add-on API (MIT licensed): https://propwashfpv.com/docs/api/ - parts can also be defined in JSON (https://propwashfpv.com/docs/parts-format/). The first add-on is "Propwash: Just More Parts" (1.1.1, works with Propwash 0.4.0 to 0.5.2; its new battery curves need 0.5.2) -> https://www.curseforge.com/minecraft/mc-mods/propwash-just-more-parts\nYou can design a drone with every part in the online configurator (https://propwashfpv.com/configurator/) and share its link in the builds forum. In creative, the Creative Flight Controller\'s Drone Editor lets you set masses, motors and props freely and share the drone as a code.'
    },
    hardware_recommendation: {
        topic: 'Which real-life radio, drone or FPV gear to buy',
        answer: 'Community advice: start with a real radio first (RadioMaster Pocket, ~100-120 EUR; the Boxer also works) to build muscle memory - it also works in Propwash over USB. For a first real quad start with a tiny whoop (very durable) and learn acro there. A decent 5" freestyle build needs ~500 or more including batteries. Share builds in #drones.'
    },
    open_source: {
        topic: 'Whether the mod is open source, its source code or its license',
        answer: 'Since 0.5.0 Propwash is source-available on GitHub (https://github.com/LardTom/propwash-fpv) under the PolyForm Shield License 1.0.0: you may read and build the code, use it in modpacks and send pull requests, but not re-upload Propwash, publish forks as alternative downloads or build competing mods. The add-on API, example add-on and docs are MIT. 0.4.0 and older stay All Rights Reserved.'
    },
    next_update: { // volatile: roadmap
        topic: 'When the next update comes out, what is planned (roadmap), or early access / beta testing',
        answer: 'The latest version is 0.5.2 (fisheye lens, waterproof drones, turtle mode and zones). Next up is 0.6.0: servers, game modes and share codes for every add-on, with the "Propwash: Server" add-on; the 1.21.1 backport comes after it. No dates yet. There is no early access; ideas are welcome in the Discord. Roadmap: https://propwashfpv.com/roadmap/'
    },
    fisheye: {
        topic: 'FPV view looks stretched or zoomed after updating, fisheye lens, or how to change the lens distortion',
        answer: 'Since 0.5.2 the FPV view looks through a fisheye lens: objects ahead look larger and closer and the edges curve away. Change it with the Fisheye slider in K > Video (0-100%, default 80%). Interference, 4:3, the OSD, visible props and shader packs all follow it.'
    },
    waterproof: {
        topic: 'Flying a drone in water or rain, waterproof coating',
        answer: 'Since 0.5.2 a Waterproof Coating lets drones fly in water. Craft the spray can with iron nuggets, honeycomb and resin: one can coats ten drones. The world rule "Drones are waterproof" coats every drone (on in the Arcade preset).'
    },
    shaders: {
        topic: 'Using shaders, Iris/Oculus or other mods for rendering',
        answer: 'Shaders work. With an active shader pack (Iris/Oculus) or another renderer, the goggles video effect falls back to a simpler overlay. K opens the Propwash Configurator, so rebind your shader menu key if it was on K.'
    },
    led_lights: {
        topic: 'LED strips, headlights or flying in dark caves',
        answer: 'LED strips come in 11 colors with Betaflight-style modes and light the way ahead in FPV, so caves become flyable. Switch them in flight with a radio switch or F8, and configure them in K > LED Strip. With LambDynamicLights (optional) the drone becomes a real light source.'
    },
    black_screen: {
        topic: 'Goggles show a black screen, for example after adding an LED strip or at night',
        answer: 'If it says NO SIGNAL, your goggles don\'t match the drone\'s video system (see the goggles answer). The black FPV view with LEDs at night on some Intel GPUs and the dark shadow with shader packs are fixed in 0.5.0, so update first. If it persists, reconnect the remote and open a ticket in #bugs-and-ideas with your launcher, GPU and OS.'
    },
    record_video: {
        topic: 'Recording flights or videos, slow recording or ffmpeg',
        answer: 'Mount an Action Cam on your drone and bind a record button or switch. It records real MP4 videos (up to 1440p60, optionally with motor sound). The Light cam (42 g) runs off the flight pack; the Heavy one (150 g) is stabilized with its own battery. Install the free program ffmpeg and recording uses your graphics card\'s encoder (much faster); the Action cam tab shows whether it was found. It can also save flights as a camera path for the Flashback replay mod (long flights are thinned when saved, "Flashback limit", on by default).'
    },
    osd_sticks: {
        topic: 'Showing stick positions or customizing the OSD on screen',
        answer: 'Enable it in K > OSD. The OSD has 43 elements, presets and a drag-and-drop editor.'
    },
    update_not_showing: {
        topic: 'Updated the mod but the new features do not show up',
        answer: 'CurseForge sometimes doesn\'t recognise the new version as an update (it may even offer to roll back to the previous one). Give it a bit more time / refresh, and check the version under Mods in-game.'
    },
    camera_smoothing: {
        topic: 'Player camera stays smoothed after flying FPV',
        answer: 'The mod doesn\'t smooth the camera except for the action camera. Check other mods or a double hotkey; restarting the game usually fixes it.'
    }
};
