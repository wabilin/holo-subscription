import * as functions from "firebase-functions";

interface Secret {
token: string;
username:string;
}
export function getSecrets(): { bot: Secret }  {
  const token: string = functions.config().bot.token;
  const username: string = functions.config().bot.username;

  return {
    bot: {
      token,
      username,
    },
  };
}
