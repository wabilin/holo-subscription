import * as functions from 'firebase-functions';
import { Telegram } from 'telegraf'
import { LiveInfo } from 'holo-schedule'
import * as moment from 'moment-timezone'

import { ScheduleItemFromDb, Subscription } from './types'
import { getSecrets } from './util/secrets'
import { getSubscriptionsRef, getScheduleRef, getFirestore } from './util/db'

let tg: Telegram

function liveInfoMessage(live: LiveInfo): string {
  const { streamer, guests, time, link } = live
  const formattedTime = moment(time).tz('Asia/Tokyo').format('MM/DD hh:mm [(Japan)]')

  let msg = `${streamer}`
  if (guests.length) {
    msg += ` with ${guests.join(', ')}`
  }
  msg += `\n${formattedTime}\n${link}`

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
    .where('time', '>', new Date())
    .where('dailyNotificationSent', '==', false)

  const db = getFirestore()
  const schedule = await scheduleRef.get()

  const { bot } = getSecrets()
  tg = new Telegram(bot.token)

  const batch = db.batch();

  const jobs: Promise<void>[] = []
  schedule.forEach(x => {
    const item = x.data() as ScheduleItemFromDb
    batch.update(x.ref, { dailyNotificationSent: true })

    jobs.push(notifyForLive({
      ...item,
      time: item.time.toDate()
    }))
  })

  await Promise.all(jobs)
  await batch.commit()

  return null
})

export default sendNotification;
