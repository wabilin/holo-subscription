import * as functions from 'firebase-functions';
import parseScheduleHtml from 'holo-schedule'
import getScheduleHtml from 'holo-schedule/lib/getScheduleHtml'

import {
  getStreamerImageDict,
  updateSchedule,
  setStreamerImageDict,
  getStoredSchedule,
} from "./util/db";

function isSameTime(a: Date, b: Date) {
  return a.toUTCString() === b.toUTCString()
}

const scheduleUpdater = functions.pubsub.schedule('every 3 hours').onRun(async (context) => {
  const html = await getScheduleHtml()

  const streamerImageDict = await getStreamerImageDict() || {}
  const { lives: allLives, dict } = parseScheduleHtml(html, streamerImageDict)
  await setStreamerImageDict(dict)

  const now = new Date()

  const storedSchedule = await getStoredSchedule(now)

  const lives = allLives
    .filter(x => x.time > now)
    .filter(x => {
      const stored = storedSchedule[x.link]
      return !stored || !isSameTime(x.time, stored.time)
    })

  return updateSchedule(lives)
});

export default scheduleUpdater
