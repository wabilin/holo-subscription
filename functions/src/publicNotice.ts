import * as functions from 'firebase-functions';

import { getTelegram } from './util/bot'
import { getAllUsersConfig } from './util/db'
import { PUBLIC_NOTICE } from './util/dbCollections'
import { UserConfig } from './types';


const publicNotice = functions.firestore.document(`${PUBLIC_NOTICE}/{key}`).onCreate(async (change) => {
  const { message } = change.data()
  if (!message) {
    return
  }

  const telegram = getTelegram()
  const configs = await getAllUsersConfig()

  const jobs: Promise<unknown>[] = []
  configs.forEach(x => {
    const config = x.data() as UserConfig
    const { chatId } = config
    jobs.push(telegram.sendMessage(chatId, message, { disable_notification: true }))
  })

  return Promise.all(jobs)
})

export default publicNotice;
