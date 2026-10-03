const https = require('https');
const fs = require('fs');
const path = require('path');

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' } }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

// Map game slugs to nice Khmer titles and categories
const KH_TITLE_MAP = {
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

async function buildCatalog() {
  console.log('Fetching /api/games from khmer-topup.com...');
  const apiGamesData = await fetchUrl('https://khmer-topup.com/api/games');
  const json = JSON.parse(apiGamesData);
  const html = json.html;

  const regex = /<a\s+class="game-card"[^>]*href="([^"]+)"[^>]*data-flag="([^"]*)"[^>]*data-name="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;
  const rawList = [];
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

  console.log(`Found ${rawList.length} games. Scraping packages in chunks...`);

  const games = [];
  for (let i = 0; i < rawList.length; i += 5) {
    const chunk = rawList.slice(i, i + 5);
    const chunkParsed = await Promise.all(chunk.map(async (g, subIdx) => {
      const overallIndex = i + subIdx;
      try {
        const pageHtml = await fetchUrl('https://khmer-topup.com/game/' + g.slug);
        
        // Parse packages
        const pkgRegex = /<label\s+class="pkg"[^>]*>([\s\S]*?)<\/label>/gi;
        const packages = [];
        let pm;
        while ((pm = pkgRegex.exec(pageHtml)) !== null) {
          const block = pm[1];
          const inputMatch = block.match(/<input[^>]*value="([^"]+)"[^>]*data-price="([^"]+)"[^>]*data-name="([^"]+)"/i);
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
            externalPackageId: parseInt(pkgId, 10) || undefined
          });
        }

        // Account requirement checks
        const formCardMatch = pageHtml.match(/<div[^>]*class="[^"]*form-card[^"]*"[^>]*data-has-server="([^"]+)"/i);
        const needsZoneId = formCardMatch ? formCardMatch[1] === '1' : /zone|server/i.test(pageHtml);
        
        // Find labels
        const idLabelMatch = pageHtml.match(/<label[^>]*for="player_id"[^>]*>([\s\S]*?)<\/label>/i);
        const serverLabelMatch = pageHtml.match(/<label[^>]*for="server_id"[^>]*>([\s\S]*?)<\/label>/i);

        const isFeatured = overallIndex < 12 || ['freefire-sgmy', 'mobile-legends', 'telegram', 'mobile-legends-exclusive', 'honor-of-kings', 'pubg-mobile', 'eafc-mobile-cambodia', 'magic-chess-gogo', 'blood-strike'].includes(g.slug);

        return {
          id: g.slug,
          externalSlug: g.slug,
          title: g.title,
          titleKh: KH_TITLE_MAP[g.slug] || g.title,
          category: isFeatured ? 'featured' : 'all',
          badge: isFeatured ? 'POPULAR' : 'TOPUP',
          badgeKh: isFeatured ? 'POPULAR' : 'TOPUP',
          badgeType: 'vip',
          icon: '🎮',
          coverImage: g.img,
          countryFlag: g.flag || undefined,
          needsZoneId,
          zonePlaceholder: serverLabelMatch ? serverLabelMatch[1].replace(/<[^>]+>/g, '').trim() : (needsZoneId ? 'Zone ID (e.g. 1234)' : undefined),
          idLabel: idLabelMatch ? idLabelMatch[1].replace(/<[^>]+>/g, '').trim() : (g.slug === 'telegram' ? 'Telegram Username' : 'Player ID'),
          serverLabel: serverLabelMatch ? serverLabelMatch[1].replace(/<[^>]+>/g, '').trim() : (needsZoneId ? 'Zone ID / Server ID' : undefined),
          isHot: isFeatured,
          rating: 4.9,
          stockCount: 9999,
          isApiConnected: true,
          priority: overallIndex + 1,
          packages: packages.length > 0 ? packages : [
            {
              id: `pkg-${g.slug}-std`,
              name: 'Standard Package',
              nameKh: 'កញ្ចប់ស្តង់ដារ',
              amount: 'Standard',
              priceUsd: 1.0,
              stock: 9999
            }
          ]
        };
      } catch (err) {
        console.error(`Error parsing ${g.slug}:`, err.message);
        return null;
      }
    }));

    chunkParsed.filter(Boolean).forEach(item => games.push(item));
  }

  // Sort cleanly by priority
  games.sort((a, b) => a.priority - b.priority);

  const outputPath = path.join(__dirname, 'cached_khmer_catalog.json');
  fs.writeFileSync(outputPath, JSON.stringify(games, null, 2), 'utf8');
  console.log(`Successfully generated ${outputPath} with ${games.length} games and ${games.reduce((acc, g) => acc + g.packages.length, 0)} packages.`);
}

buildCatalog().catch(console.error);
