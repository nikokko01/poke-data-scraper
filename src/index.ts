import { scrapeCard, calculateAverages, ScrapedData } from './scraper';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  const cardListPath = path.join(__dirname, 'data/card.json');
  const cards = JSON.parse(fs.readFileSync(cardListPath, 'utf8'));
  
  console.log(`Starting scrape for ${cards.length} unique cards...`);
  
  for (const card of cards) {
    console.log(`\nScraping card: ${card.name}`);
    
    for (const listing of card.listings) {
      console.log(`  Checking: ${listing.url}`);
      try {
        const result = await scrapeCard(listing.url, card.name);
        
        // Update listing with new data
        listing.price = result.price;
        listing.stock = result.stock;
        listing.timestamp = result.timestamp;
        
        // Add small delay to be polite
        await new Promise(resolve => setTimeout(resolve, 800));
      } catch (error) {
        console.error(`  Failed to scrape ${listing.url}:`, error);
      }
    }
  }

  console.log('\nScrape complete. Saving updated card.json...');

  try {
    fs.writeFileSync(cardListPath, JSON.stringify(cards, null, 2));
    console.log(`Successfully updated ${cardListPath}`);
  } catch (error) {
    console.error('Failed to update card.json:', error);
  }

  console.log('All tasks finished.');
}

main().catch(console.error);
