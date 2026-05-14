import { scrapeCard } from './scraper';
import * as fs from 'fs';
import * as path from 'path';

// Parse --start and --end arguments
function getArg(name: string): number | null {
  const arg = process.argv.find(a => a.startsWith(`--${name}=`));
  if (!arg) return null;
  const val = parseInt(arg.split('=')[1], 10);
  return isNaN(val) ? null : val;
}

async function main() {
  const cardListPath = path.join(__dirname, 'data/card.json');

  let cards: any[];
  try {
    cards = JSON.parse(fs.readFileSync(cardListPath, 'utf8'));
  } catch (error) {
    console.error('Failed to read or parse card.json:', error);
    process.exit(1);
  }

  const totalCards = cards.length;
  const startIdx = getArg('start') ?? 0;
  const endIdx   = getArg('end')   ?? totalCards;
  const batch     = cards.slice(startIdx, endIdx);

  console.log(`Scraping batch [${startIdx} - ${endIdx}) of ${totalCards} total cards (${batch.length} cards)...`);

  let processed = 0;
  for (const card of batch) {
    processed++;
    console.log(`\n[${startIdx + processed} / ${totalCards}] ${card.name}`);

    for (const listing of card.listings) {
      console.log(`  Checking: ${listing.url}`);
      try {
        const result = await scrapeCard(listing.url, card.name);
        
        // Update URL if it was auto-corrected
        if (result.url !== listing.url) {
          console.log(`  URL Updated: ${listing.url} -> ${result.url}`);
          listing.url = result.url;
        }

        listing.price     = result.price;
        listing.stock     = result.stock;
        listing.timestamp = result.timestamp;
        await new Promise(resolve => setTimeout(resolve, 800));
      } catch (error) {
        console.error(`  Failed: ${listing.url}`, error);
      }
    }

    // Intermediate save every 50 cards
    if (processed % 50 === 0) {
      console.log(`\n--- Intermediate save at ${startIdx + processed} ---`);
      try {
        fs.writeFileSync(cardListPath, JSON.stringify(cards, null, 2));
      } catch (e) {
        console.error('Intermediate save failed:', e);
      }
    }
  }

  console.log('\nBatch complete. Saving card.json...');
  try {
    fs.writeFileSync(cardListPath, JSON.stringify(cards, null, 2));
    console.log('Saved successfully.');
  } catch (error) {
    console.error('Final save failed:', error);
    process.exit(1);
  }

  console.log('Done.');
}

main().catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
});

