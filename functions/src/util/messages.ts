import * as functions from 'firebase-functions';
import { LiveInfo } from 'holo-schedule'

import { getSubscriptionsRef, removeUser } from './db'
import { Subscription } from '../types'
import { getTelegram } from './bot'

// TODO: Change this in DB
function subscriptionKeys(scheduleNames: string[]): string[] {
  return scheduleNames.map(x => {
    if (x === 'アキロゼ') {
      return 'アキ・ローゼンタール'
    } else {
      return x
    }
  })
}

type BuildMessage = (live: LiveInfo) => string

export async function notifyForLive(live: LiveInfo, buildMessage: BuildMessage): Promise<void> {
  const telegram = getTelegram()

  const { streamer, guests, link } = live
  const message = buildMessage(live)

  const allVtubers = guests.concat([streamer])

  functions.logger.log(`sending notification for ${link}`)
  functions.logger.log('vtubers: ', allVtubers)

  const subscriptionsRef = getSubscriptionsRef()

  const chatIdSet: Set<number> = new Set()
  const subscriptionNames = subscriptionKeys(allVtubers)
  const subscriptions = await subscriptionsRef.where('vtuber', 'in', subscriptionNames).get()
  subscriptions.forEach(x => {
    const { chatId } = x.data() as Subscription
    chatIdSet.add(chatId)
  })

  const jobs: Promise<unknown>[] = [...chatIdSet].map(async (chatId) => {
    try {
      await telegram.sendMessage(chatId, message)
    } catch(error) {
      if (error.message.includes("Forbidden: bot was blocked by the user")) {
        functions.logger.log("blocked by: ", chatId)
        await removeUser(chatId)

        functions.logger.log(`User ${chatId} removed.`)
      } else {
        throw error
      }
    }
  })

  await Promise.all(jobs)
  functions.logger.log(`${jobs.length} notifications send.`)
}
