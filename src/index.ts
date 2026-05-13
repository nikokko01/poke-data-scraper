import { scrapeCard, ScrapedData } from './scraper';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  const cardListPath = path.join(__dirname, 'data/card.json');
  
  let cards;
  try {
    cards = JSON.parse(fs.readFileSync(cardListPath, 'utf8'));
  } catch (error) {
    console.error('Failed to read or parse card.json:', error);
    process.exit(1);
  }
  
  const totalCards = cards.length;
  console.log(`Starting scrape for ${totalCards} unique cards...`);
  
  let processedCount = 0;

  for (const card of cards) {
    processedCount++;
    console.log(`\n[${processedCount} / ${totalCards}] Scraping card: ${card.name}`);
    
    let hasUpdated = false;
    for (const listing of card.listings) {
      console.log(`  Checking: ${listing.url}`);
      try {
        const result = await scrapeCard(listing.url, card.name);
        
        // Update listing with new data
        listing.price = result.price;
        listing.stock = result.stock;
        listing.timestamp = result.timestamp;
        hasUpdated = true;
        
        // Add small delay to be polite
        await new Promise(resolve => setTimeout(resolve, 800));
      } catch (error) {
        console.error(`  Failed to scrape ${listing.url}:`, error);
      }
    }

    // Save every 50 cards to prevent data loss
    if (processedCount % 50 === 0) {
      console.log(`\n--- Intermediate Save at ${processedCount} cards ---`);
      try {
        fs.writeFileSync(cardListPath, JSON.stringify(cards, null, 2));
      } catch (error) {
        console.error('Failed to perform intermediate save:', error);
      }
    }
  }

  console.log('\nScrape complete. Saving final card.json...');

  try {
    fs.writeFileSync(cardListPath, JSON.stringify(cards, null, 2));
    console.log(`Successfully updated ${cardListPath}`);
  } catch (error) {
    console.error('Failed to update card.json:', error);
    process.exit(1);
  }

  console.log('All tasks finished.');
}

main().catch(console.error);
