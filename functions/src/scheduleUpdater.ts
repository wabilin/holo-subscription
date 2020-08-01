import * as functions from 'firebase-functions';
import parseScheduleHtml, { LiveInfo } from 'holo-schedule'
import getScheduleHtml from 'holo-schedule/lib/getScheduleHtml'

import { ScheduleItem, ScheduleItemFromDb } from './types'
import {
  getStreamerImageDict,
  getScheduleRef,
  setStreamerImageDict,
} from "./util/db";

function isSameTime(a: Date, b: Date) {
  return a.toUTCString() === b.toUTCString()
}

function itemKey(live: LiveInfo) {
  return live.link.replace('https://www.youtube.com/watch?v=', '')
}

const scheduleUpdater = functions.pubsub.schedule('every 1 hours').onRun(async (context) => {
  const html = await getScheduleHtml()


  const streamerImageDict = await getStreamerImageDict() || {}
  const { lives: allLives, dict } = parseScheduleHtml(html, streamerImageDict)
  await setStreamerImageDict(dict)

  const now = new Date()
  const scheduleRef = getScheduleRef();
  const snapshot = await scheduleRef.where('time', '>', now).get()

  const storedSchedule: Record<string, ScheduleItem> = {}
  snapshot.forEach((x) => {
    const item = x.data() as ScheduleItemFromDb
    storedSchedule[item.link] = {
      ...item,
      time: item.time.toDate()
    }
  })

  const lives = allLives
    .filter(x => x.time > now)
    .filter(x => {
      const stored = storedSchedule[x.link]
      return !stored || !isSameTime(x.time, stored.time)
    })

  const updatePromises = lives.map(live => {
    const item: ScheduleItem = {
      ...live,
      dailyNotificationSent: false,
      justBeforeNotificationSent: false,
    }
    return scheduleRef.doc(itemKey(live)).set(item)
  })
  await Promise.all(updatePromises)

  return null;
});

export default scheduleUpdater
