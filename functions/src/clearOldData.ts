
import * as functions from 'firebase-functions';

import { clearOldDbData } from "./util/db";

const clearOldData = functions.pubsub.schedule('every 1 days').onRun((context) => {
  return clearOldDbData()
});

export default clearOldData
