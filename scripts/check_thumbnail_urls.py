import json

with open('data/mindfolk-nfts.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# Check a Founder NFT
founder = [n for n in data if 'Founder' in n.get('Name', '')][0]
print('Founder NFT:')
print(f'  Name: {founder.get("Name")}')
print(f'  thumbnailURL: {founder.get("thumbnailURL", "N/A")}')
print(f'  thumbnailURLs: {founder.get("thumbnailURLs", {})}')

# Check if URLs have # or _
founders_with_hash = [n for n in data if 'Founder' in n.get('Name', '') and '#' in str(n.get('thumbnailURL', ''))]
founders_with_underscore = [n for n in data if 'Founder' in n.get('Name', '') and 'Mindfolk Founder _' in str(n.get('thumbnailURL', ''))]

print()
print(f'Founders with # in URL: {len(founders_with_hash)}')
print(f'Founders with _ in URL: {len(founders_with_underscore)}')

if founders_with_hash:
    print(f'  Example with #: {founders_with_hash[0].get("Name")}')
    print(f'    URL: {founders_with_hash[0].get("thumbnailURL")}')

if founders_with_underscore:
    print(f'  Example with _: {founders_with_underscore[0].get("Name")}')
    print(f'    URL: {founders_with_underscore[0].get("thumbnailURL")}')
