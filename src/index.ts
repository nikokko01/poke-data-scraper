import { scrapeHareruya2, calculateAverages, ScrapedData } from './scraper';
import cards from './data/cards.json';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  console.log(`Starting scrape for ${cards.length} cards...`);
  
  const scrapedResults: ScrapedData[] = [];

  for (const card of cards) {
    console.log(`Scraping: ${card.name} (${card.url})`);
    const result = await scrapeHareruya2(card.url, card.name);
    scrapedResults.push(result);
    
    // Add small delay to be polite
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('Scrape complete. Calculating averages...');
  
  const summaryData = calculateAverages(scrapedResults);

  console.log('\n--- Scrape Summary ---');
  for (const stats of summaryData) {
    console.log(`${stats.name}: ${stats.avgPrice}円 (在庫: ${stats.totalStock})`);
  }
  console.log('----------------------\n');

  console.log('Saving results to local file...');
  
  try {
    const outputPath = path.join(__dirname, 'data/results.json');
    fs.writeFileSync(outputPath, JSON.stringify(summaryData, null, 2));
    console.log(`Successfully saved data to ${outputPath}`);
  } catch (error) {
    console.error('Failed to save data to file:', error);
  }

  console.log('All tasks finished.');
}

main().catch(console.error);
