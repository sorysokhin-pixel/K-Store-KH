/**
 * Firebase Cloud Functions - Order Notification Service
 * Alerts Admin @sorysokhin on Telegram whenever a new order is placed
 */

const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const { logger } = require('firebase-functions');
const admin = require('firebase-admin');
const https = require('https');

admin.initializeApp();

// Configured admin Telegram handle
const ADMIN_HANDLE = '@sorysokhin';

/**
 * Sends a message via Telegram Bot API
 */
function sendTelegramMessage(botToken, chatId, text) {
  return new Promise((resolve, reject) => {
    if (!botToken || !chatId) {
      logger.warn(`Telegram Bot Token or Chat ID not configured. Notification for ${ADMIN_HANDLE} skipped.`);
      return resolve({ ok: false, error: 'Missing credentials' });
    }

    const payload = JSON.stringify({
      chat_id: chatId,
      text: text,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
    });

    const options = {
      hostname: 'api.telegram.org',
      port: 443,
      path: `/bot${botToken}/sendMessage`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve(parsed);
        } catch {
          resolve({ ok: res.statusCode === 200, raw: data });
        }
      });
    });

    req.on('error', (err) => {
      logger.error('Telegram API request error:', err);
      reject(err);
    });

    req.write(payload);
    req.end();
  });
}

/**
 * Cloud Function Trigger: onDocumentCreated in "orders" collection
 * Triggers automatically whenever a customer places an order
 */
exports.onOrderCreated = onDocumentCreated('orders/{orderId}', async (event) => {
  const snapshot = event.data;
  if (!snapshot) {
    logger.warn('No data associated with the event');
    return;
  }

  const order = snapshot.data();
  const orderId = event.params.orderId;

  logger.info(`New order received: ${orderId}. Preparing Telegram alert for ${ADMIN_HANDLE}...`);

  // Retrieve Telegram bot credentials from environment or Firestore settings
  let botToken = process.env.TELEGRAM_BOT_TOKEN;
  let chatId = process.env.TELEGRAM_CHAT_ID;

  if (!botToken || !chatId) {
    try {
      const settingsDoc = await admin.firestore().collection('settings').doc('telegram').get();
      if (settingsDoc.exists) {
        const settings = settingsDoc.data();
        botToken = botToken || settings.botToken;
        chatId = chatId || settings.chatId;
      }
    } catch (e) {
      logger.warn('Failed to load telegram settings from Firestore:', e);
    }
  }

  const timeStr = new Date(order.createdAt || Date.now()).toLocaleString('en-US', {
    timeZone: 'Asia/Phnom_Penh',
    hour12: true,
  });

  const message = `🚨 <b>【 ការកុម្ម៉ង់ទិញថ្មី - NEW ORDER PLACED 】</b> 🚨
👨‍💼 <b>Admin Alert:</b> ${ADMIN_HANDLE}
━━━━━━━━━━━━━━━━━━
🎮 <b>Game:</b> ${order.gameTitle || 'Unknown Game'}
📦 <b>Package:</b> ${order.packageTitle || 'Standard Package'}
💰 <b>Price:</b> $${Number(order.amountUsd || 0).toFixed(2)} USD
🎯 <b>Player ID:</b> <code>${order.playerId || 'N/A'}</code> ${order.zoneId ? `(Zone: <code>${order.zoneId}</code>)` : ''}
💳 <b>Payment:</b> ${order.paymentMethod || 'KHQR'}
👤 <b>Customer:</b> ${order.userEmail || 'Guest User'}
🧾 <b>Order Ref:</b> <code>${orderId}</code>
⏱ <b>Time:</b> ${timeStr}
${order.licenseKey ? `🔑 <b>License Key:</b> <code>${order.licenseKey}</code>\n` : ''}━━━━━━━━━━━━━━━━━━
⚡ <i>Please review or fulfill this order in the Admin Dashboard!</i>`;

  try {
    const result = await sendTelegramMessage(botToken, chatId, message);
    logger.info(`Telegram alert for ${ADMIN_HANDLE} sent successfully.`, result);
  } catch (err) {
    logger.error(`Failed to send Telegram alert for ${ADMIN_HANDLE}:`, err);
  }
});
