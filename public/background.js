const actionAPI = chrome.action || chrome.browserAction;
if (actionAPI) {
  actionAPI.onClicked.addListener((tab) => {
    if (tab.id) {
      // Dynamically inject scraping script on user click (leveraging activeTab permission)
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["content.js"]
      }, () => {
        // Ignore any errors if clicking on a protected browser page (e.g., chrome://)
        if (chrome.runtime.lastError) {
          console.warn("Could not inject scraper: ", chrome.runtime.lastError.message);
        }
        chrome.windows.create({
          url: chrome.runtime.getURL(`index.html?tabId=${tab.id}`),
          type: "popup",
          width: 500,
          height: 750
        });
      });
    }
  });
}

chrome.runtime.onInstalled.addListener(() => {
  if (chrome.contextMenus) {
    chrome.contextMenus.create({
      id: "compress_image",
      title: "Compress this Image",
      contexts: ["image"]
    });
  }
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "compress_image") {
    chrome.windows.create({
      url: chrome.runtime.getURL(`index.html?imageUrl=${encodeURIComponent(info.srcUrl)}`),
      type: "popup",
      width: 500,
      height: 750
    });
  }
});
