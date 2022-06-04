import {unified} from 'unified'
import retextEnglish from 'retext-english'
import retextStringify from 'retext-stringify'
import retextPos from 'retext-pos';
import ussyfy from './ussify.js';
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

const processor = unified()
  .use(retextEnglish)
  .use(retextPos)
  .use(ussyfy, {frequency: ussifiedWordFrequency})
  .use(retextStringify);

  // this chat client really only works in the context of a single channel (mine, at the moment)
// we initialize our chatTarget so that our redemption bot can have a channel to send our messages to. Otherwise, we don't care too much about this thing here.
chatClient.on('message', async (target, tags, msg, self) => {
  if (self) return;

  const channelName = target.substring(1);
  if (channelName.toLowerCase() === process.env.botName.toLowerCase()) {
    if (msg.trim().toLowerCase() === '!join') {
      await join(target, tags.username);
      return;
    }

    if (msg.trim().toLowerCase() === '!leave') {
      await leave(target, tags.username);
      return;
    }


  }



  // if we hit the odds of ussyfying a word:
  if (Math.floor(Math.random()*ussyBotMessageFrequency) === 0) {

      // use the processing stream to ussify the message.
      const processResult = processor.processSync(msg);
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
      chatClient.say(target, `${userName} chat isn't getting ussified!`);
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