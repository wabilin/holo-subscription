import * as functions from 'firebase-functions';

const testTriggerByDb = functions.firestore.document("schedule/{key}").onWrite((change, context) => {
  functions.logger.log(`context.params: ${JSON.stringify(context.params)}`)
  functions.logger.log(`before data: ${JSON.stringify(change.before.data())}`)
  functions.logger.log(`after data: ${JSON.stringify(change.after.data())}`)
});

export default testTriggerByDb
