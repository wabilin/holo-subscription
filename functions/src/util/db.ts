import { Subscription } from "../types";
import admin = require('firebase-admin');

export function getFirestore() {
  if (!admin.apps.length) {
    admin.initializeApp();
  }

  return admin.firestore();
}


export async function getStreamerImageDict() {
  const db = getFirestore()
  const dictRef = db.collection('docs').doc('streamerImageDict');

  const doc = await dictRef.get()
  return doc.data()
}

export async function setStreamerImageDict(dict: Record<string, string>): Promise<void> {
  const db = getFirestore()
  const dictRef = db.collection('docs').doc('streamerImageDict');

  await dictRef.set(dict)
}

export async function addSubscription(subscription: Subscription): Promise<void> {
  const { chatId, vtuber } = subscription
  const db = getFirestore()
  const subscriptionsRef = db.collection('dailySubscriptions')

  await subscriptionsRef.doc(`${chatId}-${vtuber}`).set(subscription)
}

export function getSubscriptionsRef() {
  const db = getFirestore()
  return db.collection('dailySubscriptions')
}

export function getScheduleRef() {
  const db = getFirestore()
  return db.collection('schedule');
}