import * as functions from 'firebase-functions';
import { Telegram } from 'telegraf'
import { LiveInfo } from 'holo-schedule'

import { getSubscriptionsRef } from './db'
import { getSecrets } from './secrets'
import { Subscription } from '../types'

type BuildMessage = (live: LiveInfo) => string

export async function notifyForLive(live: LiveInfo, buildMessage: BuildMessage) {
  const { bot } = getSecrets()
  const telegram = new Telegram(bot.token)

  const { streamer, guests, link } = live
  const message = buildMessage(live)

  const allVtubers = guests.concat([streamer])

  functions.logger.log(`sending notification for ${link}`)
  functions.logger.log('vtubers: ', allVtubers)

  const subscriptionsRef = getSubscriptionsRef()

  const jobs: Promise<unknown>[] = []

  const subscriptions = await subscriptionsRef.where('vtuber', 'in', allVtubers).get()
  subscriptions.forEach(x => {
    const { chatId } = x.data() as Subscription
    jobs.push(telegram.sendMessage(chatId, message))
  })

  await Promise.all(jobs)
  functions.logger.log(`${jobs.length} notifications send.`)
}
