chrome.action.onClicked.addListener((tab) => {
  if (tab.id) {
    chrome.windows.create({
      url: chrome.runtime.getURL(`index.html?tabId=${tab.id}`),
      type: "popup",
      width: 500,
      height: 750
    });
  }
});
