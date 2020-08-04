import * as functions from 'firebase-functions';
import * as moment from 'moment-timezone'

import { getScheduleRef, createIncomingNotifications } from "./util/db";
import { ScheduleItem } from './types'

const checkIncomingLive = functions.pubsub.schedule('every 10 minutes').onRun(async (context) => {
  const now = new Date()
  const halfHourLater: Date = moment().add(30, 'minutes').toDate()

  const ref = getScheduleRef().where('time', '>', now).where('time', '<', halfHourLater)
  const scheduleItems = await ref.get()

  const lives: ScheduleItem[] = []
  scheduleItems.forEach(x => {
    const item = x.data() as ScheduleItem
    lives.push(item)
  })

  return createIncomingNotifications(lives)
});

export default checkIncomingLive
