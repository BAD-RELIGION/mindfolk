"""Rename all thumbnails to remove # characters and update JSON"""
import os
import json
import re
from pathlib import Path

THUMBNAIL_DIRS = {
    '190x190': 'img/thumbnails/190x190',
    '100x100': 'img/thumbnails/100x100',
    '30x30': 'img/thumbnails/30x30'
}
INPUT_JSON = 'data/mindfolk-nfts.json'
OUTPUT_JSON = 'data/mindfolk-nfts.json'

def sanitize_filename(name):
    """Create a safe filename from NFT name (remove # and other invalid chars)"""
    invalid_chars = '<>:"/\\|?*#'
    filename = name
    for char in invalid_chars:
        filename = filename.replace(char, '_')
    # Remove multiple underscores
    filename = re.sub(r'_+', '_', filename)
    # Limit length
    if len(filename) > 200:
        filename = filename[:200]
    return filename.strip('_')

def main():
    # Load JSON
    print(f"Loading {INPUT_JSON}...")
    with open(INPUT_JSON, 'r', encoding='utf-8') as f:
        nfts = json.load(f)
    
    print(f"Found {len(nfts)} NFTs")
    print()
    
    renamed_count = 0
    updated_json_count = 0
    
    # Process each NFT
    for i, nft in enumerate(nfts):
        nft_name = nft.get('Name', '').strip()
        if not nft_name:
            continue
        
        # Get sanitized filename
        safe_filename = sanitize_filename(nft_name)
        old_filename = f"{nft_name}.jpg"
        new_filename = f"{safe_filename}.jpg"
        
        # Skip if filename doesn't need changing
        if old_filename == new_filename:
            continue
        
        # Rename thumbnails in all three sizes
        thumbnail_urls = {}
        all_renamed = True
        
        for size_name, dir_path in THUMBNAIL_DIRS.items():
            old_path = os.path.join(dir_path, old_filename)
            new_path = os.path.join(dir_path, new_filename)
            
            # Check if old file exists
            if os.path.exists(old_path):
                try:
                    # Rename the file
                    os.rename(old_path, new_path)
                    print(f"  [RENAMED] {size_name}: {old_filename} -> {new_filename}")
                    renamed_count += 1
                except Exception as e:
                    print(f"  [ERROR] Could not rename {old_path}: {e}")
                    all_renamed = False
                    continue
            elif os.path.exists(new_path):
                # Already renamed or was created with correct name
                pass
            else:
                # File doesn't exist, skip
                continue
            
            # Update thumbnail URL in JSON
            thumbnail_url = f"{dir_path.replace(os.sep, '/')}/{new_filename}"
            thumbnail_urls[size_name] = thumbnail_url
        
        # Update JSON if we renamed any files
        if thumbnail_urls:
            nft['thumbnailURL'] = thumbnail_urls.get('190x190', '')
            nft['thumbnailURLs'] = thumbnail_urls
            updated_json_count += 1
    
    # Save updated JSON
    print()
    print("=" * 60)
    print("Summary:")
    print(f"  Total NFTs processed: {len(nfts)}")
    print(f"  Thumbnails renamed: {renamed_count}")
    print(f"  JSON entries updated: {updated_json_count}")
    print("=" * 60)
    print()
    
    print(f"Saving updated JSON to {OUTPUT_JSON}...")
    with open(OUTPUT_JSON, 'w', encoding='utf-8') as f:
        json.dump(nfts, f, indent=2, ensure_ascii=False)
    
    print("Done!")

if __name__ == '__main__':
    main()







