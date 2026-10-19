// Bridge API process (pm2 "propwash-api"), separate from the bot so either can restart alone.
require('dotenv').config();
require('./api').start();

process.on('unhandledRejection', console.error);
process.on('uncaughtException', console.error);
