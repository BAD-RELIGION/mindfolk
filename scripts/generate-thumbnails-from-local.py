"""
Script to generate thumbnails from local NFT images.
Matches images to NFTs by name and generates optimized thumbnails.

Requirements:
    pip install Pillow

Usage:
    python scripts/generate-thumbnails-from-local.py
"""

import json
import os
from PIL import Image
from pathlib import Path
import re

# Configuration
# Three sizes for three different views
THUMBNAIL_SIZES = {
    '190x190': (190, 190),  # For 6-column view (main gallery default)
    '100x100': (100, 100),  # For 12-column view (smaller cards)
    '30x30': (30, 30)       # For list view (tiny thumbnails)
}
QUALITY = 85  # JPEG quality (1-100)
INPUT_JSON = 'data/mindfolk-nfts.json'
OUTPUT_JSON = 'data/mindfolk-nfts.json'
THUMBNAIL_DIRS = {
    '190x190': 'img/thumbnails/190x190',
    '100x100': 'img/thumbnails/100x100',
    '30x30': 'img/thumbnails/30x30'
}
IMAGE_DIR = r'E:\Tralha\Stuff\crypto design\MY MINDFOLK\Mindfolk Images'

# Folders to process (ignore GIFs)
FOLDERS_TO_PROCESS = ['Elders', 'Mushrooms']

# Test mode - set to a number to only process that many NFTs (None = process all)
TEST_MODE = None  # Set to 10 for testing, None to process all

def normalize_name(name):
    """Normalize name for matching (remove special chars, lowercase, etc.)"""
    if not name:
        return ""
    # Remove special characters, convert to lowercase, strip whitespace
    normalized = re.sub(r'[^\w\s]', '', name.lower())
    normalized = re.sub(r'\s+', ' ', normalized).strip()
    return normalized

def find_image_file(image_dir, nft_name):
    """Find image file matching NFT name in the image directory"""
    normalized_nft_name = normalize_name(nft_name)
    
    # Check if this is a "Mindfolk Founder #X" pattern
    founder_match = re.search(r'founder\s*#?\s*(\d+)', nft_name, re.IGNORECASE)
    if founder_match:
        founder_num = int(founder_match.group(1))
        # Try to find file with pattern Mindfolk_Founder_XXXX.png (zero-padded to 4 digits)
        # Files are named like: Mindfolk_Founder_0008.png
        padded_num = str(founder_num).zfill(4)  # Pad to 4 digits: 8 -> 0008
        possible_names = [
            f"Mindfolk_Founder_{padded_num}",
            f"Mindfolk_Founder_{founder_num}",  # Also try without padding
        ]
        for possible_name in possible_names:
            for ext in ['.png', '.jpg', '.jpeg', '.PNG', '.JPG', '.JPEG']:
                file_path = Path(image_dir) / f"{possible_name}{ext}"
                if file_path.exists() and file_path.is_file():
                    return file_path
    
    # Search in main directory first, then subfolders
    search_paths = [Path(image_dir)]  # Start with root directory
    for folder in FOLDERS_TO_PROCESS:
        folder_path = Path(image_dir) / folder
        if folder_path.exists():
            search_paths.append(folder_path)
    
    for search_path in search_paths:
        if not search_path.exists():
            continue
            
        # Search for image files (ignore GIFs for now)
        image_extensions = ['.png', '.jpg', '.jpeg', '.webp', '.PNG', '.JPG', '.JPEG', '.WEBP']
        
        try:
            for file_path in search_path.iterdir():
                try:
                    if not file_path.is_file():
                        continue
                        
                    # Skip GIFs and other non-image files
                    file_ext = file_path.suffix.lower()
                    if file_ext == '.gif':
                        continue
                    
                    # Check if extension matches
                    if file_ext not in [ext.lower() for ext in image_extensions]:
                        continue
                    
                    # Get filename without extension
                    filename_base = file_path.stem
                    normalized_filename = normalize_name(filename_base)
                    
                    # Try exact match first
                    if normalized_filename == normalized_nft_name:
                        return file_path
                    
                    # Try partial match (filename contains NFT name or vice versa)
                    if normalized_nft_name in normalized_filename or normalized_filename in normalized_nft_name:
                        return file_path
                except Exception as e:
                    # Skip individual file if there's an error (permissions, etc.)
                    continue
        except PermissionError:
            print(f"Permission denied accessing: {search_path}")
            continue
        except Exception as e:
            print(f"Error accessing {search_path}: {e}")
            continue
    
    return None

def generate_thumbnail(input_path, output_path, size, quality=QUALITY):
    """Generate thumbnail from image file"""
    try:
        # Open image
        img = Image.open(input_path)
        
        # Convert to RGB if necessary (for JPEG)
        if img.mode in ('RGBA', 'LA', 'P'):
            # Create black background (better for dark theme)
            background = Image.new('RGB', img.size, (0, 0, 0))
            if img.mode == 'P':
                img = img.convert('RGBA')
            if img.mode == 'RGBA':
                background.paste(img, mask=img.split()[-1])
            else:
                background.paste(img)
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
        print(f"Error processing {input_path}: {e}")
        return False

def sanitize_filename(name):
    """Create a safe filename from NFT name"""
    # Remove or replace invalid filename characters (including # which can cause URL issues)
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
    # Create thumbnail directories
    for size_name, dir_path in THUMBNAIL_DIRS.items():
        Path(dir_path).mkdir(parents=True, exist_ok=True)
    
    # Check if image directory exists
    if not os.path.exists(IMAGE_DIR):
        print(f"ERROR: Image directory not found: {IMAGE_DIR}")
        print("Please update IMAGE_DIR in the script to point to your images folder.")
        return
    
    # Load JSON
    print(f"Loading {INPUT_JSON}...")
    with open(INPUT_JSON, 'r', encoding='utf-8') as f:
        nfts = json.load(f)
    
    print(f"Found {len(nfts)} NFTs")
    print(f"Image directory: {IMAGE_DIR}")
    print(f"Generating thumbnails in 3 sizes:")
    for size_name, size in THUMBNAIL_SIZES.items():
        print(f"  - {size_name}: {size[0]}x{size[1]}px -> {THUMBNAIL_DIRS[size_name]}/")
    print()
    
    matched_count = 0
    generated_count = 0
    skipped_count = 0
    failed_count = 0
    not_found_count = 0
    
    # Limit to test mode if set
    nfts_to_process = nfts[:TEST_MODE] if TEST_MODE else nfts
    total_to_process = len(nfts_to_process)
    
    print(f"Processing {total_to_process} NFTs...")
    if TEST_MODE:
        print(f"  [TEST MODE: Only processing first {TEST_MODE} NFTs]")
    print()
    
    for i, nft in enumerate(nfts_to_process):
        try:
            if (i + 1) % 100 == 0:
                print(f"Processing {i + 1}/{len(nfts)}... (Matched: {matched_count}, Generated: {generated_count}, Skipped: {skipped_count}, Not Found: {not_found_count}, Failed: {failed_count})")
            
            nft_name = nft.get('Name', '').strip()
            mint = nft.get('mintAddress', '').strip()
            
            if not nft_name:
                not_found_count += 1
                continue
            
            # Find matching image file
            image_file = find_image_file(IMAGE_DIR, nft_name)
            
            if not image_file:
                not_found_count += 1
                if (i + 1) <= 10 or (i + 1) % 500 == 0:  # Log first 10 and then every 500
                    print(f"  Not found: '{nft_name}'")
                continue
            
            matched_count += 1
            
            # Log which folder the image was found in (for debugging first few)
            if matched_count <= 10:
                folder_name = image_file.parent.name if image_file.parent.name else 'root'
                print(f"  [OK] Found '{nft_name}' in {folder_name} folder: {image_file.name}")
            
            # Generate safe filename (remove # and other invalid chars)
            safe_filename = sanitize_filename(nft_name)
            thumbnail_filename = f"{safe_filename}.jpg"
            
            # Check if old filename with # exists and needs to be renamed
            old_filename = f"{nft_name}.jpg"
            old_thumbnail_paths = {}
            for size_name in THUMBNAIL_SIZES.keys():
                old_path = os.path.join(THUMBNAIL_DIRS[size_name], old_filename)
                if os.path.exists(old_path) and old_filename != thumbnail_filename:
                    old_thumbnail_paths[size_name] = old_path
            
            # Generate all three sizes
            all_generated = True
            all_exist = True
            thumbnail_urls = {}
            
            for size_name, size in THUMBNAIL_SIZES.items():
                thumbnail_path = os.path.join(THUMBNAIL_DIRS[size_name], thumbnail_filename)
                # Use forward slashes for URLs (web-compatible)
                thumbnail_url = f"{THUMBNAIL_DIRS[size_name].replace(os.sep, '/')}/{thumbnail_filename}"
                thumbnail_urls[size_name] = thumbnail_url
                
                # If old thumbnail with # exists, rename it to the sanitized version
                if size_name in old_thumbnail_paths:
                    old_path = old_thumbnail_paths[size_name]
                    try:
                        if not os.path.exists(thumbnail_path):
                            os.rename(old_path, thumbnail_path)
                            if VERBOSE_LOGGING:
                                print(f"  [RENAMED] {Path(old_path).name} -> {thumbnail_filename}")
                    except Exception as e:
                        print(f"  [WARNING] Could not rename {Path(old_path).name}: {e}")
                
                # Skip if already exists
                if os.path.exists(thumbnail_path):
                    continue
                
                all_exist = False
                
                # Generate thumbnail
                if not generate_thumbnail(image_file, thumbnail_path, size):
                    all_generated = False
                    failed_count += 1
                    print(f"  [ERROR] Failed to generate {size_name} thumbnail for '{nft_name}'")
                    break
            
            if all_generated:
                # Store all thumbnail URLs in JSON
                nft['thumbnailURL'] = thumbnail_urls.get('190x190', '')  # Default to 190x190 for backward compatibility
                nft['thumbnailURLs'] = thumbnail_urls  # Store all sizes
                if all_exist:
                    skipped_count += 1
                else:
                    generated_count += 1
        except Exception as e:
            print(f"  [ERROR] Error processing NFT {i + 1} ('{nft.get('Name', 'unknown')}'): {e}")
            import traceback
            traceback.print_exc()
            failed_count += 1
            continue
    
    # Save updated JSON
    print()
    print("=" * 60)
    print("Summary:")
    print(f"  Total NFTs in file: {len(nfts)}")
    print(f"  NFTs processed: {total_to_process}")
    print(f"  Images matched: {matched_count}")
    print(f"  Thumbnails generated: {generated_count}")
    print(f"  Thumbnails skipped (already exist): {skipped_count}")
    print(f"  Failed to generate: {failed_count}")
    print(f"  Images not found: {not_found_count}")
    print("=" * 60)
    print()
    print(f"Saving updated JSON to {OUTPUT_JSON}...")
    
    with open(OUTPUT_JSON, 'w', encoding='utf-8') as f:
        json.dump(nfts, f, indent=2, ensure_ascii=False)
    
    print("Done!")
    print()
    print("Next steps:")
    print("1. Check the gallery to ensure thumbnails load correctly")
    print("2. If some images weren't found, check the name matching logic")

if __name__ == '__main__':
    main()

