const ms = require("ms");
// @ts-check
exports.run = async (client, message, args, level) => {
  // eslint-disable-line no-unused-vars
  if (client.activeGames.has(message.channel.guild.id)) return;
  client.activeGames.add(message.channel.guild.id);
  // setTimeout(() => client.activeGames.delete(message.channel.id), 10000);

  const amVoiceChannel = message.guild.channels.cache
    .array()
    .find(
      ({ id, type }) =>
        type === "voice" && id === message.settings.voiceChannel,
    );

  let totalScore = 0;
  const showEpisode = createEmbed(client, message);

  const restart = async () => {
    totalScore = 0;
    await client.activeGames.delete(message.channel.guild.id);
  };

  const ending = async episode => {
    if (episode.next === -1) {
      const end = totalScore > 0 ? "good" : "bad";
      const ending = client.endings.find(e => e.ending === end);
      await showEpisode(ending);
      // Show total score
      // await message.channel.send(totalScore);
      await restart();
      client.logger.log("FIN");
      return true;
    }
    return false;
  };

  const next = async episode => {
    // Ending
    if (await ending(episode)) return;

    const msg = await showEpisode(episode);
    await Promise.all([
      Object.keys(episode.reactions).map(key => msg.react(key)),
    ]);

    const [embed] = msg.embeds;
    episode.embed_replacements.sort(() => Math.random() - 0.5);

    for await (const emb of episode.embed_replacements) {
      const mappedKeys = {
        title: t => embed.setTitle(t),
        description: d => embed.setDescription(d),
      };
      Object.keys(emb).map(key => mappedKeys[key]?.(emb[key]));
      await delay(ms(episode.delays.edit));

      if (!!amVoiceChannel && Math.random() >= 0.5) {
        const member = randomItem(amVoiceChannel.members.array());
        await member.send(embed);
      } else await msg.edit(embed);
    }

    const options = {
      max: 1,
      time: ms("20m"),
      errors: ["timeout"],
    };

    try {
      await message.channel.awaitMessages(
        e => e.content === "continue;",
        options,
      );
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
        await restart();
        return error;
      }
      throw error;
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

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function randomItem(collection) {
  return collection[Math.floor(Math.random() * collection.length)];
}

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
        color: episode.color,
        // author: {
        //   name: client.user.username,
        //   icon_url: client.user.avatarURL(),
        // },
        title: episode.title,
        description: episode.description,
        // thumbnail: {
        //   url: client.user.avatarURL(),
        // },
        // fields: episode.fields,
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
