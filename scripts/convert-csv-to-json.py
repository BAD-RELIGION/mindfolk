"""Convert Mindfolk-images.csv to JSON for popup images"""
import csv
import json
import sys
import os

CSV_FILE = r'e:\Tralha\Stuff\crypto design\MY MINDFOLK\Json and Data\Mindfolk-images.csv'
OUTPUT_JSON = 'data/mindfolk-popup-images.json'

def main():
    # Check if CSV file exists
    if not os.path.exists(CSV_FILE):
        print(f"ERROR: CSV file not found: {CSV_FILE}")
        return
    
    popupImageMap = {}
    popupImageMapByName = {}
    popupImageMapByMint = {}
    
    print(f"Reading CSV file: {CSV_FILE}")
    
    with open(CSV_FILE, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        count = 0
        
        for row in reader:
            # Column A: mintAddress
            mint = row.get('mintAddress', '').strip()
            # Column B: Name
            name = row.get('Name', '').strip()
            # Column F: URL (popup image URL)
            popupUrl = row.get('URL', '').strip()
            # Handle duplicate column names - CSV has two "URL" columns, F is the second one
            # The CSV reader will only read the first "URL" column, so we need to parse differently
            
            if not name:
                continue
            
            # Since CSV has duplicate column names, let's parse manually
            # We'll read the raw line and split by comma
            # Actually, let's try a different approach - read the line manually for column F
            count += 1
            
        print(f"Processed {count} rows using DictReader")
        print("Note: CSV has duplicate column names (URL appears twice)")
        print("Reading CSV file manually to get column F...")
    
    # Read CSV manually to handle duplicate column names
    popupImageMapByName = {}
    popupImageMapByMint = {}
    count = 0
    
    with open(CSV_FILE, 'r', encoding='utf-8') as f:
        lines = f.readlines()
        header = lines[0].strip().split(',')
        
        # Find column indices
        mintIndex = header.index('mintAddress') if 'mintAddress' in header else -1
        nameIndex = header.index('Name') if 'Name' in header else -1
        # Column E (Type) is at index 4, Column F (URL) is at index 5 (0-based: A=0, B=1, C=2, D=3, E=4, F=5)
        typeIndex = 4
        popupUrlIndex = 5
        
        print(f"Header: {header}")
        print(f"Mint index: {mintIndex}, Name index: {nameIndex}, Popup URL index: {popupUrlIndex}")
        
        for lineNum, line in enumerate(lines[1:], start=2):  # Skip header, start from line 2
            # Handle CSV properly - split by comma but respect quoted strings
            import re
            # Simple CSV parsing - split by comma, but this won't handle quoted commas well
            # For now, let's use a simple approach
            values = []
            current = ''
            in_quotes = False
            
            for char in line:
                if char == '"':
                    in_quotes = not in_quotes
                    current += char
                elif char == ',' and not in_quotes:
                    values.append(current)
                    current = ''
                else:
                    current += char
            values.append(current)  # Add last value
            
            if len(values) > popupUrlIndex:
                mint = values[mintIndex].strip('"').strip() if mintIndex >= 0 and mintIndex < len(values) else ''
                name = values[nameIndex].strip('"').strip() if nameIndex >= 0 and nameIndex < len(values) else ''
                nftType = values[typeIndex].strip('"').strip() if typeIndex >= 0 and typeIndex < len(values) else ''
                popupUrl = values[popupUrlIndex].strip('"').strip() if popupUrlIndex < len(values) else ''
                
                if name and popupUrl:
                    # Convert Google Drive download links to thumbnail links for direct image embedding
                    if 'drive.usercontent.google.com/download?id=' in popupUrl:
                        # Extract the file ID
                        file_id = popupUrl.split('id=')[1].split('&')[0]
                        # Use thumbnail endpoint (works better for embedding)
                        popupUrl = f'https://drive.google.com/thumbnail?id={file_id}&sz=w1920'
                    elif 'drive.google.com/file/d/' in popupUrl:
                        # Extract file ID from sharing link format
                        file_id = popupUrl.split('/file/d/')[1].split('/')[0]
                        popupUrl = f'https://drive.google.com/thumbnail?id={file_id}&sz=w1920'
                    elif 'drive.google.com/uc?export=view&id=' in popupUrl:
                        # Already in uc format, convert to thumbnail
                        file_id = popupUrl.split('id=')[1].split('&')[0]
                        popupUrl = f'https://drive.google.com/thumbnail?id={file_id}&sz=w1920'
                    
                    # For Elder types, add authuser parameter
                    if nftType.lower() == 'elder' and popupUrl:
                        if 'authuser=0' not in popupUrl:
                            # Check if URL already has query parameters
                            if '?' in popupUrl:
                                popupUrl = popupUrl + '&authuser=0'
                            else:
                                popupUrl = popupUrl + '?authuser=0'
                    
                    popupImageMapByName[name] = popupUrl
                    if mint:
                        popupImageMapByMint[mint] = popupUrl
                    count += 1
                    
                    if count <= 5:
                        print(f"Sample: Name='{name}', Type='{nftType}', PopupURL='{popupUrl[:70]}...'")
    
    print(f"\nProcessed {count} entries")
    print(f"Entries by name: {len(popupImageMapByName)}")
    print(f"Entries by mint: {len(popupImageMapByMint)}")
    
    # Create output directory if it doesn't exist
    os.makedirs(os.path.dirname(OUTPUT_JSON), exist_ok=True)
    
    # Save to JSON
    output_data = {
        'byName': popupImageMapByName,
        'byMint': popupImageMapByMint
    }
    
    with open(OUTPUT_JSON, 'w', encoding='utf-8') as f:
        json.dump(output_data, f, indent=2, ensure_ascii=False)
    
    print(f"\nSaved to: {OUTPUT_JSON}")

if __name__ == '__main__':
    main()


