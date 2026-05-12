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
      // Try multiple selectors for the main price
      let priceText = $('.product-detailing h4').first().text().trim();
      if (!priceText) {
        priceText = $('h4.fw-bold').first().text().trim();
      }
      if (!priceText || !priceText.includes('円')) {
        priceText = $('h4:contains("円"), strong:contains("円")').first().text().trim();
      }
      price = parseInt(priceText.replace(/[^\d]/g, '')) || null;
      
      const stockText = $('#cart_sell_zaiko_pc, #cart_sell_zaiko_mobile, .product-detailing').text();
      if (stockText.includes('在庫')) {
        const match = stockText.match(/在庫\s*:\s*(\d+)/);
        stock = match ? parseInt(match[1]) : 1;
      } else {
        const bodyText = $('body').text();
        stock = bodyText.includes('売り切れ') || bodyText.includes('在庫なし') ? 0 : 1;
      }
    } else if (url.includes('snkrdunk.com')) {
      // SNKRDUNK Logic
      const mainTag = $('detail-trading-card-single').first();
      let priceText = "";
      if (mainTag.length > 0) {
        priceText = mainTag.attr('apparel-summary-used-min-price') || 
                    mainTag.attr('apparel-summary-min-price') || "";
      }
      
      if (!priceText) {
        const bodyHtml = $.html();
        const match = bodyHtml.match(/¥\s?([\d,]+)/);
        if (match) priceText = match[0];
      }
      
      price = parseInt(priceText.replace(/[^\d]/g, '')) || null;
      
      const bodyText = $('body').text();
      stock = bodyText.includes('売り切れ') || bodyText.includes('SOLD OUT') ? 0 : 1;
    } else if (url.includes('torecacamp-pokemon.com')) {
      // Toreca Camp Logic
      // Check both product page and list page selectors
      let priceText = $('.price').first().text();
      if (!priceText) {
        priceText = $('.product-item__price').first().text();
      }
      price = parseInt(priceText.replace(/[^\d]/g, '')) || null;
      
      const bodyText = $('body').text();
      const stockText = $('.product-item__inventory, .product-form__info-content').text();
      stock = (stockText.includes('在庫なし') || bodyText.includes('売り切れ')) ? 0 : 1;
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

function fixUrl(baseUrl: string, partUrl: string | undefined): string | null {
  if (!partUrl) return null;
  if (partUrl.startsWith('http')) return partUrl;
  const base = baseUrl.replace(/\/+$/, '');
  const part = partUrl.replace(/^\/+/, '');
  return `${base}/${part}`;
}

export async function searchCardUrl(site: string, keyword: string): Promise<string | null> {
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  };

  const cleanKeyword = keyword.replace(/[【】]/g, ' ').trim();

  try {
    let searchUrl = '';
    if (site === 'torecolo') {
      searchUrl = `https://www.torecolo.jp/shop/goods/search.aspx?ct2=1074&search=x&keyword=${encodeURIComponent(keyword)}`;
    } else if (site === 'hareruya2') {
      searchUrl = `https://www.hareruya2.com/search?q=${encodeURIComponent(keyword)}`;
    } else if (site === 'yuyutei') {
      searchUrl = `https://yuyu-tei.jp/sell/poc/s/search?search_word=${encodeURIComponent(cleanKeyword)}`;
    } else if (site === 'clabo') {
      searchUrl = `https://www.c-labo-online.jp/product-list?keyword=${encodeURIComponent(keyword)}`;
    } else if (site === 'snkrdunk') {
      return `https://snkrdunk.com/search?keywords=${encodeURIComponent(keyword)}`;
    } else if (site === 'torecacamp') {
      searchUrl = `https://torecacamp-pokemon.com/search?q=${encodeURIComponent(cleanKeyword)}`;
    }

    const response = await axios.get(searchUrl, { headers, timeout: 10000 });
    const $ = cheerio.load(response.data);

    if (site === 'torecolo') {
      const link = $('.goods_list_ a[href*="/shop/g/g"]').first().attr('href');
      return fixUrl('https://www.torecolo.jp', link);
    } else if (site === 'hareruya2') {
      const link = $('.product-item__title a, a.full-unstyled-link').filter((_, el) => {
        const href = $(el).attr('href') || '';
        return href.includes('/products/') || href.includes('/product/');
      }).first().attr('href');
      return fixUrl('https://www.hareruya2.com', link);
    } else if (site === 'yuyutei') {
      const link = $('a[href*="/sell/poc/card/"]').first().attr('href');
      return fixUrl('https://yuyu-tei.jp', link);
    } else if (site === 'clabo') {
      const link = $('.item_data_link').first().attr('href');
      return fixUrl('https://www.c-labo-online.jp', link);
    } else if (site === 'torecacamp') {
      const link = $('.product-item__title, .product-item__title a').first().attr('href');
      return fixUrl('https://torecacamp-pokemon.com', link);
    }

    return null;
  } catch (error) {
    console.error(`Error searching ${site} for ${keyword}:`, error);
    return null;
  }
}
