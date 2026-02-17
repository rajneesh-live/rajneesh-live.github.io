#!/usr/bin/env python3
"""
Scrape discourse transcripts from oshoworld.com (parallelized)

Flow:
  1. For each letter A-Z, call /api/server/audio/filter to get all series
  2. For each series, call /api/server/audio/series-filter to get all discourse slugs
  3. For each discourse, fetch the page and extract the full transcript from __NEXT_DATA__
  4. Save one file per discourse: transcripts/{series_slug}/{discourse_slug}.txt

Parallelism:
  - 10 concurrent workers for series metadata (series page + slug listing)
  - 20 concurrent workers for individual transcript downloads
"""

import json
import os
import re
import string
import time
from concurrent.futures import ThreadPoolExecutor, as_completed

import requests

BASE_URL = "https://oshoworld.com"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                  "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36",
    "Content-Type": "application/json",
}
OUTPUT_DIR = "transcripts"
WORKERS_SERIES = 10
WORKERS_TRANSCRIPTS = 20


def fetch_series_for_letter(letter: str) -> list[dict]:
    url = f"{BASE_URL}/api/server/audio/filter"
    body = {"letter": letter, "language": "hindi"}
    resp = requests.post(url, headers=HEADERS, json=body, timeout=30)
    resp.raise_for_status()
    return resp.json().get("seriesData", [])


def fetch_series_metadata(series: dict):
    """Fetch category_id + all discourse slugs for a series."""
    series_slug = series["slug"]
    series_dir = os.path.join(OUTPUT_DIR, series_slug)

    # Fetch the series page to get categoryData._id and total
    resp = requests.get(f"{BASE_URL}/{series_slug}", headers=HEADERS, timeout=30)
    resp.raise_for_status()
    match = re.search(
        r'<script[^>]*id="__NEXT_DATA__"[^>]*>(.*?)</script>', resp.text
    )
    if not match:
        return None
    data = json.loads(match.group(1))
    page_data = data["props"]["pageProps"]["data"]["pageData"]
    category_id = page_data["categoryData"]["_id"]
    total = page_data["total"]

    # Fetch all discourse slugs in one call
    url = f"{BASE_URL}/api/server/audio/series-filter"
    body = {"perPage": max(total, 100), "page": 1, "currentId": category_id}
    resp = requests.post(url, headers=HEADERS, json=body, timeout=30)
    resp.raise_for_status()
    slugs = [item["slug"] for item in resp.json().get("listData", [])]

    return {
        "series_slug": series_slug,
        "series_title": series["title"],
        "series_dir": series_dir,
        "discourse_slugs": slugs,
        "total": total,
    }


def fetch_and_save_transcript(series_dir: str, discourse_slug: str) -> tuple[str, str, int]:
    """
    Fetch a single transcript and save it.
    Returns (discourse_slug, title, char_count) or (discourse_slug, "SKIP"/"ERROR"/..., 0).
    """
    output_file = os.path.join(series_dir, f"{discourse_slug}.txt")

    # Skip if file already exists (even empty ones count as "done")
    if os.path.exists(output_file):
        return discourse_slug, "SKIP", 0

    os.makedirs(series_dir, exist_ok=True)

    resp = requests.get(f"{BASE_URL}/{discourse_slug}", headers=HEADERS, timeout=30)
    resp.raise_for_status()
    match = re.search(
        r'<script[^>]*id="__NEXT_DATA__"[^>]*>(.*?)</script>', resp.text
    )
    if not match:
        # Create empty file so we don't retry
        open(output_file, "w").close()
        return discourse_slug, "NO_PAGE", 0

    data = json.loads(match.group(1))
    audio = data["props"]["pageProps"]["data"]["pageData"]["audioData"]
    title = audio.get("title", discourse_slug)
    raw = audio.get("description", "")
    text = raw.replace("<br>", "\n").replace("<br/>", "\n").replace("<br />", "\n")
    text = re.sub(r"<[^>]+>", "", text)
    text = re.sub(r"\n{3,}", "\n\n", text).strip()

    # Treat as blank if fewer than 2 line breaks (e.g. just "Osho")
    if text.count("\n") < 2:
        open(output_file, "w").close()
        return discourse_slug, "BLANK", 0

    with open(output_file, "w", encoding="utf-8") as f:
        f.write(text)

    return discourse_slug, title, len(text)


def scrape_all():
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    # ── Step 1: Collect all series from A-Z (fast, 26 requests) ──
    print("=" * 60)
    print("Step 1: Fetching series index A-Z")
    print("=" * 60)
    all_series = []
    with ThreadPoolExecutor(max_workers=10) as pool:
        futs = {pool.submit(fetch_series_for_letter, ch): ch for ch in string.ascii_uppercase}
        for fut in as_completed(futs):
            letter = futs[fut]
            try:
                result = fut.result()
                print(f"  [{letter}] {len(result)} series")
                all_series.extend(result)
            except Exception as e:
                print(f"  [{letter}] ERROR: {e}")

    print(f"\nTotal series: {len(all_series)}")

    # ── Step 2: Fetch metadata (category_id + discourse slugs) per series ──
    print("\n" + "=" * 60)
    print(f"Step 2: Fetching discourse lists ({WORKERS_SERIES} workers)")
    print("=" * 60)
    series_meta = []
    with ThreadPoolExecutor(max_workers=WORKERS_SERIES) as pool:
        futs = {pool.submit(fetch_series_metadata, s): s for s in all_series}
        for i, fut in enumerate(as_completed(futs), 1):
            s = futs[fut]
            try:
                meta = fut.result()
                if meta:
                    series_meta.append(meta)
                    print(f"  [{i}/{len(all_series)}] {meta['series_title']}  ({len(meta['discourse_slugs'])} discourses)")
                else:
                    print(f"  [{i}/{len(all_series)}] {s['slug']} - could not parse")
            except Exception as e:
                print(f"  [{i}/{len(all_series)}] {s['slug']} - ERROR: {e}")

    # ── Build flat list of all transcript jobs ──
    all_jobs = []
    skipped_upfront = 0
    for meta in series_meta:
        for slug in meta["discourse_slugs"]:
            output_file = os.path.join(meta["series_dir"], f"{slug}.txt")
            if os.path.exists(output_file):
                skipped_upfront += 1
            else:
                all_jobs.append((meta["series_dir"], slug, meta["series_title"]))

    total_discourses = skipped_upfront + len(all_jobs)
    print(f"\nTotal discourses: {total_discourses}")
    print(f"  Already downloaded: {skipped_upfront}")
    print(f"  To download: {len(all_jobs)}")

    if not all_jobs:
        print("\nNothing to download!")
        return

    # ── Step 3: Download transcripts in parallel ──
    print("\n" + "=" * 60)
    print(f"Step 3: Downloading {len(all_jobs)} transcripts ({WORKERS_TRANSCRIPTS} workers)")
    print("=" * 60)

    done = 0
    downloaded = 0
    no_transcript = 0
    errors = 0
    t0 = time.time()

    with ThreadPoolExecutor(max_workers=WORKERS_TRANSCRIPTS) as pool:
        futs = {}
        for series_dir, slug, series_title in all_jobs:
            f = pool.submit(fetch_and_save_transcript, series_dir, slug)
            futs[f] = (slug, series_title)

        for fut in as_completed(futs):
            slug, series_title = futs[fut]
            done += 1
            try:
                dslug, status, chars = fut.result()
                if status == "SKIP":
                    pass  # shouldn't happen since we filtered above
                elif chars > 0:
                    downloaded += 1
                    elapsed = time.time() - t0
                    rate = done / elapsed if elapsed > 0 else 0
                    eta = (len(all_jobs) - done) / rate if rate > 0 else 0
                    print(f"  [{done}/{len(all_jobs)}] {status} ({chars:,} chars)  "
                          f"[{rate:.1f}/s  ETA {int(eta)}s]")
                else:
                    no_transcript += 1
                    print(f"  [{done}/{len(all_jobs)}] {dslug} - {status} (empty file created)")
            except Exception as e:
                errors += 1
                print(f"  [{done}/{len(all_jobs)}] {slug} - ERROR: {e}")

    elapsed = time.time() - t0
    print("\n" + "=" * 60)
    print(f"Done in {elapsed:.0f}s")
    print(f"  Downloaded:     {downloaded}")
    print(f"  No transcript:  {no_transcript}")
    print(f"  Errors:         {errors}")
    print(f"  Already existed: {skipped_upfront}")
    print("=" * 60)


if __name__ == "__main__":
    scrape_all()
