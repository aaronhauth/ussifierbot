import {unified} from 'unified'
import retextEnglish from 'retext-english'
import retextStringify from 'retext-stringify'
import retextPos from 'retext-pos';
import ussyfy from './ussify.js';
import emoteTagger from './emote-tagger.js';
import * as tmi from 'tmi.js';

import {dbClient} from './db.js';

const db = new dbClient();
const channels = (await db.getAllChannels()).map(row => row.username);

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
      process.env.channelUserName,
      ...channels
  ]
}

const chatClient = new tmi.client(opts);

chatClient.connect().catch(console.error);

chatClient.on("ban", (channel, username, reason, userstate) => {
  console.log("uh oh. I've been banned. idk what to do at this point, but for logging purposes, here's this...");
  console.log(channel)
  console.log(username)
  console.log(reason)
  console.log(userstate)
})

  // this chat client really only works in the context of a single channel (mine, at the moment)
// we initialize our chatTarget so that our redemption bot can have a channel to send our messages to. Otherwise, we don't care too much about this thing here.
chatClient.on('message', async (target, tags, msg, self) => {
  if (self) return;
  if (!!tags['emote-only']) return;

  const channelName = target.substring(1);

  // Handle bot commands by looking for commands in bot's own channel
  if (channelName.toLowerCase() === process.env.botName.toLowerCase()) {
    if (msg.trim().toLowerCase() === '!join') {
      await join(target, tags.username);
      return;
    }

    if (msg.trim().toLowerCase() === '!leave') {
      await leave(target, tags.username);
      return;
    }

    if (msg.trim().toLowerCase().startsWith('!setmessagefrequency')) {
      const messageParts = msg.trim().toLowerCase().split(' ', 2);
      if (messageParts.length === 1) {
        chatClient.say(target, `${tags.username} must enter a number after the command.`);
        return;
      }

      const numberParam = Number(messageParts[1]);
      if (!numberParam || numberParam < 1) {
        chatClient.say(target, `${numberParam} is not a valid argument.`);

      }
      await updateMessageFrequencyForUser(target, tags.username, numberParam)
      return;
    }

    if (msg.trim().toLowerCase().startsWith('!setwordfrequency')) {
      const messageParts = msg.trim().toLowerCase().split(' ', 2);
      if (messageParts.length === 1) {
        chatClient.say(target, `${tags.username} must enter a number after the command.`);
        return;
      }

      const numberParam = Number(messageParts[1]);
      if (!numberParam || numberParam < 1) {
        chatClient.say(target, `${numberParam} is not a valid argument.`);

      }
      await updateWordFrequencyForUser(target, tags.username, numberParam)
      return;
    }
  }

  const channels = await db.getChannel(channelName);

  if (channels.length !== 1) return;
  const channel = channels[0];
  const messageFrequency = channel.messagefrequency ?? ussyBotMessageFrequency;
  const wordFrequency = channel?.wordfrequency ?? ussifiedWordFrequency;

  // generate list of emotes used in the message
  const emotes = new Set();
  if (!!tags['emote-only']) {
    const emotePositions = Object.values(tags['emote-only']).flat();
    for (let position of emotePositions) {
      const parts = position.split('-');
      emotes.add(msg.substring(parts[0], parts[1]));
    }
    // make list unique
    emotes = [...emotes.values];
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
      chatClient.say(target, processResult.value);
  }
});

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