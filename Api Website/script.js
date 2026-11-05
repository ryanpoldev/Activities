const API_BASE = "https://www.demonslayer-api.com/api/v1";
const PAGE_SIZE = 8; // cards per page
const FALLBACK_IMG = "img/Isologo.svg";

const proxies = [
  "https://corsproxy.io/?url=",
  "https://api.allorigins.win/raw?url="
];

var elCharList = document.getElementById("characters-list");
var elCharPagination = document.getElementById("characters-pagination");
var elCharSearch = document.getElementById("characters-search");
var elCharClear = document.getElementById("characters-clear");
var elCharCount = document.getElementById("characters-count");

var elStyleList = document.getElementById("styles-list");
var elStylePagination = document.getElementById("styles-pagination");
var elStyleSearch = document.getElementById("styles-search");
var elStyleClear = document.getElementById("styles-clear");
var elStyleCount = document.getElementById("styles-count");

var elModalTitle = document.getElementById("detailModalTitle");
var elModalBody = document.getElementById("detailModalBody");
var modal = new bootstrap.Modal(document.getElementById("detailModal"));

var allCharacters = [];
var filteredCharacters = [];
var charPage = 1;

var allStyles = [];
var filteredStyles = [];
var stylePage = 1;

function escapeHtml(value) {
  if (value == null) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function fixText(text) {
  if (!text) return "";
  return escapeHtml(String(text).replace(/´/g, "'"));
}

function imageTag(src, alt) {
  if (!src) src = FALLBACK_IMG;
  return '<img src="' + escapeHtml(src) + '" alt="' + escapeHtml(alt) + '" loading="lazy" ' +
    'onerror="this.onerror=null;this.src=\'' + FALLBACK_IMG + '\'">';
}

const getJSON = async (url) => {
  var urls = [url];
  for (var i = 0; i < proxies.length; i++) {
    urls.push(proxies[i] + encodeURIComponent(url));
  }

  for (var i = 0; i < urls.length; i++) {
    try {
      const response = await fetch(urls[i]);
      if (!response.ok) continue;
      return await response.json();
    } catch (error) {
      console.log("Failed: " + urls[i]);
    }
  }
  throw new Error("Could not load " + url);
}

const getAll = async (endpoint) => {
  const first = await getJSON(API_BASE + "/" + endpoint);
  var items = first.content;
  var totalPages = 1;
  if (first.pagination) totalPages = first.pagination.totalPages;

  for (var p = 2; p <= totalPages; p++) {
    const next = await getJSON(API_BASE + "/" + endpoint + "?page=" + p);
    items = items.concat(next.content);
  }
  return items;
}

function makePagination(page, totalPages) {
  var html = "";

  var prevDisabled = page == 1 ? " disabled" : "";
  html += '<li class="page-item' + prevDisabled + '"><button class="page-link" data-page="' + (page - 1) + '">&laquo;</button></li>';

  for (var i = 1; i <= totalPages; i++) {
    // only show first, last and the pages around the current one
    if (i == 1 || i == totalPages || (i >= page - 1 && i <= page + 1)) {
      var active = i == page ? " active" : "";
      html += '<li class="page-item' + active + '"><button class="page-link" data-page="' + i + '">' + i + '</button></li>';
    } else if (i == page - 2 || i == page + 2) {
      html += '<li class="page-item disabled"><span class="page-link">&hellip;</span></li>';
    }
  }

  var nextDisabled = page == totalPages ? " disabled" : "";
  html += '<li class="page-item' + nextDisabled + '"><button class="page-link" data-page="' + (page + 1) + '">&raquo;</button></li>';

  return html;
}

function openModal(title, html) {
  elModalTitle.textContent = title;
  elModalBody.innerHTML = html;
  modal.show();
}

function loadingHtml(text) {
  return '<div class="col-12 text-center py-5">' +
    '<div class="spinner-border text-danger" role="status"></div>' +
    '<div class="mt-3 opacity-75">Loading ' + text + '...</div></div>';
}

function errorHtml(retryId) {
  return '<div class="col-12 text-center py-5">' +
    '<p class="mb-3">Could not load data from the API.</p>' +
    '<button class="btn btn-danger" type="button" id="' + retryId + '">Try again</button></div>';
}


function showCharacters() {
  var start = (charPage - 1) * PAGE_SIZE;
  var pageItems = filteredCharacters.slice(start, start + PAGE_SIZE);

  if (pageItems.length == 0) {
    elCharList.innerHTML = '<div class="col-12 text-center py-5 opacity-75">No characters match your search.</div>';
  } else {
    var html = "";
    for (var i = 0; i < pageItems.length; i++) {
      var c = pageItems[i];
      html += '<div class="col">' +
        '<div class="api-card h-100 d-flex flex-column">' +
          '<div class="api-card-img">' + imageTag(c.img, c.name) + '</div>' +
          '<div class="p-3 d-flex flex-column flex-grow-1">' +
            '<h5 class="mb-2">' + escapeHtml(c.name) + '</h5>' +
            '<div class="mb-2 d-flex flex-wrap gap-2">' +
              '<span class="badge text-bg-danger">' + escapeHtml(c.race) + '</span>' +
              (c.gender ? '<span class="badge text-bg-secondary">' + escapeHtml(c.gender) + '</span>' : '') +
              (c.age ? '<span class="badge text-bg-dark border">Age ' + escapeHtml(c.age) + '</span>' : '') +
            '</div>' +
            '<p class="small opacity-75 clamp-3 mb-3">' + fixText(c.description) + '</p>' +
            '<button class="btn btn-outline-light btn-sm mt-auto" type="button" data-id="' + c.id + '">View</button>' +
          '</div>' +
        '</div>' +
      '</div>';
    }
    elCharList.innerHTML = html;
  }


  var totalPages = Math.ceil(filteredCharacters.length / PAGE_SIZE);
  if (filteredCharacters.length <= PAGE_SIZE) {
    elCharPagination.innerHTML = "";
  } else {
    elCharPagination.innerHTML = makePagination(charPage, totalPages);
  }


  var search = elCharSearch.value.trim();
  if (search != "") {
    elCharCount.innerHTML = filteredCharacters.length + ' result(s) for "' + escapeHtml(search) + '" (of ' + allCharacters.length + ')';
  } else {
    elCharCount.innerHTML = allCharacters.length + " total";
  }
}

function filterCharacters() {
  var search = elCharSearch.value.trim().toLowerCase();

  filteredCharacters = allCharacters.filter(function (c) {
    var text = [c.name, c.race, c.gender, c.description, c.quote].join(" ").toLowerCase();
    return text.includes(search);
  });

  charPage = 1;
  showCharacters();
}

function showCharacterDetail(id) {
  var c = allCharacters.find(function (item) {
    return String(item.id) == id;
  });
  if (!c) return;

  var html = '<div class="row g-4">' +
    '<div class="col-12 col-md-5">' +
      '<div class="detail-img">' + imageTag(c.img, c.name) + '</div>' +
    '</div>' +
    '<div class="col-12 col-md-7">' +
      '<dl class="row mb-3">' +
        '<dt class="col-4">Race</dt><dd class="col-8">' + escapeHtml(c.race) + '</dd>' +
        '<dt class="col-4">Gender</dt><dd class="col-8">' + escapeHtml(c.gender || "Unknown") + '</dd>' +
        '<dt class="col-4">Age</dt><dd class="col-8">' + escapeHtml(c.age || "Unknown") + '</dd>' +
      '</dl>' +
      '<p>' + fixText(c.description) + '</p>' +
      (c.quote ? '<blockquote class="quote-box">&ldquo;' + fixText(c.quote) + '&rdquo;</blockquote>' : '') +
    '</div>' +
  '</div>';

  openModal(c.name, html);
}

const getCharacters = async () => {
  elCharList.innerHTML = loadingHtml("characters");
  elCharPagination.innerHTML = "";
  elCharCount.innerHTML = "";

  try {
    allCharacters = await getAll("characters");
    filteredCharacters = allCharacters;
    charPage = 1;
    showCharacters();
  } catch (error) {
    console.log(error);
    elCharList.innerHTML = errorHtml("characters-retry");
    document.getElementById("characters-retry").addEventListener("click", getCharacters);
  }
}


elCharSearch.addEventListener("input", filterCharacters);

elCharClear.addEventListener("click", function () {
  elCharSearch.value = "";
  filterCharacters();
  elCharSearch.focus();
});

elCharPagination.addEventListener("click", function (e) {
  var button = e.target.closest("button[data-page]");
  if (!button) return;

  var target = Number(button.dataset.page);
  var totalPages = Math.ceil(filteredCharacters.length / PAGE_SIZE);
  if (target < 1 || target > totalPages || target == charPage) return;

  charPage = target;
  showCharacters();
  document.getElementById("characters").scrollIntoView({ behavior: "smooth" });
});

elCharList.addEventListener("click", function (e) {
  var button = e.target.closest("[data-id]");
  if (button) showCharacterDetail(button.dataset.id);
});


function showStyles() {
  var start = (stylePage - 1) * PAGE_SIZE;
  var pageItems = filteredStyles.slice(start, start + PAGE_SIZE);

  if (pageItems.length == 0) {
    elStyleList.innerHTML = '<div class="col-12 text-center py-5 opacity-75">No combat styles match your search.</div>';
  } else {
    var html = "";
    for (var i = 0; i < pageItems.length; i++) {
      var s = pageItems[i];
      var userCount = s.combat_style_character ? s.combat_style_character.length : 0;

      html += '<div class="col">' +
        '<div class="api-card h-100 d-flex flex-column">' +
          '<div class="api-card-img api-card-img-wide">' + imageTag(s.img, s.name) + '</div>' +
          '<div class="p-3 d-flex flex-column flex-grow-1">' +
            '<h5 class="mb-2">' + escapeHtml(s.name) + '</h5>' +
            '<p class="small opacity-75 clamp-3 mb-2">' + fixText(s.description) + '</p>' +
            '<p class="small mb-3"><span class="badge text-bg-danger">' + userCount + '</span> user' + (userCount == 1 ? '' : 's') + '</p>' +
            '<button class="btn btn-outline-light btn-sm mt-auto" type="button" data-id="' + s.id + '">View</button>' +
          '</div>' +
        '</div>' +
      '</div>';
    }
    elStyleList.innerHTML = html;
  }


  var totalPages = Math.ceil(filteredStyles.length / PAGE_SIZE);
  if (filteredStyles.length <= PAGE_SIZE) {
    elStylePagination.innerHTML = "";
  } else {
    elStylePagination.innerHTML = makePagination(stylePage, totalPages);
  }


  var search = elStyleSearch.value.trim();
  if (search != "") {
    elStyleCount.innerHTML = filteredStyles.length + ' result(s) for "' + escapeHtml(search) + '" (of ' + allStyles.length + ')';
  } else {
    elStyleCount.innerHTML = allStyles.length + " total";
  }
}

function filterStyles() {
  var search = elStyleSearch.value.trim().toLowerCase();

  filteredStyles = allStyles.filter(function (s) {
    var users = s.combat_style_character || [];
    var userNames = users.map(function (u) { return u.name; });
    var text = [s.name, s.description].concat(userNames).join(" ").toLowerCase();
    return text.includes(search);
  });

  stylePage = 1;
  showStyles();
}

function showStyleDetail(id) {
  var s = allStyles.find(function (item) {
    return String(item.id) == id;
  });
  if (!s) return;

  var users = s.combat_style_character || [];

  var html = '<div class="detail-img detail-img-wide mb-3">' + imageTag(s.img, s.name) + '</div>' +
    '<p>' + fixText(s.description) + '</p>' +
    '<h6 class="mt-4 mb-3">Known users</h6>';

  if (users.length == 0) {
    html += '<p class="opacity-75">No known users.</p>';
  } else {
    html += '<ul class="list-group list-group-flush">';
    for (var i = 0; i < users.length; i++) {
      html += '<li class="list-group-item bg-transparent text-white border-secondary">' +
        '<strong>' + escapeHtml(users[i].name) + '</strong>' +
        '<div class="small opacity-75 clamp-2">' + fixText(users[i].description) + '</div></li>';
    }
    html += '</ul>';
  }

  openModal(s.name, html);
}

const getStyles = async () => {
  elStyleList.innerHTML = loadingHtml("styles");
  elStylePagination.innerHTML = "";
  elStyleCount.innerHTML = "";

  try {
    allStyles = await getAll("combat-styles");
    filteredStyles = allStyles;
    stylePage = 1;
    showStyles();
  } catch (error) {
    console.log(error);
    elStyleList.innerHTML = errorHtml("styles-retry");
    document.getElementById("styles-retry").addEventListener("click", getStyles);
  }
}

elStyleSearch.addEventListener("input", filterStyles);

elStyleClear.addEventListener("click", function () {
  elStyleSearch.value = "";
  filterStyles();
  elStyleSearch.focus();
});

elStylePagination.addEventListener("click", function (e) {
  var button = e.target.closest("button[data-page]");
  if (!button) return;

  var target = Number(button.dataset.page);
  var totalPages = Math.ceil(filteredStyles.length / PAGE_SIZE);
  if (target < 1 || target > totalPages || target == stylePage) return;

  stylePage = target;
  showStyles();
  document.getElementById("styles").scrollIntoView({ behavior: "smooth" });
});

elStyleList.addEventListener("click", function (e) {
  var button = e.target.closest("[data-id]");
  if (button) showStyleDetail(button.dataset.id);
});

getCharacters();
getStyles();
