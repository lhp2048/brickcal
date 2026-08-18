importScripts("holiday.js");

function loadPayload() {
  if (loadPayload.cached) {
    return Promise.resolve(loadPayload.cached);
  }
  return fetch(chrome.runtime.getURL("data/holidays.json")).then(function (resp) {
    if (!resp.ok) {
      throw new Error("HTTP " + resp.status);
    }
    return resp.json();
  }).then(function (payload) {
    loadPayload.cached = payload;
    return payload;
  });
}

function settings() {
  return chrome.storage.sync
    .get({ homeCountry: "CN", workStart: "09:00", workEnd: "18:00" })
    .catch(function () {
      return chrome.storage.local.get({
        homeCountry: "CN",
        workStart: "09:00",
        workEnd: "18:00",
      });
    });
}

function refreshBadge() {
  return Promise.all([loadPayload(), settings()])
    .then(function (pair) {
      const payload = pair[0];
      const home = pair[1].homeCountry || "CN";
      const text = badgeText(payload, home, new Date());
      const color = text === "休" ? "#2f6f5e" : "#c45c26";
      chrome.action.setBadgeBackgroundColor({ color: color });
      chrome.action.setBadgeText({ text: text });
    })
    .catch(function () {
      chrome.action.setBadgeText({ text: "" });
    });
}

chrome.runtime.onInstalled.addListener(function () {
  chrome.alarms.create("badge", { periodInMinutes: 60 });
  refreshBadge();
});
chrome.runtime.onStartup.addListener(refreshBadge);
chrome.alarms.onAlarm.addListener(function (alarm) {
  if (alarm.name === "badge") {
    refreshBadge();
  }
});
chrome.storage.onChanged.addListener(function () {
  refreshBadge();
});
