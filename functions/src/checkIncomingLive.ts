import * as functions from 'firebase-functions';

import { getScheduleRef, createIncomingNotifications } from "./util/db";
import { ScheduleItem } from './types'

const checkIncomingLive = functions.pubsub.schedule('every 10 minutes').onRun(async (context) => {
  const now = new Date()
  // FIXME: 300 -> 30 after debug done
  const halfHourLater = new Date(now)
  halfHourLater.setMinutes(now.getMinutes() + 300)

  functions.logger.log('now: ', now)
  functions.logger.log('halfHourLater: ', halfHourLater)

  const ref = getScheduleRef().where('time', '>', now).where('time', '<', halfHourLater)
  const scheduleItems = await ref.get()

  const lives: ScheduleItem[] = []
  scheduleItems.forEach(x => {
    const item = x.data() as ScheduleItem
    lives.push(item)
  })
  functions.logger.log('lives added in incoming:', lives)

  return createIncomingNotifications(lives)
});

export default checkIncomingLive
