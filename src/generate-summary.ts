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
  const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD

  const summary = cards.map(card => {
    let totalPrice = 0;
    let storeCount = 0;
    let totalStock = 0;
    let fleamarketPrice: number | null = null;

    card.listings.forEach(listing => {
      const isSnkrdunk = listing.url.includes('snkrdunk.com');
      
      if (isSnkrdunk) {
        fleamarketPrice = listing.price;
      } else {
        if (listing.price !== null) {
          totalPrice += listing.price;
          storeCount++;
        }
      }

      if (listing.stock !== null) {
        totalStock += listing.stock;
      }
    });

    const averagePrice = storeCount > 0 ? Math.round(totalPrice / storeCount) : null;

    return {
      name: card.name,
      code: card.code,
      averagePrice: averagePrice,
      totalStock: totalStock,
      fleamarketPrice: fleamarketPrice,
      lastUpdated: now.toISOString()
    };
  });

  // 1. Save main summary.json (Latest)
  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
  
  // 2. Save dated summary in history
  const historyPath = path.join(historyDir, `summary_${dateStr}.json`);
  fs.writeFileSync(historyPath, JSON.stringify(summary, null, 2));
  console.log(`Summary generated at ${summaryPath} and ${historyPath}`);

  // 3. Keep only last 7 days of history
  const files = fs.readdirSync(historyDir)
    .filter(f => f.startsWith('summary_') && f.endsWith('.json'))
    .sort();

  if (files.length > 7) {
    const filesToDelete = files.slice(0, files.length - 7);
    filesToDelete.forEach(f => {
      fs.unlinkSync(path.join(historyDir, f));
      console.log(`Deleted old history file: ${f}`);
    });
  }

  console.log(`Processed ${summary.length} cards.`);
}

generateSummary();
