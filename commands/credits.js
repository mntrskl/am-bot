const { version } = require("discord.js");

exports.run = (client, message, args, level) => {
  // eslint-disable-line no-unused-vars
  message.channel.send(
    `= CREDITS =
• Programming  :: 🐻 Diego Geremia
• Programming  :: 🐱‍💻 Joel Mut
• Programming  :: Debo Theaux
• Sound        :: Guillo
• Music        :: Gusty
• Design       :: Kurara
• Art          :: Sofi Podestá
• Game Design  :: Emma Rubio
• El que falte :: que me avise`,
    { code: "asciidoc" },
  );
};

exports.conf = {
  enabled: true,
  guildOnly: false,
  aliases: [],
  permLevel: "User",
};

exports.help = {
  name: "credits",
  category: "Miscelaneous",
  description: "Gives some useful bot info",
  usage: "credits",
};
