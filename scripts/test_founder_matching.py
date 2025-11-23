from pathlib import Path
import re

img_dir = Path(r'E:\Tralha\Stuff\crypto design\MY MINDFOLK\Mindfolk Images')
files = [f for f in img_dir.iterdir() if f.is_file() and 'Founder' in f.name and f.suffix.lower() == '.png']

print(f'Founder files found: {len(files)}')
print('Sample founder files:')
for f in sorted(files)[:10]:
    print(f'  {f.name}')

print()
print('Testing matching:')
test_name = 'Mindfolk Founder #8'
founder_match = re.search(r'founder\s*#?\s*(\d+)', test_name, re.IGNORECASE)
if founder_match:
    num = int(founder_match.group(1))
    padded = str(num).zfill(4)
    file_path = img_dir / f'Mindfolk_Founder_{padded}.png'
    print(f'  NFT: {test_name}')
    print(f'  Number: {num}')
    print(f'  Padded: {padded}')
    print(f'  Looking for: Mindfolk_Founder_{padded}.png')
    print(f'  Exists: {file_path.exists()}')







