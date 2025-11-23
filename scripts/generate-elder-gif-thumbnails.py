"""Generate thumbnails for Elder GIF images"""
import json
import os
from PIL import Image
from pathlib import Path
import sys

# Configuration
THUMBNAIL_SIZES = {
    '190x190': (190, 190),
    '100x100': (100, 100),
    '30x30': (30, 30)
}
QUALITY = 85  # JPEG quality (1-100)
INPUT_JSON = 'data/mindfolk-nfts.json'
OUTPUT_JSON = 'data/mindfolk-nfts.json'
THUMBNAIL_DIRS = {
    '190x190': 'img/thumbnails/190x190',
    '100x100': 'img/thumbnails/100x100',
    '30x30': 'img/thumbnails/30x30'
}
ELDER_IMAGE_DIR = r'E:\Tralha\Stuff\crypto design\MY MINDFOLK\Mindfolk Images\Elders'

# Configure stdout for UTF-8 on Windows
if os.name == 'nt':
    sys.stdout.reconfigure(encoding='utf-8')

def generate_thumbnail(image_path, thumbnail_path, size):
    """Generate a thumbnail from an image file (including GIF)"""
    try:
        with Image.open(image_path) as img:
            # For GIFs, get the first frame
            if img.format == 'GIF':
                # Convert to RGB for GIF animation
                img = img.convert('RGB')
            
            # Convert to RGB if necessary (for PNG with transparency, etc.)
            if img.mode in ('RGBA', 'LA', 'P'):
                # Create a white background
                background = Image.new('RGB', img.size, (255, 255, 255))
                if img.mode == 'P':
                    img = img.convert('RGBA')
                background.paste(img, mask=img.split()[-1] if img.mode in ('RGBA', 'LA') else None)
                img = background
            elif img.mode != 'RGB':
                img = img.convert('RGB')
            
            # Generate thumbnail maintaining aspect ratio
            img.thumbnail(size, Image.Resampling.LANCZOS)
            
            # Create a square thumbnail with white background
            thumbnail = Image.new('RGB', size, (255, 255, 255))
            # Calculate position to center the image
            paste_x = (size[0] - img.size[0]) // 2
            paste_y = (size[1] - img.size[1]) // 2
            thumbnail.paste(img, (paste_x, paste_y))
            
            # Save as JPEG
            thumbnail.save(thumbnail_path, 'JPEG', quality=QUALITY, optimize=True)
            return True
    except Exception as e:
        print(f"    [ERROR] Failed to generate thumbnail: {e}")
        return False

def main():
    # Create thumbnail directories
    for size_name, dir_path in THUMBNAIL_DIRS.items():
        Path(dir_path).mkdir(parents=True, exist_ok=True)
    
    # Check if elder directory exists
    if not os.path.exists(ELDER_IMAGE_DIR):
        print(f"ERROR: Elder directory not found: {ELDER_IMAGE_DIR}")
        return
    
    # Load JSON
    print(f"Loading {INPUT_JSON}...")
    with open(INPUT_JSON, 'r', encoding='utf-8') as f:
        nfts = json.load(f)
    
    # Filter for the 4 specific Elders
    target_names = ['Falcon Town Elder', 'Foster Mountain Elder', 'Ock Water Elder', 'Swanson Wood Elder']
    elder_nfts = [nft for nft in nfts if nft.get('Name', '').strip() in target_names]
    print(f"Found {len(elder_nfts)} target Elder NFTs")
    print()
    
    generated_count = 0
    skipped_count = 0
    failed_count = 0
    json_updated_count = 0
    
    # Process each Elder NFT
    for nft in elder_nfts:
        nft_name = nft.get('Name', '').strip()
        print(f"Processing: {nft_name}")
        
        # Look for GIF file in Elders folder
        gif_file = None
        for file_path in Path(ELDER_IMAGE_DIR).iterdir():
            if file_path.is_file():
                file_name_lower = file_path.stem.lower()
                nft_name_lower = nft_name.lower()
                
                # Try to match by name (with or without spaces/underscores)
                if (file_name_lower == nft_name_lower or 
                    file_name_lower.replace('_', ' ').replace('-', ' ') == nft_name_lower.replace('_', ' ').replace('-', ' ') or
                    nft_name_lower.replace(' ', '_') in file_name_lower or
                    nft_name_lower.replace(' ', '-') in file_name_lower):
                    
                    if file_path.suffix.lower() == '.gif':
                        gif_file = file_path
                        break
        
        if not gif_file:
            print(f"  [WARNING] GIF file not found for {nft_name}")
            failed_count += 1
            continue
        
        print(f"  Found GIF: {gif_file.name}")
        
        # Generate safe filename (remove # and other invalid chars)
        import re
        invalid_chars = '<>:"/\\|?*#'
        safe_filename = nft_name
        for char in invalid_chars:
            safe_filename = safe_filename.replace(char, '_')
        safe_filename = re.sub(r'_+', '_', safe_filename).strip('_')
        thumbnail_filename = f"{safe_filename}.jpg"
        
        # Generate all three sizes
        all_generated = True
        all_exist = True
        thumbnail_urls = {}
        
        for size_name, size in THUMBNAIL_SIZES.items():
            thumbnail_path = Path(THUMBNAIL_DIRS[size_name]) / thumbnail_filename
            thumbnail_url = f"{THUMBNAIL_DIRS[size_name].replace(os.sep, '/')}/{thumbnail_filename}"
            thumbnail_urls[size_name] = thumbnail_url
            
            # Skip if already exists
            if thumbnail_path.exists():
                continue
            
            all_exist = False
            
            # Generate thumbnail
            if not generate_thumbnail(gif_file, thumbnail_path, size):
                all_generated = False
                failed_count += 1
                break
        
        if all_generated:
            if all_exist:
                skipped_count += 1
                print(f"  [SKIPPED] Thumbnails already exist")
            else:
                generated_count += 1
                print(f"  [OK] Generated thumbnails")
            
            # Update JSON
            nft['thumbnailURL'] = thumbnail_urls.get('190x190', '')
            nft['thumbnailURLs'] = thumbnail_urls
            json_updated_count += 1
            print(f"  [OK] Updated JSON")
        else:
            failed_count += 1
        
        print()
    
    # Save updated JSON
    print("=" * 60)
    print("Summary:")
    print(f"  Elder NFTs processed: {len(elder_nfts)}")
    print(f"  Thumbnails generated: {generated_count}")
    print(f"  Thumbnails skipped (already exist): {skipped_count}")
    print(f"  Failed to generate: {failed_count}")
    print(f"  JSON entries updated: {json_updated_count}")
    print("=" * 60)
    print()
    
    print(f"Saving updated JSON to {OUTPUT_JSON}...")
    with open(OUTPUT_JSON, 'w', encoding='utf-8') as f:
        json.dump(nfts, f, indent=2, ensure_ascii=False)
    
    print("Done!")

if __name__ == '__main__':
    main()







