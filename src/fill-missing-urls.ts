import { searchCardUrl } from './scraper';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  const cardListPath = path.join(__dirname, 'data/card.json');
  const cards = JSON.parse(fs.readFileSync(cardListPath, 'utf8'));
  const sites = ['torecolo', 'hareruya2', 'yuyutei', 'clabo', 'snkrdunk', 'torecacamp'];
  
  const siteDomains = {
    torecolo: 'torecolo.jp',
    hareruya2: 'hareruya2.com',
    yuyutei: 'yuyu-tei.jp',
    clabo: 'c-labo-online.jp',
    snkrdunk: 'snkrdunk.com',
    torecacamp: 'torecacamp-pokemon.com'
  };

  console.log(`Checking ${cards.length} cards for missing URLs...`);

  let updatedCount = 0;

  for (const card of cards) {
    const existingDomains = new Set<string>(card.listings.map((l: any) => {
      try {
        return new URL(l.url).hostname.replace('www.', '');
      } catch {
        return '';
      }
    }));

    let cardUpdated = false;

    for (const site of sites) {
      const domain = (siteDomains as any)[site];
      // Special case for clabo which can have multiple domains
      const hasSite = Array.from(existingDomains).some((d: any) => d.includes(domain) || (site === 'clabo' && d.includes('c-labo-kaitori.jp')));

      if (!hasSite) {
        process.stdout.write(`  Missing ${site} for ${card.name}. Searching... `);
        const url = await searchCardUrl(site, card.name);
        if (url) {
          console.log('Found!');
          card.listings.push({
            url,
            price: null,
            stock: null,
            timestamp: new Date().toISOString()
          });
          cardUpdated = true;
          updatedCount++;
        } else {
          console.log('Not found.');
        }
        // Polite delay
        await new Promise(resolve => setTimeout(resolve, 1200));
      }
    }

    if (cardUpdated) {
      // Save periodically or at the end
      fs.writeFileSync(cardListPath, JSON.stringify(cards, null, 2));
    }
  }

  console.log(`\nFinished! Added ${updatedCount} new URLs.`);
}

main().catch(console.error);
