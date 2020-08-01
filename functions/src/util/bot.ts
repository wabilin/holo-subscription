import * as functions from 'firebase-functions';
import { Telegraf } from "telegraf";

export function createBot() {
  const token: string = functions.config().bot.token;
  const username: string = functions.config().bot.username;
  return new Telegraf(token, { username });
}
