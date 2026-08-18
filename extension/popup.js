var state = {
  payload: null,
  homeCountry: "CN",
  selectedIso: null,
  viewYear: 0,
  viewMonth: 0,
  weekStart: 0,
  monthSwitch: "dblclick",
};

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function homeDay(payload, home, at) {
  const info = ((payload && payload.countries) || {})[home] || {};
  return localDate(at || new Date(), info.tz || "Asia/Shanghai");
}

function activeIso() {
  if (state.selectedIso) {
    return state.selectedIso;
  }
  return homeDay(state.payload, state.homeCountry);
}

function isTodayView() {
  return !state.selectedIso || state.selectedIso === homeDay(state.payload, state.homeCountry);
}

function homeWorkdays() {
  const info = ((state.payload && state.payload.countries) || {})[state.homeCountry] || {};
  return info.workdays || [];
}

function renderTodayPanel() {
  const iso = homeDay(state.payload, state.homeCountry);
  const rest = isHomeRestDay(state.payload, state.homeCountry, iso);
  const info = ((state.payload && state.payload.countries) || {})[state.homeCountry] || {};
  document.getElementById("homeChip").textContent =
    "主日历：" + zhCountryName(state.homeCountry, info.name || state.homeCountry);
  document.getElementById("heroDate").textContent = formatZhDate(iso);
  const lunarEl = document.getElementById("heroLunar");
  if (state.homeCountry === "CN") {
    const lunar = lunarFullLabel(iso);
    lunarEl.textContent = lunar ? "农历" + lunar : "";
    lunarEl.hidden = !lunar;
  } else {
    lunarEl.textContent = "";
    lunarEl.hidden = true;
  }
  document.getElementById("heroStatus").textContent = rest ? "今天休假" : "今天上班";
  const panel = document.getElementById("workPanel");
  panel.classList.toggle("rest", rest);
  panel.classList.toggle("work", !rest);
}

function renderNextHolidays() {
  if (!state.payload) {
    return;
  }
  const nexts = nextHolidaysAfter(state.payload, activeIso(), state.homeCountry, 3);
  document.getElementById("nextHolidays").textContent = upcomingHolidaySentence(nexts);
}

function renderCal() {
  document.getElementById("calTitle").textContent = state.viewYear + "年" + state.viewMonth + "月";
  const week = weekLabels(state.weekStart);
  let html = "";
  week.forEach(function (label, index) {
    html += '<div class="dow' + (isWeekHeaderWeekend(index, state.weekStart) ? " wk" : "") + '">' + label + "</div>";
  });
  const selected = activeIso();
  const today = homeDay(state.payload, state.homeCountry);
  const workdays = homeWorkdays();
  monthCells(state.viewYear, state.viewMonth, state.weekStart).forEach(function (cell) {
    const shift = workdays.indexOf(cell.iso) >= 0;
    const fest = homeHolidayName(state.payload, state.homeCountry, cell.iso);
    const lunar = state.homeCountry === "CN" ? lunarLabel(cell.iso) : "";
    const cls = ["cell"];
    if (!cell.inMonth) {
      cls.push("out");
    }
    if (cell.weekend) {
      cls.push("wk");
    }
    if (fest) {
      cls.push("fest");
    } else if (lunar && !shift) {
      cls.push("lunar");
    }
    if (shift) {
      cls.push("shift");
    }
    if (cell.iso === today) {
      cls.push("today");
    }
    if (cell.iso === selected) {
      cls.push("on");
    }
    const sub = shift ? "班" : fest || lunar;
    html +=
      '<button type="button" class="' +
      cls.join(" ") +
      '" data-day="' +
      cell.iso +
      '"><span class="n">' +
      cell.day +
      "</span>" +
      (sub ? '<span class="s">' + escapeHtml(sub) + "</span>" : "") +
      "</button>";
  });
  document.getElementById("calGrid").innerHTML = html;
}

function worldRowHtml(row) {
  return (
    '<div class="row"><span class="flag">' +
    row.code +
    '</span><span class="name">' +
    escapeHtml(row.zhName || row.countryName) +
    '</span><span class="meta">' +
    escapeHtml(row.name || "") +
    "</span></div>"
  );
}

function closeWorldLayer() {
  const layer = document.getElementById("worldLayer");
  if (layer) {
    layer.hidden = true;
  }
}

function openWorldLayer() {
  document.getElementById("worldLayer").hidden = false;
}

function renderWorld() {
  const rows = worldHolidayList(state.payload, {
    homeCountry: state.homeCountry,
    useLocalToday: false,
    dateStr: activeIso(),
  });
  const title = document.getElementById("worldTitle");
  const list = document.getElementById("worldList");
  const more = document.getElementById("worldMore");
  const sheetTitle = document.getElementById("worldSheetTitle");
  const sheetList = document.getElementById("worldSheetList");
  title.textContent = rows.length
    ? (isTodayView() ? "当天还有 " : "这天还有 ") + rows.length + " 个国家在休假"
    : "这一天没有其他国家在休假";
  if (!rows.length) {
    list.innerHTML = "";
    list.hidden = true;
    more.hidden = true;
    closeWorldLayer();
    return;
  }
  list.hidden = false;
  list.innerHTML = worldRowHtml(rows[0]);
  more.hidden = rows.length <= 1;
  sheetTitle.textContent = title.textContent;
  sheetList.innerHTML = rows.map(worldRowHtml).join("");
}

function renderYearNote() {
  const note = document.getElementById("yearNote");
  const localYear = parseDay(homeDay(state.payload, state.homeCountry)).getUTCFullYear();
  const dataYear = state.payload && state.payload.year;
  if (dataYear && dataYear !== localYear) {
    note.textContent = "数据为 " + dataYear + " 年";
    note.hidden = false;
  } else {
    note.textContent = "";
    note.hidden = true;
  }
}

function holidayYear() {
  if (state.payload && state.payload.year) {
    return state.payload.year;
  }
  return parseDay(homeDay(state.payload, state.homeCountry)).getUTCFullYear();
}

function closeRestMenu() {
  const menu = document.getElementById("restMenu");
  const btn = document.getElementById("calRest");
  if (menu) {
    menu.hidden = true;
  }
  if (btn) {
    btn.setAttribute("aria-expanded", "false");
  }
}

function openRestMenu() {
  renderRestMenu();
  const menu = document.getElementById("restMenu");
  const btn = document.getElementById("calRest");
  menu.hidden = false;
  btn.setAttribute("aria-expanded", "true");
}

function toggleRestMenu() {
  const menu = document.getElementById("restMenu");
  if (menu.hidden) {
    openRestMenu();
  } else {
    closeRestMenu();
  }
}

function renderRestMenu() {
  const menu = document.getElementById("restMenu");
  if (!menu) {
    return;
  }
  if (!state.payload) {
    menu.innerHTML = '<p class="empty">假期加载中…</p>';
    return;
  }
  const items = yearHolidayList(state.payload, state.homeCountry, holidayYear());
  if (!items.length) {
    menu.innerHTML = '<p class="empty">今年没有可查的休假</p>';
    return;
  }
  menu.innerHTML = items
    .map(function (item) {
      return (
        '<button type="button" data-holiday="' +
        item.date +
        '"><span class="name">' +
        escapeHtml(item.name) +
        '</span><span class="when">' +
        escapeHtml(holidayRangeLabel(item.start, item.end)) +
        "</span></button>"
      );
    })
    .join("");
}

function goHoliday(iso) {
  state.selectedIso = iso;
  const p = parseDay(iso);
  state.viewYear = p.getUTCFullYear();
  state.viewMonth = p.getUTCMonth() + 1;
  closeRestMenu();
  renderAll();
}

function dayIsOutOfView(iso) {
  const p = parseDay(iso);
  return p.getUTCFullYear() !== state.viewYear || p.getUTCMonth() + 1 !== state.viewMonth;
}

function selectCalendarDay(iso, switchMonth) {
  state.selectedIso = iso;
  if (switchMonth) {
    const p = parseDay(iso);
    state.viewYear = p.getUTCFullYear();
    state.viewMonth = p.getUTCMonth() + 1;
  }
  renderAll();
}

var monthSwitchTimer = 0;

function onCalDayClick(iso) {
  const out = dayIsOutOfView(iso);
  if (monthSwitchTimer) {
    clearTimeout(monthSwitchTimer);
    monthSwitchTimer = 0;
  }
  if (!out || state.monthSwitch === "click") {
    selectCalendarDay(iso, out);
    return;
  }
  monthSwitchTimer = setTimeout(function () {
    monthSwitchTimer = 0;
    selectCalendarDay(iso, false);
  }, 280);
}

function onCalDayDblClick(iso) {
  if (state.monthSwitch !== "dblclick" || !dayIsOutOfView(iso)) {
    return;
  }
  if (monthSwitchTimer) {
    clearTimeout(monthSwitchTimer);
    monthSwitchTimer = 0;
  }
  selectCalendarDay(iso, true);
}

function renderAll() {
  renderYearNote();
  renderTodayPanel();
  renderNextHolidays();
  renderCal();
  renderRestMenu();
  if (state.payload) {
    renderWorld();
  }
}

function shiftView(delta) {
  state.viewMonth += delta;
  if (state.viewMonth < 1) {
    state.viewMonth = 12;
    state.viewYear -= 1;
  } else if (state.viewMonth > 12) {
    state.viewMonth = 1;
    state.viewYear += 1;
  }
  renderAll();
}

function goToday() {
  state.selectedIso = null;
  const today = homeDay(state.payload, state.homeCountry);
  const p = parseDay(today);
  state.viewYear = p.getUTCFullYear();
  state.viewMonth = p.getUTCMonth() + 1;
  renderAll();
}

function loadSettings() {
  const defaults = {
    homeCountry: "CN",
    workStart: "09:00",
    workEnd: "18:00",
    lunchStart: "12:00",
    lunchMinutes: 90,
    workColor: "#ff8a2b",
    weekStart: "sun",
    monthSwitch: "dblclick",
  };
  return new Promise(function (resolve) {
    function finish(items) {
      resolve(items || defaults);
    }
    function fromLocal() {
      try {
        chrome.storage.local.get(defaults, finish);
      } catch (err) {
        finish(defaults);
      }
    }
    try {
      chrome.storage.sync.get(defaults, function (items) {
        if (chrome.runtime.lastError) {
          fromLocal();
          return;
        }
        finish(items);
      });
    } catch (err) {
      fromLocal();
    }
  });
}

function applyLoadedSettings(saved) {
  state.homeCountry = saved.homeCountry || "CN";
  if (state.payload && state.payload.countries && !state.payload.countries[state.homeCountry]) {
    state.homeCountry = "CN";
  }
  applyWorkHours({
    start: saved.workStart || "09:00",
    end: saved.workEnd || "18:00",
    lunchStart: saved.lunchStart || "12:00",
    lunchMinutes: saved.lunchMinutes,
  });
  applyWorkColor(saved.workColor || "#ff8a2b");
  state.weekStart = normalizeWeekStart(saved.weekStart);
  state.monthSwitch = normalizeMonthSwitch(saved.monthSwitch);
}

function openSettingsPage() {
  const url = chrome.runtime.getURL("options.html");
  if (chrome.windows && chrome.windows.create) {
    chrome.windows.create({
      url: url,
      type: "popup",
      width: 440,
      height: 720,
      focused: true,
    });
    return;
  }
  chrome.runtime.openOptionsPage();
}

document.getElementById("calPrev").addEventListener("click", function () {
  shiftView(-1);
});
document.getElementById("calNext").addEventListener("click", function () {
  shiftView(1);
});
document.getElementById("calToday").addEventListener("click", function () {
  closeRestMenu();
  goToday();
});
document.getElementById("calRest").addEventListener("click", function (e) {
  e.stopPropagation();
  toggleRestMenu();
});
document.getElementById("restMenu").addEventListener("click", function (e) {
  const btn = e.target.closest("[data-holiday]");
  if (!btn) {
    return;
  }
  goHoliday(btn.getAttribute("data-holiday"));
});
document.getElementById("calGrid").addEventListener("click", function (e) {
  const btn = e.target.closest("[data-day]");
  if (!btn) {
    return;
  }
  onCalDayClick(btn.getAttribute("data-day"));
});
document.getElementById("calGrid").addEventListener("dblclick", function (e) {
  const btn = e.target.closest("[data-day]");
  if (!btn) {
    return;
  }
  e.preventDefault();
  onCalDayDblClick(btn.getAttribute("data-day"));
});
document.getElementById("setBtn").addEventListener("click", function () {
  openSettingsPage();
});
document.getElementById("worldMore").addEventListener("click", function (e) {
  e.stopPropagation();
  openWorldLayer();
});
document.getElementById("worldLayer").addEventListener("click", function (e) {
  if (!e.target.closest("#worldSheet")) {
    closeWorldLayer();
  }
});
document.addEventListener("click", function (e) {
  if (!e.target.closest(".rest-wrap")) {
    closeRestMenu();
  }
});
document.addEventListener("keydown", function (e) {
  if (e.key === "Escape") {
    closeWorldLayer();
    closeRestMenu();
  }
});

chrome.storage.onChanged.addListener(function () {
  loadSettings().then(function (saved) {
    applyLoadedSettings(saved);
    renderAll();
    tickWorkTimer();
  });
});

function initViewIfNeeded() {
  if (state.viewYear) {
    return;
  }
  const today = homeDay(state.payload, state.homeCountry);
  const p = parseDay(today);
  state.viewYear = p.getUTCFullYear();
  state.viewMonth = p.getUTCMonth() + 1;
}

function paintShell() {
  initViewIfNeeded();
  renderTodayPanel();
  renderCal();
}

function holidayDataUrl() {
  try {
    if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.getURL) {
      return chrome.runtime.getURL("data/holidays.json");
    }
  } catch (err) {}
  return "data/holidays.json";
}

function loadHolidays() {
  const url = holidayDataUrl();
  if (typeof fetch === "function") {
    return fetch(url).then(function (resp) {
      if (!resp.ok) {
        throw new Error("HTTP " + resp.status);
      }
      return resp.json();
    });
  }
  return new Promise(function (resolve, reject) {
    const req = new XMLHttpRequest();
    req.open("GET", url, true);
    req.onreadystatechange = function () {
      if (req.readyState !== 4) {
        return;
      }
      if (req.status !== 200) {
        reject(new Error("HTTP " + req.status));
        return;
      }
      try {
        resolve(JSON.parse(req.responseText));
      } catch (err) {
        reject(err);
      }
    };
    req.onerror = function () {
      reject(new Error("network"));
    };
    req.send();
  });
}

function showLoadError() {
  const nexts = document.getElementById("nextHolidays");
  const title = document.getElementById("worldTitle");
  if (nexts) {
    nexts.textContent = "还没有假期数据";
  }
  if (title) {
    title.textContent = "假期数据加载失败";
  }
}

function revealWorkRail() {
  if (!document.getElementById("workSlogan")) {
    return;
  }
  document.body.classList.add("with-work");
  tickWorkTimer();
  if (!window.__workTimer) {
    window.__workTimer = setInterval(tickWorkTimer, 1000);
  }
}

function boot() {
  try {
    paintShell();
  } catch (err) {
    showLoadError();
  }
  revealWorkRail();
  loadHolidays()
    .then(function (payload) {
      state.payload = payload;
      return loadSettings();
    })
    .then(function (saved) {
      applyLoadedSettings(saved);
      initViewIfNeeded();
      renderAll();
      tickWorkTimer();
    })
    .catch(showLoadError);
  loadSettings().then(function (saved) {
    applyLoadedSettings(saved);
    try {
      paintShell();
    } catch (err) {}
    tickWorkTimer();
  });
}

boot();
