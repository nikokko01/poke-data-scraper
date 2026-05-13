import requests
from bs4 import BeautifulSoup
import csv
import sys
import time
import urllib.parse
from collections import defaultdict
import os

class CardSearcher:
    def __init__(self):
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
            "Accept-Language": "ja,en-US;q=0.9,en;q=0.8",
        }

    def _get_soup(self, url):
        try:
            response = requests.get(url, headers=self.headers, timeout=10)
            if response.status_code == 403: return "BLOCKED"
            response.raise_for_status()
            return BeautifulSoup(response.text, 'lxml')
        except Exception:
            return None

    def _fix_url(self, base_url, part_url):
        if not part_url: return ""
        if part_url.startswith('http'): return part_url
        return base_url.rstrip('/') + '/' + part_url.lstrip('/')

    def search_torecolo(self, keyword):
        url = f"https://www.torecolo.jp/shop/goods/search.aspx?ct2=1074&search=x&keyword={urllib.parse.quote(keyword)}"
        soup = self._get_soup(url)
        if not soup or soup == "BLOCKED": return ""
        container = soup.select_one('.goods_list_') or soup
        links = [a['href'] for a in container.find_all('a', href=True) if '/shop/g/g' in a['href']]
        if not links: return ""
        best = next((l for l in links if '-K' not in l), links[0])
        return self._fix_url("https://www.torecolo.jp", best)

    def search_hareruya2(self, keyword):
        url = f"https://www.hareruya2.com/search?q={urllib.parse.quote(keyword)}"
        soup = self._get_soup(url)
        if not soup or soup == "BLOCKED": return ""
        links = soup.select('.product-item__title a, a.full-unstyled-link')
        for l in links:
            href = l.get('href')
            if href and ('/products/' in href or '/product/' in href):
                return self._fix_url("https://www.hareruya2.com", href)
        return ""

    def search_yuyutei(self, keyword):
        url = f"https://yuyu-tei.jp/sell/poc/s/search?search_word={urllib.parse.quote(keyword)}"
        soup = self._get_soup(url)
        if not soup or soup == "BLOCKED": return ""
        items = soup.select('.card-product, .card-item')
        for item in items:
            link = item.select_one('a[href*="/sell/poc/card/"]')
            if link:
                return self._fix_url("https://yuyu-tei.jp", link['href'])
        all_links = soup.select('a[href*="/sell/poc/card/"]')
        if all_links:
            return self._fix_url("https://yuyu-tei.jp", all_links[0]['href'])
        return ""

    def search_clabo(self, keyword):
        url = f"https://www.c-labo-online.jp/product-list?keyword={urllib.parse.quote(keyword)}"
        soup = self._get_soup(url)
        if soup == "BLOCKED": return "取得不可(要ブラウザ)"
        if not soup: return ""
        container = soup.select_one('.product_list_main') or soup
        links = container.select('a.item_data_link')
        if links:
            return self._fix_url("https://www.c-labo-online.jp", links[0]['href'])
        return ""

    def search_snkrdunk(self, keyword):
        return f"https://snkrdunk.com/search?keywords={urllib.parse.quote(keyword)}"

    def search_torecacamp(self, keyword):
        url = f"https://torecacamp-pokemon.com/search?q={urllib.parse.quote(keyword)}"
        soup = self._get_soup(url)
        if not soup or soup == "BLOCKED": return ""
        links = soup.select('.product-item__title, .product-item__title a')
        if links:
            href = links[0].get('href')
            return self._fix_url("https://torecacamp-pokemon.com", href)
        return ""

def main():
    if len(sys.argv) < 2:
        print("使い方: python3 bulk_find_urls.py \"カード名1\" \"カード名2\" ...")
        return

    keywords = sys.argv[1:]
    searcher = CardSearcher()
    site_results = defaultdict(list)
    
    sites_info = [
        ("トレコロ", searcher.search_torecolo),
        ("晴れる屋2", searcher.search_hareruya2),
        ("遊々亭", searcher.search_yuyutei),
        ("カードラボ", searcher.search_clabo),
        ("スニダン", searcher.search_snkrdunk),
        ("トレカキャンプ", searcher.search_torecacamp)
    ]
    
    print(f"{len(keywords)} 件のカードを検索中...")
    for kw in keywords:
        print(f"\n--- {kw} ---")
        for site_name, search_func in sites_info:
            print(f" {site_name}...", end="", flush=True)
            url = search_func(kw)
            if url:
                site_results[site_name].append(url)
            print(" 完了")
            time.sleep(1)
            
    output_file = 'cards_urls_all.csv'
    with open(output_file, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        for site_name, _ in sites_info:
            urls = site_results.get(site_name, [])
            for url in urls:
                writer.writerow([url])
            
    print(f"\n全ての結果を {output_file} に保存しました。")

if __name__ == "__main__":
    main()
