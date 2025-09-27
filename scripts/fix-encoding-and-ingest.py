import os
import sys
import glob
import json
import requests
import time
from pathlib import Path

DECISIONS_DIR = Path(__file__).parent.parent / "decisions"
API_URL = "https://legal-topology.jhaladik.workers.dev/api/ingest/decision"

def fix_encoding(file_path):
    """Convert Windows-1250 to UTF-8"""
    try:
        with open(file_path, 'r', encoding='windows-1250') as f:
            content = f.read()

        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)

        return True
    except Exception as e:
        print(f"Error fixing encoding for {file_path}: {e}")
        return False

def ingest_decision(file_path):
    """Send decision to ingestion API"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            text = f.read()

        case_id = Path(file_path).stem.replace('rozhodnuti-', '')

        payload = {
            "text": text,
            "metadata": {
                "case_id": case_id,
                "court": "Nejvyšší soud",
                "date": "2001-01-01",
                "is_binding": True
            }
        }

        response = requests.post(API_URL, json=payload, timeout=120)

        if response.status_code == 200:
            return True, response.json()
        else:
            return False, f"HTTP {response.status_code}: {response.text[:200]}"

    except Exception as e:
        return False, str(e)

def main():
    if len(sys.argv) < 2:
        print("Usage: python fix-encoding-and-ingest.py [fix|ingest|both] [start_from] [batch_size]")
        print("  fix       - Fix encoding only")
        print("  ingest    - Ingest only (encoding already fixed)")
        print("  both      - Fix encoding + ingest")
        print("  start_from - Start from file number (default: 1)")
        print("  batch_size - Batch size (default: 10)")
        return

    mode = sys.argv[1]
    start_from = int(sys.argv[2]) if len(sys.argv) > 2 else 1
    batch_size = int(sys.argv[3]) if len(sys.argv) > 3 else 10

    print("=" * 80)
    print("DECISION INGESTION SCRIPT")
    print("=" * 80)

    files = sorted(glob.glob(str(DECISIONS_DIR / "rozhodnuti-*.txt")))
    total = len(files)

    print(f"\nFound {total} decision files")
    print(f"Mode: {mode}")
    print(f"Start from: {start_from}")
    print(f"Batch size: {batch_size}\n")

    if mode in ['fix', 'both']:
        print(f"\n{'='*80}")
        print("PHASE 1: FIXING ENCODING")
        print(f"{'='*80}\n")

        fixed = 0
        failed = 0

        for i, file_path in enumerate(files, 1):
            print(f"[{i}/{total}] Fixing {Path(file_path).name}...", end=' ')

            if fix_encoding(file_path):
                fixed += 1
                print("OK")
            else:
                failed += 1
                print("FAIL")

        print(f"\n[+] Fixed: {fixed}")
        print(f"[-] Failed: {failed}")

    if mode in ['ingest', 'both']:
        print(f"\n{'='*80}")
        print("PHASE 2: INGESTING DECISIONS")
        print(f"{'='*80}\n")

        files_to_process = files[start_from - 1:]

        ingested = 0
        failed = 0

        for i, file_path in enumerate(files_to_process, start_from):
            print(f"\n[{i}/{total}] Ingesting {Path(file_path).name}...")

            success, result = ingest_decision(file_path)

            if success:
                ingested += 1
                print(f"  [+] Success: {result.get('chunks_created', 0)} chunks created")
            else:
                failed += 1
                print(f"  [-] Failed: {result}")

            if i % batch_size == 0:
                print(f"\n--- Batch complete. Sleeping 2 seconds... ---")
                time.sleep(2)

        print(f"\n{'='*80}")
        print("INGESTION COMPLETE")
        print(f"{'='*80}")
        print(f"[+] Ingested: {ingested}")
        print(f"[-] Failed: {failed}")
        print(f"Total: {ingested + failed}")

if __name__ == "__main__":
    main()