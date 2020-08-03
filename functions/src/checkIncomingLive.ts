import * as functions from 'firebase-functions';

import { getScheduleRef } from "./util/db";
import { ScheduleItem } from './types'

const checkIncomingLive = functions.pubsub.schedule('every 10 minutes').onRun(async (context) => {
  const now = new Date()
  // FIXME: 300 -> 30 after debug done
  const halfHourLater = (new Date(now)).setMinutes(now.getMinutes() + 300)
  const ref = getScheduleRef().where('time', '>', now).where('time', '<', halfHourLater)
  const scheduleItems = await ref.get()

  const lives = []
  scheduleItems.forEach(x => {
    const item = x.data() as ScheduleItem
    lives.push(item)
  })
});

export default checkIncomingLive
