// @ts-check
const gameActiveInChannel = new Set();

exports.run = async (client, message, args, level) => {
  // eslint-disable-line no-unused-vars
  if (gameActiveInChannel.has(message.channel.id)) return;
  gameActiveInChannel.add(message.channel.id);
  setTimeout(() => gameActiveInChannel.delete(message.channel.id), 10000);

  let totalScore = 0;
  const showEpisode = createEmbed(client, message);

  const next = async episode => {
    // Ending
    if (episode.next === -1) {
      await showEpisode(episode);
      // Show total score
      await message.channel.send(totalScore);
      return;
    }

    const msg = await showEpisode(episode);
    await Promise.all([
      Object.keys(episode.reactions).map(key => msg.react(key)),
    ]);

    const options = {
      max: 1,
      time: 30000,
      errors: ["timeout"],
    };

    try {
      await message.channel.awaitMessages(e => e.content === "next", options);
      const reactions = msg.reactions.cache;
      // Calculate reactions
      totalScore += calculateReactions(reactions, episode);
      // Next Episode
      await next(client.episodes[episode.next]);
    } catch (error) {
      if (error.value === "timeout") {
        // Calculate reactions
        const reactions = msg.reactions.cache;
        totalScore += calculateReactions(reactions, episode);
      }
    }
  };

  const [episode] = client.episodes;
  next(episode);
};

exports.conf = {
  enabled: true,
  guildOnly: false,
  aliases: [],
  permLevel: "User",
};

exports.help = {
  name: "play",
  category: "Game",
  description: "It literally plays the game...",
  usage: "play",
};

function calculateReactions(reactions, episode) {
  return reactions
    .array()
    .reduce(
      (acc, { emoji, count }) =>
        (acc += episode.reactions[emoji.name] * (count - 1)),
      0,
    );
}

function createEmbed(client, message) {
  return episode =>
    message.channel.send({
      embed: {
        color: "#FF0000",
        // author: {
        //   name: client.user.username,
        //   icon_url: client.user.avatarURL(),
        // },
        title: episode.title,
        description: episode.description,
        thumbnail: {
          url: client.user.avatarURL(),
        },
        fields: episode.fields,
        image: {
          url: episode.images[0],
        },
        timestamp: new Date(),
        footer: {
          text: client.user.username,
          icon_url: client.user.avatarURL(),
        },
      },
    });
}
