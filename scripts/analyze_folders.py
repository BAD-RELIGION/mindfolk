"""Quick script to analyze folder structure"""
from pathlib import Path
import os

img_dir = Path(r'E:\Tralha\Stuff\crypto design\MY MINDFOLK\Mindfolk Images')
thumb_dir = Path('img/thumbnails')

print('=== SOURCE FOLDER STRUCTURE ===')
print(f'Root: {img_dir}')
print(f'Exists: {img_dir.exists()}')
print()

if img_dir.exists():
    files = list(img_dir.iterdir())
    print(f'Total items in root: {len(files)}')
    print()
    
    # Count files vs directories
    dirs = [f for f in files if f.is_dir()]
    root_files = [f for f in files if f.is_file()]
    image_files = [f for f in root_files if f.suffix.lower() in ['.png', '.jpg', '.jpeg', '.webp'] and f.suffix.lower() != '.gif']
    
    print(f'Directories: {len(dirs)}')
    for d in dirs:
        print(f'  - {d.name}/')
    
    print()
    print(f'Image files in root: {len(image_files)}')
    print('First 10 root images:')
    for img in image_files[:10]:
        print(f'  - {img.name}')
    if len(image_files) > 10:
        print(f'  ... and {len(image_files) - 10} more')
    
    print()
    elders = img_dir / 'Elders'
    if elders.exists():
        elders_files = list(elders.iterdir())
        elders_images = [f for f in elders_files if f.is_file() and f.suffix.lower() in ['.png', '.jpg', '.jpeg', '.webp'] and f.suffix.lower() != '.gif']
        print(f'Elders folder: {len(elders_images)} image files')
        print(f'  Sample: {[f.name for f in elders_images[:5]]}')
        print()
    
    mushrooms = img_dir / 'Mushrooms'
    if mushrooms.exists():
        mush_files = list(mushrooms.iterdir())
        mush_images = [f for f in mush_files if f.is_file() and f.suffix.lower() in ['.png', '.jpg', '.jpeg', '.webp'] and f.suffix.lower() != '.gif']
        print(f'Mushrooms folder: {len(mush_images)} image files')
        print(f'  Sample: {[f.name for f in mush_images[:5]]}')

print()
print('=== THUMBNAIL FOLDERS STRUCTURE ===')
if thumb_dir.exists():
    for size_dir in sorted(thumb_dir.iterdir()):
        if size_dir.is_dir():
            files = list(size_dir.glob('*.jpg'))
            print(f'{size_dir.name}: {len(files)} thumbnails')
            if len(files) > 0:
                print(f'  Sample: {files[0].name}')
else:
    print('Thumbnail directory does not exist')







