import axios from 'axios';
import * as cheerio from 'cheerio';

export interface ScrapedData {
  url: string;
  name: string;
  price: number | null;
  stock: number | null;
  cardNumber: string | null;
  expansionCode: string | null;
  timestamp: string;
}

export async function scrapeHareruya2(url: string, name: string): Promise<ScrapedData> {
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      timeout: 10000
    });

    const $ = cheerio.load(response.data);
    
    // Price extraction
    const priceRaw = $('meta[property="og:price:amount"]').attr('content');
    const price = priceRaw ? parseInt(priceRaw.replace(/,/g, ''), 10) : null;

    // Inventory extraction
    let stock: number | null = null;
    const inventoryElement = $('p[id^="Inventory-template"]');
    const inventoryText = inventoryElement.length > 0 ? inventoryElement.text() : $('body').text();
    const stockMatch = inventoryText.replace(/\s/g, '').match(/在庫(\d+)/);
    if (stockMatch) {
      stock = parseInt(stockMatch[1], 10);
    } else if (inventoryText.includes('売り切れ') || inventoryText.includes('SOLD OUT')) {
      stock = 0;
    }

    const title = $('title').text();
    const cardNumber = title.match(/\d{3}\/\d{3}/)?.[0] || null;
    const expansionCode = title.match(/\[([A-Za-z0-9]+)\]/)?.[1] || null;

    return {
      url,
      name,
      price,
      stock,
      cardNumber,
      expansionCode,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error(`Error scraping ${url}:`, error);
    return {
      url,
      name,
      price: null,
      stock: null,
      cardNumber: null,
      expansionCode: null,
      timestamp: new Date().toISOString()
    };
  }
}

export function calculateAverages(dataList: ScrapedData[]) {
  const groupedByName: Record<string, ScrapedData[]> = {};

  dataList.forEach(data => {
    if (!groupedByName[data.name]) {
      groupedByName[data.name] = [];
    }
    groupedByName[data.name].push(data);
  });

  return Object.entries(groupedByName).map(([name, listings]) => {
    const validPrices = listings
      .map(l => l.price)
      .filter((p): p is number => p !== null && p > 0);

    const validStocks = listings
      .map(l => l.stock)
      .filter((s): s is number => s !== null);

    const avgPrice = validPrices.length > 0 
      ? Math.round(validPrices.reduce((a, b) => a + b, 0) / validPrices.length)
      : null;

    const totalStock = validStocks.reduce((a, b) => a + b, 0);

    return {
      name,
      avgPrice,
      minPrice: validPrices.length > 0 ? Math.min(...validPrices) : null,
      maxPrice: validPrices.length > 0 ? Math.max(...validPrices) : null,
      totalStock,
      sampleCount: listings.length,
      timestamp: new Date().toISOString()
    };
  });
}
