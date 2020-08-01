import { LiveInfo } from 'holo-schedule'
import { firestore } from 'firebase-admin'

export interface ScheduleItem extends LiveInfo {
  dailyNotificationSent: boolean
  justBeforeNotificationSent: boolean
}

export interface ScheduleItemFromDb extends Omit<ScheduleItem, 'time'> {
  time: firestore.Timestamp
}

export interface Subscription {
  vtuber: string
  chatId: number
}
