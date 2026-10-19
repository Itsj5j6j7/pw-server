const AutocompleteComponent = require("../../structure/AutocompleteComponent");
const store = require("../../bridge/store");
const config = require("../../config");
const servers = require("../../bridge/servers");
const { mapName } = require("../../bridge/render");

module.exports = new AutocompleteComponent({
    commandName: 'leaderboard',
    run: async (client, interaction) => {
        const focused = interaction.options.getFocused(true);
        let choices;

        if (focused.name === 'course') {
            // The #id tells apart courses with the same (or no) name; the [server] tag, courses of different servers with the same id.
            choices = store.courses().map((course) => ({
                name: `${servers.multi ? `[${servers.get(course.server)?.name ?? course.server}] ` : ''}#${course.id} ${course.name || 'Unnamed'} — ${mapName(course.dimension, course.server)}`,
                value: `${course.server}:${course.id}`
            }));
        } else {
            const course = store.courseByRef(interaction.options.get('course')?.value);
            choices = (course ? store.frames(course) : []).map((frame) => ({ name: config.bridge.frames[frame] ?? frame, value: frame }));
        }

        const query = focused.value.toLowerCase();
        await interaction.respond(choices.filter((choice) => choice.name.toLowerCase().includes(query)).slice(0, 25).map((choice) => ({ ...choice, name: choice.name.slice(0, 100) })));
    }
}).toJSON();
