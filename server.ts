import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import https from 'https';
import fs from 'fs';
import cachedCatalogData from './cached_khmer_catalog.json';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Normalize Vercel serverless request path
app.use((req, res, next) => {
  const orig =
    (req.headers['x-matched-path'] as string) ||
    (req.headers['x-forwarded-uri'] as string) ||
    (req.headers['x-now-route-path'] as string);
  if (orig && typeof orig === 'string' && orig.startsWith('/api')) {
    req.url = orig;
  }
  next();
});

// In-memory runtime settings initialized with live credentials from Angkor SMM
let paymentSettings = {
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

// CRC16 Checksum helper
function crc16Ccitt(data: string): string {
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

function generateBakongKHQR(
  account: string,
  merchantName: string,
  amount: number,
  billNumber?: string,
  isDynamic: boolean = true
): string {
  let str = '';
  str += formatTLV('00', '01');
  str += formatTLV('01', isDynamic ? '12' : '11'); // Dynamic (12) or Static (11)
  const cleanAccount = (account || 'sokhin_sory@bkrt').trim();
  const mInfo = formatTLV('00', cleanAccount);
  str += formatTLV('29', mInfo);
  str += formatTLV('52', '5999'); // MCC: 5999
  str += formatTLV('53', '840'); // Currency: USD
  if (amount && Number(amount) > 0) {
    str += formatTLV('54', Number(amount).toFixed(2));
  }
  str += formatTLV('58', 'KH');
  str += formatTLV('59', (merchantName || 'SORY SOKHIN').trim().slice(0, 25).toUpperCase());
  str += formatTLV('60', 'Phnom Penh');
  if (billNumber) {
    str += formatTLV('62', formatTLV('01', String(billNumber).slice(0, 25)));
  }
  if (isDynamic) {
    const now = Date.now();
    const exp = now + 15 * 60 * 1000;
    const timeData = formatTLV('00', String(now)) + formatTLV('01', String(exp));
    str += formatTLV('99', timeData);
  }
  str += '6304';
  return str + crc16Ccitt(str);
}

// Cloudflare IP bypass for khmer-system.com to evade local ISP DNS sinkhole (Smart Axiata, etc.)
const KHMER_SYSTEM_CLOUDFLARE_IPS = ['104.26.9.244', '104.26.8.244', '172.67.68.92'];

// Helper to make HTTPS requests to https://khmer-system.com matching Python bot
function makeKhmerSystemRequest(endpoint: string, payload: Record<string, any>): Promise<any> {
  return new Promise((resolve, reject) => {
    const dataStr = JSON.stringify(payload);
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

    // Connect directly to Cloudflare edge IP with Host header & SNI
    const targetHost = KHMER_SYSTEM_CLOUDFLARE_IPS[0];

    const req = https.request(
      {
        host: targetHost,
        port: 443,
        path: cleanEndpoint,
        method: 'POST',
        servername: 'khmer-system.com',
        rejectUnauthorized: false,
        headers: {
          'Host': 'khmer-system.com',
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(dataStr),
          'X-API-Key': paymentSettings.abaApiKey,
          'User-Agent': 'Khmer-System-Telegram-Bot/2.0',
        },
        timeout: 10000,
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          try {
            resolve(JSON.parse(body));
          } catch {
            resolve({ raw: body, statusCode: res.statusCode });
          }
        });
      }
    );

    req.on('error', (err) => {
      // Fallback to domain name URL if direct IP fails
      try {
        const url = new URL(cleanEndpoint, paymentSettings.gatewayUrl);
        const fbReq = https.request(
          url,
          {
            method: 'POST',
            rejectUnauthorized: false,
            headers: {
              'Content-Type': 'application/json',
              'Content-Length': Buffer.byteLength(dataStr),
              'X-API-Key': paymentSettings.abaApiKey,
              'User-Agent': 'Khmer-System-Telegram-Bot/2.0',
            },
            timeout: 10000,
          },
          (fbRes) => {
            let fbBody = '';
            fbRes.on('data', (c) => (fbBody += c));
            fbRes.on('end', () => {
              try {
                resolve(JSON.parse(fbBody));
              } catch {
                resolve({ raw: fbBody, statusCode: fbRes.statusCode });
              }
            });
          }
        );
        fbReq.on('error', (fbErr) => reject(fbErr));
        fbReq.write(dataStr);
        fbReq.end();
      } catch (e) {
        reject(err);
      }
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout to Khmer-System Gateway'));
    });

    req.write(dataStr);
    req.end();
  });
}

// -------------------------------------------------------------
// Payment API Endpoints
// -------------------------------------------------------------

// 1. Generate QR Code
app.post('/api/payment/generate-qr', async (req, res) => {
  try {
    const { amount, orderId, provider, username } = req.body;
    const selectedProvider = provider || paymentSettings.activeProvider;
    const amt = parseFloat(amount);

    if (isNaN(amt) || amt <= 0) {
      return res.status(400).json({ ok: false, error: 'Invalid amount' });
    }

    if (selectedProvider === 'bakong') {
      const qrString = generateBakongKHQR(
        paymentSettings.bakongUid,
        paymentSettings.bakongName,
        amt,
        orderId,
        true
      );

      return res.json({
        ok: true,
        payment_id: orderId,
        provider: 'bakong',
        amount: amt,
        currency: 'USD',
        qr_string: qrString,
        merchant_name: paymentSettings.bakongName,
        pay_url: `bakong://pay?qr=${encodeURIComponent(qrString)}`,
      });
    }

    // ABA PayWay / Khmer-System API with reliable NBC KHQR fallback
    try {
      const responseData = await makeKhmerSystemRequest('/aba-api/generate-qr', {
        api_key: paymentSettings.abaApiKey,
        merchant_id: paymentSettings.abaMerchantId,
        username: username || `web_${orderId || Date.now()}`,
        amount: amt,
      });

      if (responseData && (responseData.ok || responseData.success) && responseData.qr_string) {
        return res.json({
          ok: true,
          payment_id: responseData.payment_id || responseData.id || orderId,
          provider: 'aba',
          amount: amt,
          currency: 'USD',
          qr_string: responseData.qr_string,
          qr_image: responseData.qr_image || responseData.qr_image_url,
          card_image: responseData.card_image || `https://khmer-system.com/aba/card/${responseData.payment_id}`,
          pay_url: responseData.pay_url,
          merchant_name: paymentSettings.botName,
          expires_at: responseData.expires_at,
        });
      }
    } catch (gatewayErr) {
      console.warn('Khmer-System gateway unreachable, using standard NBC KHQR fallback:', gatewayErr);
    }

    // Direct NBC-compliant KHQR generation (Scannable by ABA Mobile & Bakong)
    const rawAba = (paymentSettings.abaAccount || paymentSettings.bakongUid?.replace(/@.*$/, '@abaa') || 'sokhin_sory@abaa').trim();
    const abaAccount = rawAba.includes('@') ? rawAba : `${rawAba}@abaa`;
    const abaName = (paymentSettings.abaAccountName || paymentSettings.botName || 'SORY SOKHIN').trim();

    const khqrString = generateBakongKHQR(
      abaAccount,
      abaName,
      amt,
      orderId,
      true
    );

    return res.json({
      ok: true,
      payment_id: orderId,
      provider: 'aba',
      amount: amt,
      currency: 'USD',
      qr_string: khqrString,
      merchant_name: abaName,
      pay_url: `aba://pay?amount=${amt.toFixed(2)}&currency=USD&ref=${orderId}&merchant=${encodeURIComponent(abaName)}`,
    });
  } catch (error: any) {
    console.error('Error generating QR:', error);
    res.status(500).json({ ok: false, error: error.message || 'Internal server error' });
  }
});

// 2. Check Payment Status
app.post('/api/payment/check-payment', async (req, res) => {
  try {
    const { payment_id } = req.body;

    if (!payment_id) {
      return res.status(400).json({ ok: false, error: 'Missing payment_id' });
    }

    const checkData = await makeKhmerSystemRequest('/aba-api/check-payment', {
      api_key: paymentSettings.abaApiKey,
      merchant_id: paymentSettings.abaMerchantId,
      payment_id: String(payment_id),
    });

    const status = String(checkData.status || '').toLowerCase();
    const isPaid =
      status === 'paid' ||
      status === 'completed' ||
      status === 'success' ||
      status === 'approved' ||
      checkData.paid === true;

    if (isPaid) {
      // Confirm payment credit on gateway
      try {
        await makeKhmerSystemRequest('/aba-api/mark-credited', {
          api_key: paymentSettings.abaApiKey,
          merchant_id: paymentSettings.abaMerchantId,
          payment_id: String(payment_id),
        });
      } catch (markErr) {
        console.warn('Mark credited non-fatal error:', markErr);
      }
    }

    return res.json({
      ok: true,
      status: isPaid ? 'paid' : status === 'expired' ? 'expired' : 'pending',
      paid: isPaid,
      raw_status: checkData.raw_status || checkData.status,
    });
  } catch (error: any) {
    console.error('Error checking payment:', error);
    res.status(500).json({ ok: false, error: error.message || 'Internal server error' });
  }
});

// 3. Payment Gateway Settings GET & POST
app.get('/api/payment/settings', (req, res) => {
  res.json({
    ok: true,
    settings: {
      activeProvider: paymentSettings.activeProvider,
      gatewayUrl: paymentSettings.gatewayUrl,
      abaMerchantId: paymentSettings.abaMerchantId,
      abaAccount: paymentSettings.abaAccount,
      abaAccountName: paymentSettings.abaAccountName,
      abaApiKeyMasked: `${paymentSettings.abaApiKey.slice(0, 6)}...${paymentSettings.abaApiKey.slice(-4)}`,
      bakongUid: paymentSettings.bakongUid,
      bakongName: paymentSettings.bakongName,
      botName: paymentSettings.botName,
    },
  });
});

app.post('/api/payment/settings', (req, res) => {
  const updates = req.body;
  if (updates) {
    if (updates.activeProvider) paymentSettings.activeProvider = updates.activeProvider;
    if (updates.abaApiKey) paymentSettings.abaApiKey = updates.abaApiKey;
    if (updates.abaMerchantId) paymentSettings.abaMerchantId = updates.abaMerchantId;
    if (updates.abaAccount) paymentSettings.abaAccount = updates.abaAccount;
    if (updates.abaAccountName) paymentSettings.abaAccountName = updates.abaAccountName;
    if (updates.bakongToken) paymentSettings.bakongToken = updates.bakongToken;
    if (updates.bakongUid) paymentSettings.bakongUid = updates.bakongUid;
    if (updates.bakongName) paymentSettings.bakongName = updates.bakongName;
    if (updates.gatewayUrl) paymentSettings.gatewayUrl = updates.gatewayUrl;
    if (updates.botName) paymentSettings.botName = updates.botName;
  }
  res.json({ ok: true, settings: paymentSettings });
});

// 4. Admin Credentials Sync & Verification Endpoints
let serverAdminCreds = {
  username: 'admin',
  code: '888888',
  isCustom: false,
};

app.get('/api/admin/credentials', (req, res) => {
  res.json({
    ok: true,
    isCustom: serverAdminCreds.isCustom,
    username: serverAdminCreds.username,
  });
});

app.post('/api/admin/credentials', (req, res) => {
  const { username, code, isCustom } = req.body;
  if (username && code) {
    serverAdminCreds = {
      username: String(username).trim(),
      code: String(code).trim(),
      isCustom: Boolean(isCustom ?? true),
    };
    return res.json({ ok: true, message: 'Admin credentials saved successfully' });
  }
  res.status(400).json({ ok: false, error: 'Invalid username or code' });
});

app.post('/api/admin/verify', (req, res) => {
  const { username, code } = req.body;
  const inUser = String(username || '').trim().toLowerCase();
  const inCode = String(code || '').trim();
  const targetUser = serverAdminCreds.username.trim().toLowerCase();
  const targetCode = serverAdminCreds.code.trim();

  if (serverAdminCreds.isCustom) {
    const isValid = inUser === targetUser && inCode === targetCode;
    return res.json({ ok: true, isValid });
  }

  const isDefaultMatch = (inUser === 'admin' && inCode === '888888') || (inUser === 'sorysokhin' && inCode === '123456');
  res.json({ ok: true, isValid: isDefaultMatch });
});

// 5. Custom / Edited Products Storage for Multi-Device Sync
let customServerProducts: any[] = [];

app.get('/api/admin/products', (req, res) => {
  res.json({ ok: true, products: customServerProducts });
});

app.post('/api/admin/products', (req, res) => {
  const product = req.body;
  if (product && product.id) {
    const idx = customServerProducts.findIndex((p) => p.id === product.id);
    if (idx >= 0) {
      customServerProducts[idx] = { ...customServerProducts[idx], ...product };
    } else {
      customServerProducts.push(product);
    }
    return res.json({ ok: true, products: customServerProducts });
  }
  res.status(400).json({ ok: false, error: 'Invalid product data' });
});

app.delete('/api/admin/products/:id', (req, res) => {
  const { id } = req.params;
  customServerProducts = customServerProducts.filter((p) => p.id !== id);
  res.json({ ok: true, products: customServerProducts });
});

// -------------------------------------------------------------
// Khmer-TopUp API Integration Endpoints (https://khmer-topup.com/api/v1)
// -------------------------------------------------------------
let khmerTopupSettings = {
  apiKey: '',
  baseUrl: 'https://khmer-topup.com/api/v1',
  autoSync: true,
  syncIntervalMinutes: 30,
  profitPercentage: 5,
};

function makeKhmerTopupRequest(
  endpointPath: string,
  method: string = 'GET',
  payload?: any,
  overrideApiKey?: string
): Promise<any> {
  return new Promise((resolve, reject) => {
    const key = overrideApiKey || khmerTopupSettings.apiKey;
    const cleanBase = khmerTopupSettings.baseUrl.replace(/\/+$/, '');
    const cleanPath = endpointPath.replace(/^\/+/, '');
    const fullUrl = new URL(`${cleanBase}/${cleanPath}`);

    const postData = payload ? JSON.stringify(payload) : null;
    const headers: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'application/json',
    };

    if (key) {
      headers['Authorization'] = `Bearer ${key}`;
      headers['X-API-Key'] = key;
    }

    if (postData) {
      headers['Content-Type'] = 'application/json';
      headers['Content-Length'] = String(Buffer.byteLength(postData));
    }

    const req = https.request(
      fullUrl,
      {
        method,
        headers,
        timeout: 15000,
      },
      (res) => {
        let body = '';
        res.on('data', (c) => (body += c));
        res.on('end', () => {
          try {
            const parsed = JSON.parse(body);
            resolve({ statusCode: res.statusCode, ...parsed });
          } catch {
            resolve({ statusCode: res.statusCode, raw: body });
          }
        });
      }
    );

    req.on('error', (err) => reject(err));
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Khmer-TopUp API connection timeout'));
    });

    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

// In-memory catalog of live games & packages from https://khmer-topup.com
let cachedLiveGames: any[] = Array.isArray(cachedCatalogData) ? [...cachedCatalogData] : [];

// Try to load cached catalog on startup
const possibleCachePaths = [
  path.resolve(__dirname, 'cached_khmer_catalog.json'),
  path.resolve(process.cwd(), 'cached_khmer_catalog.json'),
  path.resolve(__dirname, '../cached_khmer_catalog.json'),
];
for (const cp of possibleCachePaths) {
  try {
    if (fs.existsSync(cp)) {
      cachedLiveGames = JSON.parse(fs.readFileSync(cp, 'utf8'));
      if (cachedLiveGames.length > 0) {
        console.log(`[Catalog] Loaded ${cachedLiveGames.length} games from cache (${cp}).`);
        break;
      }
    }
  } catch (e) {
    // continue to next path
  }
}

// Scraper helper to crawl https://khmer-topup.com
function fetchKhmerTopupUrl(urlStr: string): Promise<string> {
  return new Promise((resolve, reject) => {
    https
      .get(
        urlStr,
        {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          },
          timeout: 20000,
        },
        (res) => {
          let data = '';
          res.on('data', (c) => (data += c));
          res.on('end', () => resolve(data));
        }
      )
      .on('error', reject);
  });
}

const KH_GAME_TITLES: Record<string, string> = {
  'freefire-sgmy': 'Free Fire',
  'mobile-legends': 'Mobile Legends Cambodia',
  'telegram': 'Telegram Stars',
  'mobile-legends-exclusive': 'Mobile Legends Exclusive Cambodia',
  'mobile-legends-special': 'Mobile Legends Special',
  'freefire-indonesia': 'Free Fire Indonesia',
  'honor-of-kings': 'Honor of Kings',
  'freefire-taiwan': 'Free Fire Taiwan',
  'freefire-vietnam': 'Free Fire Vietnam',
  'pubg-mobile': 'PUBG Mobile Global',
  'eafc-mobile-cambodia': 'EA Sports FC Mobile Cambodia',
  'magic-chess-gogo': 'Magic Chess GoGo',
  'blood-strike': 'Blood Strike',
  'freefire-sg': 'Free Fire Singapore',
  'freefire-brazil': 'Free Fire Brazil',
  'racing-master-sea': 'Racing Master SEA',
  'freefire-global': 'Free Fire Global',
  'wild-rift-cambodia': 'Wild Rift Cambodia',
  'freefire-middle-east': 'Free Fire Middle East',
  'freefire-latam': 'Free Fire LATAM',
  'freefire-bangladesh': 'Free Fire Bangladesh',
  'valorant-sg': 'Valorant Singapore',
  'call-of-duty-mobile-garena-sgmy': 'Call of Duty Mobile Garena',
  'bigo-live-diamonds': 'Bigo Live Diamonds',
  'identity-v': 'Identity V',
};

async function scrapeLiveKhmerTopup(): Promise<any[]> {
  try {
    console.log('[Catalog Crawler] Fetching /api/games from https://khmer-topup.com ...');
    const apiGamesData = await fetchKhmerTopupUrl('https://khmer-topup.com/api/games');
    const json = JSON.parse(apiGamesData);
    const html = json.html || '';

    const regex = /<a\s+class="game-card"[^>]*href="([^"]+)"[^>]*data-flag="([^"]*)"[^>]*data-name="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;
    const rawList: any[] = [];
    let m;
    while ((m = regex.exec(html)) !== null) {
      const href = m[1];
      const dataFlag = m[2];
      const dataName = m[3];
      const inner = m[4];
      const imgMatch = inner.match(/<img\s+src="([^"]+)"\s+alt="([^"]*)"/i);
      let img = imgMatch ? imgMatch[1] : '';
      if (img && !img.startsWith('http')) {
        img = 'https://khmer-topup.com' + (img.startsWith('/') ? img : '/' + img);
      }
      const flagMatch = inner.match(/<img\s+class="game-flag"[^>]*src="([^"]+)"/i);
      let flag = flagMatch ? flagMatch[1] : (dataFlag || '');
      if (flag && !flag.startsWith('http')) {
        flag = 'https://khmer-topup.com' + (flag.startsWith('/') ? flag : '/' + flag);
      }
      const titleMatch = inner.match(/<div class="game-name">([^<]+)<\/div>/i);
      const title = titleMatch ? titleMatch[1].trim() : dataName;
      const slug = href.replace('/game/', '').trim();
      rawList.push({ slug, href, title, name: dataName, img, flag });
    }

    if (rawList.length === 0) {
      console.warn('[Catalog Crawler] No games found in /api/games');
      return cachedLiveGames;
    }

    const games: any[] = [];
    for (let i = 0; i < rawList.length; i += 5) {
      const chunk = rawList.slice(i, i + 5);
      const chunkParsed = await Promise.all(
        chunk.map(async (g, subIdx) => {
          const overallIndex = i + subIdx;
          try {
            const pageHtml = await fetchKhmerTopupUrl('https://khmer-topup.com/game/' + g.slug);
            const pkgRegex = /<label\s+class="pkg"[^>]*>([\s\S]*?)<\/label>/gi;
            const packages: any[] = [];
            let pm;
            while ((pm = pkgRegex.exec(pageHtml)) !== null) {
              const block = pm[1];
              const inputMatch = block.match(
                /<input[^>]*value="([^"]+)"[^>]*data-price="([^"]+)"[^>]*data-name="([^"]+)"/i
              );
              if (!inputMatch) continue;
              const pkgId = inputMatch[1];
              const rawPrice = inputMatch[2];
              const pkgName = inputMatch[3];
              const priceUsd = parseFloat(rawPrice.replace(/[^0-9.]/g, '')) || 0;
              const isBestSeller = /best seller|bestseller/i.test(block);
              const isPopular = /popular/i.test(block) || isBestSeller;

              packages.push({
                id: `pkg-${g.slug}-${pkgId}`,
                name: pkgName,
                nameKh: pkgName,
                amount: pkgName,
                priceUsd,
                popular: isPopular,
                bonus: isBestSeller ? 'BEST SELLER' : isPopular ? 'POPULAR' : undefined,
                stock: 9999,
                externalPackageId: parseInt(pkgId, 10) || undefined,
              });
            }

            const formCardMatch = pageHtml.match(
              /<div[^>]*class="[^"]*form-card[^"]*"[^>]*data-has-server="([^"]+)"/i
            );
            const needsZoneId = formCardMatch ? formCardMatch[1] === '1' : /zone|server/i.test(pageHtml);

            const idLabelMatch = pageHtml.match(/<label[^>]*for="player_id"[^>]*>([\s\S]*?)<\/label>/i);
            const serverLabelMatch = pageHtml.match(/<label[^>]*for="server_id"[^>]*>([\s\S]*?)<\/label>/i);

            const isFeatured =
              overallIndex < 12 ||
              [
                'freefire-sgmy',
                'mobile-legends',
                'telegram',
                'mobile-legends-exclusive',
                'honor-of-kings',
                'pubg-mobile',
                'eafc-mobile-cambodia',
                'magic-chess-gogo',
                'blood-strike',
              ].includes(g.slug);

            return {
              id: g.slug,
              externalSlug: g.slug,
              title: g.title,
              titleKh: KH_GAME_TITLES[g.slug] || g.title,
              category: isFeatured ? 'featured' : 'all',
              badge: isFeatured ? 'POPULAR' : 'TOPUP',
              badgeKh: isFeatured ? 'POPULAR' : 'TOPUP',
              badgeType: 'vip',
              icon: '🎮',
              coverImage: g.img,
              countryFlag: g.flag || undefined,
              needsZoneId,
              zonePlaceholder: serverLabelMatch
                ? serverLabelMatch[1].replace(/<[^>]+>/g, '').trim()
                : needsZoneId
                ? 'Zone ID (e.g. 1234)'
                : undefined,
              idLabel: idLabelMatch
                ? idLabelMatch[1].replace(/<[^>]+>/g, '').trim()
                : g.slug === 'telegram'
                ? 'Telegram Username'
                : 'Player ID',
              serverLabel: serverLabelMatch
                ? serverLabelMatch[1].replace(/<[^>]+>/g, '').trim()
                : needsZoneId
                ? 'Zone ID / Server ID'
                : undefined,
              isHot: isFeatured,
              rating: 4.9,
              stockCount: 9999,
              isApiConnected: true,
              priority: overallIndex + 1,
              packages:
                packages.length > 0
                  ? packages
                  : [
                      {
                        id: `pkg-${g.slug}-std`,
                        name: 'Standard Package',
                        nameKh: 'កញ្ចប់ស្តង់ដារ',
                        amount: 'Standard',
                        priceUsd: 1.0,
                        stock: 9999,
                      },
                    ],
            };
          } catch (err: any) {
            console.error(`Error scraping game ${g.slug}:`, err.message);
            return null;
          }
        })
      );
      chunkParsed.filter(Boolean).forEach((item) => games.push(item));
    }

    games.sort((a, b) => a.priority - b.priority);

    if (games.length > 0) {
      cachedLiveGames = games;
      try {
        const cacheFile = path.resolve(__dirname, 'cached_khmer_catalog.json');
        fs.writeFileSync(cacheFile, JSON.stringify(games, null, 2), 'utf8');
      } catch (saveErr) {
        console.warn('[Catalog Crawler] Failed to write cache file:', saveErr);
      }
      console.log(`[Catalog Crawler] Successfully synced ${games.length} games & ${games.reduce((acc, g) => acc + g.packages.length, 0)} packages.`);
    }

    return cachedLiveGames;
  } catch (error: any) {
    console.error('[Catalog Crawler] Scraping failed:', error.message);
    return cachedLiveGames;
  }
}

// Automatically sync on startup in background if cache is empty or stale
setTimeout(() => {
  if (cachedLiveGames.length === 0) {
    scrapeLiveKhmerTopup();
  }
}, 1000);

// Endpoint 1: Get complete live catalog directly
app.get('/api/khmer-topup/live-catalog', (req, res) => {
  res.json({
    ok: true,
    games: cachedLiveGames,
    count: cachedLiveGames.length,
    totalPackages: cachedLiveGames.reduce((acc, g) => acc + (g.packages?.length || 0), 0),
  });
});

// Endpoint 2: Force refresh / re-sync now
app.post('/api/khmer-topup/sync-now', async (req, res) => {
  try {
    const updated = await scrapeLiveKhmerTopup();
    res.json({
      ok: true,
      games: updated,
      count: updated.length,
      totalPackages: updated.reduce((acc, g) => acc + (g.packages?.length || 0), 0),
    });
  } catch (err: any) {
    res.json({ ok: false, error: err.message, fallbackGames: cachedLiveGames });
  }
});

// Endpoint 3: Image Proxy to guarantee images and flags load without any CORS / hotlink blockers
app.get('/api/khmer-topup/image-proxy', (req, res) => {
  const imageUrl = req.query.url as string;
  if (!imageUrl || !imageUrl.startsWith('https://khmer-topup.com/')) {
    return res.status(400).send('Invalid or unauthorized image URL');
  }

  https
    .get(imageUrl, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 10000 }, (upstream) => {
      res.setHeader('Content-Type', upstream.headers['content-type'] || 'image/webp');
      res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
      upstream.pipe(res);
    })
    .on('error', (err) => {
      res.status(502).send(err.message);
    });
});

// Check Balance (/api/v1/me)
app.post('/api/khmer-topup/me', async (req, res) => {
  try {
    const { apiKey } = req.body;
    if (apiKey) khmerTopupSettings.apiKey = apiKey;
    const result = await makeKhmerTopupRequest('me', 'GET', null, apiKey);
    if (result && (result.username || result.balance !== undefined)) {
      return res.json({ ok: true, ...result });
    }
    return res.json({ ok: false, error: result?.message || result?.error || 'Invalid API Key or balance not available', ...result });
  } catch (err: any) {
    res.json({ ok: false, error: err.message || 'API connection failed' });
  }
});

// List Games & Packages (/api/v1/games) with resilient fallback
app.post('/api/khmer-topup/games', async (req, res) => {
  try {
    const { apiKey } = req.body;
    if (apiKey) {
      khmerTopupSettings.apiKey = apiKey;
      const result = await makeKhmerTopupRequest('games', 'GET', null, apiKey);
      if (result.games || Array.isArray(result)) {
        return res.json({ ok: true, games: result.games || result, source: 'official_api' });
      }
    }
    return res.json({ ok: true, games: cachedLiveGames, source: 'cached' });
  } catch (err: any) {
    return res.json({ ok: true, games: cachedLiveGames, source: 'cached' });
  }
});

// Verify Game Account (/api/v1/check?slug=...&player_id=...&server_id=...)
app.post('/api/khmer-topup/check', async (req, res) => {
  try {
    const { slug, player_id, server_id, apiKey } = req.body;
    let query = `check?slug=${encodeURIComponent(slug)}&player_id=${encodeURIComponent(player_id)}`;
    if (server_id) {
      query += `&server_id=${encodeURIComponent(server_id)}`;
    }
    const result = await makeKhmerTopupRequest(query, 'GET', null, apiKey);
    return res.json(result);
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Place Order (/api/v1/orders)
app.post('/api/khmer-topup/order', async (req, res) => {
  try {
    const { package_id, player_id, server_id, reference, apiKey } = req.body;
    const payload = {
      package_id,
      player_id,
      ...(server_id ? { server_id } : {}),
      reference: reference || `order_${Date.now()}`,
    };
    const result = await makeKhmerTopupRequest('orders', 'POST', payload, apiKey);
    return res.json(result);
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Order Status (/api/v1/orders/:orderCode)
app.get('/api/khmer-topup/order/:code', async (req, res) => {
  try {
    const { code } = req.params;
    const result = await makeKhmerTopupRequest(`orders/${encodeURIComponent(code)}`, 'GET');
    return res.json(result);
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Khmer-TopUp Settings
app.get('/api/khmer-topup/settings', (req, res) => {
  res.json({
    ok: true,
    settings: {
      baseUrl: khmerTopupSettings.baseUrl,
      hasApiKey: Boolean(khmerTopupSettings.apiKey),
      apiKeyMasked: khmerTopupSettings.apiKey
        ? `${khmerTopupSettings.apiKey.slice(0, 4)}...${khmerTopupSettings.apiKey.slice(-4)}`
        : '',
      autoSync: khmerTopupSettings.autoSync,
      syncIntervalMinutes: khmerTopupSettings.syncIntervalMinutes,
      profitPercentage: khmerTopupSettings.profitPercentage ?? 5,
    },
  });
});

app.post('/api/khmer-topup/settings', (req, res) => {
  const { apiKey, baseUrl, autoSync, syncIntervalMinutes, profitPercentage } = req.body;
  if (apiKey !== undefined) khmerTopupSettings.apiKey = apiKey;
  if (baseUrl !== undefined) khmerTopupSettings.baseUrl = baseUrl;
  if (autoSync !== undefined) khmerTopupSettings.autoSync = Boolean(autoSync);
  if (syncIntervalMinutes !== undefined) khmerTopupSettings.syncIntervalMinutes = Math.max(1, Number(syncIntervalMinutes) || 30);
  if (profitPercentage !== undefined) khmerTopupSettings.profitPercentage = Math.max(0, Number(profitPercentage) || 0);
  res.json({ ok: true, settings: khmerTopupSettings });
});

// -------------------------------------------------------------
// Telegram Order Notification Service (@sorysokhin)
// -------------------------------------------------------------
let telegramConfig = {
  adminHandle: '@sorysokhin',
  botToken: process.env.TELEGRAM_BOT_TOKEN || '',
  chatId: process.env.TELEGRAM_CHAT_ID || '',
  enabled: true,
};

function sendTelegramMessage(botToken: string, chatId: string, text: string): Promise<any> {
  return new Promise((resolve, reject) => {
    if (!botToken || !chatId) {
      console.log(`[Telegram Alert for ${telegramConfig.adminHandle}]:\n${text.replace(/<[^>]*>/g, '')}`);
      return resolve({
        ok: true,
        simulated: true,
        note: `Logged for ${telegramConfig.adminHandle}. Configure Bot Token & Chat ID in Admin Panel to receive directly on Telegram app.`,
      });
    }

    const payload = JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
    });

    const req = https.request(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': String(Buffer.byteLength(payload)),
        },
        timeout: 10000,
      },
      (res) => {
        let body = '';
        res.on('data', (c) => (body += c));
        res.on('end', () => {
          try {
            resolve(JSON.parse(body));
          } catch {
            resolve({ ok: res.statusCode === 200, raw: body });
          }
        });
      }
    );

    req.on('error', (err) => reject(err));
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Telegram API connection timeout'));
    });

    req.write(payload);
    req.end();
  });
}

// Telegram order alert route
app.post('/api/notifications/telegram-order', async (req, res) => {
  try {
    const { order, adminHandle, botToken, chatId, enabled } = req.body;
    if (enabled === false) {
      return res.json({ ok: true, skipped: true });
    }

    const activeToken = botToken || telegramConfig.botToken;
    const activeChatId = chatId || telegramConfig.chatId;
    const activeHandle = adminHandle || telegramConfig.adminHandle || '@sorysokhin';

    const timeStr = new Date(order?.createdAt || Date.now()).toLocaleString('en-US', {
      timeZone: 'Asia/Phnom_Penh',
      hour12: true,
    });

    const message = `🚨 <b>【 ការកុម្ម៉ង់ទិញថ្មី - NEW ORDER PLACED 】</b> 🚨
👨‍💼 <b>Admin Alert:</b> ${activeHandle}
━━━━━━━━━━━━━━━━━━
🎮 <b>Game:</b> ${order?.gameTitle || 'Unknown Game'}
📦 <b>Package:</b> ${order?.packageTitle || 'Standard Package'}
💰 <b>Price:</b> $${Number(order?.amountUsd || 0).toFixed(2)} USD
🎯 <b>Player ID:</b> <code>${order?.playerId || 'N/A'}</code> ${order?.zoneId ? `(Zone: <code>${order?.zoneId}</code>)` : ''}
💳 <b>Payment:</b> ${order?.paymentMethod || 'KHQR'}
👤 <b>Customer:</b> ${order?.userEmail || 'Guest User'}
🧾 <b>Order Ref:</b> <code>${order?.orderId || 'ORDER'}</code>
⏱ <b>Time:</b> ${timeStr}
${order?.licenseKey ? `🔑 <b>License Key:</b> <code>${order.licenseKey}</code>\n` : ''}━━━━━━━━━━━━━━━━━━
⚡ <i>Please review or fulfill this order in the Admin Dashboard!</i>`;

    const result = await sendTelegramMessage(activeToken, activeChatId, message);
    res.json({ ok: true, result });
  } catch (err: any) {
    console.error('Telegram notification error:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Telegram test alert route
app.post('/api/notifications/telegram-test', async (req, res) => {
  try {
    const { adminHandle, botToken, chatId, message } = req.body;
    const activeToken = botToken || telegramConfig.botToken;
    const activeChatId = chatId || telegramConfig.chatId;
    const activeHandle = adminHandle || telegramConfig.adminHandle || '@sorysokhin';

    const testMsg = message || `🔔 <b>【 TEST NOTIFICATION 】</b> 🔔
👨‍💼 <b>Admin Handle:</b> ${activeHandle}
✅ <i>Telegram Notification Service is active and configured to alert you on every new customer order!</i>`;

    const result = await sendTelegramMessage(activeToken, activeChatId, testMsg);
    res.json({ ok: true, result });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Telegram settings GET & POST
app.get('/api/notifications/telegram-settings', (req, res) => {
  res.json({
    ok: true,
    settings: {
      adminHandle: telegramConfig.adminHandle,
      chatId: telegramConfig.chatId,
      botTokenMasked: telegramConfig.botToken
        ? `${telegramConfig.botToken.slice(0, 6)}...${telegramConfig.botToken.slice(-4)}`
        : '',
      enabled: telegramConfig.enabled,
    },
  });
});

app.post('/api/notifications/telegram-settings', (req, res) => {
  const { botToken, chatId, enabled, adminHandle } = req.body;
  if (botToken !== undefined) telegramConfig.botToken = botToken;
  if (chatId !== undefined) telegramConfig.chatId = chatId;
  if (enabled !== undefined) telegramConfig.enabled = Boolean(enabled);
  if (adminHandle !== undefined) telegramConfig.adminHandle = adminHandle || '@sorysokhin';
  res.json({ ok: true, settings: telegramConfig });
});

// -------------------------------------------------------------
// Vite middleware mounting in development & Static serving in production
// -------------------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });
}

if (!process.env.VERCEL) {
  startServer();
}

export default function handler(req: any, res: any) {
  return app(req, res);
}
export { app };
