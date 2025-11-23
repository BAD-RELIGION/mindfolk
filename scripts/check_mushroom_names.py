import json

with open('data/mindfolk-nfts.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

mushrooms = [n for n in data if n.get('Type', '').strip().lower() == 'mushroom head']
print(f'Mushroom Head NFTs: {len(mushrooms)}')
print()
print('Sample NFT names:')
for n in mushrooms[:10]:
    print(f'  Name: {n.get("Name")}')







