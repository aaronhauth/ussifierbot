import {unified} from 'unified'
import retextEnglish from 'retext-english'
import retextStringify from 'retext-stringify'
import retextPos from 'retext-pos';
import ussyfy from './ussify.js';
import emoteTagger from './emote-tagger.js';
import * as tmi from 'tmi.js';
import dotenv from 'dotenv';

if (process.env.NODE_ENV !== 'production') {
  dotenv.config();
}

import {dbClient} from './db.js';

const db = new dbClient();
const clientChannels = (await db.getAllChannels()).map(row => row.username);

const ussyBotMessageFrequency = Number(process.env.ussyBotMessageFrequency);
const ussifiedWordFrequency = Number(process.env.ussifiedWordFrequency);

// chatbot options
const opts = {
  options: {debug: true, messagesLogLevel: 'info'},
  connection: {
      reconnect: true,
      secure: true
  },
  identity: {
      username: process.env.botName,
      password: 'oauth:' + process.env.chatBotToken
  },
  channels: [
      process.env.channelUserName
  ]
}

const chatClient = new tmi.client(opts);

try {
  await chatClient.connect();
} catch (err) {
  console.error(err);
}

clientChannels.forEach(channel => {
  chatClient.join(channel)
    .catch(err => {
      console.log(err);
      if (err === 'msg_banned') {
        db.deleteChannel(channel)
        .then(res => {
          console.log(`successfully deleted ${channel}`, res);
        })
      }
    })
})


  // this chat client really only works in the context of a single channel (mine, at the moment)
// we initialize our chatTarget so that our redemption bot can have a channel to send our messages to. Otherwise, we don't care too much about this thing here.
chatClient.on('message', async (channel, tags, msg, msgSentBySelf) => {
  if (msgSentBySelf) return;
  if (!!tags['emote-only']) return;

  const channelName = channel.substring(1);

  // Handle bot commands by looking for commands in bot's own channel
  if (channelName.toLowerCase() === process.env.botName.toLowerCase()) {
    await handleBotChannelCommands(channel, tags, msg);
    return;
  }

  if (msg.startsWith('!')) {
    await handleHostChannelCommands(channel, tags, msg);
    return;
  }

  const channels = await db.getChannel(channelName);

  if (channels.length !== 1) return;
  const channelSettings = channels[0];

  if (channelSettings.ignorelist && channelSettings.ignorelist.indexOf(tags.username) > -1) {
    console.log(`user ${tags.username} is on the ignore list. ignoring their message...`);
  }

  const uniqueEmotes = new Set();
  const emotes = [];
  const messageFrequency = channelSettings.messagefrequency ?? ussyBotMessageFrequency;
  const wordFrequency = channelSettings?.wordfrequency ?? ussifiedWordFrequency;


  if (!!tags['emotes'] && tags['emotes'].length > 0) {
    const emotePositions = Object.values(tags['emote']).flat();
  // generate list of emotes used in the message
    for (let position of emotePositions) {
      const parts = position.split('-');
      emotes.add(msg.substring(parts[0], parts[1]));
    }
    // make list unique
    emotes = [...uniqueEmotes.values];
  }

  // if we hit the odds of ussyfying a word:
  if (Math.floor(Math.random()*messageFrequency) === 0) {
      const processor = unified()
        .use(retextEnglish)
        .use(retextPos)
        .use(emoteTagger, {emotes: emotes})
        .use(ussyfy, {frequency: wordFrequency})
        .use(retextStringify);

      // use the processing stream to ussify the message.
      const processResult = await processor.process(msg);
      chatClient.say(channel, processResult.value);
  }
});

async function handleBotChannelCommands(channel, tags, msg) {
  if (msg.trim().toLowerCase() === '!join') {
    await join(channel, tags.username);
    return;
  }

  if (msg.trim().toLowerCase() === '!leave') {
    await leave(channel, tags.username);
    return;
  }

  if (msg.trim().toLowerCase().startsWith('!setmessagefrequency')) {
    const messageParts = msg.trim().toLowerCase().split(' ', 2);
    if (messageParts.length === 1) {
      chatClient.say(channel, `${tags.username} must enter a number after the command.`);
      return;
    }

    const numberParam = Number(messageParts[1]);
    if (!numberParam || numberParam < 1) {
      chatClient.say(channel, `${numberParam} is not a valid argument.`);

    }
    await updateMessageFrequencyForUser(channel, tags.username, numberParam)
    return;
  }

  if (msg.trim().toLowerCase().startsWith('!setwordfrequency')) {
    const messageParts = msg.trim().toLowerCase().split(' ', 2);
    if (messageParts.length === 1) {
      chatClient.say(channel, `${tags.username} must enter a number after the command.`);
      return;
    }

    const numberParam = Number(messageParts[1]);
    if (!numberParam || numberParam < 1) {
      chatClient.say(channel, `${numberParam} is not a valid argument.`);
    }
    await updateWordFrequencyForUser(channel, tags.username, numberParam)
    return;
  }
}

async function handleHostChannelCommands(channel, tags, msg) {
  const channelName = channel.substring(1); // get channel name, without the # at the start
  // commands that are executed on the channel itself let us adjust settings for the bot on the channel, but only
  // if the user sending the command is the channel owner, or a mod for the channel
  if (channelName === tags.username || tags.mod) {
    if (msg.trim().toLowerCase().startsWith('!ubignoreuser')) {
      const messageParts = msg.trim().toLowerCase().split(' ', 2);

      if (messageParts.length === 1) {
        chatClient.say(channel, `${tags.username} must enter a number after the command.`);
        return;
      }

      console.log(`Adding ${messageParts[1]} to ignore list for ${channelName}`);
      const rows = await db.getUserInIgnoreList(channelName, messageParts[1]);
      if (rows.length) {
        chatClient.say(channel, `${tags.username} is already being ignored`);
        return;
      }
      console.log(`user is not already being ignored. Adding to ignore list`);


      await db.addUserToIgnoreList(channelName, messageParts[1]);
      return;
    }

    if (msg.trim().toLowerCase().startsWith('!ubunignoreuser')) {
      const messageParts = msg.trim().toLowerCase().split(' ', 2);

      if (messageParts.length === 1) {
        chatClient.say(channel, `${tags.username} must enter a number after the command.`);
        return;
      }

      const rows = await db.getUserInIgnoreList(channelName, messageParts[1]);
      if (!rows.length) {
        chatClient.say(channel, `${tags.username} wasn't being ignored, ya ding dong.`);
        return;
      }

      await db.removeUserFromIgnoreList(channelName, messageParts[1]);
      return;
    }
  }
}

async function join(target, userName) {
  try {
    let added = false;
    const existingChannels = await db.getChannel(userName);

    if (!chatClient.getChannels().includes(`#${userName}`)) {
      await chatClient.join(userName);
      added = true;
    }

    if (existingChannels.length === 0) {
      await db.insertChannel(userName);
      added = true;
    }

    if (added){
      chatClient.say(target, `${userName} chat is getting ussified PogChamp`);
    } else {
      chatClient.say(target, `${userName} chat is already getting ussified PogChamp`);

    }

  } catch (err) {
    chatClient.say(target, `failed to join because of error ${JSON.stringify(err)}`);
    return;
  }
}

async function leave(target, userName) {
  try {
    let removed = false;
    const existingChannels = await db.getChannel(userName);

    if (existingChannels.length > 0) {
      await db.deleteChannel(userName);
      removed = true;
    }

    if (chatClient.getChannels().includes(`#${userName}`)) {
      await chatClient.part(userName);
      removed = true;
    }

    if (removed) {
      chatClient.say(target, `${userName} chat is no longer getting ussified. Sad to see you go BibleThump`);
    } else {
      chatClient.say(target, `${userName} isn't even being ussified right now SwiftRage`);
    }
  } catch (err) {
    chatClient.say(target, `failed to delete because of error ${JSON.stringify(err)}`);
    return;
  }
}

async function updateMessageFrequencyForUser(target, userName, wordFrequency) {
    const existingChannels = await db.getChannel(userName);

    if (existingChannels.length > 0) {
      await db.setMessageFrequency(userName, wordFrequency);
      chatClient.say(target, `${userName} word frequency updated!`);
    } else {
      chatClient.say(target, `${userName} channel not found`);
    }
}

async function updateWordFrequencyForUser(target, userName, wordFrequency) {
    const existingChannels = await db.getChannel(userName);

    if (existingChannels.length > 0) {
      await db.setWordFrequency(userName, wordFrequency);
      chatClient.say(target, `${userName} word frequency updated!`);
    } else {
      chatClient.say(target, `${userName} channel not found`);
    }
}