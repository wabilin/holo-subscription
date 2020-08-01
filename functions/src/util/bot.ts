import { getSecrets } from './secrets'
import { Telegraf } from "telegraf";

export function createBot() {
  const { bot } = getSecrets();
  const { token, username } = bot;
  return new Telegraf(token, { username });
}
