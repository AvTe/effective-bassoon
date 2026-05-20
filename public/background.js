const actionAPI = chrome.action || chrome.browserAction;
if (actionAPI) {
  actionAPI.onClicked.addListener((tab) => {
    if (tab.id) {
      chrome.windows.create({
        url: chrome.runtime.getURL(`index.html?tabId=${tab.id}`),
        type: "popup",
        width: 500,
        height: 750
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
