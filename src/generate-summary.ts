import * as fs from 'fs';
import * as path from 'path';

interface Listing {
  url: string;
  price: number | null;
  stock: number | null;
  timestamp: string;
}

interface Card {
  name: string;
  code: string;
  listings: Listing[];
}

interface SummaryItem {
  name: string;
  code: string;
  averagePrice: number | null;
  minPrice: number | null;
  bestStoreUrl: string | null;
  totalStock: number;
  fleamarketPrice: number | null;
  changeRate: number | null; // Percent change from yesterday
  lastUpdated: string;
}

function generateSummary() {
  const dataDir = path.join(__dirname, 'data');
  const historyDir = path.join(dataDir, 'history');
  const cardListPath = path.join(dataDir, 'card.json');
  const summaryPath = path.join(dataDir, 'summary.json');

  if (!fs.existsSync(historyDir)) {
    fs.mkdirSync(historyDir, { recursive: true });
  }

  if (!fs.existsSync(cardListPath)) {
    console.error('card.json not found');
    return;
  }

  const cards: Card[] = JSON.parse(fs.readFileSync(cardListPath, 'utf8'));
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];

  // Load yesterday's summary for comparison
  const historyFiles = fs.readdirSync(historyDir)
    .filter(f => f.startsWith('summary_') && f.endsWith('.json'))
    .sort();
  
  let yesterdaySummary: SummaryItem[] = [];
  if (historyFiles.length > 0) {
    const lastFile = historyFiles[historyFiles.length - 1];
    try {
      yesterdaySummary = JSON.parse(fs.readFileSync(path.join(historyDir, lastFile), 'utf8'));
    } catch (e) {
      console.error('Failed to load yesterday summary:', e);
    }
  }

  const summary = cards.map(card => {
    const shopPrices: {price: number, url: string}[] = [];
    let totalStock = 0;
    let fleamarketPrice: number | null = null;

    card.listings.forEach(listing => {
      if (listing.price !== null) {
        if (listing.url.includes('snkrdunk.com')) {
          fleamarketPrice = listing.price;
        } else {
          shopPrices.push({ price: listing.price, url: listing.url });
        }
      }
      if (listing.stock !== null) {
        totalStock += listing.stock;
      }
    });

    // 1. Outlier Filtering & Min Price calculation
    // Filter out prices that are too far from the median (more than 2x or less than 0.5x)
    let filteredPrices = shopPrices;
    if (shopPrices.length >= 3) {
      const sorted = [...shopPrices].sort((a, b) => a.price - b.price);
      const median = sorted[Math.floor(sorted.length / 2)].price;
      filteredPrices = shopPrices.filter(p => p.price >= median * 0.4 && p.price <= median * 2.5);
    }

    let averagePrice: number | null = null;
    let minPrice: number | null = null;
    let bestStoreUrl: string | null = null;

    if (filteredPrices.length > 0) {
      const total = filteredPrices.reduce((sum, p) => sum + p.price, 0);
      averagePrice = Math.round(total / filteredPrices.length);
      
      const best = filteredPrices.reduce((min, p) => p.price < min.price ? p : min, filteredPrices[0]);
      minPrice = best.price;
      bestStoreUrl = best.url;
    }

    // 2. Change Rate Calculation
    const yesterdayCard = yesterdaySummary.find(y => y.code === card.code || y.name === card.name);
    let changeRate: number | null = null;
    if (yesterdayCard && yesterdayCard.averagePrice && averagePrice) {
      changeRate = Math.round(((averagePrice - yesterdayCard.averagePrice) / yesterdayCard.averagePrice) * 1000) / 10;
    }

    return {
      name: card.name,
      code: card.code,
      averagePrice,
      minPrice,
      bestStoreUrl,
      totalStock,
      fleamarketPrice,
      changeRate,
      lastUpdated: now.toISOString()
    };
  });

  // Save results
  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
  fs.writeFileSync(path.join(historyDir, `summary_${dateStr}.json`), JSON.stringify(summary, null, 2));
  
  // Cleanup history (keep 7 days)
  const finalFiles = fs.readdirSync(historyDir)
    .filter(f => f.startsWith('summary_') && f.endsWith('.json'))
    .sort();

  if (finalFiles.length > 7) {
    finalFiles.slice(0, finalFiles.length - 7).forEach(f => {
      fs.unlinkSync(path.join(historyDir, f));
    });
  }

  console.log(`Processed ${summary.length} cards. Summary updated.`);
}

generateSummary();
