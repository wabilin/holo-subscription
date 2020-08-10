import * as functions from 'firebase-functions';
import { LiveInfo } from 'holo-schedule'

import { getSubscriptionsRef } from './db'
import { Subscription } from '../types'
import { getTelegram } from './bot'

type BuildMessage = (live: LiveInfo) => string

export async function notifyForLive(live: LiveInfo, buildMessage: BuildMessage) {
  const telegram = getTelegram()

  const { streamer, guests, link } = live
  const message = buildMessage(live)

  const allVtubers = guests.concat([streamer])

  functions.logger.log(`sending notification for ${link}`)
  functions.logger.log('vtubers: ', allVtubers)

  const subscriptionsRef = getSubscriptionsRef()

  const chatIdSet: Set<number> = new Set()
  const subscriptions = await subscriptionsRef.where('vtuber', 'in', allVtubers).get()
  subscriptions.forEach(x => {
    const { chatId } = x.data() as Subscription
    chatIdSet.add(chatId)
  })

  const jobs: Promise<unknown>[] = [...chatIdSet].map(chatId => (
    telegram.sendMessage(chatId, message)
  ))

  await Promise.all(jobs)
  functions.logger.log(`${jobs.length} notifications send.`)
}
