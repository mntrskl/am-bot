exports.run = async (client, message, args, level) => { // eslint-disable-line no-unused-vars
  // const msg = await message.channel.send("Ping?");
  // msg.edit(`Pong! Latency is ${msg.createdTimestamp - message.createdTimestamp}ms. API Latency is ${Math.round(client.ws.ping)}ms`);
};

exports.conf = {
  enabled: true,
  guildOnly: false,
  aliases: [],
  permLevel: "User"
};

exports.help = {
  name: "play",
  category: "Game",
  description: "It literally plays the game...",
  usage: "play"
};
