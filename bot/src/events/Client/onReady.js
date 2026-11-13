const { success } = require("../../utils/Console");
const Event = require("../../structure/Event");
const { sweep } = require("../../utils/Voice");
const { startTimer } = require("../../utils/Supporter");
const { startTimer: startShop } = require("../../utils/Shop");
const { syncAll } = require("../../utils/Ranks");
const { syncAllLinked } = require("../../utils/Linked");
const { startMeetings } = require("../../utils/Jobs");

module.exports = new Event({
    event: 'clientReady',
    once: true,
    run: (__client__, client) => {
        sweep(__client__);
        syncAll(__client__).then(() => startTimer(__client__));
        startShop(__client__);
        syncAllLinked();
        startMeetings(__client__);
        success('Logged in as ' + client.user.displayName + ', took ' + ((Date.now() - __client__.login_timestamp) / 1000) + "s.")
    }
}).toJSON();