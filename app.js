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
  mapExternalLink: document.querySelector("#mapExternalLink")
};

function googleSearchUrl(query) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

function googleEmbedUrl(query) {
  return `https://www.google.com/maps?q=${encodeURIComponent(query)}&output=embed`;
}

function focusMap(title, query, subtitle = "") {
  els.mapTitle.textContent = title;
  els.mapSubtitle.textContent = subtitle || query;
  els.mapFrame.src = googleEmbedUrl(query);
  els.mapExternalLink.href = googleSearchUrl(query);
}

function parseItinerary(markdown) {
  const start = markdown.indexOf("## 逐日行程");
  const end = markdown.indexOf("## 米其林三星");
  const body = markdown.slice(start, end > -1 ? end : markdown.length);
  const chunks = body.split(/\n### /).slice(1);

  return chunks.map((chunk) => {
    const lines = chunk.trim().split("\n");
    const title = lines.shift().trim();
    const guide = ITINERARY_GUIDE[title];
    if (guide) {
      return {
        title,
        headline: guide.headline,
        overview: guide.overview,
        notes: guide.notes,
        stops: guide.links
      };
    }

    return {
      title,
      headline: title.replace(/^([^｜]+)｜?/, "").trim() || title,
      overview: [],
      notes: [],
      stops: ITINERARY_STOPS[title] || []
    };
  });
}

function parsePlaces(markdown) {
  const rows = [];
  let category = "";

  markdown.split("\n").forEach((line) => {
    if (line.startsWith("## ")) {
      category = line.replace("## ", "").trim();
      return;
    }
    if (!line.startsWith("- ") || !CATEGORY_ORDER.includes(category)) {
      return;
    }

    const raw = line.slice(2);
    const [namePart, typePart = "", pricePart = "", notePart = ""] = raw.split(" | ");
    const name = namePart.replaceAll("\\|", "|").replaceAll("\\u0026", "&");
    const type = typePart.replace("類型：", "").trim() || "待補";
    const price = pricePart.replace("Google 價格：", "").trim() || "待補";
    const note = notePart.replace("備註：", "").trim();
    const city = CITY_LOOKUP[name] || "巴黎";
    const query = note ? `${name} ${note}` : `${name} ${city}`;
    const district = DISTRICT_LOOKUP[name] || inferParisDistrict(note);
    const normalizedType = type.replaceAll("\\u0026", "&");

    rows.push({
      name,
      city,
      category,
      type: normalizedType,
      displayType: formatTypeLabel(normalizedType),
      price,
      note: note.replaceAll("\\u0026", "&"),
      district,
      displayDistrict: formatDistrictLabel(district),
      query,
      summary: ""
    });
  });

  return rows;
}

function inferParisDistrict(note) {
  const postal = note.match(/75(\d{3})/);
  if (postal) {
    const districtNumber = Number(postal[1]);
    if (districtNumber >= 1 && districtNumber <= 20) {
      return `${districtNumber}區`;
    }
  }

  return "未分區";
}

function districtSortValue(label) {
  if (label === "全部") return -1;

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

function pickDistrictLead(district) {
  if (/^\d{1,2}區$/.test(district)) {
    return `巴黎${district}的`;
  }
  if (district.startsWith("近郊")) {
    return "巴黎近郊的";
  }
  return "巴黎的";
}

function normalizeTypeLabel(type) {
  return type.replace("/早午餐", "").replace("/小酒館", "").replace("/酒館", "").trim();
}

function createPlaceSummary(place) {
  if (PLACE_SUMMARY_OVERRIDES[place.name]) {
    return PLACE_SUMMARY_OVERRIDES[place.name];
  }

  const lead = pickDistrictLead(place.district);
  const type = normalizeTypeLabel(place.type);

  if (place.category === "早午餐") {
    if (type.includes("麵包")) return `${lead}${type}選項，適合排進早晨路線，現場吃或外帶都方便。`;
    if (type.includes("甜點")) return `${lead}${type}店，適合安排早餐後順吃，或當成散步中的甜點停靠點。`;
    if (type.includes("咖啡")) return `${lead}${type}店，適合早上坐下慢慢吃，也能和附近散步行程一起安排。`;
    return `${lead}${type || "早午餐"}店，適合當成一天開始的第一站。`;
  }

  if (place.category === "午晚餐") {
    if (type.includes("法式")) return `${lead}${type}餐廳，適合排成一頓完整正餐，感受比較典型的巴黎用餐節奏。`;
    if (type.includes("義式")) return `${lead}${type}餐廳，適合在市區行程中安排一頓氣氛感比較強的午晚餐。`;
    if (/(中式|越式|日式|韓式|泰式|台式|川味|拉麵)/.test(type)) return `${lead}${type}選項，適合在巴黎行程中換個口味吃得更熟悉一點。`;
    if (/(市集|熟食|食材)/.test(type)) return `${lead}${type}型地點，適合邊逛邊吃，或買些東西當行程中的補給。`;
    if (type.includes("酒吧")) return `${lead}${type}空間，適合正餐後續攤，或晚一點來小坐一下。`;
    return `${lead}${type || "正餐"}選項，適合安排在附近主要行程前後當一頓完整用餐。`;
  }

  if (place.category === "咖啡") {
    if (type.includes("精品")) return `${lead}${type}，適合行程中穿插休息，也很適合外帶一杯邊走邊逛。`;
    if (type.includes("經典")) return `${lead}${type}，重點不只在咖啡，也在整體老巴黎氛圍與停留感。`;
    return `${lead}${type || "咖啡館"}，適合在景點與景點之間坐下休息一下。`;
  }

  if (place.category === "飲料") {
    return `${lead}${type || "飲料"}選項，適合逛街途中順手補一杯，或當餐後小休息。`;
  }

  if (place.category === "酒吧") {
    if (type.includes("葡萄酒")) return `${lead}${type}，適合晚上慢慢喝一杯，也很適合當成晚餐後的第二站。`;
    return `${lead}${type || "酒吧"}，適合夜間小坐，或在附近行程結束後延伸安排。`;
  }

  if (place.category === "景點") {
    if (type.includes("美術館")) return `${lead}${type}，適合保留 1 至 2 小時慢慢看，建築與館藏通常都值得停留。`;
    if (type.includes("博物館")) return `${lead}${type}，適合搭配附近街區一起安排，讓行程多一點室內深度。`;
    if (type.includes("教堂")) return `${lead}${type}，重點通常在空間氛圍與建築細節，適合順路進去看看。`;
    if (type.includes("公園") || type.includes("花園")) return `${lead}${type}，很適合留一段散步或休息時間，不一定要排得很趕。`;
    if (type.includes("廣場")) return `${lead}${type}，適合當散步節點、拍照點，或與周邊景點連成一路。`;
    if (type.includes("地標")) return `${lead}${type}，屬於來巴黎很容易排進去的經典代表點。`;
    if (type.includes("歷史")) return `${lead}${type}，適合喜歡法國歷史脈絡的人安排進主要路線中。`;
    if (type.includes("圖書館")) return `${lead}${type}，重點常在空間與館內細節，適合當作靜態景點穿插。`;
    if (type.includes("表演")) return `${lead}${type}，適合安排成夜間節目，和白天觀光做出節奏差異。`;
    if (type.includes("住宿")) return `${lead}${type}，位置主要影響你每天移動節奏，適合當作附近行程的出發或收尾點。`;
    return `${lead}${type || "景點"}，適合與同區行程一起安排，當成順路停留的重點點位。`;
  }

  if (place.category === "購物") {
    if (type.includes("百貨")) return `${lead}${type}，適合集中採買，也能順便安排建築或頂樓景觀。`;
    if (type.includes("香氛")) return `${lead}${type}店，適合慢慢試聞與挑選，通常比一般購物點更需要留點時間。`;
    if (type.includes("服飾") || type.includes("選物")) return `${lead}${type}店，適合排在散步購物路線中，順著街區慢慢逛。`;
    return `${lead}${type || "購物"}地點，適合放進同區的逛街路線一起安排。`;
  }

  return `${lead}${type || place.category}地點，適合與附近行程一起安排。`;
}

function linkStops(text, stops) {
  const placeholders = [];
  const sortedStops = [...stops].sort((a, b) => b[0].length - a[0].length);
  let linked = text;

  sortedStops.forEach(([label, query], index) => {
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
  });

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

async function init() {
  wireTabs();
  els.placeSearch.addEventListener("input", (event) => {
    state.search = event.target.value;
    renderPlaces();
  });

  const [itineraryMd, categoriesMd] = await Promise.all([
    fetchTextFile(["itinerary.md"]),
    fetchTextFile(["google_maps_categories.md"])
  ]);

  state.places = parsePlaces(categoriesMd);
  state.places = state.places.map((place) => ({ ...place, summary: createPlaceSummary(place) }));
  renderItinerary(parseItinerary(itineraryMd));
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
