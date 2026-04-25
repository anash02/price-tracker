import json
import os
from datetime import datetime, timezone
from pathlib import Path
from scraper import scrape_price
from emailer import send_alert

DATA_DIR = Path(__file__).parent.parent / "data"
ITEMS_FILE = DATA_DIR / "items.json"
HISTORY_FILE = DATA_DIR / "price_history.json"


def load_json(path: Path) -> dict | list:
    if path.exists():
        with open(path) as f:
            return json.load(f)
    return {} if "history" in path.name else []


def save_json(path: Path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w") as f:
        json.dump(data, f, indent=2)


def run():
    items: list[dict] = load_json(ITEMS_FILE)
    history: dict = load_json(HISTORY_FILE)
    drops = []
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    for item in items:
        item_id = item["id"]
        name = item["name"]
        url = item["url"]
        target = item.get("target_price")

        print(f"\n🔍 Checking: {name}")
        current_price = scrape_price(url)

        if current_price is None:
            print(f"  ⚠️  Could not fetch price for {name}")
            continue

        print(f"  💰 Current price: ₹{current_price:,}")

        # Update history
        if item_id not in history:
            history[item_id] = {"name": name, "url": url, "prices": []}

        prices = history[item_id]["prices"]
        prices.append({"date": today, "price": current_price})

        # Keep last 90 days only
        history[item_id]["prices"] = prices[-90:]

        # Detect price drop
        if len(prices) >= 2:
            prev_price = prices[-2]["price"]
            if current_price < prev_price:
                drop_pct = round((prev_price - current_price) / prev_price * 100, 1)
                print(f"  📉 Price dropped {drop_pct}% from ₹{prev_price:,}")
                drops.append({
                    "name": name,
                    "url": url,
                    "prev_price": prev_price,
                    "current_price": current_price,
                    "drop_pct": drop_pct,
                    "target_hit": target is not None and current_price <= target,
                })

        # Also alert if target price is hit for first time today
        elif target and current_price <= target:
            drops.append({
                "name": name,
                "url": url,
                "prev_price": None,
                "current_price": current_price,
                "drop_pct": None,
                "target_hit": True,
            })

    save_json(HISTORY_FILE, history)
    print(f"\n✅ History saved. {len(drops)} price drop(s) detected.")

    if drops:
        recipient = os.environ["ALERT_EMAIL"]
        send_alert(drops, recipient)


if __name__ == "__main__":
    run()
