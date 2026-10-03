import QRCode from 'qrcode';

export interface PaymentSettings {
  activeProvider: 'aba' | 'bakong';
  gatewayUrl: string;
  abaApiKey: string;
  abaMerchantId: string;
  abaAccount: string;
  abaAccountName: string;
  bakongToken: string;
  bakongUid: string;
  bakongName: string;
  botName: string;
}

export const DEFAULT_PAYMENT_SETTINGS: PaymentSettings = {
  activeProvider: 'aba',
  gatewayUrl: 'https://khmer-system.com',
  abaApiKey: 'PK_7213c309db731dc63fe1e1faed0a971ef8de5612',
  abaMerchantId: 'Yuqg4u',
  abaAccount: 'sokhin_sory@abaa',
  abaAccountName: 'SORY SOKHIN',
  bakongToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJkYXRhIjp7ImlkIjoiMmY4NDM5YjkwNDEwNDUwNyJ9LCJpYXQiOjE3Nzc5NjA1MjMsImV4cCI6MTc4NTczNjUzM30.jbSLWaRmlRyyh9txBw3B5b6ThL0n4VrCFgRkhfWyASw',
  bakongUid: 'sokhin_sory@bkrt',
  bakongName: 'SORY SOKHIN',
  botName: 'SORY SOKHIN',
};

// Local storage key for runtime settings in browser
const SETTINGS_KEY = 'kstore_payment_settings';

export function getStoredPaymentSettings(): PaymentSettings {
  if (typeof window === 'undefined') return DEFAULT_PAYMENT_SETTINGS;
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      return { ...DEFAULT_PAYMENT_SETTINGS, ...JSON.parse(raw) };
    }
  } catch (e) {
    console.warn('Failed to read payment settings from localStorage:', e);
  }
  return DEFAULT_PAYMENT_SETTINGS;
}

export function saveStoredPaymentSettings(settings: Partial<PaymentSettings>): PaymentSettings {
  const current = getStoredPaymentSettings();
  const updated = { ...current, ...settings };
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to save payment settings to localStorage:', e);
    }
  }
  return updated;
}

// -------------------------------------------------------------
// EMVCo & Bakong KHQR CRC-16 Checksum Generator
// -------------------------------------------------------------
export function crc16Ccitt(data: string): string {
  let crc = 0xffff;
  for (let i = 0; i < data.length; i++) {
    crc ^= data.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

function formatTLV(tag: string, value: string): string {
  const strVal = String(value);
  const len = strVal.length.toString().padStart(2, '0');
  return tag + len + strVal;
}

export function generateBakongKHQRString(
  account: string,
  merchantName: string,
  amount: number,
  billNumber?: string,
  isDynamic: boolean = true
): string {
  let str = '';
  str += formatTLV('00', '01'); // Payload Format Indicator
  str += formatTLV('01', isDynamic ? '12' : '11'); // Point of Initiation: 12 (Dynamic), 11 (Static)

  // Tag 29: Merchant Account Information (Individual - NBC Standard)
  const cleanAccount = (account || 'sokhin_sory@bkrt').trim();
  const mInfo = formatTLV('00', cleanAccount);
  str += formatTLV('29', mInfo);

  str += formatTLV('52', '5999'); // Merchant Category Code (5999 general goods/services)
  str += formatTLV('53', '840'); // Currency: 840 (USD)
  if (amount && Number(amount) > 0) {
    str += formatTLV('54', Number(amount).toFixed(2)); // Amount
  }
  str += formatTLV('58', 'KH'); // Country Code
  str += formatTLV('59', (merchantName || 'SORY SOKHIN').trim().slice(0, 25).toUpperCase()); // Merchant Name
  str += formatTLV('60', 'Phnom Penh'); // Merchant City

  // Tag 62: Additional Data (Bill Number / Order ID)
  if (billNumber) {
    const addData = formatTLV('01', String(billNumber).slice(0, 25));
    str += formatTLV('62', addData);
  }

  // Tag 99: Timestamp (Required by NBC KHQR for Dynamic QR 12)
  if (isDynamic) {
    const now = Date.now();
    const exp = now + 15 * 60 * 1000; // 15 minutes validity matching countdown
    const timeData = formatTLV('00', String(now)) + formatTLV('01', String(exp));
    str += formatTLV('99', timeData);
  }

  str += '6304';
  const checksum = crc16Ccitt(str);
  return str + checksum;
}

export interface GeneratedPaymentData {
  ok: boolean;
  paymentId: string;
  provider: 'aba' | 'bakong';
  amount: number;
  currency: string;
  qrString: string;
  qrImageUrl?: string;
  cardImageUrl?: string;
  payUrl?: string;
  merchantName: string;
  expiresAt?: string;
  error?: string;
}

// -------------------------------------------------------------
// Create Payment (Client API -> Server Proxy with Local Fallback)
// -------------------------------------------------------------
export async function createPaymentQR(
  amount: number,
  orderId: string,
  provider?: 'aba' | 'bakong',
  username: string = 'guest'
): Promise<GeneratedPaymentData> {
  const settings = getStoredPaymentSettings();
  const selectedProvider = provider || settings.activeProvider;

  // 1. Try server proxy endpoint first
  try {
    const res = await fetch('/api/payment/generate-qr', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount,
        orderId,
        provider: selectedProvider,
        username,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.ok && data.qr_string) {
        return {
          ok: true,
          paymentId: data.payment_id || orderId,
          provider: selectedProvider,
          amount,
          currency: data.currency || 'USD',
          qrString: data.qr_string,
          qrImageUrl: data.qr_image || data.qr_image_url,
          cardImageUrl: data.card_image,
          payUrl: data.pay_url,
          merchantName: data.merchant_name || (selectedProvider === 'aba' ? 'SORY SOKHIN' : settings.bakongName),
          expiresAt: data.expires_at,
        };
      }
    }
  } catch (err: any) {
    if (err?.name === 'AbortError' || String(err?.message || err).includes('aborted')) {
      // Benign abort
    } else {
      console.warn('Backend proxy /api/payment/generate-qr unavailable, running direct fallback:', err);
    }
  }

  // 2. Direct NBC-compliant KHQR generation fallback
  let account = '';
  let merchantName = '';

  if (selectedProvider === 'aba') {
    // ABA Bank account: Uses @abaa domain so banking apps recognize ABA Bank
    const rawAba = (settings.abaAccount || settings.bakongUid?.replace(/@.*$/, '@abaa') || 'sokhin_sory@abaa').trim();
    account = rawAba.includes('@') ? rawAba : `${rawAba}@abaa`;
    merchantName = (settings.abaAccountName || settings.bakongName || settings.botName || 'SORY SOKHIN').trim();
  } else {
    // Bakong Wallet: Uses @bkrt domain
    account = (settings.bakongUid || 'sokhin_sory@bkrt').trim();
    merchantName = (settings.bakongName || settings.botName || 'SORY SOKHIN').trim();
  }

  const qrString = generateBakongKHQRString(
    account,
    merchantName,
    amount,
    orderId,
    true
  );

  const qrDataUrl = await QRCode.toDataURL(qrString, {
    margin: 1,
    width: 450,
    errorCorrectionLevel: 'H',
    color: { dark: '#000000', light: '#ffffff' },
  });

  const payUrl = selectedProvider === 'aba'
    ? `aba://pay?amount=${amount.toFixed(2)}&currency=USD&ref=${orderId}&merchant=${encodeURIComponent(merchantName)}`
    : `bakong://pay?qr=${encodeURIComponent(qrString)}`;

  return {
    ok: true,
    paymentId: orderId,
    provider: selectedProvider,
    amount,
    currency: 'USD',
    qrString,
    qrImageUrl: qrDataUrl,
    cardImageUrl: `https://khmer-system.com/aba/card/${orderId}`,
    payUrl,
    merchantName,
  };
}

// -------------------------------------------------------------
// Check Payment Status (Client API -> Server Proxy)
// -------------------------------------------------------------
export interface CheckPaymentResult {
  ok: boolean;
  status: 'paid' | 'pending' | 'expired' | 'failed';
  paid: boolean;
  rawStatus?: string;
  error?: string;
}

export async function checkPaymentStatus(
  paymentId: string,
  provider: 'aba' | 'bakong' = 'aba'
): Promise<CheckPaymentResult> {
  try {
    const res = await fetch('/api/payment/check-payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ payment_id: paymentId, provider }),
    });

    if (res.ok) {
      const data = await res.json();
      const status = String(data.status || '').toLowerCase();
      const isPaid = status === 'paid' || status === 'completed' || status === 'success' || data.paid === true;

      return {
        ok: true,
        status: isPaid ? 'paid' : status === 'expired' ? 'expired' : 'pending',
        paid: isPaid,
        rawStatus: data.raw_status || data.status,
      };
    }
  } catch (err: any) {
    if (err?.name === 'AbortError' || String(err?.message || err).includes('aborted')) {
      return {
        ok: true,
        status: 'pending',
        paid: false,
      };
    }
    console.warn('Check payment backend query exception:', err);
  }

  return {
    ok: true,
    status: 'pending',
    paid: false,
  };
}

// -------------------------------------------------------------
// Generate Beautiful ABA / Bakong KHQR Canvas (Matching Python Card)
// -------------------------------------------------------------
export async function renderKhqrCardToCanvas(
  canvas: HTMLCanvasElement,
  qrData: string,
  merchantName: string,
  amount: number,
  cardType: 'aba' | 'bakong' = 'aba'
): Promise<void> {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  canvas.width = 900;
  canvas.height = 1104;

  // Background
  ctx.fillStyle = '#EDEEF3';
  ctx.fillRect(0, 0, 900, 1104);

  // Top Title
  ctx.fillStyle = '#0A243F';
  ctx.font = 'bold 70px Inter, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(cardType === 'aba' ? "ABA' QR" : "BAKONG' QR", 450, 100);

  // White Card Container (Rounded rectangle)
  ctx.fillStyle = '#FFFFFF';
  drawRoundedRect(ctx, 110, 178, 680, 809, 32);
  ctx.fill();

  // Top Red KHQR Header
  ctx.save();
  drawRoundedRect(ctx, 110, 178, 680, 809, 32);
  ctx.clip();
  ctx.fillStyle = '#D11A2A';
  ctx.fillRect(110, 178, 680, 68);
  ctx.restore();

  // KHQR White text in header
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 36px Inter, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('KHQR', 450, 226);

  // Merchant Name
  ctx.fillStyle = '#1C2A38';
  ctx.font = 'bold 28px Inter, -apple-system, sans-serif';
  ctx.fillText(merchantName.trim().toUpperCase(), 450, 285);

  // Amount & USD
  const amtStr = Number(amount).toFixed(2);
  ctx.font = 'bold 52px Inter, -apple-system, sans-serif';
  const amtWidth = ctx.measureText(amtStr).width;
  ctx.font = '36px Inter, -apple-system, sans-serif';
  const usdWidth = ctx.measureText('USD').width;

  const totalWidth = amtWidth + 12 + usdWidth;
  const startX = 450 - totalWidth / 2;

  ctx.fillStyle = '#000000';
  ctx.font = 'bold 52px Inter, -apple-system, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(amtStr, startX, 345);

  ctx.fillStyle = '#7F8C8D';
  ctx.font = '36px Inter, -apple-system, sans-serif';
  ctx.fillText('USD', startX + amtWidth + 12, 345);

  // Dashed Divider line
  ctx.fillStyle = '#BDC3C7';
  for (let x = 115; x < 785; x += 19) {
    ctx.fillRect(x, 368, 12, 2);
  }

  // Draw QR code onto canvas
  try {
    const qrDataUrl = await QRCode.toDataURL(qrData, {
      margin: 1,
      width: 453,
      errorCorrectionLevel: 'H',
      color: { dark: '#000000', light: '#ffffff' },
    });
    const qrImg = new Image();
    qrImg.src = qrDataUrl;
    await new Promise((resolve) => {
      qrImg.onload = resolve;
    });
    ctx.drawImage(qrImg, 223, 411, 453, 453);

    // Center Badge Circle (calibrated size to preserve QR scan readability)
    ctx.beginPath();
    ctx.arc(450, 638, 34, 0, Math.PI * 2);
    ctx.fillStyle = '#D11A2A';
    ctx.fill();

    // Center Badge Text
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 20px Inter, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(cardType === 'aba' ? 'ABA' : 'BAKONG', 450, 638);
    ctx.textBaseline = 'alphabetic';
  } catch (err) {
    console.error('Failed to draw QR image onto canvas:', err);
  }

  // Bottom Footer
  ctx.fillStyle = '#0A243F';
  ctx.fillRect(0, 1016, 900, 88);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 34px Inter, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(cardType === 'aba' ? 'ABA BANK' : 'BAKONG KHQR', 450, 1052);

  ctx.fillStyle = '#99ACCB';
  ctx.font = '18px Inter, -apple-system, sans-serif';
  ctx.fillText(
    cardType === 'aba' ? 'NATIONAL BANK OF CANADA GROUP' : 'NATIONAL BANK OF CAMBODIA',
    450,
    1080
  );
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}
