import { OrderItem } from '../types';

export interface TelegramConfig {
  adminHandle: string;
  botToken: string;
  chatId: string;
  enabled: boolean;
}

export const DEFAULT_TELEGRAM_CONFIG: TelegramConfig = {
  adminHandle: '@sorysokhin',
  botToken: '',
  chatId: '',
  enabled: true,
};

const STORAGE_KEY = 'kstore_telegram_config';

export function getStoredTelegramConfig(): TelegramConfig {
  if (typeof window === 'undefined') return DEFAULT_TELEGRAM_CONFIG;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return { ...DEFAULT_TELEGRAM_CONFIG, ...JSON.parse(raw) };
    }
  } catch (e) {
    console.warn('Failed to load telegram config:', e);
  }
  return DEFAULT_TELEGRAM_CONFIG;
}

export function saveStoredTelegramConfig(partial: Partial<TelegramConfig>): TelegramConfig {
  const current = getStoredTelegramConfig();
  const updated = { ...current, ...partial, adminHandle: '@sorysokhin' };
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to save telegram config:', e);
    }
  }
  return updated;
}

/**
 * Format telegram alert message for admin @sorysokhin
 */
export function formatOrderTelegramMessage(order: OrderItem, adminHandle: string = '@sorysokhin'): string {
  const timeStr = new Date(order.createdAt || Date.now()).toLocaleString('en-US', {
    timeZone: 'Asia/Phnom_Penh',
    hour12: true,
  });

  return `🚨 <b>【 ការកុម្ម៉ង់ទិញថ្មី - NEW ORDER PLACED 】</b> 🚨
👨‍💼 <b>Admin Alert:</b> ${adminHandle}
━━━━━━━━━━━━━━━━━━
🎮 <b>Game:</b> ${order.gameTitle}
📦 <b>Package:</b> ${order.packageTitle}
💰 <b>Price:</b> $${order.amountUsd.toFixed(2)} USD
🎯 <b>Player ID:</b> <code>${order.playerId || 'N/A'}</code> ${order.zoneId ? `(Zone: <code>${order.zoneId}</code>)` : ''}
💳 <b>Payment:</b> ${order.paymentMethod || 'KHQR'}
👤 <b>Customer:</b> ${order.userEmail || 'Guest User'}
🧾 <b>Order Ref:</b> <code>${order.orderId}</code>
⏱ <b>Time:</b> ${timeStr}
${order.licenseKey ? `🔑 <b>License Key:</b> <code>${order.licenseKey}</code>\n` : ''}━━━━━━━━━━━━━━━━━━
⚡ <i>Please check Admin Panel to verify or fulfill this order.</i>`;
}

/**
 * Dispatch Telegram Order Notification to backend
 */
export async function dispatchTelegramOrderNotification(order: OrderItem): Promise<{
  ok: boolean;
  message?: string;
  error?: string;
}> {
  try {
    const config = getStoredTelegramConfig();
    const res = await fetch('/api/notifications/telegram-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        order,
        adminHandle: config.adminHandle || '@sorysokhin',
        botToken: config.botToken,
        chatId: config.chatId,
        enabled: config.enabled,
      }),
    });

    const data = await res.json();
    return data;
  } catch (err: any) {
    console.warn('Telegram notification network error:', err);
    return { ok: false, error: err.message };
  }
}

/**
 * Send test notification to @sorysokhin
 */
export async function sendTelegramTestAlert(customMessage?: string): Promise<{
  ok: boolean;
  message?: string;
  error?: string;
}> {
  try {
    const config = getStoredTelegramConfig();
    const res = await fetch('/api/notifications/telegram-test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        adminHandle: config.adminHandle || '@sorysokhin',
        botToken: config.botToken,
        chatId: config.chatId,
        message: customMessage,
      }),
    });

    return await res.json();
  } catch (err: any) {
    return { ok: false, error: err.message };
  }
}
