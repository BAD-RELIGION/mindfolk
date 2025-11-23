import json
from collections import defaultdict

# Load JSON
with open('data/mindfolk-nfts.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# Check for duplicates by name
names_dict = defaultdict(list)
for nft in data:
    name = nft.get('Name', '').strip()
    if name:
        names_dict[name].append(nft)

duplicate_names = {k: v for k, v in names_dict.items() if len(v) > 1}

print(f'Total NFTs: {len(data)}')
print(f'Unique names: {len(names_dict)}')
print(f'Duplicate names: {len(duplicate_names)}')
print()

# Check specific names
target_names = ['Falcon Town Elder', 'Foster Mountain Elder']
for target_name in target_names:
    if target_name in names_dict:
        nfts = names_dict[target_name]
        print(f'{target_name}: {len(nfts)} entries')
        for i, nft in enumerate(nfts):
            print(f'  Entry {i+1}:')
            print(f'    Mint: {nft.get("mintAddress", "N/A")}')
            print(f'    Type: {nft.get("Type", "N/A")}')
        print()

# Show all duplicates
if duplicate_names:
    print('All duplicate names:')
    for name, nfts in list(duplicate_names.items())[:20]:
        print(f'  {name}: {len(nfts)} entries')
        for nft in nfts:
            print(f'    - Mint: {nft.get("mintAddress", "N/A")[:30]}...')







