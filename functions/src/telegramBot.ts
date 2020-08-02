import * as functions from "firebase-functions";
import { Markup } from 'telegraf'

import { getStreamerImageDict, addSubscription } from "./util/db";
import { createBot } from "./util/bot";

async function getVtuberList() {
  const dict = await getStreamerImageDict();
  if (!dict) {
    throw new Error('get dic failed')
  }

  return Object.keys(dict);
}

function webhookBot() {
  const bot = createBot();

  bot.start((ctx) => ctx.reply("Welcome!"));
  bot.command("test", (ctx) => {
    const chatId = ctx.chat?.id;
    functions.logger.log(`Test command from chatId: ${chatId}`);

    const time = new Date()
    const times = "Current Time:"
      + `IOS: ${time.toISOString()}`
      + `UTC: ${time.toUTCString()}`
      + `Locale : ${time.toLocaleString()}`

    return ctx.reply(times);
  });

  bot.command("subscribe", async (ctx) => {
    const text = ctx.message?.text || "";
    const vtuber = text.trim().split(/\s+/)[1];

    if (!vtuber) {
      // return ctx.reply("Failed. (Wrong format?)");
      Markup.inlineKeyboard([
        Markup.callbackButton('赤井はあと', 'subscribe/赤井はあと')
      ])
      return ctx.reply('Who would you like to subscribe?', )
    }

    const vtubers = await getVtuberList();
    if (!vtubers.includes(vtuber)) {
      return ctx.reply("Failed. VTuber name not found.");
    }

    const { chat } = ctx;
    if (!chat) {
      throw new Error("Chat not found.");
    }

    await addSubscription({
      vtuber,
      chatId: chat.id,
    });

    return ctx.reply(`Subscribe ${vtuber} successfully ❤️`);
  });

  bot.action(/subscribe\/(.+)/, (ctx) => {
    const match = ctx.match && ctx.match[1]
    functions.logger.log(`From chat: ${ctx.chat?.id}`)
    functions.logger.log(`inline query: ${ctx.inlineQuery}`)
    functions.logger.log(`callback query: ${ctx.callbackQuery}`)
    functions.logger.log(`match: ${match}`)

    return ctx.reply('Subscript successfully')
  })

  bot.command('unsubscribe', (ctx) => {
    return ctx.reply(`TODO️`);
  })

  return bot;
}

const telegramBot = functions.https.onRequest(async (request, response) => {
  const bot = webhookBot();
  // Catch all workaround
  bot.on("message", () => {
    response.status(200).end();
  });

  try {
    await bot.handleUpdate(request.body, response);
  } catch (err) {
    functions.logger.error(err);
    throw err;
  }
});

export default telegramBot;
