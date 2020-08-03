import * as functions from 'firebase-functions';
import { Telegram } from 'telegraf'
import { LiveInfo } from 'holo-schedule'
import * as moment from 'moment-timezone'

import { getSubscriptionsRef } from './util/db'
import { ScheduleItemFromDb, Subscription } from './types'
import { getSecrets } from './util/secrets'

function liveInfoMessage(live: LiveInfo): string {
  const { streamer, guests, time, link } = live

  // use HH[時]mm[分] to avoid format like "18:00" becomes a video time link
  const formattedTime = moment(time).tz('Asia/Tokyo').format('MM/DD HH[時]mm[分] [(Japan)]')

  let msg = `${streamer} will start live at ${formattedTime}`
  if (guests.length) {
    msg += `\nGuests: ${guests.join(', ')}`
  }
  msg += `\n${link}`

  return msg
}

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

const notifyNewLive = functions.firestore.document("schedule/{key}").onWrite(async (change, context) => {
  const item = change.after.data() as ScheduleItemFromDb

  // it's data delete event
  if (!item) { return }

  await notifyForLive({
    ...item,
    time: item.time.toDate()
  })
})

export default notifyNewLive;
