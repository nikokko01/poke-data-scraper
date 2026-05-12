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

export async function scrapeCard(url: string, name: string): Promise<ScrapedData> {
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      timeout: 15000
    });

    const $ = cheerio.load(response.data);
    let price: number | null = null;
    let stock: number | null = null;
    let cardNumber: string | null = null;
    let expansionCode: string | null = null;

    if (url.includes('hareruya2.com')) {
      // Hareruya2 Logic
      const priceRaw = $('meta[property="og:price:amount"]').attr('content');
      price = priceRaw ? parseInt(priceRaw.replace(/,/g, ''), 10) : null;

      const inventoryElement = $('p[id^="Inventory-template"]');
      const inventoryText = inventoryElement.length > 0 ? inventoryElement.text() : $('body').text();
      const stockMatch = inventoryText.replace(/\s/g, '').match(/在庫(\d+)/);
      if (stockMatch) {
        stock = parseInt(stockMatch[1], 10);
      } else if (inventoryText.includes('売り切れ') || inventoryText.includes('SOLD OUT') || inventoryText.includes('在庫なし')) {
        stock = 0;
      }
      
      const title = $('title').text();
      cardNumber = title.match(/\d{3}\/\d{3}/)?.[0] || null;
      expansionCode = title.match(/\[([A-Za-z0-9]+)\]/)?.[1] || null;

    } else if (url.includes('torecolo.jp')) {
      // Torecolo Logic
      const priceText = $('.js-enhanced-ecommerce-goods-price').first().text();
      price = parseInt(priceText.replace(/[^\d]/g, '')) || null;
      
      const stockText = $('#spec_stock_msg').text();
      stock = stockText.includes('在庫あります') ? 1 : 0;

      // Extract metadata from breadcrumbs or title if needed
      const title = $('title').text();
      cardNumber = title.match(/\d{3}-\d{3}/)?.[0] || null; // Torecolo often uses 000-000 format
    } else if (url.includes('c-labo-online.jp') || url.includes('c-labo-kaitori.jp')) {
      // Card Labo Logic
      const priceText = $('.figure, #pricech').first().text();
      price = parseInt(priceText.replace(/[^\d]/g, '')) || null;
      
      const soldOutText = $('.sold_out').text();
      stock = soldOutText.includes('在庫なし') ? 0 : 1;
    } else if (url.includes('yuyu-tei.jp')) {
      // Yu-Gi-Oh! Tei Logic
      // The main price is inside .product-detailing h4
      let priceText = $('.product-detailing h4').first().text().trim();
      if (!priceText) {
        priceText = $('h4:contains("円")').first().text().trim();
      }
      if (!priceText) {
        priceText = $('strong:contains("円")').first().text().trim();
      }
      price = parseInt(priceText.replace(/[^\d]/g, '')) || null;
      
      const stockText = $('#cart_sell_zaiko_pc, #cart_sell_zaiko_mobile').text();
      if (stockText.includes('在庫')) {
        const match = stockText.match(/在庫\s*:\s*(\d+)/);
        stock = match ? parseInt(match[1]) : 1;
      } else {
        const bodyText = $('body').text();
        stock = bodyText.includes('売り切れ') || bodyText.includes('在庫なし') ? 0 : 1;
      }
    } else if (url.includes('snkrdunk.com')) {
      // SNKRDUNK Logic
      // Prices are often in custom attributes of detail-trading-card-single
      const mainTag = $('detail-trading-card-single').first();
      let priceText = "";
      if (mainTag.length > 0) {
        priceText = mainTag.attr('apparel-summary-used-min-price') || 
                    mainTag.attr('apparel-summary-min-price') || "";
      }
      
      if (!priceText) {
        // Fallback to searching the whole HTML for ¥...
        const bodyHtml = $.html();
        const match = bodyHtml.match(/¥\s?([\d,]+)/);
        if (match) priceText = match[0];
      }
      
      price = parseInt(priceText.replace(/[^\d]/g, '')) || null;
      
      const bodyText = $('body').text();
      stock = bodyText.includes('売り切れ') || bodyText.includes('SOLD OUT') ? 0 : 1;
    }

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

    const price = validPrices.length > 0 
      ? Math.round(validPrices.reduce((a, b) => a + b, 0) / validPrices.length)
      : null;

    const stock = validStocks.reduce((a, b) => a + b, 0);

    return {
      name,
      price,
      stock,
      timestamp: new Date().toISOString()
    };
  });
}
