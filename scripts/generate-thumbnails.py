"""
Script to download and generate thumbnails for NFT images.
This will:
1. Download images from the URLs in mindfolk-nfts.json
2. Generate optimized thumbnails (e.g., 300x300px)
3. Save them locally in img/thumbnails/
4. Update the JSON file to point to local thumbnails

Requirements:
    pip install Pillow requests

Usage:
    python scripts/generate-thumbnails.py
"""

import json
import os
import requests
from PIL import Image
from io import BytesIO
import hashlib
from pathlib import Path

# Configuration
THUMBNAIL_SIZE = (300, 300)  # Size for gallery thumbnails
QUALITY = 85  # JPEG quality (1-100)
INPUT_JSON = 'data/mindfolk-nfts.json'
OUTPUT_JSON = 'data/mindfolk-nfts.json'  # Update in place or create new file
THUMBNAIL_DIR = 'img/thumbnails'
FULL_IMAGE_DIR = 'img/full'  # Optional: store full images too

def get_image_filename(mint_address, url):
    """Generate a consistent filename from mint address"""
    # Use first 8 chars of mint + hash of URL for uniqueness
    url_hash = hashlib.md5(url.encode()).hexdigest()[:8]
    return f"{mint_address[:8]}_{url_hash}.jpg"

def download_and_resize_image(url, output_path, size=THUMBNAIL_SIZE, quality=QUALITY):
    """Download image from URL and resize it"""
    try:
        # Download image
        response = requests.get(url, timeout=30, stream=True)
        response.raise_for_status()
        
        # Open image
        img = Image.open(BytesIO(response.content))
        
        # Convert to RGB if necessary (for JPEG)
        if img.mode in ('RGBA', 'LA', 'P'):
            # Create white background
            background = Image.new('RGB', img.size, (255, 255, 255))
            if img.mode == 'P':
                img = img.convert('RGBA')
            background.paste(img, mask=img.split()[-1] if img.mode == 'RGBA' else None)
            img = background
        elif img.mode != 'RGB':
            img = img.convert('RGB')
        
        # Resize maintaining aspect ratio
        img.thumbnail(size, Image.Resampling.LANCZOS)
        
        # Create a square thumbnail with padding if needed
        thumb = Image.new('RGB', size, (0, 0, 0))
        offset = ((size[0] - img.size[0]) // 2, (size[1] - img.size[1]) // 2)
        thumb.paste(img, offset)
        
        # Save thumbnail
        thumb.save(output_path, 'JPEG', quality=quality, optimize=True)
        
        return True
    except Exception as e:
        print(f"Error processing {url}: {e}")
        return False

def main():
    # Create directories
    Path(THUMBNAIL_DIR).mkdir(parents=True, exist_ok=True)
    
    # Load JSON
    print(f"Loading {INPUT_JSON}...")
    with open(INPUT_JSON, 'r', encoding='utf-8') as f:
        nfts = json.load(f)
    
    print(f"Found {len(nfts)} NFTs")
    print(f"Generating thumbnails in {THUMBNAIL_DIR}/")
    print(f"Thumbnail size: {THUMBNAIL_SIZE[0]}x{THUMBNAIL_SIZE[1]}px")
    print()
    
    updated_count = 0
    failed_count = 0
    
    for i, nft in enumerate(nfts):
        if i % 100 == 0:
            print(f"Processing {i}/{len(nfts)}...")
        
        url = nft.get('URL', '').strip()
        mint = nft.get('mintAddress', '').strip()
        
        if not url or not mint:
            continue
        
        # Generate filename
        filename = get_image_filename(mint, url)
        thumbnail_path = os.path.join(THUMBNAIL_DIR, filename)
        thumbnail_url = f"img/thumbnails/{filename}"
        
        # Skip if already exists
        if os.path.exists(thumbnail_path):
            nft['thumbnailURL'] = thumbnail_url
            updated_count += 1
            continue
        
        # Download and resize
        if download_and_resize_image(url, thumbnail_path):
            nft['thumbnailURL'] = thumbnail_url
            updated_count += 1
        else:
            failed_count += 1
            # Keep original URL as fallback
            nft['thumbnailURL'] = url
    
    # Save updated JSON
    print()
    print(f"Completed: {updated_count} thumbnails generated, {failed_count} failed")
    print(f"Saving updated JSON to {OUTPUT_JSON}...")
    
    with open(OUTPUT_JSON, 'w', encoding='utf-8') as f:
        json.dump(nfts, f, indent=2, ensure_ascii=False)
    
    print("Done!")
    print()
    print("Next steps:")
    print("1. Update js/gallery.js to use 'thumbnailURL' instead of 'URL'")
    print("2. Test the gallery to ensure images load correctly")

if __name__ == '__main__':
    main()







