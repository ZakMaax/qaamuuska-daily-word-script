const { Expo } = require('expo-server-sdk');
const { createClient } = require('@supabase/supabase-js');

const expo = new Expo();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  try {
    const today = new Date().toISOString().split('T')[0]; // Format: YYYY-MM-DD

    // 1. Fetch Today's Word
    const randomId = Math.floor(Math.random() * 47516) + 1;
    const { data: word } = await supabase.from('dictionary').select('word, meaning').eq('id', randomId).single();

    // 2. Fetch only devices NOT notified today
    const { data: devices } = await supabase
      .from('registered_devices')
      .select('expo_push_token, device_id')
      .or(`last_notified_at.is.null,last_notified_at.neq.${today}`);

    if (!devices || devices.length === 0) {
      console.log("No new devices to notify for this slot.");
      return;
    }

    // 3. Prepare messages
    const messages = devices.map(d => ({
      to: d.expo_push_token,
      sound: 'default',
      title: `Erayga Maanta: ${word.word}`,
      body: word.meaning.substring(0, 150),
      data: { url: "/", word: word.word },
      android: { channelId: "daily-word" },
    }));

    // 4. Send Chunks
    let chunks = expo.chunkPushNotifications(messages);
    for (let chunk of chunks) {
      await expo.sendPushNotificationsAsync(chunk);
    }

    // 5. Update last_notified_at so they are skipped in the next run today
    const notifiedIds = devices.map(d => d.device_id);
    await supabase
      .from('registered_devices')
      .update({ last_notified_at: today })
      .in('device_id', notifiedIds);

    console.log(`Sent to ${messages.length} new devices.`);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
run();
