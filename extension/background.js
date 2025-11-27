/**
 * Background script to handle image fetching (bypasses CORS)
 */

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'fetchImages') {
    const fetchPromises = request.urls.map(async (url, index) => {
      try {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Failed to fetch image ${url}: ${response.statusText}`);
        }
        const blob = await response.blob();
        const reader = new FileReader();
        return new Promise((resolve) => {
          reader.onloadend = () => {
            const base64data = reader.result.split(',')[1];
            const urlParts = url.split('.');
            const extension = urlParts.length > 1 ? urlParts[urlParts.length - 1].split('?')[0] : 'webp';
            const fileName = `image_${index + 1}.${extension}`;
            resolve({
              name: fileName,
              type: blob.type || 'image/webp',
              data: base64data
            });
          };
          reader.readAsDataURL(blob);
        });
      } catch (error) {
        console.error(`Background script: Error fetching image ${url}:`, error);
        return null;
      }
    });
    
    Promise.all(fetchPromises).then(images => {
      const validImages = images.filter(Boolean);
      sendResponse({ success: true, images: validImages });
    }).catch(error => {
      console.error('Background script: Error in Promise.all for fetchImages:', error);
      sendResponse({ success: false, error: error.message });
    });
    
    return true; // Indicates that sendResponse will be called asynchronously
  }
});


