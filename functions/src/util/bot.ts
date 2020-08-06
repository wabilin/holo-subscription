import { getSecrets } from './secrets'
import { Telegraf, Telegram } from "telegraf";

export function createBot() {
  const { bot } = getSecrets();
  const { token, username } = bot;
  return new Telegraf(token, { username });
}

export function getTelegram() {
  const { bot } = getSecrets()
  return new Telegram(bot.token)
}
