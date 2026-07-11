// Static trip data is loaded from data.js before this file.

const state = {
  places: [],
  cities: [],
  categories: [],
  types: [],
  districts: [],
  search: ""
};

const els = {
  tabs: document.querySelectorAll(".tab"),
  itineraryView: document.querySelector("#itineraryView"),
  placesView: document.querySelector("#placesView"),
  itineraryList: document.querySelector("#itineraryList"),
  cityFilters: document.querySelector("#cityFilters"),
  categoryFilters: document.querySelector("#categoryFilters"),
  typeFilters: document.querySelector("#typeFilters"),
  districtFilters: document.querySelector("#districtFilters"),
  placeSearch: document.querySelector("#placeSearch"),
  placeList: document.querySelector("#placeList"),
  mapFrame: document.querySelector("#mapFrame"),
  mapTitle: document.querySelector("#mapTitle"),
  mapSubtitle: document.querySelector("#mapSubtitle"),
  mapExternalLink: document.querySelector("#mapExternalLink"),
  mobileMapBar: document.querySelector("#mobileMapBar"),
  mobileMapContext: document.querySelector("#mobileMapContext"),
  mobileMapTitle: document.querySelector("#mobileMapTitle"),
  mobileMapLink: document.querySelector("#mobileMapLink"),
  mobileMapPreviewToggle: document.querySelector("#mobileMapPreviewToggle"),
  mobileMapPreview: document.querySelector("#mobileMapPreview"),
  mobileMapPreviewClose: document.querySelector("#mobileMapPreviewClose"),
  mobilePreviewTitle: document.querySelector("#mobilePreviewTitle"),
  mobileMapFrame: document.querySelector("#mobileMapFrame")
};

function googleSearchUrl(query) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

function googleEmbedUrl(query) {
  return `https://www.google.com/maps?q=${encodeURIComponent(query)}&output=embed`;
}

function focusMap(title, query, subtitle = "") {
  const searchUrl = googleSearchUrl(query);
  const embedUrl = googleEmbedUrl(query);

  els.mapTitle.textContent = title;
  els.mapSubtitle.textContent = subtitle || query;
  els.mapFrame.src = embedUrl;
  els.mapExternalLink.href = searchUrl;

  els.mobileMapBar.hidden = false;
  els.mobileMapContext.textContent = subtitle || "地圖參考";
  els.mobileMapTitle.textContent = title;
  els.mobileMapLink.href = searchUrl;
  els.mobilePreviewTitle.textContent = title;
  els.mobileMapFrame.src = embedUrl;
}

function setMobileMapPreview(open) {
  els.mobileMapPreview.hidden = !open;
  els.mobileMapPreviewToggle.setAttribute("aria-expanded", String(open));
  els.mobileMapPreviewToggle.textContent = open ? "收合" : "預覽";
}

function districtSortValue(label) {
  if (label === "全部") return -1;

  const milanIndex = MILAN_DISTRICT_ORDER.indexOf(label);
  if (milanIndex > -1) {
    return 30 + milanIndex;
  }

  const match = label.match(/^(\d{1,2})區$/);
  if (match) {
    return Number(match[1]);
  }

  if (label.startsWith("近郊")) return 98;
  if (label === "未分區") return 99;
  return 97;
}

function citySortValue(city) {
  const index = CITY_ORDER.indexOf(city);
  return index === -1 ? 99 : index;
}

function formatDistrictLabel(district) {
  return district;
}

function formatTypeLabel(type) {
  return type.replace("早午餐/咖啡", "咖啡").replace("/早午餐", "").trim();
}

function typeSortValue(type) {
  if (type === "全部") return -1;
  if (type === "待補") return 99;
  return 50;
}

function categorySortValue(category) {
  const index = CATEGORY_ORDER.indexOf(category);
  return index === -1 ? 99 : index;
}

function comparePlaces(a, b) {
  return (
    citySortValue(a.city) - citySortValue(b.city) ||
    a.city.localeCompare(b.city, "zh-Hant") ||
    districtSortValue(a.district) - districtSortValue(b.district) ||
    a.district.localeCompare(b.district, "zh-Hant") ||
    categorySortValue(a.category) - categorySortValue(b.category) ||
    typeSortValue(a.displayType) - typeSortValue(b.displayType) ||
    a.displayType.localeCompare(b.displayType, "zh-Hant") ||
    a.originalIndex - b.originalIndex
  );
}

function linkStops(text, stops) {
  const placeholders = [];
  const normalizedStops = stops.map((stop) =>
    Array.isArray(stop) ? { label: stop[0], query: stop[1] } : stop
  );
  const sortedStops = normalizedStops.sort((a, b) => b.label.length - a.label.length);
  let linked = text;

  sortedStops.forEach(({ label, query }, index) => {
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(escaped, "g");
    const token = `__MAP_LINK_${index}__`;

    placeholders.push({
      token,
      html: `<button class="inline-map-link" type="button" data-title="${label}" data-query="${query}">${label}</button>`
    });

    linked = linked.replace(pattern, token);
  });

  placeholders.forEach(({ token, html }) => {
    linked = linked.replaceAll(token, html);
  });

  return linked;
}

function renderItinerary(days) {
  els.itineraryList.innerHTML = days
    .map((day) => {
      const dateMatch = day.title.match(/^\d+\/\d+（[^）]+）/);
      const date = dateMatch ? dateMatch[0].trim() : day.title;
      const heading = `${date} ${day.headline}`.trim();
      const overview = day.overview.map((item) => `<li>${linkStops(item, day.stops)}</li>`).join("");
      const notes = day.notes.map((item) => `<li>${linkStops(item, day.stops)}</li>`).join("");

      return `
        <article class="day-card">
          <div class="day-summary">
            <h3>${heading}</h3>
          </div>
          <div class="day-body">
            <section class="detail-block">
              <h4>行程概要</h4>
              <ul>${overview}</ul>
            </section>
            ${notes ? `<section class="detail-block note-block"><h4>注意事項</h4><ul>${notes}</ul></section>` : ""}
          </div>
        </article>
      `;
    })
    .join("");

  els.itineraryList.querySelectorAll(".inline-map-link").forEach((button) => {
    button.addEventListener("click", () => {
      focusMap(button.dataset.title, button.dataset.query, "行程安排中的地點");
    });
  });
}

function renderFilters() {
  const cities = ["全部", ...new Set(state.places.map((place) => place.city).sort((a, b) => citySortValue(a) - citySortValue(b) || a.localeCompare(b, "zh-Hant")))];
  els.cityFilters.innerHTML = cities
    .map((city) => {
      const active = city === "全部" ? state.cities.length === 0 : state.cities.includes(city);
      return `<button class="filter ${active ? "is-active" : ""}" type="button" data-city="${city}">${city}</button>`;
    })
    .join("");

  els.cityFilters.querySelectorAll(".filter").forEach((button) => {
    button.addEventListener("click", () => {
      const { city } = button.dataset;
      if (city === "全部") {
        state.cities = [];
        state.districts = [];
      } else if (state.cities.includes(city)) {
        state.cities = state.cities.filter((item) => item !== city);
      } else {
        state.cities = [...state.cities, city];
      }
      if (state.cities.length === 0) {
        state.districts = [];
      }
      const validDistricts = new Set(
        state.places
          .filter((place) => state.cities.length === 0 || state.cities.includes(place.city))
          .map((place) => place.district)
      );
      state.districts = state.districts.filter((district) => validDistricts.has(district));
      renderFilters();
      renderPlaces();
    });
  });

  const filters = ["全部", ...CATEGORY_ORDER];
  els.categoryFilters.innerHTML = filters
    .map((category) => {
      const active = category === "全部" ? state.categories.length === 0 : state.categories.includes(category);
      return `<button class="filter ${active ? "is-active" : ""}" type="button" data-category="${category}">${category}</button>`;
    })
    .join("");

  els.categoryFilters.querySelectorAll(".filter").forEach((button) => {
    button.addEventListener("click", () => {
      const { category } = button.dataset;
      if (category === "全部") {
        state.categories = [];
        state.types = [];
      } else if (state.categories.includes(category)) {
        state.categories = state.categories.filter((item) => item !== category);
      } else {
        state.categories = [...state.categories, category];
      }
      const validTypes = new Set(
        state.places
          .filter((place) => state.categories.length === 0 || state.categories.includes(place.category))
          .map((place) => place.displayType)
      );
      state.types = state.types.filter((type) => validTypes.has(type));
      renderFilters();
      renderPlaces();
    });
  });

  const typeSource =
    state.categories.length > 0
      ? state.places.filter((place) => state.categories.includes(place.category))
      : [];
  const types = [
    "全部",
    ...new Set(
      typeSource
        .map((place) => place.displayType)
        .filter((type) => type && type !== "待補")
        .sort((a, b) => typeSortValue(a) - typeSortValue(b) || a.localeCompare(b, "zh-Hant"))
    )
  ];

  els.typeFilters.innerHTML =
    state.categories.length === 0
      ? ""
      : types
          .map((type) => {
            const active = type === "全部" ? state.types.length === 0 : state.types.includes(type);
            return `<button class="filter sub-filter ${active ? "is-active" : ""}" type="button" data-type="${type}">${type}</button>`;
          })
          .join("");

  els.typeFilters.querySelectorAll(".filter").forEach((button) => {
    button.addEventListener("click", () => {
      const { type } = button.dataset;
      if (type === "全部") {
        state.types = [];
      } else if (state.types.includes(type)) {
        state.types = state.types.filter((item) => item !== type);
      } else {
        state.types = [...state.types, type];
      }
      renderFilters();
      renderPlaces();
    });
  });

  const districtSource =
    state.cities.length > 0
      ? state.places.filter((place) => state.cities.includes(place.city))
      : [];
  const districts = ["全部", ...new Set(districtSource.map((place) => place.district).sort((a, b) => districtSortValue(a) - districtSortValue(b) || a.localeCompare(b, "zh-Hant")))];
  els.districtFilters.innerHTML =
    state.cities.length === 0
      ? ""
      : districts
          .map((district) => {
            const active = district === "全部" ? state.districts.length === 0 : state.districts.includes(district);
            return `<button class="filter ${active ? "is-active" : ""}" type="button" data-district="${district}">${formatDistrictLabel(district)}</button>`;
          })
          .join("");

  els.districtFilters.querySelectorAll(".filter").forEach((button) => {
    button.addEventListener("click", () => {
      const { district } = button.dataset;
      if (district === "全部") {
        state.districts = [];
      } else if (state.districts.includes(district)) {
        state.districts = state.districts.filter((item) => item !== district);
      } else {
        state.districts = [...state.districts, district];
      }
      renderFilters();
      renderPlaces();
    });
  });
}

function renderPlaces() {
  const needle = state.search.trim().toLowerCase();
  const places = state.places.filter((place) => {
    const matchCity = state.cities.length === 0 || state.cities.includes(place.city);
    const matchCategory = state.categories.length === 0 || state.categories.includes(place.category);
    const matchType = state.types.length === 0 || state.types.includes(place.displayType);
    const matchDistrict = state.districts.length === 0 || state.districts.includes(place.district);
    const haystack = `${place.name} ${place.city} ${place.type} ${place.displayType} ${place.displayDistrict} ${place.note} ${place.summary}`.toLowerCase();
    const matchSearch = !needle || haystack.includes(needle);
    return matchCity && matchCategory && matchType && matchDistrict && matchSearch;
  }).sort(comparePlaces);

  if (!places.length) {
    els.placeList.innerHTML = `<p class="empty">沒有符合條件的地點。</p>`;
    return;
  }

  els.placeList.innerHTML = places
    .map(
      (place, index) => `
        <article class="place-card" tabindex="0" role="button" data-place-index="${index}">
          <h3>${place.name}</h3>
          <p class="district-label">${place.city} / ${place.displayDistrict}</p>
          <div class="meta-row">
            <span class="tag">${place.category}</span>
            ${place.displayType !== "待補" ? `<span class="tag">${place.displayType}</span>` : ""}
            ${place.price !== "待補" ? `<span class="tag">${place.price}</span>` : ""}
          </div>
          ${place.summary ? `<p class="place-summary">${place.summary}</p>` : ""}
        </article>
      `
    )
    .join("");

  els.placeList.querySelectorAll("[data-place-index]").forEach((card) => {
    const updateMap = () => {
      const place = places[Number(card.dataset.placeIndex)];
      const subtitle = place.displayType !== "待補" ? `${place.category} / ${place.displayType}` : place.category;
      focusMap(place.name, place.query, subtitle);
    };
    card.addEventListener("click", updateMap);
    card.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        updateMap();
      }
    });
  });
}

function wireTabs() {
  els.tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      els.tabs.forEach((item) => item.classList.remove("is-active"));
      tab.classList.add("is-active");
      const isItinerary = tab.dataset.view === "itinerary";
      els.itineraryView.classList.toggle("is-active", isItinerary);
      els.placesView.classList.toggle("is-active", !isItinerary);
    });
  });
}

function wireMobileMap() {
  els.mobileMapPreviewToggle.addEventListener("click", () => {
    setMobileMapPreview(els.mobileMapPreview.hidden);
  });
  els.mobileMapPreviewClose.addEventListener("click", () => {
    setMobileMapPreview(false);
  });
}

async function init() {
  wireTabs();
  wireMobileMap();
  els.placeSearch.addEventListener("input", (event) => {
    state.search = event.target.value;
    renderPlaces();
  });

  state.places = PLACES.map((place, index) => ({
    ...place,
    originalIndex: place.originalIndex ?? index,
    displayType: place.displayType || formatTypeLabel(place.type),
    displayDistrict: place.displayDistrict || formatDistrictLabel(place.district),
    query: place.query || (place.note ? `${place.name} ${place.note}` : `${place.name} ${place.city}`),
    summary: place.summary || ""
  }));
  renderItinerary(ITINERARY_DAYS);
  renderFilters();
  renderPlaces();
}

async function fetchTextFile(candidates) {
  for (const path of candidates) {
    const response = await fetch(`${path}?v=${DATA_VERSION}`);
    if (response.ok) {
      return response.text();
    }
  }

  throw new Error(`Unable to load any of: ${candidates.join(", ")}`);
}

init().catch((error) => {
  console.error(error);
  els.itineraryList.innerHTML = `<p class="empty">網站資料讀取失敗，請確認行程與清單資料檔已一併上傳。</p>`;
});
