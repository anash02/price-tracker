import re
import time
import random
from playwright.sync_api import sync_playwright, TimeoutError as PWTimeout


# ── Selectors ──────────────────────────────────────────────────────────────────

AMAZON_SELECTORS = [
    "#corePrice_feature_div .a-price-whole",
    "#priceblock_ourprice",
    "#priceblock_dealprice",
    ".a-price.aok-align-center .a-price-whole",
    "span.a-price-whole",
]

FLIPKART_SELECTORS = [
    "div.Nx9bqj",          # primary (2024–25)
    "div._30jeq3",         # legacy
    "div._16Jk6d",
    "._25b18c ._30jeq3",
    "div[class*='_30jeq3']",
]


def _parse_price(raw: str) -> float | None:
    """Strip currency symbols, commas, spaces and return float."""
    cleaned = re.sub(r"[^\d.]", "", raw.replace(",", ""))
    try:
        return float(cleaned)
    except ValueError:
        return None


def _random_delay():
    time.sleep(random.uniform(2.0, 4.5))


def scrape_amazon(page, url: str) -> float | None:
    page.goto(url, wait_until="domcontentloaded", timeout=30000)
    _random_delay()

    for selector in AMAZON_SELECTORS:
        try:
            el = page.query_selector(selector)
            if el:
                price = _parse_price(el.inner_text())
                if price and price > 0:
                    return price
        except Exception:
            continue

    # Fallback: look for OG price metadata
    try:
        meta = page.query_selector('meta[name="twitter:data1"]')
        if meta:
            price = _parse_price(meta.get_attribute("content") or "")
            if price:
                return price
    except Exception:
        pass

    return None


def scrape_flipkart(page, url: str) -> float | None:
    page.goto(url, wait_until="domcontentloaded", timeout=30000)
    _random_delay()

    for selector in FLIPKART_SELECTORS:
        try:
            el = page.query_selector(selector)
            if el:
                price = _parse_price(el.inner_text())
                if price and price > 0:
                    return price
        except Exception:
            continue

    return None


def scrape_price(url: str) -> float | None:
    """Auto-detect platform and return current price in INR."""
    is_amazon = "amazon.in" in url or "amazon.com" in url
    is_flipkart = "flipkart.com" in url

    if not (is_amazon or is_flipkart):
        print(f"  ❌ Unsupported URL: {url}")
        return None

    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=True,
            args=[
                "--no-sandbox",
                "--disable-blink-features=AutomationControlled",
            ],
        )
        context = browser.new_context(
            user_agent=(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/124.0.0.0 Safari/537.36"
            ),
            viewport={"width": 1280, "height": 800},
            locale="en-IN",
            timezone_id="Asia/Kolkata",
            extra_http_headers={
                "Accept-Language": "en-IN,en;q=0.9",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
            },
        )

        # Mask automation signals
        context.add_init_script("""
            Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
            window.chrome = { runtime: {} };
        """)

        page = context.new_page()

        try:
            if is_amazon:
                price = scrape_amazon(page, url)
            else:
                price = scrape_flipkart(page, url)
        except PWTimeout:
            print("  ⚠️  Page timed out")
            price = None
        except Exception as e:
            print(f"  ⚠️  Error: {e}")
            price = None
        finally:
            browser.close()

    return price
