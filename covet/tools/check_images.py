"""Check every product photo link and record the result in tools/images.json.

Run after adding products:  python3 tools/check_images.py && python3 tools/build_catalog.py
Links that load are left alone; links that fail are set to null so the site shows
a text tile. To fix one, put the right StockX image file name (without .jpg) in
tools/images.json under the product's handle.
"""
import concurrent.futures as cf
import json
import os
import sys
import urllib.error
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "tools"))
import build_catalog  # noqa: E402


def loads(url):
    req = urllib.request.Request(url.split("?")[0], method="HEAD", headers={"User-Agent": "Mozilla/5.0"})
    try:
        with urllib.request.urlopen(req, timeout=15) as r:
            return r.status == 200
    except (urllib.error.URLError, TimeoutError):
        return False


def main():
    path = os.path.join(ROOT, "tools", "images.json")
    with open(path) as f:
        checked = json.load(f)
    items = [p for p in build_catalog.all_items() if p["image"]]
    with cf.ThreadPoolExecutor(16) as ex:
        results = list(ex.map(lambda p: (p["handle"], loads(p["image"])), items))
    broken = [h for h, ok in results if not ok]
    for h in broken:
        checked[h] = None
    with open(path, "w") as f:
        json.dump(dict(sorted(checked.items())), f, indent=1)
    print(f"{len(items) - len(broken)} photos load, {len(broken)} newly broken")


if __name__ == "__main__":
    main()
