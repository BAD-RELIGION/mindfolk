import json

with open('data/mindfolk-nfts.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

sample = data[0]
print('Sample NFT:')
print(f'  Name: {sample.get("Name")}')
print(f'  thumbnailURL: {sample.get("thumbnailURL", "N/A")}')
print(f'  thumbnailURLs: {sample.get("thumbnailURLs", {})}')
print(f'  URL: {sample.get("URL", "N/A")}')







