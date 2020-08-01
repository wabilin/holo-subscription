import * as functions from 'firebase-functions';
import parseScheduleHtml, { LiveInfo } from 'holo-schedule'
import getScheduleHtml from 'holo-schedule/lib/getScheduleHtml'

import admin = require('firebase-admin');

interface ScheduleItem extends LiveInfo {
  dailyNotificationSent: boolean
  justBeforeNotificationSent: boolean
}

function isSameTime(a: Date, b: Date) {
  return a.toUTCString() === b.toUTCString()
}

function getFirestore() {
  if (!admin.apps.length) {
    admin.initializeApp();
  }

  return admin.firestore();
}

function itemKey(live: LiveInfo) {
  return live.link.replace('https://www.youtube.com/watch?v=', '')
}

const scheduleUpdater = functions.pubsub.schedule('every 1 hours').onRun(async (context) => {
  const html = await getScheduleHtml()

  const db = getFirestore()
  const dictRef = db.collection('docs').doc('streamerImageDict');

  const doc = await dictRef.get()
  const streamerImageDict = doc.exists ? doc.data() : {}

  const { lives: allLives, dict } = parseScheduleHtml(html, streamerImageDict)
  await dictRef.set(dict)

  const now = new Date()
  const scheduleRef = db.collection('schedule');
  const snapshot = await scheduleRef.where('time', '>', now).get()

  const storedSchedule: Record<string, ScheduleItem> = {}
  snapshot.forEach((x) => {
    const item = x.data() as ScheduleItem
    storedSchedule[item.link] = item
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
