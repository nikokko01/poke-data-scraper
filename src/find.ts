import { searchCardUrl } from './scraper';
import * as fs from 'fs';
import * as path from 'path';

async function findUrls(cardName: string) {
  const sites = ['torecolo', 'hareruya2', 'yuyutei', 'clabo', 'snkrdunk', 'torecacamp'];
  console.log(`Searching for URLs for: ${cardName}`);

  const listings = [];

  for (const site of sites) {
    process.stdout.write(`  Searching ${site}... `);
    const url = await searchCardUrl(site, cardName);
    if (url) {
      console.log('Found!');
      listings.push({ url });
    } else {
      console.log('Not found.');
    }
    // Small delay to avoid blocking
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  if (listings.length > 0) {
    const newCard = {
      name: cardName,
      listings,
      code: "" // User should fill this in
    };

    console.log('\nSuggested JSON entry:');
    console.log(JSON.stringify(newCard, null, 2));
    console.log('\nCopy and paste the above into src/data/card.json');
  } else {
    console.log('\nNo URLs found for any site.');
  }
}

const args = process.argv.slice(2);
if (args.length === 0) {
  console.log('Usage: npx ts-node src/find.ts "Card Name"');
} else {
  findUrls(args[0]).catch(console.error);
}
