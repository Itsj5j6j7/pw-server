const AutocompleteComponent = require("../../structure/AutocompleteComponent");
const { listMessages } = require("../../utils/Messages");

module.exports = new AutocompleteComponent({
    commandName: 'msg',
    run: async (client, interaction) => {
        const query = interaction.options.getFocused().toLowerCase();
        const ids = await listMessages().catch(() => []);
        await interaction.respond(ids.filter((id) => id.includes(query)).slice(0, 25).map((id) => ({ name: id, value: id })));
    }
}).toJSON();
