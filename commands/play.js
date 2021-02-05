const ms = require("ms");
// @ts-check
exports.run = async (client, message, args, level) => {
  // eslint-disable-line no-unused-vars
  if (client.activeGames.has(message.channel.guild.id)) {
    await message.channel.send(
      "_```asciidoc\nPlease wait for the current game to finish before starting a new one\n```_",
    );
    return;
  } else {
    client.activeGames.add(message.channel.guild.id);
  }

  // * Connect to voice
  const voiceChannel = await message.guild.channels.cache
    .array()
    .find(
      ({ id, type }) =>
        type === "voice" && id === message.settings.voiceChannel,
    );

  //TODO: Check if this works on multiple guilds
  const members = voiceChannel.members.array().filter(e => !e.user.bot);

  // * Game Start/Setup
  let totalScore = 0;
  const showEpisode = createEmbed(client, message);

  const restart = async () => {
    totalScore = 0;
    await voiceChannel?.leave();
    await client.activeGames.delete(message.channel.guild.id);
  };

  const ending = async episode => {
    if (episode.next === -1) {
      const end = totalScore > 0 ? "good" : "bad";
      const ending = client.endings.find(e => e.ending === end);

      const msg = await showEpisode(ending);
      const [embed] = msg.embeds;
      embed.addField(
        `${end.toLocaleUpperCase()} Ending`,
        `Compasion: ${totalScore}`,
        false,
      );
      await msg.edit(embed);
      await restart();
      client.logger.log(`Game Ended for ${message.channel.guild.id}`);
      return true;
    }
    return false;
  };

  const next = async episode => {
    // * Ending
    if (await ending(episode)) return;
    const sentMessage = await showEpisode(episode);
    await loadReactions(episode, sentMessage);
    await processEmbeds({ members, episode, sentMessage, voiceChannel });

    // TODO: Improve this...
    await message.channel.send(
      '_```asciidoc\nto continue with the execution (episode) please make sure everyone reacted accordingly and have someone type "continue;"```_',
    );

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
      const reactions = sentMessage.reactions.cache;

      // * Calculate reactions
      totalScore += calculateReactions(reactions, episode);

      // * Next Episode
      await next(client.episodes[episode.next]);
    } catch (error) {
      if (error.value === "timeout") {
        // * Calculate reactions
        const reactions = sentMessage.reactions.cache;
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

//#region Commmand Properties
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
//#endregion
//#region Helpers

async function loadReactions(episode, sentMessage) {
  return Promise.all([
    Object.keys(episode.reactions).map(key => sentMessage.react(key)),
  ]);
}

async function processEmbeds(options) {
  const { members, episode, sentMessage, voiceChannel } = options;
  const amVoiceConnection = await voiceChannel?.join();
  const [embed] = sentMessage.embeds;
  episode.embed_replacements.sort(() => Math.random() - 0.5);

  const messagesPromise = new Promise(async res => {
    for (const emb of episode.embed_replacements) {
      const mappedKeys = {
        title: t => embed.setTitle(t),
        description: d => embed.setDescription(d),
      };
      Object.keys(emb).map(key => mappedKeys[key]?.(emb[key]));
      await delay(ms(episode.delays.edit));

      if (!!voiceChannel && members.length > 0 && Math.random() >= 0.5) {
        const member = randomItem(members);
        await member.send(embed);
      } else await sentMessage.edit(embed);
    }
    res();
  });

  const audioPromise = new Promise(async res => {
    for (const audioClip of episode.media) {
      await playClip(amVoiceConnection, audioClip);
    }
    res();
  });

  return Promise.all([messagesPromise, audioPromise]);
}

function playClip(connection, clip) {
  return new Promise((res, rej) => {
    const options = {
      volume: 0.5,
    };
    setTimeout(() => {
      connection
        ?.play(`media/${clip}`, options)
        .on("finish", res)
        .on("error", rej);
    }, ms("3s"));
  });
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

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function randomItem(collection) {
  return collection[Math.floor(Math.random() * collection.length)];
}

//#endregion
