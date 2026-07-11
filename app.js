const CATEGORY_ORDER = ["早午餐", "午晚餐", "咖啡", "飲料", "酒吧", "景點", "購物"];

const ITINERARY_STOPS = {
  "8/9（日）抵達米蘭｜大教堂與市中心": [
    ["NYX Hotel Milan", "NYX Hotel Milan, Milan"],
    ["Brera", "Brera, Milan"],
    ["Maccheroni", "Maccheroni La Carbonara N°1 di Milano"],
    ["米蘭大教堂", "Duomo di Milano"],
    ["Navigli", "Navigli, Milan"]
  ],
  "8/10（一）科莫湖一日遊｜Como＋Bellagio＋Varenna": [
    ["Como", "Como, Italy"],
    ["Bellagio", "Bellagio, Lake Como"],
    ["Varenna", "Varenna, Italy"],
    ["Osteria Serafina", "Osteria Serafina Milano"]
  ],
  "8/11（二）維洛納一日遊": [
    ["Verona Arena", "Verona Arena"],
    ["茱麗葉之家", "Casa di Giulietta Verona"],
    ["Ponte Pietra", "Ponte Pietra Verona"],
    ["Castel San Pietro", "Castel San Pietro Verona"]
  ],
  "8/12（三）米蘭新城區｜搭車前往巴黎": [
    ["BAM", "Biblioteca degli Alberi Milano"],
    ["Ratanà", "Ristorante Ratanà Milano"],
    ["Paris Gare de Lyon", "Paris Gare de Lyon"],
    ["Hôtel Magenta 38", "Hôtel Magenta 38 Paris"]
  ],
  "8/13（四）飯店周邊早餐｜聖馬丁運河｜蒙馬特｜Pink Mamma｜聖心堂日落": [
    ["Mamiche", "Mamiche Paris"],
    ["Liberté", "Liberté Paris"],
    ["Du Pain et des Idées", "Du Pain et des Idées Paris"],
    ["聖馬丁運河", "Canal Saint-Martin Paris"],
    ["Pink Mamma", "Pink Mamma Paris"],
    ["愛牆", "Le Mur des Je t'aime Paris"],
    ["聖心堂", "Sacré-Cœur Paris"]
  ],
  "8/14（五）瑪黑區早餐｜Merci 周邊｜皮諾美術館｜PHO 14 Opéra｜小皇宮｜팔도_PALDO": [
    ["Petite Île", "Petite Île Boulangerie Paris"],
    ["Merci", "Merci 111 Boulevard Beaumarchais Paris"],
    ["皮諾美術館", "Bourse de Commerce Pinault Collection Paris"],
    ["PHO 14 Opéra", "Phở Bánh Cuốn 14 Opéra Paris"],
    ["小皇宮", "Petit Palais Paris"],
    ["팔도_PALDO", "팔도_PALDO Paris"]
  ],
  "8/15（六，法國國定假日）瑪黑區｜街區散步與彈性購物": [
    ["Place des Vosges", "Place des Vosges Paris"],
    ["Village Saint-Paul", "Village Saint-Paul Paris"],
    ["Rue des Rosiers", "Rue des Rosiers Paris"],
    ["Musée Carnavalet", "Musée Carnavalet Paris"]
  ],
  "8/16（日）奧塞博物館｜巴黎鐵塔": [
    ["奧塞博物館", "Musée d'Orsay Paris"],
    ["Saint-Germain-des-Prés", "Saint-Germain-des-Prés Paris"],
    ["Rue Cler", "Rue Cler Paris"],
    ["艾菲爾鐵塔", "Eiffel Tower Paris"]
  ],
  "8/17（一）巴黎軍事博物館｜塞納河遊船": [
    ["巴黎軍事博物館", "Musée de l'Armée Paris"],
    ["Rue Cler", "Rue Cler Paris"],
    ["Bateaux Parisiens", "Bateaux Parisiens Eiffel Tower"]
  ],
  "8/18（二）巴黎返台": [
    ["Hôtel Magenta 38", "Hôtel Magenta 38 Paris"],
    ["CDG Terminal 1", "Charles de Gaulle Airport Terminal 1"]
  ]
};

const state = {
  places: [],
  category: "全部",
  search: ""
};

const els = {
  tabs: document.querySelectorAll(".tab"),
  itineraryView: document.querySelector("#itineraryView"),
  placesView: document.querySelector("#placesView"),
  itineraryList: document.querySelector("#itineraryList"),
  categoryFilters: document.querySelector("#categoryFilters"),
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
    const summary = lines
      .filter((line) => line.startsWith("- ") || line.startsWith("  - "))
      .slice(0, 12)
      .map((line) => line.replace(/^ {0,2}- /, "").replace(/\[([^\]]+)\]\([^)]+\)/g, "$1"));
    return { title, summary, stops: ITINERARY_STOPS[title] || [] };
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
    const type = typePart.replace("類型：", "").trim() || "待補";
    const price = pricePart.replace("Google 價格：", "").trim() || "待補";
    const note = notePart.replace("備註：", "").trim();
    const query = note ? `${namePart} ${note}` : `${namePart} Paris`;

    rows.push({
      name: namePart.replaceAll("\\|", "|").replaceAll("\\u0026", "&"),
      category,
      type: type.replaceAll("\\u0026", "&"),
      price,
      note: note.replaceAll("\\u0026", "&"),
      query
    });
  });

  return rows;
}

function renderItinerary(days) {
  els.itineraryList.innerHTML = days
    .map((day) => {
      const dateMatch = day.title.match(/^([^｜]+)/);
      const date = dateMatch ? dateMatch[1] : day.title;
      const title = day.title.replace(/^([^｜]+)｜?/, "").trim() || day.title;
      const summary = day.summary.map((item) => `<li>${item}</li>`).join("");
      const stops = day.stops
        .map(
          ([label, query]) =>
            `<button class="map-button" type="button" data-title="${label}" data-query="${query}">${label}</button>`
        )
        .join("");

      return `
        <article class="day-card">
          <div class="day-summary">
            <span class="date-pill">${date}</span>
            <div>
              <h3>${title}</h3>
              <div class="stop-row">${stops}</div>
            </div>
          </div>
          <div class="day-body">
            <ul>${summary}</ul>
          </div>
        </article>
      `;
    })
    .join("");

  els.itineraryList.querySelectorAll(".map-button").forEach((button) => {
    button.addEventListener("click", () => {
      focusMap(button.dataset.title, button.dataset.query, "行程安排中的地點");
    });
  });
}

function renderFilters() {
  const filters = ["全部", ...CATEGORY_ORDER];
  els.categoryFilters.innerHTML = filters
    .map((category) => `<button class="filter ${category === state.category ? "is-active" : ""}" type="button" data-category="${category}">${category}</button>`)
    .join("");

  els.categoryFilters.querySelectorAll(".filter").forEach((button) => {
    button.addEventListener("click", () => {
      state.category = button.dataset.category;
      renderFilters();
      renderPlaces();
    });
  });
}

function renderPlaces() {
  const needle = state.search.trim().toLowerCase();
  const places = state.places.filter((place) => {
    const matchCategory = state.category === "全部" || place.category === state.category;
    const haystack = `${place.name} ${place.type} ${place.note}`.toLowerCase();
    return matchCategory && (!needle || haystack.includes(needle));
  });

  if (!places.length) {
    els.placeList.innerHTML = `<p class="empty">沒有符合條件的地點。</p>`;
    return;
  }

  els.placeList.innerHTML = places
    .map(
      (place, index) => `
        <article class="place-card">
          <h3>${place.name}</h3>
          <div class="meta-row">
            <span class="tag">${place.category}</span>
            <span class="tag">${place.type}</span>
            <span class="tag">${place.price}</span>
          </div>
          <p class="note">${place.note || "尚未補地址或備註"}</p>
          <div class="place-actions">
            <button class="map-button" type="button" data-place-index="${index}">看地圖</button>
            <a class="text-link" href="${googleSearchUrl(place.query)}" target="_blank" rel="noreferrer">Google Maps</a>
          </div>
        </article>
      `
    )
    .join("");

  els.placeList.querySelectorAll("[data-place-index]").forEach((button) => {
    button.addEventListener("click", () => {
      const place = places[Number(button.dataset.placeIndex)];
      focusMap(place.name, place.query, `${place.category} / ${place.type}`);
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
    fetchTextFile(["itinerary.txt", "itinerary.md"]),
    fetchTextFile(["google_maps_categories.txt", "google_maps_categories.md"])
  ]);

  state.places = parsePlaces(categoriesMd);
  renderItinerary(parseItinerary(itineraryMd));
  renderFilters();
  renderPlaces();
}

async function fetchTextFile(candidates) {
  for (const path of candidates) {
    const response = await fetch(path);
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
