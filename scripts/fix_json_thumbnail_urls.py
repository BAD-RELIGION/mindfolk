"""Fix JSON thumbnail URLs to remove # characters"""
import json
import re

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
    
    fixed_count = 0
    
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
        
        # Fix thumbnailURL
        if nft.get('thumbnailURL') and '#' in nft.get('thumbnailURL', ''):
            old_url = nft['thumbnailURL']
            new_url = old_url.replace(f"/{old_filename}", f"/{new_filename}")
            nft['thumbnailURL'] = new_url
            fixed_count += 1
        
        # Fix thumbnailURLs object
        if nft.get('thumbnailURLs') and isinstance(nft['thumbnailURLs'], dict):
            for size_key, url in nft['thumbnailURLs'].items():
                if url and '#' in url:
                    new_url = url.replace(f"/{old_filename}", f"/{new_filename}")
                    nft['thumbnailURLs'][size_key] = new_url
                    fixed_count += 1
    
    # Save updated JSON
    print("=" * 60)
    print("Summary:")
    print(f"  Total NFTs processed: {len(nfts)}")
    print(f"  Thumbnail URLs fixed: {fixed_count}")
    print("=" * 60)
    print()
    
    print(f"Saving updated JSON to {OUTPUT_JSON}...")
    with open(OUTPUT_JSON, 'w', encoding='utf-8') as f:
        json.dump(nfts, f, indent=2, ensure_ascii=False)
    
    print("Done!")

if __name__ == '__main__':
    main()







