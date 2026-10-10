"""Find which products have StockX 360-degree photos and record extra views.

Run after check_images.py:  python3 tools/check_gallery.py && python3 tools/build_catalog.py
Writes tools/gallery.json: {image name: [frame numbers that load]}.
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

FRAMES = ["01", "10", "19", "28"]  # four angles around the shoe (36 frames in a full turn)
URL = "https://images.stockx.com/360/{n}/Images/{n}/Lv2/img{f}.jpg"


def loads(url):
    req = urllib.request.Request(url, method="HEAD", headers={"User-Agent": "Mozilla/5.0"})
    try:
        with urllib.request.urlopen(req, timeout=15) as r:
            return r.status == 200
    except (urllib.error.URLError, TimeoutError):
        return False


def frames(name):
    base = name[:-len("-Product")] if name.endswith("-Product") else name
    return name, [f for f in FRAMES if loads(URL.format(n=base, f=f))]


def main():
    names = sorted({p["image"].split("/images/")[1].split(".jpg")[0]
                    for p in build_catalog.expand() if p["image"]})
    with cf.ThreadPoolExecutor(16) as ex:
        found = {n: fs for n, fs in ex.map(frames, names) if len(fs) > 1}
    with open(os.path.join(ROOT, "tools", "gallery.json"), "w") as f:
        json.dump(found, f, indent=1, sort_keys=True)
    print(f"{len(found)} of {len(names)} products have extra views")


if __name__ == "__main__":
    main()
