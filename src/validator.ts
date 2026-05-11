import { ScrapedData } from './scraper';

export function verifyData(data: ScrapedData) {
  const issues: string[] = [];

  // 1. Price check
  if (data.price === null) {
    issues.push('Price not found');
  } else if (data.price <= 0) {
    issues.push('Price is 0 or negative');
  } else if (data.price > 1000000) {
    issues.push('Price suspiciously high (> 1M)');
  }

  // 2. Stock check
  if (data.stock === null) {
    issues.push('Stock info not found');
  }

  return {
    isValid: issues.length === 0,
    issues
  };
}

export function detectAnomalies(current: any, previous: any) {
  if (!previous) return null;

  const priceChange = Math.abs(current.avgPrice - previous.avgPrice) / previous.avgPrice;
  if (priceChange > 0.5) {
    return `Price jumped by ${Math.round(priceChange * 100)}%`;
  }
  return null;
}
