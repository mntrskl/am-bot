// This will check if the node version you are running is the required
// Node version, if it isn't it will throw the following error to inform
// you.
if (Number(process.version.slice(1).split(".")[0]) < 12)
  throw new Error(
    "Node 12.0.0 or higher is required. Update Node on your system.",
  );

// Load up the discord.js library
const Discord = require("discord.js");
// We also load the rest of the things we need in this file:
const { promisify } = require("util");
const readdir = promisify(require("fs").readdir);
const Enmap = require("enmap");
const config = require("./config.js");

// This is your client. Some people call it `bot`, some people call it `self`,
// some might call it `cootchie`. Either way, when you see `client.something`,
// or `bot.something`, this is what we're referring to. Your client.
const am = new Discord.Client({
  ws: {
    intents: config.intents,
  },
});

// Here we load the config file that contains our token and our prefix values.
am.config = config;
// client.config.token contains the bot's token
// client.config.prefix contains the message prefix

// Require our logger
am.logger = require("./modules/Logger");

// Let's start by getting some useful functions that we'll use throughout
// the bot, like logs and elevation features.
require("./modules/functions.js")(am);

// Aliases and commands are put in collections where they can be read from,
// catalogued, listed, etc.
am.commands = new Enmap();
am.aliases = new Enmap();

// Now we integrate the use of Evie's awesome EnMap module, which
// essentially saves a collection to disk. This is great for per-server configs,
// and makes things extremely easy for this purpose.
am.settings = new Enmap({ name: "settings" });

am.activeGames = new Set();

// We're doing real fancy node 8 async/await stuff here, and to do that
// we need to wrap stuff in an anonymous function. It's annoying but it works.

const init = async () => {
  // Here we load **commands** into memory, as a collection, so they're accessible
  // here and everywhere else.
  const cmdFiles = await readdir("./commands/");
  am.logger.log(`Loading a total of ${cmdFiles.length} commands.`);
  cmdFiles.forEach(f => {
    if (!f.endsWith(".js")) return;
    const response = am.loadCommand(f);
    if (response) console.log(response);
  });

  // Then we load events, which will include our message and ready event.
  const evtFiles = await readdir("./events/");
  am.logger.log(`Loading a total of ${evtFiles.length} events.`);
  evtFiles.forEach(file => {
    const eventName = file.split(".")[0];
    am.logger.log(`Loading Event: ${eventName}`);
    const event = require(`./events/${file}`);
    // Bind the client to any event, before the existing arguments
    // provided by the discord.js event.
    // This line is awesome by the way. Just sayin'.
    am.on(eventName, event.bind(null, am));
  });

  // Generate a cache of client permissions for pretty perm names in commands.
  am.levelCache = {};
  for (let i = 0; i < am.config.permLevels.length; i++) {
    const thisLevel = am.config.permLevels[i];
    am.levelCache[thisLevel.name] = thisLevel.level;
  }

  const episodesFiles = await readdir("./episodes/");
  am.logger.log(`Loading a total of ${episodesFiles.length} episodes.`);
  const { episodes, endings } = episodesFiles.reduce(
    (acc, e) => {
      const episode = require(`./episodes/${e}`);
      switch (e[0]) {
        case "e":
          acc.episodes.push(episode);
          break;
        case "f":
          acc.endings.push(episode);
          break;
      }
      return acc;
    },
    {
      episodes: [],
      endings: [],
    },
  );
  am.episodes = episodes;
  am.endings = endings;

  // Here we login the client.
  am.login(am.config.token);

  // End top-level async/await function.
};

init();
