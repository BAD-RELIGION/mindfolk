import json

# Load JSON
with open('data/mindfolk-nfts.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# Check for Bladesong NFTs
bladesong_left = [n for n in data if 'Bladesong Left' in n.get('Name', '')]
bladesong_right = [n for n in data if 'Bladesong Right' in n.get('Name', '')]

print('Bladesong Left Warrior Elder Twin:')
print(f'  Found {len(bladesong_left)} entries')
for i, nft in enumerate(bladesong_left):
    print(f'  Entry {i+1}:')
    print(f'    Mint: {nft.get("mintAddress", "N/A")}')
    print(f'    Name: {nft.get("Name", "N/A")}')
print()

print('Bladesong Right Warrior Elder Twin:')
print(f'  Found {len(bladesong_right)} entries')
for i, nft in enumerate(bladesong_right):
    print(f'  Entry {i+1}:')
    print(f'    Mint: {nft.get("mintAddress", "N/A")}')
    print(f'    Name: {nft.get("Name", "N/A")}')
print()

# Check if there are duplicate mint addresses
mints_dict = {}
duplicates = []
for nft in data:
    mint = nft.get('mintAddress', '').strip()
    if mint:
        if mint in mints_dict:
            duplicates.append((mint, nft.get('Name', 'N/A')))
        else:
            mints_dict[mint] = nft.get('Name', 'N/A')

if duplicates:
    print(f'Duplicate mint addresses found: {len(duplicates)}')
    for mint, name in duplicates[:10]:
        print(f'  Mint: {mint[:30]}... Name: {name}')
else:
    print('No duplicate mint addresses found')







