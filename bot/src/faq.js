// `topic` is what Jev reads: keep it short and in English (better accuracy, fewer tokens).
// `answer` is what the bot replies with.
// Sources: Propwash FPV 0.6.0 (CHANGELOG, release notes, CurseForge description, requirements in the release jars),
// propwashfpv.com for 0.6.0 (home page with FAQ, server and video sections, player guide, world rules, add-on API,
// license in plain words, add-ons, roadmap, configurator, sim, convert), the add-ons Just More Parts 1.2.0,
// Camera Drones 1.0.0 and Mob Defense 1.0.0 (README, docs, changelog), the listing texts, and older community
// answers from propwash_messages/faq.json. `volatile` entries must be reviewed on the next release or port.
module.exports = {
    download_install: { // volatile: CurseForge goes live with 0.6.0, Modrinth page still in review
        topic: 'Where to download or how to install the mod (CurseForge, Modrinth, CurseForge app, mods folder), or an update not showing up',
        answer: 'CurseForge: https://www.curseforge.com/minecraft/mc-mods/propwash-fpv (Modrinth page still in review).\nEasiest: install the CurseForge app, search "propwash" and start the game from the app.\nBy hand: put the jar for your loader (Fabric needs Fabric API) into the mods folder of every client and the server.\nUpdate not showing? CurseForge can be slow; check the version under Mods.'
    },
    official_sources: { // volatile: Modrinth page still in review
        topic: 'Whether the mod is safe or a virus, unofficial download sites like 9minecraft, downloading older versions',
        answer: 'Download Propwash only from its official pages: CurseForge, Modrinth (page still in review) and the GitHub releases, which also keep older versions: https://github.com/lardtom/propwash-fpv/releases\nSites like 9minecraft are not official, so don\'t download from them.'
    },
    versions: { // volatile: ports/backports (1.21.1 planned)
        topic: 'Required Minecraft version, loader, Java or Fabric API version, or ports/backports to 1.21.1, 26.2 or other versions',
        answer: 'Propwash 0.6.0 needs Minecraft 26.3 and Java 25, with Fabric (Loader 0.19.5+, Fabric API 0.161.0+26.3) or NeoForge 26.3.0.10-beta+, on client and server.\nOnly 26.3 is supported. A 1.21.1 version is planned after 0.6.0, no date yet: https://propwashfpv.com/roadmap/'
    },
    whats_new: { // volatile: latest version
        topic: 'What is new in 0.6.0, latest update features, patch notes or changelog',
        answer: '0.6.0 brings PW3 share codes for every add-on, a bigger race system (loops, point to point, course IDs), a replay and ghost for every leaderboard time, the freecam drone (F6) and the RX block.\nNeoForge players can join Fabric servers, and there are two new add-ons: Camera Drones and Mob Defense.\nFull list: https://propwashfpv.com/changelog/'
    },
    updating_from_05: { // volatile: upgrade notes 0.5.x to 0.6.0
        topic: 'Updating from 0.5.x to 0.6.0: old worlds, drones and courses, servers, mixing versions, going back to 0.5.2',
        answer: 'Worlds, drones, courses and leaderboards from 0.5.x load unchanged.\nThe server and every client must update to 0.6.0 together; 0.5.x and 0.6.0 can\'t play together.\nJust More Parts must be 1.2.0, and old PW1/PW2 share codes still load.'
    },
    getting_started: {
        topic: 'How to get started: building a first drone, which parts it needs, first flight, or learning FPV as a beginner',
        answer: '1. Build a drone at the Drone Workbench (or take a creative preset).\n2. Place it and right-click it with the FPV Remote to bind it.\n3. Wear goggles that match its video system, hold the radio, right-click the air and arm with Z.\nNew to FPV? Press M for the Flight School. Guide: https://propwashfpv.com/docs/guide/'
    },
    place_drone: {
        topic: 'Right-click does not place the drone, holding a frame instead of a finished drone, getting the drone out of the workbench',
        answer: 'A frame on its own is a part, not a drone. Put it into the Drone Workbench with the other parts, take the finished drone out on the right and right-click a block with it.\nIn creative the ready-to-fly presets are placed right away.\nGuide: https://propwashfpv.com/docs/guide/#first-flight'
    },
    controller_supported: {
        topic: 'Whether a controller or radio is compatible (Xbox, PS4/PS5, Radiomaster, EdgeTX, ExpressLRS, DJI, Bluetooth, mouse, keyboard), not connection problems',
        answer: 'Radios (EdgeTX/OpenTX) work over USB in Joystick (HID) mode, gamepads are detected automatically, and mouse + keyboard or the keyboard alone work too.\nPick your device and stick mode in K > Receiver.\nA real radio flies best; use a USB cable that carries data.'
    },
    controller_not_detected: {
        topic: 'Controller or radio not detected, not connecting, missing from the device list, macOS problems or SDL error',
        answer: '1. Choose USB Joystick (HID) on the radio when you plug it in, and use a data cable directly on the computer.\n2. Pick the radio in K > Receiver or run the Receiver Wizard.\n3. macOS: keep Apple GameController (Receiver > Advanced) off.\nMore fixes: https://propwashfpv.com/docs/guide/#radio-not-detected'
    },
    recalibrate_controls: {
        topic: 'Wrong or mixed sticks, inverted axis, stick mode 1/2, drone drifting or flying backwards, how to calibrate the controller',
        answer: 'Run K > Receiver > Receiver Wizard: pick your stick mode, move each stick, calibrate. Throttle down must read 1000, up 2000; Inv. flips a reversed channel.\nRadios: set Read as > Raw axes in the Receiver tab.\nControls right but still drifting? Probably chipped props: swap them.'
    },
    throttle_not_low_arm: {
        topic: 'Drone won\'t arm on the ground: "Throttle not low", "Not level", "Arm switch on" or other arm messages, how to arm',
        answer: 'Arm with your switch or Z (Y on QWERTZ); the OSD names why it refuses.\nTHROTTLE NOT LOW: stick fully down, otherwise recalibrate in the Receiver Wizard.\nNOT LEVEL: tilt below the max arm angle. ARM SWITCH ON: switch off, then on.\nTHROTTLE NOT CENTERED means 3D mode is on.'
    },
    arm_again_in_air: {
        topic: 'Disarmed in the air and cannot arm again, arm button does nothing mid-air, arming from any angle or upside down',
        answer: 'Arming only works below the max arm angle (25 degrees by default).\nSet K > Configuration > Arming > Max arm angle to 180 to arm in any attitude, even in the air or upside down. The throttle must still be down.'
    },
    flight_modes: {
        topic: 'How to switch flight mode (Acro, Angle, Horizon), altitude or position hold, R key not switching, cannot flip or do a 360',
        answer: 'R cycles the modes, Numpad 1/2/3 = Acro/Angle/Horizon; on a radio AUX2 is the mode switch (change it in K > Modes).\nFlips and rolls need Acro (or Horizon at full stick). Angle keeps the drone level.\nAltitude hold is Numpad 4, position hold Numpad 5.'
    },
    upside_down: {
        topic: 'Drone landed or stuck upside down, flip it back over, turtle mode, or 3D mode (locked, how to unlock) to fly inverted',
        answer: 'Press U to flip it upright, or pick it up with an empty hand.\nTurtle mode (Numpad 8 or a switch in K > Modes): arm on its back and push the stick toward the side it should tip.\n3D mode (unlock in K > Modes, then Numpad 6) lets you fly inverted.'
    },
    drone_stuck_block: {
        topic: 'Drone stuck inside a block or wall after a crash, drone clipping into blocks',
        answer: 'Fixed in 0.6.0, please update: a drone that ends up inside a block now gets out the shortest way.\nStill stuck? Reset it to its home point with Backspace, or disarm and pick it up with an empty hand.'
    },
    camera_angle: {
        topic: 'How to change the drone camera tilt / uptilt angle',
        answer: 'K > Video, section "Camera of this drone", while you hold or fly it, or Shift + right-click the placed drone for its service menu.\nThe angle is saved per drone and stays within the frame\'s camera mount.'
    },
    goggles: {
        topic: 'Whether goggles are needed, real FPV goggles or VR, wrong goggles, NO SIGNAL or no picture in the goggles',
        answer: 'Use the in-game goggles that match the drone\'s video system: analog, digital, or creative goggles for both. Right-click the drone with them to check.\nNO SIGNAL right away means wrong goggles; breaking up far away is the signal.\nReal FPV goggles and VR aren\'t supported (HDMI goggles can mirror your screen).'
    },
    black_screen_gpu: {
        topic: 'Black screen in the goggles while the OSD still shows, green or empty action cam recordings, laptop, Intel or integrated graphics, graphics driver',
        answer: 'That comes from the graphics card (NO SIGNAL instead means wrong goggles).\n1. Update the graphics driver.\n2. Two graphics cards? Start Minecraft on the stronger one (Windows graphics settings: javaw.exe on High performance).\n3. K > Configuration: set Graphics compatibility to On and restart Minecraft.'
    },
    open_menu: {
        topic: 'How to open the Propwash menu, configurator, settings, keybinds or the default keys',
        answer: 'K opens the Configurator (Ctrl+F searches every setting), M the Flight School.\nKeys: K > Keys or Options > Controls > Key Binds > Propwash FPV. Arm Z, stop flight Y, mode R, reset Backspace.\nAll keys: https://propwashfpv.com/docs/guide/#controls'
    },
    switch_assignment: {
        topic: 'Assigning radio switches or buttons to functions (arm, modes, beeper, recording), or running Minecraft commands from a switch',
        answer: 'K > Modes: put any function (arm, modes, rescue, beeper, recording, turtle, accessory actions...) on an AUX range or a button, held or as a toggle.\nThe Commands page puts your own Minecraft commands like /time set night on a switch (Custom command 1 to 8).'
    },
    radio_switches: {
        topic: 'Radio sticks work but switches or buttons do nothing, setting up AUX channels in the radio model mixer (EdgeTX)',
        answer: 'The radio has to send switches and buttons as channels: in the model\'s mixer on the radio, put each one on a channel from 5 up.\nPropwash starts with AUX1 arm, AUX2 flight mode, AUX3 beeper and AUX4 rescue; change them in K > Modes.'
    },
    binding_drones: {
        topic: 'Binding a drone, sharing a drone with a friend, drone bound to someone else, or resetting the binding',
        answer: 'Right-click the placed drone with your FPV Remote: it remembers the last pilot who bound it.\nTo share it, your friend clicks it with their own remote.\nReset the binding in the RX field of the service menu (Shift + right-click the drone).'
    },
    survival_crafting: {
        topic: 'Survival mode: crafting recipes, crafting materials, or finding parts and drones in chests',
        answer: 'Everything except creative-only items is craftable at a crafting table: search "propwash" in the recipe book (recipes unlock when you hold an ingredient).\nA whoop needs only copper, iron and redstone.\nLoot chests can hold parts, batteries and rarely a ready-to-fly whoop.'
    },
    battery: {
        topic: 'Charging or swapping drone batteries, battery not fitting, battery empty or flashing voltage',
        answer: 'Charge packs in the Battery Charger (faster with redstone).\nTo swap, hold a fitting pack and Shift + right-click the drone.\nA pack only fits the frames it suits (Shift over it shows which).\nInfinite battery: /gamerule propwash:battery_scale 0'
    },
    repair_parts: {
        topic: 'Repairing a crashed or damaged drone, replacing broken or chipped props, recycling parts in the workbench',
        answer: 'Swap props where you crashed: Shift + right-click the drone. Other parts are swapped at the Drone Workbench.\nTwo damaged props of the same kind craft into one.\nThe workbench Recycle tab turns parts back into materials (less when worn).'
    },
    paint: {
        topic: 'Painting a drone or changing its color, paint screen, dyes, finishes like carbon or gold, hex colors',
        answer: 'Paint at the Drone Workbench: twelve parts separately (frame, motor bells, each prop, battery wrap, camera and more) with 16 dyes, five finishes like carbon and gold, or any hex color.\nPresets and copy and paste are built in. In survival each repainted part costs a dye, and other players see your colors.'
    },
    drone_wont_take_off: {
        topic: 'Drone is armed but won\'t take off or lift, too heavy, overloaded, weak or losing power',
        answer: 'Check the OSD and the workbench: too little thrust-to-weight, OVERLOADED (too much cargo or ammo), an empty or puffed battery, PROP BROKEN or ESC OVERHEAT.\nOn honey a drone sticks for about a second on take-off.\nSwap the battery or props, or carry less.'
    },
    motor_heat: {
        topic: 'Motor overheat, ESC overheat or VTX overheat warning, drone throttles back or loses power at full throttle',
        answer: 'Motors and ESCs heat up under load and cool in forward flight.\nMOTOR OVERHEAT costs a little torque, ESC OVERHEAT (above about 140 °C) cuts power until it cools, VTX OVERHEAT turns the video power down.\nFly forward instead of hovering at full throttle, or turn off the world rule propwash:hardware_limits.'
    },
    waterproof: {
        topic: 'Flying a drone in or under water, waterproof coating, drone shorted out in water or lava',
        answer: 'Spray the drone with Waterproof Coating (iron nuggets, honeycomb, resin clump; one can coats ten drones), then it can fly in water.\nThe world rule propwash:waterproof_drones coats every drone.\nUncoated drones short out, and lava always ends the flight.'
    },
    pilot_body: {
        topic: 'Player died, drowned or took damage while flying the drone, or invulnerable pilot',
        answer: 'Your body stays a normal player while you fly and can fall, drown or die, so park it somewhere safe.\nIf you die, the drone goes into failsafe.\nServers can protect pilots: /gamerule propwash:invulnerable_pilots true'
    },
    drone_size: {
        topic: 'Drone looks too small or too big, drone display size setting, making a drone bigger with /attribute scale, decorative drones with spinning props',
        answer: 'Look only: K > Display > Drone size (real size is the default).\nReal size: /attribute @e[type=propwash:drone,limit=1,sort=nearest] minecraft:scale base set 2 (laps with it count as assisted).\nA drone item with the custom model data string blur shows spinning props.'
    },
    return_home: {
        topic: 'Getting a lost or crashed drone back, finding it, return to home (RTH), GPS Rescue, locator beeper or teleporting the drone',
        answer: 'GPS Rescue (J or a switch, set up in K > Rescue) flies the drone home and lands.\nReset (Backspace) puts it back on its home point at once.\nThe locator beeper (. key) helps you find it, and right-clicking the air connects to your nearest bound drone within 128 blocks.'
    },
    reset_home_point: {
        topic: 'Reset drone to its home point, Backspace reset, set home point, auto-arm after reset, restart race',
        answer: 'Reset (Backspace or a switch) puts the drone back on its home point, level and disarmed; set the home point with the , key. It cancels a running race.\nIf your arm switch stays on, the drone auto-arms once the throttle is down (turn it off in K > Modes > Arm / disarm).'
    },
    gripper_cargo: {
        topic: 'Gripper, carrying cargo or items with the drone, picking up and dropping items',
        answer: 'Put the Gripper into the bottom accessory slot at the workbench. Hover low (below one block) over items to grab them (up to 400 g).\nDrop them with Enter (Cargo drop) or the Drop cargo switch; landing also sets them down.'
    },
    led_lights: {
        topic: 'LED strips, headlights or flying in dark caves at night',
        answer: 'Mount an LED strip: it lights the way ahead in FPV, so caves become flyable.\nSwitch it with F8 or a radio switch, and set colors and modes in K > LED strip.\nWith LambDynamicLights the drone becomes a real light source.'
    },
    fisheye: {
        topic: 'FPV view looks stretched, round or zoomed, fisheye lens, 4:3 or 16:9 image format',
        answer: 'That\'s the fisheye lens. Change it with the Fisheye slider in K > Video (default 80%, 0% is flat).\n4:3 or 16:9 is the Image format setting in the same tab.'
    },
    osd: {
        topic: 'Showing stick positions, customizing the OSD, OSD elements, flight path marker or velocity vector',
        answer: 'K > OSD: over 40 elements, presets and a drag-and-drop editor.\nTick Stick overlay to show your sticks.\nThe Flight path marker shows where the drone really flies; tick it in the element list (off by default).'
    },
    tuning_blackbox: {
        topic: 'Tuning rates, PIDs and filters, sticks too sensitive on a gamepad, saving tune presets, or recording blackbox logs for Blackbox Explorer / PIDtoolbox',
        answer: 'Rates and PIDs are in K > Rates and K > PID Tuning, saved on the drone; Keep saves your own preset.\nBlackbox: set K > Blackbox > Log while armed to On, then open the .bbl logs in Blackbox Explorer or PIDtoolbox.\nGuide: https://propwashfpv.com/docs/blackbox/'
    },
    realism: {
        topic: 'How realistic the flight physics are, whether it flies like a real drone or a real FPV simulator',
        answer: 'Propwash has its own flight model (motor, ESC and battery simulation, prop wash, ground effect, wind) and a Betaflight-style flight controller.\nEach drone flies by its real parts, checked against blackbox logs of real drones.\nFor easier flying use the Training or Arcade preset.'
    },
    world_rules: {
        topic: 'Infinite battery, no crash damage, turning off disarm on crash, gravity, wind, or world rules / gamerules and presets (Realistic, Training, Arcade)',
        answer: 'K > World rules (the host and operators can change them). One click sets a preset: Realistic, Training (infinite battery, no wear) or Arcade.\nOr by command, e.g. /gamerule propwash:battery_scale 0 or /gamerule propwash:crash_damage false.\nAll rules: https://propwashfpv.com/docs/gamerules/'
    },
    personal_rules: {
        topic: 'Personal rules, My rules tab, letting players change physics rules for themselves, Race Legal preset',
        answer: 'Admins set per physics rule who may change it (Fixed, Zones or Players) in the Release column of K > World rules or with /propwash rules tier.\nRules released to players appear in the My rules tab; Race Legal clears your own values. Laps with your own values count as assisted.'
    },
    zones: {
        topic: 'Zones: Zone Marker, giving an area its own physics (zero gravity, infinite battery), zone editor or /propwash zone',
        answer: 'Craft a Zone Marker (glowstone dust, paper, stick), right-click two corners, and the zone editor opens.\nThere you give the area its own rules, like zero gravity or infinite battery.\nMark it race-legal so laps through it still count. More: https://propwashfpv.com/docs/guide/#servers-zones'
    },
    range_limit: {
        topic: 'Signal range limit, video breaking up, failsafe behind walls, trees or hills or far away, VTX power and F10',
        answer: 'Walls weaken the signal, and hills, caves, deep water and metal cut it; the picture breaks up before NO SIGNAL.\nFixes: raise the VTX power (K > Video channel or F10), place signal repeaters, or use creative goggles or the Infinite range world rules.'
    },
    signal_repeater: {
        topic: 'Signal repeater: how to use it, its range, carrying video through walls or buildings, RPT in the OSD',
        answer: 'Place a Signal Repeater like a button where it sees both sides of a wall or floor; it passes video and control on.\nEach hop reaches as far as a direct link, up to four in a row.\nIn your hand it works as a signal meter.'
    },
    analog_vs_digital: {
        topic: 'Analog vs digital video, latency, video channels (R1-R8, CH1-CH8), all channels taken or channel limit',
        answer: 'Analog: almost no latency, breaks up into snow and static.\nDigital: clean HD with a bit more latency, gets blocky and freezes, then NO SIGNAL.\nSet the channel in K > Video channel; goggles must match the video system.\nAll channels taken (world rule propwash:max_video_channels)? Wait until a pilot lands.'
    },
    spectating: {
        topic: 'Watching other pilots, spectating with F7, seeing other drones while flying, drone trails',
        answer: 'With goggles on, press F7 to cycle through other pilots\' video, or pick a channel in K > Video channel.\nTo see other drones while flying, operators can turn on /gamerule propwash:drone_trails true.'
    },
    record_video: {
        topic: 'Recording flights or videos with the action cam, recording key, slow recording, Flashback replay mod',
        answer: 'Mount an action cam at the workbench and press F9 to record an MP4 (settings in K > Action cam).\nLight cam up to 1080p60, Heavy up to 1440p60 with stabilization; the Flashback cam saves a camera path for the Flashback mod.\nInstall ffmpeg for much faster recording.'
    },
    ffmpeg: {
        topic: 'Installing ffmpeg, ffmpeg not found, hardware encoder for faster recording',
        answer: 'Install ffmpeg: winget install ffmpeg (Windows), brew install ffmpeg (macOS) or your package manager (Linux), or put the file into propwash/ffmpeg/ in the game folder.\nThen press Test in K > Action cam.\nMore: https://propwashfpv.com/docs/guide/#video-ffmpeg'
    },
    shaders: {
        topic: 'Using shaders, Iris/Oculus, motion blur or other rendering mods, K key conflict with Iris',
        answer: 'Shaders (Iris/Oculus) work; the goggles video effect then switches to a simpler overlay.\nIris also uses K, so change one of the two key bindings.\nMotion blur isn\'t built in, but a shader pack can add it.'
    },
    camera_smoothing: {
        topic: 'Player camera stays smoothed or laggy after flying FPV',
        answer: 'The mod doesn\'t smooth your player camera. Check other mods or a key that is bound twice; restarting the game usually fixes it.'
    },
    freecam: {
        topic: 'Freecam drone: flying a free camera drone through walls, F6 not working or Start freecam greyed out',
        answer: 'The world rule Allow freecam drone must be on (off by default): K > World rules or /gamerule propwash:allow_freecam true.\nThen press F6 or Start freecam in K > Overview and arm as usual. F6 again brings you back.\nIt flies through walls, has no battery and stops at your view distance.'
    },
    rx_block: {
        topic: 'RX block: turning a radio stick, switch or button into redstone, binding and setting it up, RX block not working',
        answer: 'Right-click the RX Block with your radio to bind it, click Learn channel and move a stick or switch.\nIt gives redstone 0 to 15 to the blocks next to it, up to 128 blocks away (default 64).\nRed LED = out of range; it only works while its chunk is loaded.'
    },
    creative_fc: {
        topic: 'Creative drone, Creative Flight Controller, Drone Editor, setting custom masses, motors or any battery in creative',
        answer: 'Put the Creative Flight Controller (creative only, /give @s propwash:creative_fc) on any frame.\nThen K > Drone Editor lets you set masses, motors, props, battery and more freely.\nCreative drones count as assisted on leaderboards.'
    },
    tricks: {
        topic: 'Freestyle tricks, trick points and combos, trick tutorial videos, how to do a power loop or flip',
        answer: 'Propwash recognizes 59 freestyle tricks with points and combos in the OSD; flips need Acro (or Horizon at full stick).\nIn K > Freestyle hover a trick for a short video, or click it for a step-by-step tutorial with slow motion (S) and stick cam (C).'
    },
    flight_school: {
        topic: 'Flight School and flight training lessons, lessons locked, unlocking all lessons, slow motion, reset hints',
        answer: 'Press M for the Flight School, or hold M over an item for its lesson. The flight training has 20 lessons you fly yourself.\nLocked lessons: Unlock all in the flight training window (no stars for it).\nReset hints in K > Flight school brings first-time hints back.'
    },
    advancements: {
        topic: 'Advancements or achievements for Propwash',
        answer: 'Propwash has its own advancements tab "Propwash FPV" (L) with 27 advancements, from your first drone to 100 km flown and downing the wither with a drone.\nIt appears once you carry a drone, radio, goggles or workbench.'
    },
    racing: {
        topic: 'How to set up race gates and a course with the Course Tool, lap timing, start and finish',
        answer: 'Place gates and course elements, then click them in order with the Course Tool: the first gate is start and finish.\nYou get lap times, splits, a ghost and a leaderboard.\nRight-click the air with the Course Tool for the course settings. Guide: https://propwashfpv.com/docs/guide/#racing'
    },
    start_gate_lights: {
        topic: 'Start gate, start lights, countdown, standing start, lining up with several pilots, false start penalty',
        answer: 'Flying start: just fly through the start gate.\nStanding start: turn on Start when arming in K > Race, then arm near the start gate; the start lights count down 3 s, and others join by arming there.\nCrossing the gate before GO costs 3 s.'
    },
    course_settings: {
        topic: 'Editing a course: name, number of laps, gate order, who may edit, cannot edit a course, course ID for servers and bots',
        answer: 'Right-click the air with the Course Tool for the course settings: name, laps, gate order, rights and leaderboard.\nOnly the course owner and operators can edit it.\nThe course ID (/propwash course id) stays the same when you rename or rebuild the course.'
    },
    loops_point_to_point: {
        topic: 'Loops, flying a gate twice or backwards in a course, wrong way, point-to-point courses without laps',
        answer: 'Loops: click a gate that is already in the course again with the Course Tool; clicked from behind, it is flown backwards.\nPoint to point: switch in the course window or with /propwash race mode <course> point_to_point (first element start, last one finish).'
    },
    gate_rows_stacks: {
        topic: 'Stacking gates, ladders or double gates, gates snapping into rows, dive box, overlapping gates or gate in gate',
        answer: 'Place a gate on a gate to stack up to four; gates placed side by side snap into rows.\nFour gates with a lying gate on top make a dive box.\nFor overlapping or gate-in-gate builds: /gamerule propwash:free_course_placement true'
    },
    gate_menu_adjust: {
        topic: 'Rotating, tilting, resizing or moving gates, gate menu, Adjust gate, Position page, nudging gates',
        answer: 'Sneak + right-click a gate (holding a gate or the Course Tool) for Adjust gate: the mouse wheel changes size and angle, Enter applies, Esc cancels.\nThe Position page nudges it in 1/16 steps, and R rotates it.\nThe Flight School chapter on the gate menu shows it step by step.'
    },
    freeform_gate: {
        topic: 'Freeform gate: making a gate from a hallway, cave mouth, window or any opening, freeform gate does not fit',
        answer: 'Hold a Freeform Gate and right-click a block at the edge of the opening; the preview shows the outline or why it doesn\'t fit.\nThe opening must be closed all around and at most 20 x 20 blocks by default (world rule propwash:freeform_gate_max_size).'
    },
    flags_slalom: {
        topic: 'Race flags, slalom poles, dive cubes and gate poles: how to pass them, wrong side, scoring distance',
        answer: 'Slalom pole: pass on the side its ground arrows show. Race flag: fly around it as its arrow arc shows. Dive cube: in at the top, out the lit side.\nA wrong side shows red. Sneak + right-click an element to set its scoring range.'
    },
    gate_redstone: {
        topic: 'Redstone signal from gates when a drone flies through, gate pulse length, lamps or doors triggered by gates',
        answer: 'A drone flying through a gate the right way powers the block the gate stands on, like a button. Wire lamps or doors to it.\nPulse length or Races only: Redstone page of Adjust gate (sneak + right-click the gate).'
    },
    lap_not_counted: {
        topic: '"Lap not counted", "slalom pole missed", lap or race time not saved, server could not confirm the lap',
        answer: 'The message names the reason, e.g. a missed pole; the next laps still count.\nIf a pole\'s or flag\'s zone covers a gate opening, use Shorten to... in the warning or /propwash race trim <course> <element>.\nCounted as assisted instead? See the assisted lap answer.'
    },
    flight_assist_lap: {
        topic: 'Race lap flagged as assisted or not counting on the leaderboard because of flight aids, creative goggles or world rules',
        answer: 'Laps with flight aids count as assisted: hold modes, GPS rescue, changed race-relevant world rules, a creative drone, parts that only fit with Parts must fit off, or a resized drone.\nK > Race > Flight aid check shows what applies right now.'
    },
    race_standard: {
        topic: 'Race standard for servers: making laps count with custom world rules, every lap assisted on my server, race-relevant rules',
        answer: 'Operators: set your rules, then K > World rules > Race standard > Use current rules (or /propwash race standard adopt).\nLaps flown with those race-relevant rules then count. Neutral rules never make a lap assisted.'
    },
    leaderboards: {
        topic: 'Leaderboards: where to see times, opening the leaderboard, best times per drone class, share code of a record, deleting times',
        answer: 'Open it with the Course Tool (right-click the air) or K > Race > Open leaderboard.\nIt lists every time per course and drone class; click one for its share code, replay and ghost.\nOperators can delete times.'
    },
    replays_video: {
        topic: 'Watching the replay of a lap, saving a replay as a video file (Record as video), replay button greyed out',
        answer: 'Click a time in the leaderboard and press Replay; V switches between FPV and behind the drone.\nRecord as video saves it as an MP4 (needs ffmpeg).\nReplays don\'t work while you fly or spectate.'
    },
    ghosts: {
        topic: 'Racing against a ghost, best lap ghost, server record ghost, choosing which ghost flies along',
        answer: 'Choose the ghost in K > Race > Ghost: Own (your best lap), From leaderboard or Off.\nTo race a specific time, click it in the leaderboard and press Fly against.'
    },
    bosses_sculk: {
        topic: 'Warden, ender dragon or wither attacking drones, bosses fight drones, sculk sensors or shriekers triggered by drones',
        answer: 'With the world rule propwash:drones_boss_interactions (on by default) the warden, ender dragon and wither attack drones.\nArmed drones also trigger sculk sensors and shriekers (propwash:drones_trigger_sculk).\nSet either rule to false to turn it off.'
    },
    drones_hit_mobs: {
        topic: 'Drones hitting or damaging mobs and players, knockback, drones flying through mobs, PvP with drones',
        answer: 'With propwash:drone_hits_entities (on by default) drones bounce off mobs and players and hurt them by the impact (players only with PvP).\nTurn it off and drones fly through them: /gamerule propwash:drone_hits_entities false'
    },
    glass_breaking: {
        topic: 'Drones breaking glass, smashing through windows or glass panes, drones breaking blocks',
        answer: 'Turn on /gamerule propwash:drones_break_blocks true (off by default): fast drones then smash glass and glass panes, while a whoop bounces off.\nSpawn protection and claim mods still stop it.'
    },
    blocks_react: {
        topic: 'Slime, wool, hay, honey, cobwebs, vines, bells, pressure plates, tripwires or drone barriers reacting to drones',
        answer: 'Slime bounces drones back, wool and hay catch them, honey brakes and sticks, cobwebs trap them.\nDrones press wooden and weighted pressure plates and trip tripwires.\nDrone barriers (creative) let only drones through or stop only drones.'
    },
    maps: {
        topic: 'Where to get or share maps, tracks or bandos for flying, bando maps',
        answer: 'Any Minecraft map works; race courses and bandos (abandoned buildings for freestyle) generate in the world.\nJourneyman cartographers sell Bando Maps.\nShare and find maps in #maps on the Discord.'
    },
    world_share: {
        topic: 'Where race courses are saved: gates, courses, leaderboards and ghosts in the world folder, whether they come along when sharing a world',
        answer: 'Everything is saved in the world folder: the gates stand in the world, and courses, leaderboards and their ghosts are stored with it.\nShare the whole world folder and the courses come along.'
    },
    disable_structures: {
        topic: 'Turning off bandos or race courses in world generation, stopping Propwash structures from generating',
        answer: 'Bandos and race courses generate as world structures, and there is no separate switch for them.\nOnly Generate structures off when you create the world stops them; that also turns off vanilla structures and bando maps.'
    },
    clear_drones: {
        topic: 'Removing all drones or parked drones on a server, /propwash clear, drone tags and selectors',
        answer: 'Operators: /propwash clear removes all drones in loaded areas, /propwash clear <targets> only selected ones, e.g. @e[tag=pw_owner_Steve]. There is no undo.\nUseful tags: pw_owner_<name>, pw_pilot_<name>, pw_flying.'
    },
    servers: { // volatile: versions/protocol
        topic: 'Whether it works in multiplayer, on servers or LAN, how to set up a Propwash server',
        answer: 'Yes. Install the same Propwash version (and the same add-ons) on the server and every client; Fabric also needs Fabric API.\nWorld rules: K > World rules; limits: config/propwash/server.json.\nGuide: https://propwashfpv.com/docs/guide/#servers'
    },
    community_server: {
        topic: 'The official or community Propwash Minecraft server IP or address, how to join it, what is needed',
        answer: 'Our community server: mc.propwashfpv.com\nYou can join with Fabric or NeoForge. Install the latest Propwash and add the address to your server list; if a mod is missing, the join screen names it.\nQuestions: https://discord.gg/bNhkSXYSgZ'
    },
    cracked_launcher: {
        topic: 'Joining the community server with TLauncher, SKlauncher, a cracked or non-premium account, which launcher works',
        answer: 'The community server needs a bought Minecraft Java account. Cracked launchers like TLauncher or SKlauncher can\'t join, and piracy isn\'t supported.\nWith a real account the CurseForge app, Modrinth or Prism Launcher all work.'
    },
    neoforge_fabric: {
        topic: 'NeoForge and Fabric players on the same server, cross-loader play, joining a Fabric server with NeoForge, Velocity',
        answer: 'Yes, on a Fabric server: NeoForge players with the same Propwash version and add-ons can join (also behind Velocity).\nA NeoForge server only takes NeoForge players. More: https://propwashfpv.com/docs/guide/#servers-mixed'
    },
    join_mismatch: {
        topic: 'Cannot join a server: "Add-ons don\'t match this server", version or protocol mismatch, "Add-on inactive on this server"',
        answer: 'Version mismatch: client and server must run the same Propwash version.\nAdd-ons don\'t match: the window lists each add-on and whether to install, update or remove it.\nAdd-on inactive on this server: you can still play, the add-on just stays off there.'
    },
    server_config: {
        topic: 'Server owner settings: server.json, who may fly, pilot distance limit, drone speed limit, spawn protection, charger speed',
        answer: 'Rights and limits are in config/propwash/server.json, e.g. pilotPermissionLevel (who may fly) and maxPilotDistance; /propwash reload applies changes.\nAll settings: https://propwashfpv.com/docs/guide/#servers-config'
    },
    performance: {
        topic: 'Lag, low FPS, server performance, chunk loading around drones, recording slows the game down',
        answer: 'Install ffmpeg so recording uses your graphics card; shaders work with a simpler goggles overlay.\nServers: /gamerule propwash:drones_generate_chunks false stops drones generating terrain, server.json limits chunk streaming, and /propwash clear removes parked drones.'
    },
    modpacks: {
        topic: 'Putting Propwash or its add-ons in a modpack, modpack permission and requirements',
        answer: 'Yes: the unchanged release files of Propwash and its official add-ons may go into a modpack. Pass on LICENSE, LICENSE-MIT and NOTICE (or their links).\nNot allowed: offering the files on their own instead of CurseForge and Modrinth.\nDetails: https://propwashfpv.com/docs/license/'
    },
    addons_overview: { // volatile: add-on versions, Modrinth pages still in review
        topic: 'Which add-ons exist, official add-ons, add-on versions and compatibility, installing add-ons',
        answer: 'Official add-ons for Propwash 0.6.0: Just More Parts 1.2.0 (more parts), Camera Drones 1.0.0 (GPS camera drones) and Mob Defense 1.0.0 (dispenser, spear, rocket booster).\nThe server and every client need the same add-ons.\nAll on CurseForge (Modrinth pages still in review): https://propwashfpv.com/addons/'
    },
    jmp: { // volatile: version, Modrinth page still in review
        topic: 'Just More Parts (JMP) add-on: what it adds, more frames, motors, props and presets, X-Class, download',
        answer: 'Just More Parts 1.2.0 adds 146 real-world parts (frames up to 13" X-Class, motors, props, batteries) and 23 ready-to-fly presets in its own creative tab. It needs Propwash 0.6.0.\nCurseForge: https://www.curseforge.com/minecraft/mc-mods/propwash-just-more-parts (Modrinth page still in review)'
    },
    game_crash_on_start: { // volatile: version pairing of Propwash and add-ons
        topic: 'Game crashes or won\'t start after installing or updating, Just More Parts 1.1 incompatible, add-on needs a newer Propwash',
        answer: 'Usually versions: Propwash 0.6.0 needs Just More Parts 1.2.0 (1.1.x won\'t start), and the add-ons need Propwash 0.6.0.\nAlso check Minecraft 26.3, Java 25 and, on Fabric, Fabric API.\nStill crashing? Post the crash report in #bugs-and-ideas.'
    },
    camera_drones: { // volatile: version, Modrinth page not public yet
        topic: 'Camera Drones add-on: what it is, GPS camera drones, Compact, Tour and Cine, download',
        answer: 'Camera Drones 1.0.0 adds GPS camera drones: let go of the sticks and they hold position. A 3-axis gimbal films, the Flight Planner flies missions, and Delete switches to the gimbal view.\nCurseForge: https://www.curseforge.com/minecraft/mc-mods/propwash-camera-drones (Modrinth page still in review)'
    },
    camera_flight_planner: {
        topic: 'Camera Drones Flight Planner tablet: pairing, waypoints, missions, follow me, point of interest, landing pad',
        answer: '1. Sneak + right-click your parked drone with the Flight Planner to pair it.\n2. Right-click blocks to set waypoints, and right-click the air for the editor.\n3. Press Send, then Start.\nMore: https://propwashfpv.com/addons/camera-drones/'
    },
    camera_gimbal_operator: {
        topic: 'Camera Drones: second player as camera operator, Crew invite, gimbal control, recording or photos with the gimbal',
        answer: 'Invite a player within 16 blocks with Crew in the service menu or /camdrones crew invite <player>; they steer the gimbal with their own radio.\nAlone, use Live view in the Flight Planner during a mission. Recordings come from the gimbal camera (F9).'
    },
    camera_modes_atti: {
        topic: 'Camera drone flight modes N, C and S, ATTI mode, no GPS, compass error, obstacle sensors, drone does not stop at walls',
        answer: 'Modes on R or your mode switch: N (GPS hold), C (smooth cine), S (fast, manual).\nATTI means no GPS (caves, under blocks) or a compass error: fly into the open, or land and restart.\nOnly the Nav Flight Controller Pro brakes for walls, and not in Sport.'
    },
    camera_mission_problems: {
        topic: 'Camera drone mission does not start or ended early, waypoint action skipped, no budget for autonomous flights',
        answer: 'Not starting: pair the planner, press Send, have at least 15% battery and GPS, and the world rule Allow autonomous flights must be on.\nEnded or skipped: the chat message names the reason (battery, range, time limit, you took over...).'
    },
    mob_defense: { // volatile: version, Modrinth page not public yet
        topic: 'Mob Defense add-on: what it is, dispenser, spear and rocket booster on drones, download',
        answer: 'Mob Defense 1.0.0 adds a Dispenser Mount, a Spear Mount and a Rocket Booster for your drone, and hostile mobs fight back. It needs Propwash 0.6.0.\nCurseForge: https://www.curseforge.com/minecraft/mc-mods/propwash-mob-defense (Modrinth page still in review)'
    },
    mob_defense_fire: {
        topic: 'Mob Defense: how to fire the dispenser, loading ammo, right-click does not fire, igniting the rocket booster, drone too heavy',
        answer: 'Load ammo: Shift + right-click the drone > Accessories.\nFire with Accessory action 1 (Numpad 9, best on a radio button), next slot with action 2, booster with action 3. Right-click always ends the flight.\nToo heavy? Ammo has real weight, so take less.'
    },
    mob_reactions: {
        topic: 'Mob Defense: how mobs react to drones, mobs ignore my drone, zombies, skeletons, creepers or endermen attacking drones',
        answer: 'Hostile mobs react to armed drones within 24 blocks: zombies strike low drones, skeletons shoot, phantoms hunt, creepers wait below.\nThey ignore parked or disarmed drones. Check the world rule Mobs react to drones (off in Training).'
    },
    mob_defense_rules: {
        topic: 'Mob Defense world rules: hitting other players, TNT, fluid buckets locked, drone griefing, real ammo, mob damage',
        answer: 'K > World rules > Mob Defense, or /gamerule mobdefense:<id> <value>.\nHitting players needs payloads_hit_players and PvP on. TNT (allow_tnt) is on and fluid buckets (allow_fluid_buckets) are off by default.\nHealing potions always heal.'
    },
    make_addon: {
        topic: 'Making your own add-on or parts, add-on API, parts in JSON, add-on docs, getting an add-on listed',
        answer: 'Anyone can: the add-on API, the example add-on and the docs are MIT, and your code can use any license.\nUse your own namespace (propwash is reserved) and don\'t ship Propwash in your jar.\nDocs: https://propwashfpv.com/docs/api/'
    },
    share_codes: {
        topic: 'Sharing a drone build, share codes (PW3), exporting or importing a code, /propwash code, clickable codes in chat',
        answer: 'Click Share code at the Drone Workbench (or K > Share code) to export or import a PW3 code, or use /propwash code export and /propwash code import <code>.\nCodes in chat are clickable: hover for a preview, click to import.'
    },
    share_code_website: {
        topic: 'Importing a share code from the website or online configurator into the game',
        answer: 'Install Propwash and the add-ons the drone uses, copy the code in the configurator, then paste it into the Import tab of the workbench\'s Share code window.\nIn creative, /propwash code import <code> creates it (the chat takes up to 256 characters).'
    },
    old_share_codes: {
        topic: 'Old share codes (PW1, PW2, PWD1) still working, converting old codes to PW3, codes for players on 0.5',
        answer: 'PW1 and PW2 codes still work; Copy as PW3 or /propwash code convert <code> converts them.\nWhole posts: https://propwashfpv.com/convert/\nPlayers on 0.5 can\'t read PW3, so post both for a while.'
    },
    share_code_missing_addon: {
        topic: 'Share code needs an add-on I don\'t have, missing parts, stand-in parts, wrong add-on version, parts locked',
        answer: 'The import lists each add-on the code needs, with links. Stand-in parts build it without the add-on, and paint, tune and OSD always apply.\nWrong add-on version: the parts stay locked until you choose Import parts anyway.'
    },
    online_configurator: {
        topic: 'Online drone configurator on the website, building and painting a drone in the browser, trying it without installing',
        answer: 'https://propwashfpv.com/configurator/ builds, paints and tunes a drone in your browser with every part of Propwash and the official add-ons, with the same flight figures as in the game.\nShare it as a PW3 code, or press Fly to try it in the browser.'
    },
    browser_sim: {
        topic: 'Browser FPV simulator on the website, flying in the browser, simulator physics differences, simulator controls',
        answer: 'https://propwashfpv.com/sim/ flies your configurator drone in the browser (Z arm, W/S throttle, arrow keys pitch and roll; radios in USB joystick mode).\nIts physics aren\'t 100% like the mod: crashes never disarm, and GPS rescue, hold modes, 3D mode, water and mobs are missing.'
    },
    open_source: {
        topic: 'Whether the mod is open source, its source code on GitHub, and what its license allows (playing on servers, videos, streams)',
        answer: 'Source-available, not open source: the code is on GitHub (https://github.com/lardtom/propwash-fpv) under PolyForm Shield 1.0.0; the add-on API and docs are MIT.\nPlaying, servers, videos, streams, modpacks and pull requests are fine; re-uploads and competing mods are not.\nIn plain words: https://propwashfpv.com/docs/license/'
    },
    license_forks: {
        topic: 'Forking, re-uploading or modifying the mod, publishing my own version, copying its code into my mod',
        answer: 'You may read, build and change the code for yourself and send pull requests.\nNot allowed: publishing a fork or re-upload, building a competing drone mod, or copying core code into your mod. Extend it with an add-on instead.\nDetails: https://propwashfpv.com/docs/license/'
    },
    languages: {
        topic: 'Which languages the mod and the website are in, translations (French, Russian, Polish)',
        answer: 'Propwash and its website propwashfpv.com are in English and German.'
    },
    discord_support: {
        topic: 'Reporting a bug, sending logs or a crash report, getting help, suggesting a feature, Discord invite link, community',
        answer: 'Join the Discord: https://discord.gg/bNhkSXYSgZ\nOpen a ticket in #bugs-and-ideas with your Propwash version, loader, launcher, OS and the crash report or logs/latest.log.\nBugs can also go to https://github.com/lardtom/propwash-fpv/issues'
    },
    hardware_recommendation: {
        topic: 'Which real-life radio, drone or FPV gear to buy',
        answer: 'Community advice: get a real radio first (RadioMaster Pocket, about 100 to 120 EUR); it also works in Propwash over USB.\nFor a first real quad, a tiny whoop is durable and good for learning acro. Share builds in #drones.'
    },
    next_update: { // volatile: roadmap
        topic: 'When the next update comes out, what is planned (roadmap), 1.21.1 version, early access or beta testing',
        answer: '0.6.0 is the latest version. Next on the roadmap is a Minecraft 1.21.1 version (Fabric and NeoForge), no date yet. There is no early access; ideas are welcome on the Discord.\nRoadmap: https://propwashfpv.com/roadmap/'
    }
};
