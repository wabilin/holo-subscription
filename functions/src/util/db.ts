import { StreamerImageDict, LiveInfo } from 'holo-schedule'
import * as moment from 'moment-timezone'
import * as functions from 'firebase-functions'
import admin = require('firebase-admin');
admin.initializeApp();

import {
  Subscription,
  IncomingNotification,
  IncomingNotificationFromDb,
  ScheduleItemFromDb,
  UserConfig,
  ScheduleItem,
} from "../types";

import {
  SUBSCRIPTIONS,
  STREAMER_IMAGES,
  SCHEDULE,
  INCOMING_NOTIFICATIONS,
  USER_CONFIGS,
} from './dbCollections'

function validKey(key: string) {
  if (key.includes('/') || key.includes('.')) {
    throw new Error(`Key: "${key}" is invalid`)
  }
  return key
}

export function liveKey(live: LiveInfo): string {
  const ytHash = live.link.replace('https://www.youtube.com/watch?v=', '')
  return validKey(ytHash)
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
    const key = validKey(vtuber)
    batch.set(ref.doc(key), doc)
  })

  await batch.commit()
}

function subscriptionKey(chatId: number, vtuber: string): string {
  return validKey(`${chatId}-${vtuber}`)
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

type Schedule = Record<string, ScheduleItem>
export async function getStoredSchedule(before: Date): Promise<Schedule> {
  const scheduleRef = getScheduleRef();
  const snapshot = await scheduleRef.where('time', '>', before).get()

  const storedSchedule: Schedule = {}
  snapshot.forEach((x) => {
    const item = x.data() as ScheduleItemFromDb
    storedSchedule[item.link] = {
      ...item,
      time: item.time.toDate()
    }
  })

  return storedSchedule
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

function getIncomingNotificationsRef() {
  const db = getFirestore()
  return db.collection(INCOMING_NOTIFICATIONS)
}

export async function createIncomingNotifications(lives: LiveInfo[]) {
  if (lives.length === 0) {
    return
  }

  const db = getFirestore()
  const ref = getIncomingNotificationsRef()

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

// useless function only for get typedef
function uselessScheduleQuery() {
  return getScheduleRef().where('time', '<', '')
}

type QueryRef = ReturnType<typeof uselessScheduleQuery>

async function batchClear(queryRef: QueryRef) {
  const db = getFirestore()
  const batch = db.batch()

  const snapshot = await queryRef.get();
  const { size } = snapshot

  if (size > 500) {
    throw new Error(`Batch size too big: ${size}`)
  }

  // Ref https://firebase.google.com/docs/firestore/manage-data/delete-data
  if (size > 300) {
    functions.logger.warn(`Snapshot size getting huge (${size}). Should change batchClear way`)
  }

  snapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });
  await batch.commit();
}

async function clearOldLives(beforeTime: Date) {
  const scheduleRef = getScheduleRef().where('time', '<', beforeTime)
  return batchClear(scheduleRef)
}

async function clearOldIncomingNotifications(beforeTime: Date) {
  const notificationsRef = getIncomingNotificationsRef().where('created', '<', beforeTime)
  return batchClear(notificationsRef)
}

export function clearOldDbData() {
  const threeDaysAgo: Date = moment().subtract(3, 'days').toDate()

  return Promise.all([
    clearOldLives(threeDaysAgo),
    clearOldIncomingNotifications(threeDaysAgo)
  ])
}

function getUserConfigsRef() {
  const db = getFirestore()
  return db.collection(USER_CONFIGS)
}

export async function createUserConfigIfNotExist(chatId: number) {
  const config: UserConfig = {
    chatId,
    zone: 'Asia/Tokyo'
  }
  const key = validKey(String(chatId))
  const docRef = getUserConfigsRef().doc(key)

  const currentDoc = await docRef.get()
  if (!currentDoc.exists) {
    await docRef.create(config)
  }
}

export function getAllUsersConfig() {
  const configsRef = getUserConfigsRef()
  return configsRef.get()
}
