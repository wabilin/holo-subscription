import * as functions from 'firebase-functions';
import { Telegram } from 'telegraf'
import { LiveInfo } from 'holo-schedule'

import { getSubscriptionsRef, getScheduleRef } from './util/db'
import { Subscription, ScheduleItemFromDb } from './types'
import { getSecrets } from './util/secrets'

function liveInfoMessage(live: LiveInfo): string {
  const { streamer, guests, time, link } = live

  const minDiff = Math.floor((time.valueOf() - Date.now().valueOf()) / (1000 * 60))

  let msg = `${streamer} will start live in ${minDiff} minutes.`
  if (guests.length) {
    msg += `\nGuests: ${guests.join(', ')}`
  }
  msg += `\n${link}`

  return msg
}

// FIXME: this is copy-paste
async function notifyForLive (live: LiveInfo) {
  const { bot } = getSecrets()
  const tg = new Telegram(bot.token)
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

const notifyIncomingLive = functions.firestore.document("incomingNotifications/{key}").onCreate(async (change, context) => {
  const liveId = context.params.key

  const data = (await getScheduleRef().doc(liveId).get()).data()
  if (!data) {
    throw new Error(`Can not get live with id: ${liveId}.`)
  }
  const item = data as ScheduleItemFromDb

  await notifyForLive({
    ...item,
    time: item.time.toDate()
  })
})

export default notifyIncomingLive;
