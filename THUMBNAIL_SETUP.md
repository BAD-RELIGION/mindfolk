# NFT Thumbnail Optimization Setup

## Benefits of Local Thumbnails

Hosting thumbnails locally instead of loading from external sources (like Google Drive) provides:

1. **Faster Loading**: No external HTTP requests = faster page load
2. **Better Caching**: Browser can cache local files more effectively
3. **No Rate Limits**: No dependency on external services
4. **Reduced Bandwidth**: Thumbnails are much smaller than full images
5. **Better Performance**: Especially important with 9,952 NFTs

## Current Setup

- Images are loaded from Google Drive URLs in `data/mindfolk-nfts.json`
- Each NFT card loads images with `loading="lazy"` attribute
- Gallery displays 20 NFTs initially, then loads more on demand

## Implementation Steps

### Option 1: Automated Script (Recommended)

1. **Install dependencies:**
   ```bash
   pip install Pillow requests
   ```

2. **Run the thumbnail generator:**
   ```bash
   python scripts/generate-thumbnails.py
   ```

   This will:
   - Download all images from the JSON file
   - Generate 300x300px thumbnails
   - Save them to `img/thumbnails/`
   - Update the JSON file with `thumbnailURL` fields

3. **The JavaScript is already updated** to use `thumbnailURL` if available, falling back to `URL`

### Option 2: Manual Setup

If you already have thumbnails:

1. Place thumbnails in `img/thumbnails/` directory
2. Name them using the pattern: `{first8charsOfMint}_{hash}.jpg`
3. Update `data/mindfolk-nfts.json` to include `thumbnailURL` field:
   ```json
   {
     "mintAddress": "...",
     "Name": "...",
     "URL": "...",
     "thumbnailURL": "img/thumbnails/abc12345_def67890.jpg",
     ...
   }
   ```

## Thumbnail Specifications

- **Size**: 300x300px (square)
- **Format**: JPEG
- **Quality**: 85% (good balance of quality and file size)
- **Aspect Ratio**: Maintained with black padding if needed

## File Size Estimates

- Full images: ~500KB - 2MB each
- Thumbnails (300x300): ~20-50KB each
- **Total for 9,952 NFTs**: 
  - Full images: ~5-20GB
  - Thumbnails: ~200-500MB

## Performance Impact

**Before (External URLs):**
- Initial load: 20 external requests
- Each "Load More": 20 more external requests
- Risk of rate limiting from Google Drive
- Slower due to external latency

**After (Local Thumbnails):**
- Initial load: 20 local file requests (much faster)
- Each "Load More": 20 more local requests
- No rate limiting
- Faster due to local file system / CDN

## Next Steps After Generating Thumbnails

1. Test the gallery to ensure thumbnails load correctly
2. Consider using a CDN (like Cloudflare) for even better performance
3. Optionally keep full images for the modal popup (load on demand)

## Notes

- The script will skip images that already exist (resume-friendly)
- Failed downloads will keep the original URL as fallback
- The JavaScript automatically uses thumbnails if available, otherwise uses original URLs







