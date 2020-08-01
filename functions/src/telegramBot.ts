import * as functions from 'firebase-functions';
import { Telegraf } from "telegraf";
import { getStreamerImageDict, addSubscription } from './util/db'

const token: string = functions.config().bot.token;
const username: string = functions.config().bot.username;
const bot = new Telegraf(token, { username });

bot.start((ctx) => ctx.reply("Welcome!"));
bot.command('test', (ctx) => {
  const chatId = ctx.chat?.id
  functions.logger.log(`Test command from chatId: ${chatId}`)

  return ctx.reply("Hi")
});

bot.command('subscribe', async (ctx) => {
  const text = ctx.message?.text || ''
  const vtuber = text.trim().split(/\s+/)[1]

  if (!vtuber) {
    return ctx.reply("Failed. (Wrong format?)")
  }

  const dict = (await getStreamerImageDict())!
  const vtubers = Object.keys(dict)
  if (!vtubers.includes(vtuber)) {
    return ctx.reply("Failed. VTuber name not found.")
  }

  const { chat } = ctx
  if (!chat) {
    throw new Error("Chat not found.")
  }

  await addSubscription({
    vtuber,
    chatId: chat.id,
  })

  return ctx.reply(`Subscribe ${vtuber} successfully ❤️`)
})

const telegramBot = functions.https.onRequest(async (request, response) => {
    // Catch all workaround
  bot.on('message', () => {
    response.status(200).end()
  })

  try {
    await bot.handleUpdate(request.body, response);
  } catch (err) {
    functions.logger.error(err)
    throw err
  }
});

export default telegramBot
