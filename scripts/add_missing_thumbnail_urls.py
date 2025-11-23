"""Add missing thumbnail URLs to JSON based on NFT names"""
import json
import re
import os

INPUT_JSON = 'data/mindfolk-nfts.json'
OUTPUT_JSON = 'data/mindfolk-nfts.json'

THUMBNAIL_DIRS = {
    '190x190': 'img/thumbnails/190x190',
    '100x100': 'img/thumbnails/100x100',
    '30x30': 'img/thumbnails/30x30'
}

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
    
    updated_count = 0
    missing_count = 0
    
    # Process each NFT
    for i, nft in enumerate(nfts):
        nft_name = nft.get('Name', '').strip()
        if not nft_name:
            continue
        
        # Generate safe filename
        safe_filename = sanitize_filename(nft_name)
        thumbnail_filename = f"{safe_filename}.jpg"
        
        # Check if thumbnailURLs is missing or empty
        if not nft.get('thumbnailURLs') or not isinstance(nft.get('thumbnailURLs'), dict) or len(nft.get('thumbnailURLs', {})) == 0:
            # Create thumbnail URLs
            thumbnail_urls = {}
            for size_name, dir_path in THUMBNAIL_DIRS.items():
                thumbnail_url = f"{dir_path.replace(os.sep, '/')}/{thumbnail_filename}"
                thumbnail_urls[size_name] = thumbnail_url
            
            # Update JSON
            nft['thumbnailURL'] = thumbnail_urls.get('190x190', '')
            nft['thumbnailURLs'] = thumbnail_urls
            updated_count += 1
            
            if updated_count <= 5:
                print(f"  Updated: {nft_name}")
                print(f"    thumbnailURL: {nft['thumbnailURL']}")
        else:
            # Check if URLs have # in them
            needs_fix = False
            thumbnail_urls = nft.get('thumbnailURLs', {})
            
            for size_key, url in thumbnail_urls.items():
                if url and '#' in url:
                    needs_fix = True
                    break
            
            if needs_fix or (nft.get('thumbnailURL') and '#' in nft.get('thumbnailURL', '')):
                # Fix URLs
                old_filename = f"{nft_name}.jpg"
                new_filename = thumbnail_filename
                
                if nft.get('thumbnailURL') and '#' in nft.get('thumbnailURL', ''):
                    nft['thumbnailURL'] = nft['thumbnailURL'].replace(f"/{old_filename}", f"/{new_filename}")
                
                for size_key, url in thumbnail_urls.items():
                    if url and '#' in url:
                        thumbnail_urls[size_key] = url.replace(f"/{old_filename}", f"/{new_filename}")
                
                nft['thumbnailURLs'] = thumbnail_urls
                updated_count += 1
    
    # Save updated JSON
    print()
    print("=" * 60)
    print("Summary:")
    print(f"  Total NFTs processed: {len(nfts)}")
    print(f"  Thumbnail URLs added/updated: {updated_count}")
    print("=" * 60)
    print()
    
    print(f"Saving updated JSON to {OUTPUT_JSON}...")
    with open(OUTPUT_JSON, 'w', encoding='utf-8') as f:
        json.dump(nfts, f, indent=2, ensure_ascii=False)
    
    print("Done!")

if __name__ == '__main__':
    main()







