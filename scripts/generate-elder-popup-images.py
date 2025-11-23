"""Generate 380x380 popup images for Elder NFTs"""
import os
from pathlib import Path
from PIL import Image
import json

# Paths
SOURCE_DIR = r'E:\Tralha\Stuff\crypto design\MY MINDFOLK\Mindfolk Images\Elders'
OUTPUT_DIR = Path(r'C:\Users\44756\mindfolkgallery\img\Elders')
JSON_FILE = 'data/mindfolk-nfts.json'
POPUP_SIZE = (380, 380)

def sanitize_filename(filename):
    """Sanitize filename for web compatibility"""
    # Replace # with _ for web compatibility
    filename = filename.replace('#', '_')
    return filename

def find_image_file(nft_name, source_dir):
    """Find the image file for an NFT name"""
    source_path = Path(source_dir)
    
    if not source_path.exists():
        print(f"ERROR: Source directory not found: {source_dir}")
        return None
    
    # Try different filename variations
    base_name = nft_name.replace(' ', '_').replace('-', '_')
    
    # Search patterns
    search_patterns = [
        nft_name,  # Exact name
        base_name,  # With underscores
        nft_name.replace(' ', ''),  # No spaces
        base_name.lower(),  # Lowercase
        nft_name.lower(),  # Lowercase exact
    ]
    
    # File extensions to try
    extensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp']
    
    # Search in source directory
    for pattern in search_patterns:
        for ext in extensions:
            # Try exact match
            file_path = source_path / f"{pattern}{ext}"
            if file_path.exists():
                return file_path
            
            # Try with zero-padded numbers (e.g., "Elder_0001.png")
            if 'Elder' in pattern:
                # Try to extract number if present
                import re
                match = re.search(r'(\d+)$', pattern)
                if match:
                    num = match.group(1)
                    padded_num = num.zfill(4)
                    pattern_padded = pattern.replace(num, padded_num)
                    file_path = source_path / f"{pattern_padded}{ext}"
                    if file_path.exists():
                        return file_path
    
    # List all files for debugging
    print(f"  Could not find image for: {nft_name}")
    print(f"  Available files in {source_dir}:")
    try:
        files = list(source_path.glob('*'))
        for f in files[:10]:  # Show first 10
            print(f"    - {f.name}")
        if len(files) > 10:
            print(f"    ... and {len(files) - 10} more files")
    except Exception as e:
        print(f"  Error listing files: {e}")
    
    return None

def generate_popup_image(source_path, output_path, size):
    """Generate popup image from source"""
    try:
        # Open image
        with Image.open(source_path) as img:
            # Convert RGBA to RGB if necessary (for JPEG output)
            if img.mode in ('RGBA', 'LA', 'P'):
                # Create white background
                background = Image.new('RGB', img.size, (255, 255, 255))
                if img.mode == 'P':
                    img = img.convert('RGBA')
                background.paste(img, mask=img.split()[-1] if img.mode in ('RGBA', 'LA') else None)
                img = background
            elif img.mode != 'RGB':
                img = img.convert('RGB')
            
            # Resize maintaining aspect ratio, then crop to exact size
            img.thumbnail(size, Image.Resampling.LANCZOS)
            
            # Create new image with exact size and paste resized image centered
            new_img = Image.new('RGB', size, (255, 255, 255))
            paste_x = (size[0] - img.width) // 2
            paste_y = (size[1] - img.height) // 2
            new_img.paste(img, (paste_x, paste_y))
            
            # Save as JPEG
            new_img.save(output_path, 'JPEG', quality=90, optimize=True)
            return True
    except Exception as e:
        print(f"  ERROR processing {source_path.name}: {e}")
        return False

def main():
    # Create output directory
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    
    # Load JSON to get Elder NFTs
    if not os.path.exists(JSON_FILE):
        print(f"ERROR: JSON file not found: {JSON_FILE}")
        return
    
    print(f"Loading NFTs from {JSON_FILE}...")
    with open(JSON_FILE, 'r', encoding='utf-8') as f:
        nfts = json.load(f)
    
    # Filter for Elder type NFTs
    elder_nfts = [nft for nft in nfts if nft.get('Type', '').lower() == 'elder']
    print(f"Found {len(elder_nfts)} Elder NFTs")
    
    if not elder_nfts:
        print("No Elder NFTs found in JSON file")
        return
    
    # Process each Elder NFT
    processed = 0
    skipped = 0
    errors = 0
    
    for nft in elder_nfts:
        nft_name = nft.get('Name', '')
        if not nft_name:
            continue
        
        print(f"\nProcessing: {nft_name}")
        
        # Find source image
        source_path = find_image_file(nft_name, SOURCE_DIR)
        if not source_path:
            skipped += 1
            continue
        
        # Generate output filename
        output_filename = sanitize_filename(f"{nft_name}.jpg")
        output_path = OUTPUT_DIR / output_filename
        
        # Generate popup image
        if generate_popup_image(source_path, output_path, POPUP_SIZE):
            print(f"  [OK] Created: {output_path.name}")
            processed += 1
        else:
            errors += 1
    
    print(f"\n{'='*60}")
    print(f"Summary:")
    print(f"  Processed: {processed}")
    print(f"  Skipped: {skipped}")
    print(f"  Errors: {errors}")
    print(f"  Output directory: {OUTPUT_DIR}")

if __name__ == '__main__':
    main()

