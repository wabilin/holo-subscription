import * as functions from 'firebase-functions';
import parseScheduleHtml, { LiveInfo } from 'holo-schedule'
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

function shouldUpdate(storedLive: LiveInfo|undefined, fetchedLive: LiveInfo): boolean {
  if (!storedLive) {
    return true
  }

  const storedGuests = new Set(storedLive.guests)

  return (
    (!isSameTime(fetchedLive.time, storedLive.time)) ||
    fetchedLive.guests.some(guest => !storedGuests.has(guest))
  )
}

const scheduleUpdater = functions.pubsub.schedule('every 30 minutes').onRun(async (context) => {
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
      return shouldUpdate(stored, x)
    })

  return updateSchedule(lives)
});

export default scheduleUpdater
