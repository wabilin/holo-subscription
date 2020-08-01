import * as functions from 'firebase-functions';

const confirm = functions.pubsub.schedule('10 22 * * *')
  .timeZone('Asia/Tokyo').onRun((context) => {
  functions.logger.log(new Date().toUTCString())
  return null;
});

export default confirm
