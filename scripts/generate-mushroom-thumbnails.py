"""Generate thumbnails for Mushroom images without renaming"""
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
MUSHROOM_IMAGE_DIR = r'E:\Tralha\Stuff\crypto design\MY MINDFOLK\Mindfolk Images\Mushrooms'

# Configure stdout for UTF-8 on Windows
if os.name == 'nt':
    sys.stdout.reconfigure(encoding='utf-8')

def generate_thumbnail(image_path, thumbnail_path, size):
    """Generate a thumbnail from an image file"""
    try:
        with Image.open(image_path) as img:
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
    
    # Check if mushroom directory exists
    if not os.path.exists(MUSHROOM_IMAGE_DIR):
        print(f"ERROR: Mushroom directory not found: {MUSHROOM_IMAGE_DIR}")
        return
    
    # Load JSON
    print(f"Loading {INPUT_JSON}...")
    with open(INPUT_JSON, 'r', encoding='utf-8') as f:
        nfts = json.load(f)
    
    # Filter for Mushroom Head NFTs
    mushroom_nfts = [nft for nft in nfts if nft.get('Type', '').strip().lower() == 'mushroom head']
    print(f"Found {len(mushroom_nfts)} Mushroom Head NFTs")
    print(f"Mushroom image directory: {MUSHROOM_IMAGE_DIR}")
    print()
    
    # Get all image files from Mushrooms folder
    mushroom_files = []
    for file_path in Path(MUSHROOM_IMAGE_DIR).iterdir():
        if file_path.is_file():
            ext = file_path.suffix.lower()
            if ext in ['.png', '.jpg', '.jpeg'] and ext != '.gif':
                mushroom_files.append(file_path)
    
    print(f"Found {len(mushroom_files)} image files in Mushrooms folder")
    print()
    
    generated_count = 0
    skipped_count = 0
    failed_count = 0
    json_updated_count = 0
    
    # Process each mushroom image file
    for image_file in mushroom_files:
        # Get filename without extension
        original_filename = image_file.stem
        original_ext = image_file.suffix
        
        # Thumbnail will be saved as .jpg
        thumbnail_filename = f"{original_filename}.jpg"
        
        print(f"Processing: {image_file.name}")
        
        # Generate all three sizes
        all_generated = True
        all_exist = True
        thumbnail_urls = {}
        
        for size_name, size in THUMBNAIL_SIZES.items():
            thumbnail_path = Path(THUMBNAIL_DIRS[size_name]) / thumbnail_filename
            # Use forward slashes for URLs (web-compatible)
            thumbnail_url = f"{THUMBNAIL_DIRS[size_name].replace(os.sep, '/')}/{thumbnail_filename}"
            thumbnail_urls[size_name] = thumbnail_url
            
            # Skip if already exists
            if thumbnail_path.exists():
                continue
            
            all_exist = False
            
            # Generate thumbnail
            if not generate_thumbnail(image_file, thumbnail_path, size):
                all_generated = False
                failed_count += 1
                break
        
        if all_generated:
            if all_exist:
                skipped_count += 1
            else:
                generated_count += 1
            
            # Try to find matching NFT in JSON and update it
            # Extract number from filename (e.g., "Mindfolk_Mushroom_0038" -> 38)
            import re
            number_match = re.search(r'(\d+)', original_filename)
            matched_nft = None
            
            if number_match:
                image_number = int(number_match.group(1))
                
                # Try to match with NFT names that contain this number
                for nft in mushroom_nfts:
                    nft_name = nft.get('Name', '')
                    # Extract number from NFT name
                    nft_number_match = re.search(r'(\d+)', nft_name)
                    if nft_number_match:
                        nft_number = int(nft_number_match.group(1))
                        if nft_number == image_number:
                            matched_nft = nft
                            break
                
                # If no exact number match, try partial match
                if not matched_nft:
                    image_name_clean = original_filename.replace('_', ' ').replace('-', ' ').lower()
                    for nft in mushroom_nfts:
                        nft_name = nft.get('Name', '').lower()
                        # Try to match by containing the number or similar name
                        if str(image_number) in nft_name or image_name_clean in nft_name:
                            matched_nft = nft
                            break
            
            if matched_nft:
                # Update NFT with thumbnail URLs
                matched_nft['thumbnailURL'] = thumbnail_urls.get('190x190', '')
                matched_nft['thumbnailURLs'] = thumbnail_urls
                json_updated_count += 1
                print(f"  ✓ Updated JSON for: {matched_nft.get('Name')}")
        else:
            failed_count += 1
    
    # Save updated JSON
    print()
    print("=" * 60)
    print("Summary:")
    print(f"  Image files processed: {len(mushroom_files)}")
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

