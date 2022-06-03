import {unified} from 'unified'
import retextEnglish from 'retext-english'
import retextStringify from 'retext-stringify'
import retextPos from 'retext-pos';
import ussyfy from './ussify.js';
import * as tmi from 'tmi.js';

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

chatClient.connect().catch(console.error);

const processor = unified()
  .use(retextEnglish)
  .use(retextPos)
  .use(ussyfy, {frequency: ussifiedWordFrequency})
  .use(retextStringify);

  // this chat client really only works in the context of a single channel (mine, at the moment)
// we initialize our chatTarget so that our redemption bot can have a channel to send our messages to. Otherwise, we don't care too much about this thing here.
chatClient.on('message', (target, tags, msg, self) => {
  if (self) return;

  // if we hit the odds of ussyfying a word:
  if (Math.floor(Math.random()*ussyBotMessageFrequency) === 0) {

      // use the processing stream to ussify the message.
      const processResult = processor.processSync(msg);
      chatClient.say(target, processResult.value);
  } else {
    chatClient.say(target, "echo!");
  }
});