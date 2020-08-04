import * as functions from 'firebase-functions';
import { Telegram } from 'telegraf'
import { LiveInfo } from 'holo-schedule'

import { getSubscriptionsRef, getLive } from './util/db'
import { Subscription } from './types'
import { getSecrets } from './util/secrets'
import { listEndWith } from './util/format'
import { INCOMING_NOTIFICATIONS } from './util/dbCollections'

function liveInfoMessage(live: LiveInfo): string {
  const { streamer, guests, time, link } = live

  const minDiff = Math.floor((time.valueOf() - Date.now()) / (1000 * 60))

  let msg = `${streamer} will start live in ${minDiff} minutes.`
  if (guests.length) {
    msg += `\nGuests: ${listEndWith(guests, 'and')}`
  }
  msg += `\n${link}`

  return msg
}

// FIXME: this is copy-paste
async function notifyForLive (live: LiveInfo) {
  const { bot } = getSecrets()
  const tg = new Telegram(bot.token)
  const { streamer, guests, link } = live
  const message = liveInfoMessage(live)

  const allVtubers = guests.concat([streamer])

  functions.logger.log(`sending notification for ${link}`)
  functions.logger.log('vtubers: ', allVtubers)

  const subscriptionsRef = getSubscriptionsRef()

  const jobs: Promise<unknown>[] = []

  // TODO: Do not send to an user more than once
  const subscriptions = await subscriptionsRef.where('vtuber', 'in', allVtubers).get()
  subscriptions.forEach(x => {
    const subscription = x.data() as Subscription
    jobs.push(tg.sendMessage(subscription.chatId, message))
  })

  await Promise.all(jobs)
  functions.logger.log(`${jobs.length} notifications send.`)
}

const notifyIncomingLive = functions.firestore.document(`${INCOMING_NOTIFICATIONS}/{key}`).onCreate(async (change, context) => {
  const liveId = context.params.key
  const live = await getLive(liveId)

  await notifyForLive(live)
})

export default notifyIncomingLive;
