import { StreamerImageDict, LiveInfo } from 'holo-schedule'
import admin = require('firebase-admin');
admin.initializeApp();
import {
  Subscription,
  IncomingNotification,
  IncomingNotificationFromDb,
  ScheduleItemFromDb,
} from "../types";

import {
  SUBSCRIPTIONS,
  STREAMER_IMAGES,
  SCHEDULE,
  INCOMING_NOTIFICATIONS,
} from './dbCollections'


export function liveKey(live: LiveInfo) {
  return live.link.replace('https://www.youtube.com/watch?v=', '')
}

export function getFirestore() {
  return admin.firestore();
}

interface StreamerImagesDoc {
  vtuber: string
  img : string
}

export async function getStreamerImageDict() {
  const db = getFirestore()
  const snapshot = await db.collection(STREAMER_IMAGES).get()
  const dict: StreamerImageDict = {}
  snapshot.forEach(x => {
    const { vtuber, img } = (x.data() as StreamerImageDict)
    dict[vtuber] = img
  });

  return dict
}

export async function setStreamerImageDict(dict: Record<string, string>): Promise<void> {
  const db = getFirestore()
  const batch = db.batch()
  const ref = db.collection(STREAMER_IMAGES)
  Object.entries(dict).forEach(([vtuber, img]) => {
    const doc: StreamerImagesDoc = { vtuber, img }
    batch.set(ref.doc(vtuber), doc)
  })

  await batch.commit()
}

function subscriptionKey(chatId: number, vtuber: string) {
  return `${chatId}-${vtuber}`
}

function subscriptionDoc(subscription: Subscription) {
  const { chatId, vtuber } = subscription
  const db = getFirestore()
  const subscriptionsRef = db.collection(SUBSCRIPTIONS)

  const key = subscriptionKey(chatId, vtuber)
  return subscriptionsRef.doc(key)
}
export async function addSubscription(subscription: Subscription): Promise<void> {
  const doc = subscriptionDoc(subscription)
  await doc.set(subscription)
}

export async function removeSubscription(subscription: Subscription): Promise<void> {
  const doc = subscriptionDoc(subscription)
  await doc.delete()
}

export async function getSubscribedVtubers(chatId: number): Promise<string[]> {
  const ref = getSubscriptionsRef()
  const subs = await ref.where('chatId', '==', chatId).get()
  const vtubers: string[] = []
  subs.forEach(sub => {
    vtubers.push((sub.data() as Subscription).vtuber)
  })

  return vtubers
}

export function getSubscriptionsRef() {
  const db = getFirestore()
  return db.collection(SUBSCRIPTIONS)
}

export function getScheduleRef() {
  const db = getFirestore()
  return db.collection(SCHEDULE);
}

export async function getLive(liveId: string): Promise<LiveInfo> {
  const data = (await getScheduleRef().doc(liveId).get()).data()
  if (!data) {
    throw new Error(`Can not get live with id: ${liveId}.`)
  }

  const item = data as ScheduleItemFromDb

  return {
    ...item,
    time: item.time.toDate()
  }
}

export async function updateSchedule(lives: LiveInfo[]) {
  if (lives.length === 0) {
    return
  }

  const db = getFirestore()
  const scheduleRef = getScheduleRef()

  const batch = db.batch()

  lives.forEach(live => {
    batch.set(scheduleRef.doc(liveKey(live)), live)
  })

  await batch.commit()
}

export async function createIncomingNotifications(lives: LiveInfo[]) {
  if (lives.length === 0) {
    return
  }

  const db = getFirestore()
  const ref = db.collection(INCOMING_NOTIFICATIONS)

  const liveIds = lives.map(x => liveKey(x))
  const currentNotifications = await ref.where('liveId', 'in', liveIds).get()
  const currentNotificationsSet = new Set()
  currentNotifications.forEach(x => {
    const doc = x.data() as IncomingNotificationFromDb
    currentNotificationsSet.add(doc.liveId)
  })

  const batch = db.batch()
  lives.forEach(async (live) => {
    const liveId = liveKey(live)
    const docRef = ref.doc(liveId)
    const data: IncomingNotification = {
      liveId,
      created: new Date(),
    };

    if (!currentNotificationsSet.has(liveId)) {
      batch.set(docRef, data);
    }
  })

  await batch.commit()
}
