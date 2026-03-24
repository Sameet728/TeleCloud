const { TelegramClient, Api } = require("telegram");
const { StringSession } = require("telegram/sessions");
const mongoose = require("mongoose");
require("dotenv").config({ path: "c:/Users/samee/Desktop/CloudSpace/telegram-cloud-storage/.env" });
const User = require("c:/Users/samee/Desktop/CloudSpace/telegram-cloud-storage/src/models/User");
const File = require("c:/Users/samee/Desktop/CloudSpace/telegram-cloud-storage/src/models/File");

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  const user = await User.findOne({ isTelegramConnected: true });
  if (!user) return console.log("No connected user");
  
  const client = new TelegramClient(
    new StringSession(user.telegramSession),
    parseInt(process.env.TELEGRAM_API_ID),
    process.env.TELEGRAM_API_HASH,
    { connectionRetries: 1 }
  );
  await client.connect();
  
  const file = await File.findOne({ mimeType: { $regex: /^image\// }, userId: user._id });
  if (!file) return console.log("No image found");
  
  console.log("File:", file.fileName, file.messageId);
  const messages = await client.getMessages("me", { ids: [file.messageId] });
  const msg = messages[0];
  
  console.log("Media type:", msg.media.className);
  
  try {
    const buf = await client.downloadMedia(msg, { thumb: 1 });
    console.log("Downloaded thumb bytes:", buf ? buf.length : 0);
  } catch (err) {
    console.error("Error downloading thumb:", err);
  }
  
  await client.disconnect();
  process.exit(0);
}
main();
