
import * as functions from 'firebase-functions';

import { clearOldDbData } from "./util/db";

const clearOldData = functions.pubsub.schedule('44 1 * * *').timeZone('Asia/Tokyo').onRun(() => {
  return clearOldDbData()
});

export default clearOldData
