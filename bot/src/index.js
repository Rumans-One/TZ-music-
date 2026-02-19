diff --git a/bot/src/index.js b/bot/src/index.js
new file mode 100644
index 0000000000000000000000000000000000000000..b6ed64e107502eb530384fe4515e091a21349fff
--- /dev/null
+++ b/bot/src/index.js
@@ -0,0 +1,99 @@
+import 'dotenv/config';
+import express from 'express';
+import { Telegraf } from 'telegraf';
+import { getAllApplications, getTodayApplications, pool } from './db.js';
+
+const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
+const TEAM_CHAT_ID = process.env.TELEGRAM_TEAM_CHAT_ID;
+const INTERNAL_TOKEN = process.env.BOT_INTERNAL_TOKEN;
+const HTTP_PORT = Number(process.env.BOT_PORT || 8090);
+
+if (!BOT_TOKEN) {
+  console.error('TELEGRAM_BOT_TOKEN is required');
+  process.exit(1);
+}
+
+const bot = new Telegraf(BOT_TOKEN);
+const app = express();
+
+app.use(express.json());
+
+function formatApplication(a) {
+  return [
+    `#${a.id} ${a.created_at.toISOString().replace('T', ' ').slice(0, 16)}`,
+    `👤 ${a.name}`,
+    `📞 ${a.phone}`,
+    `🎵 ${a.music_style}`,
+    `💬 ${a.comment}`
+  ].join('\n');
+}
+
+bot.start((ctx) =>
+  ctx.reply(
+    'Привет! Я бот заявок лендинга Suno.\nКоманды:\n/all - все заявки\n/today - заявки за сегодня'
+  )
+);
+
+bot.command('all', async (ctx) => {
+  const rows = await getAllApplications();
+  if (!rows.length) {
+    return ctx.reply('Заявок пока нет.');
+  }
+  const text = rows.slice(0, 10).map(formatApplication).join('\n\n');
+  return ctx.reply(`Последние заявки:\n\n${text}`);
+});
+
+bot.command('today', async (ctx) => {
+  const rows = await getTodayApplications();
+  if (!rows.length) {
+    return ctx.reply('Сегодня заявок еще нет.');
+  }
+
+  const text = rows.slice(0, 10).map(formatApplication).join('\n\n');
+  return ctx.reply(`Заявки за сегодня:\n\n${text}`);
+});
+
+app.post('/internal/new-application', async (req, res) => {
+  if (req.header('x-internal-token') !== INTERNAL_TOKEN) {
+    return res.status(401).json({ message: 'Unauthorized' });
+  }
+
+  const data = req.body;
+  if (!TEAM_CHAT_ID) {
+    return res.status(200).json({ message: 'TEAM_CHAT_ID is not set, skipped' });
+  }
+
+  try {
+    await bot.telegram.sendMessage(
+      TEAM_CHAT_ID,
+      `Новая заявка с лендинга:\n\n${formatApplication({
+        ...data,
+        created_at: new Date(data.created_at)
+      })}`
+    );
+
+    return res.status(200).json({ message: 'Sent' });
+  } catch (error) {
+    console.error('Failed to send Telegram message:', error);
+    return res.status(500).json({ message: 'Telegram send failed' });
+  }
+});
+
+async function start() {
+  await bot.launch();
+  app.listen(HTTP_PORT, () => {
+    console.log(`Bot internal API listening on ${HTTP_PORT}`);
+  });
+}
+
+process.once('SIGINT', async () => {
+  bot.stop('SIGINT');
+  await pool.end();
+});
+
+process.once('SIGTERM', async () => {
+  bot.stop('SIGTERM');
+  await pool.end();
+});
+
+start();
