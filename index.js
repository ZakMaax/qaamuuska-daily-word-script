const { Expo } = require('expo-server-sdk');
const { createClient } = require('@supabase/supabase-js');

const expo = new Expo();

const supabase = createClient(
  process.env.SUPABASE_URL, 
  process.env.SUPABASE_SERVICE_ROLE_KEY 
);

async function sendDailyBroadcast() {
  // 1. Fetch Today's Word
  const randomId = Math.floor(Math.random() * 47516) + 1;
  const { data: word } = await supabase.from('dictionary').select('word, meaning').eq('id', randomId).single();

  // 2. Fetch ALL Tokens 
  const { data: devices } = await supabase.from('registered_devices').select('expo_push_token');

  if (!devices || devices.length === 0) return;

  // 3. Prepare the Batch
  let messages = devices.map(device => ({
    to: device.expo_push_token,
    sound: 'default',
    title: `Erayga Maanta: ${word.word}`,
    body: word.meaning.length > 150 ? word.meaning.substring(0, 147) + "..." : word.meaning,
    data: { word: word.word },
    android: {
    channelId: "daily-word", 
  },
  }));

  // 4. Chunk and Send
  let chunks = expo.chunkPushNotifications(messages);
  for (let chunk of chunks) {
    try {
      await expo.sendPushNotificationsAsync(chunk);
    } catch (error) {
      console.error("Push Error:", error);
    }
  }
  console.log("Broadcast complete.");
}

sendDailyBroadcast();
