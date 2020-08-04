import * as functions from 'firebase-functions';
import { LiveInfo } from 'holo-schedule'
import * as moment from 'moment-timezone'

import { ScheduleItemFromDb } from './types'
import { listEndWith } from './util/format'
import { SCHEDULE } from './util/dbCollections'
import { notifyForLive } from './util/messages'

function liveInfoMessage(live: LiveInfo): string {
  const { streamer, guests, time, link } = live

  // use HH[時]mm[分] to avoid format like "18:00" becomes a video time link
  const formattedTime = moment(time).tz('Asia/Tokyo').format('[`]MM/DD HH:mm[`] [(Japan)]')

  let msg = `*${streamer}* will start live at ${formattedTime}`
  if (guests.length) {
    const boldGuests = guests.map(x => `*${x}*`)
    msg += `\nGuests: ${listEndWith(boldGuests, 'and')}`
  }
  msg += `\n${link}`

  return msg
}

const notifyNewLive = functions.firestore.document(`${SCHEDULE}/{key}`).onWrite(async (change, context) => {
  const item = change.after.data() as ScheduleItemFromDb

  // it's data delete event
  if (!item) { return }

  const live: LiveInfo = {
    ...item,
    time: item.time.toDate()
  }

  await notifyForLive(live, liveInfoMessage)
})

export default notifyNewLive;
