import * as functions from 'firebase-functions';
import { LiveInfo } from 'holo-schedule'

import { getLive } from './util/db'
import { listEndWith } from './util/format'
import { INCOMING_NOTIFICATIONS } from './util/dbCollections'
import { notifyForLive } from './util/messages'

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

const notifyIncomingLive = functions.firestore.document(`${INCOMING_NOTIFICATIONS}/{key}`).onCreate(async (change, context) => {
  const liveId = context.params.key
  const live = await getLive(liveId)

  await notifyForLive(live, liveInfoMessage)
})

export default notifyIncomingLive;
