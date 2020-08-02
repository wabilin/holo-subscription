import * as functions from "firebase-functions";
import { Markup, Context } from 'telegraf'

import {
  getStreamerImageDict,
  addSubscription,
  getSubscribedVtubers,
  removeSubscription,
} from "./util/db";
import { createBot } from "./util/bot";
import { VTUBERS } from './util/constants'

async function getVtuberList() {
  const dict = await getStreamerImageDict();
  if (!dict) {
    throw new Error('get dic failed')
  }

  return Object.keys(dict);
}

async function subscribe(ctx: Context, vtuber: string) {
  const vtubers = await getVtuberList();
  if (!vtubers.includes(vtuber)) {
    return ctx.reply("Failed. Vtuber name not found.");
  }

  const { chat } = ctx;
  if (!chat) {
    throw new Error("Chat not found.");
  }

  await addSubscription({
    vtuber,
    chatId: chat.id,
  });

  return ctx.reply(`Subscribed ${vtuber} ❤️`, Markup.removeKeyboard().extra());
}

async function unsubscribe(ctx: Context, vtuber: string) {
  const { chat } = ctx;
  if (!chat) {
    throw new Error("Chat not found.");
  }

  const vtubers = await getSubscribedVtubers(chat.id);
  if (!vtubers.includes(vtuber)) {
    return ctx.reply(`You did not subscribed ${vtuber}.`);
  }

  await removeSubscription({
    vtuber,
    chatId: chat.id,
  });

  return ctx.reply(`Unsubscribed ${vtuber}.️`, Markup.removeKeyboard().extra());
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
      const buttons = VTUBERS.map(name => `+${name}`).concat(['Abort'])
      const keyboard = Markup.keyboard(buttons, { columns: 3 }).oneTime().extra()

      return ctx.reply('Who would you like to subscribe?', keyboard)
    }

    return subscribe(ctx, vtuber)
  });

  bot.command("haaton", async (ctx) => {
    return subscribe(ctx, '赤井はあと')
  });

  // Subscribe with format "+Name"
  bot.hears(/^\+(.+)/, (ctx) => {
    const vtuber = ctx.match && ctx.match[1] || 'unknown'
    return subscribe(ctx, vtuber)
  })

  bot.command('unsubscribe', async (ctx) => {
    const { chat } = ctx;
    if (!chat) {
      throw new Error("Chat not found.");
    }

    const vtubers = await getSubscribedVtubers(chat.id)

    const buttons = vtubers.map(name => `-${name}`).concat(['Abort'])
    const keyboard = Markup.keyboard(buttons, { columns: 3 }).oneTime().extra()

    return ctx.reply('Who would you like to unsubscribe?', keyboard)
  })

  // Subscribe with format "+Name"
  bot.hears(/^\-(.+)/, (ctx) => {
    const vtuber = ctx.match && ctx.match[1] || 'unknown'
    return unsubscribe(ctx, vtuber)
  })

  bot.hears('Abort', (ctx) => {
    return ctx.reply(`Abort`, Markup.removeKeyboard().extra());
  })

  return bot;
}

const telegramBot = functions.https.onRequest(async (request, response) => {
  const bot = webhookBot();
  // Catch all workaround
  bot.on("message", (ctx) => {
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
