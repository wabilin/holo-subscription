import { getSecrets } from './secrets'
import { Telegraf, Telegram, Context } from "telegraf";

export function createBot(): Telegraf<Context> {
  const { bot } = getSecrets();
  const { token, username } = bot;
  return new Telegraf(token, { username });
}

export function getTelegram(): Telegram {
  const { bot } = getSecrets()
  return new Telegram(bot.token)
}
