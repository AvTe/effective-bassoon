chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "GET_IMAGES") {
    const images = [];
    const processedUrls = new Set();
    
    // Helper function to process and add URL
    const addImage = (rawUrl, originalElement) => {
      if (!rawUrl || (!rawUrl.startsWith('http') && !rawUrl.startsWith('data:image'))) return;
      
      let fullResUrl = rawUrl;
      
      // If we are on Google Drive, aggressively look for the real file ID
      if (window.location.hostname === 'drive.google.com' && originalElement) {
        const rowOrCell = originalElement.closest('[data-id]');
        if (rowOrCell) {
          const driveId = rowOrCell.getAttribute('data-id');
          if (driveId && driveId.length > 5) {
            fullResUrl = `https://drive.google.com/uc?id=${driveId}&export=download`;
          }
        }
      }

      // Upgrade Google Drive/Photos thumbnail URLs to full resolution
      if (fullResUrl.includes('googleusercontent.com') && fullResUrl.includes('=')) {
        fullResUrl = fullResUrl.replace(/=[wsh]\d+[^?&]*/, '=s0');
      } else if (fullResUrl.includes('drive.google.com/thumbnail') || fullResUrl.includes('docs.google.com/thumbnail')) {
        try {
          const urlObj = new URL(fullResUrl);
          const id = urlObj.searchParams.get('id');
          if (id) fullResUrl = `https://drive.google.com/uc?id=${id}&export=download`;
        } catch (e) {}
      }

      if (processedUrls.has(fullResUrl)) return;
      processedUrls.add(fullResUrl);

      // Try to get filename
      let filename = originalElement ? (originalElement.alt || originalElement.getAttribute('aria-label') || originalElement.title) : null;
      
      // Drive sometimes stores filenames in sibling elements or aria-labels
      if (!filename && originalElement && originalElement.closest) {
        const wrapper = originalElement.closest('[aria-label]');
        if (wrapper) filename = wrapper.getAttribute('aria-label');
      }
      
      if (!filename) {
        try {
          const urlObj = new URL(fullResUrl);
          // If it's a Drive uc URL with an ID, we might not have a great filename, but try pathname
          const pathParts = urlObj.pathname.split('/');
          const lastPart = pathParts[pathParts.length - 1];
          if (lastPart && lastPart.includes('.')) {
            filename = lastPart;
          }
        } catch (e) {}
      }
      if (!filename) {
        filename = `image_${images.length + 1}`;
      }
      
      let thumbnailUrl = rawUrl;
      // If it's a Drive full-res URL, get a proper thumbnail so the extension can show it safely
      if (fullResUrl.includes('drive.google.com/uc?id=')) {
        const idMatch = fullResUrl.match(/id=([^&]+)/);
        if (idMatch && idMatch[1]) {
           thumbnailUrl = `https://drive.google.com/thumbnail?id=${idMatch[1]}&sz=w400`;
        }
      }
      
      images.push({ url: fullResUrl, filename, thumbnailUrl });
    };

    // 1. Get all standard <img> tags
    const imgElements = Array.from(document.querySelectorAll('img'));
    imgElements.forEach(img => addImage(img.src, img));

    // 2. Drive sometimes uses div background-images for thumbnails
    const allDivs = Array.from(document.querySelectorAll('div, span'));
    allDivs.forEach(el => {
      const bgImage = window.getComputedStyle(el).backgroundImage;
      if (bgImage && bgImage !== 'none' && bgImage.startsWith('url(')) {
        const urlMatch = bgImage.match(/^url\(['"]?([^'"]+)['"]?\)/);
        if (urlMatch && urlMatch[1]) {
           addImage(urlMatch[1], el);
        }
      }
    });
    
    // Attempt to get a reasonable title for the folder name
    let title = document.title || "compressed_images";
    if (title.includes(" - Google Drive")) {
      title = title.replace(" - Google Drive", "");
    }
    // Sanitize title
    title = title.replace(/[^a-z0-9_\-\s]/gi, '_').trim().replace(/\s+/g, '_');

    sendResponse({ images, title });
  }
  return true;
});
