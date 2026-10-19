const { success } = require("../../utils/Console");
const Event = require("../../structure/Event");
const { sweep } = require("../../utils/Voice");

module.exports = new Event({
    event: 'clientReady',
    once: true,
    run: (__client__, client) => {
        sweep(__client__);
        success('Logged in as ' + client.user.displayName + ', took ' + ((Date.now() - __client__.login_timestamp) / 1000) + "s.")
    }
}).toJSON();