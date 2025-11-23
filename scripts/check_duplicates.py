import json
from collections import defaultdict

# Load JSON
with open('data/mindfolk-nfts.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

print(f'Total NFTs in JSON: {len(data)}')
print()

# Check for those specific NFTs
target_mints = ['6RYYK3bFsqtWR1HA9g3Xzdep3PkBmgiUMfuuN15NSBZC', 'B1knSLzh8hwzEec25K3vMu9aJMTK6FYRmQAMhzHjJDRG']

print('Checking for target mint addresses:')
found = []
for nft in data:
    mint = nft.get('mintAddress', '')
    if mint in target_mints:
        found.append(nft)
        print(f'  Found - Mint: {mint}, Name: {nft.get("Name", "N/A")}')

print()
print(f'Found {len(found)} entries with those mint addresses')
print()

# Check for duplicates by mint address
mints_dict = defaultdict(list)
for nft in data:
    mint = nft.get('mintAddress', '').strip()
    if mint:
        mints_dict[mint].append(nft)

duplicate_mints = {k: v for k, v in mints_dict.items() if len(v) > 1}

print(f'Unique mint addresses: {len([k for k in mints_dict.keys() if k])}')
print(f'Duplicate mint addresses: {len(duplicate_mints)}')

if duplicate_mints:
    print()
    print('Duplicate mint addresses found:')
    for mint, nfts in list(duplicate_mints.items())[:10]:
        print(f'  Mint: {mint[:30]}... ({len(nfts)} entries)')
        for nft in nfts:
            print(f'    - Name: {nft.get("Name", "N/A")}')

print()

# Check for duplicates by name
names_dict = defaultdict(list)
for nft in data:
    name = nft.get('Name', '').strip()
    if name:
        names_dict[name].append(nft)

duplicate_names = {k: v for k, v in names_dict.items() if len(v) > 1}

print(f'Unique names: {len([k for k in names_dict.keys() if k])}')
print(f'Duplicate names: {len(duplicate_names)}')

# Check specifically for Bladesong names
bladesong_left = [n for n in data if 'Bladesong Left Warrior Elder Twin' in n.get('Name', '')]
bladesong_right = [n for n in data if 'Bladesong Right Warrior Elder Twin' in n.get('Name', '')]

print()
print(f'Bladesong Left Warrior Elder Twin entries: {len(bladesong_left)}')
for nft in bladesong_left:
    print(f'  - Mint: {nft.get("mintAddress", "N/A")}, Name: {nft.get("Name", "N/A")}')

print()
print(f'Bladesong Right Warrior Elder Twin entries: {len(bladesong_right)}')
for nft in bladesong_right:
    print(f'  - Mint: {nft.get("mintAddress", "N/A")}, Name: {nft.get("Name", "N/A")}')







