import * as functions from "firebase-functions";

export function getSecrets() {
  const token: string = functions.config().bot.token;
  const username: string = functions.config().bot.username;

  return {
    bot: {
      token,
      username,
    },
  };
}
