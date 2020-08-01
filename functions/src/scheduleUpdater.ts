import * as functions from 'firebase-functions';
import parseScheduleHtml from 'holo-schedule'
import getScheduleHtml from 'holo-schedule/lib/getScheduleHtml'

import admin = require('firebase-admin');

const scheduleUpdater = functions.pubsub.schedule('every 1 hours').onRun(async (context) => {
  // admin.initializeApp();
  const db = admin.firestore();

  const html = await getScheduleHtml()

  const dictRef = db.collection('docs').doc('streamerImageDict');

  const doc = await dictRef.get()
  const streamerImageDict = doc.exists ? doc.data() : {}

  const { dict } = parseScheduleHtml(html, streamerImageDict)
  await dictRef.set(dict)

  return null;
});

export default scheduleUpdater
