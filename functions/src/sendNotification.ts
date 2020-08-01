import * as functions from 'firebase-functions';
import { Telegram } from 'telegraf'
import { LiveInfo } from 'holo-schedule'

import { ScheduleItemFromDb, Subscription } from './types'
import { getSecrets } from './util/secrets'
import { getSubscriptionsRef, getScheduleRef } from './util/db'

let tg: Telegram

function liveInfoMessage(live: LiveInfo): string {
  const now = new Date()
  const { streamer, guests, time, link } = live
  const minDiff = Math.floor((time.valueOf() - now.valueOf()) / 1000 / 60)

  let msg = `Streaming of ${streamer}`
  if (guests.length) {
    msg += ` with ${guests.join(' ,')}`
  }
  msg += ` will start in ${minDiff} mins. \n${link}`

  return msg
}

async function notifyForLive (live: LiveInfo) {
  const { streamer, guests } = live
  const message = liveInfoMessage(live)

  const allVtubers = guests.concat([streamer])

  const subscriptionsRef = getSubscriptionsRef()

  const jobs: Promise<unknown>[] = []

  // TODO: Do not send to an user more than once
  const subscriptions = await subscriptionsRef.where('vtuber', 'in', allVtubers).get()
  subscriptions.forEach(x => {
    const subscription = x.data() as Subscription
    jobs.push(tg.sendMessage(subscription.chatId, message))
  })

  await Promise.all(jobs)
}

const sendNotification = functions.pubsub.schedule('every 25 minutes').onRun(async (context) => {
  const scheduleRef = getScheduleRef()
  const schedule = await scheduleRef.where('time', '>', new Date()).get()

  const { bot } = getSecrets()
  tg = new Telegram(bot.token)

  const jobs: Promise<void>[] = []
  schedule.forEach(x => {
    const item = x.data() as ScheduleItemFromDb
    jobs.push(notifyForLive({
      ...item,
      time: item.time.toDate()
    }))
  })

  await Promise.all(jobs)

  return null
})

export default sendNotification;
