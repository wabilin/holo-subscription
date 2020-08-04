import * as functions from "firebase-functions";
import { Markup, Context } from 'telegraf'

import {
  addSubscription,
  getSubscribedVtubers,
  removeSubscription,
} from "./util/db";
import ipCheck from './util/ipCheck'
import { createBot } from "./util/bot";
import { VTUBERS } from './util/constants'
import { markdownUl } from './util/format'

const ALLOW_LIST = ['149.154.160.0/20', '91.108.4.0/22']
const isAllowedIp = (ip: string) => ALLOW_LIST.some(allow => ipCheck(allow, ip))

const HELP_MESSAGE = `
🤖Available commands:
/subscribe - Subscribe❤️
/subscribe {name} - Subscribe with name, for example,
/subscribe 赤井はあと
/unsubscribe - Unsubscribe
/list - List your subscriptions
/haaton - はあちゃまっちゃま~

Visit https://wabilin.github.io/holo-subscription
for more information, including manual in 日本語 and 中文
Feedbacks and contributing are welcome!🚀
`

async function subscribe(ctx: Context, vtuber: string) {
  if (!VTUBERS.includes(vtuber)) {
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

  bot.start(async (ctx) => {
    const message =
     'Thanks for using *Holo Subscription!* \n\n' +
     'Use `/subscribe` to subscribe vtubers.\n' +
     'Use `/help` or visit our [homepage](https://wabilin.github.io/holo-subscription/) for more information.'

    return ctx.replyWithMarkdown(message)
  });

  bot.help((ctx) => {
    functions.logger.log('Command Help')
    return ctx.reply(HELP_MESSAGE)
  })


  bot.command("subscribe", async (ctx) => {
    const text = ctx.message?.text || "";
    const vtuber = text.trim().split(/\s+/)[1];

    if (!vtuber) {
      const buttons = VTUBERS.map(name => `+${name}`).concat(['Do later'])
      const keyboard = Markup.keyboard(buttons, { columns: 3 }).oneTime().extra()

      return ctx.reply('Who would you like to subscribe?', keyboard)
    }

    return subscribe(ctx, vtuber)
  });

  bot.command("list", async (ctx) => {
    const { chat } = ctx
    if (!chat) {
      throw new Error('Can not get chat.')
    }

    const vtubers = await getSubscribedVtubers(chat.id)
    if (vtubers.length === 0) {
      return ctx.reply('No current subscriptions.')
    }

    const listStr = markdownUl(vtubers)

    return ctx.replyWithMarkdown(`Current subscriptions:\n\n${listStr}`)
  })

  bot.command("haaton", (ctx) => subscribe(ctx, '赤井はあと'));

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

    const buttons = vtubers.map(name => `-${name}`).concat(['Do later'])
    const keyboard = Markup.keyboard(buttons, { columns: 3 }).oneTime().extra()

    return ctx.reply('Who would you like to unsubscribe?', keyboard)
  })

  // Subscribe with format "+Name"
  bot.hears(/^\-(.+)/, (ctx) => {
    const vtuber = ctx.match && ctx.match[1] || 'unknown'
    return unsubscribe(ctx, vtuber)
  })

  bot.hears('Do later', (ctx) => {
    return ctx.reply('👌', Markup.removeKeyboard().extra());
  })

  return bot;
}

const telegramBot = functions.https.onRequest(async (request, response) => {
  if (!isAllowedIp(request.ip)) {
    const msg = `Telegram bot called from invalid IP: ${request.ip}`
    functions.logger.warn(msg)
    throw new Error(msg)
  }

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
