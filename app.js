function formatKES(value) {
  return `KES ${Math.round(value).toLocaleString()}`;
}

function getStatusTone(score) {
  if (score >= 66) return { label: "High value", className: "status-good" };
  if (score >= 58) return { label: "Watchlist", className: "status-warn" };
  return { label: "Premium cost", className: "status-risk" };
}

function getEstimatedRent(area, roomType) {
  const adjusted = area.baseRent + roomAdjustments[roomType].delta;
  return Math.max(area.minRent, Math.min(area.maxRent, adjusted));
}

function getMonthlyBurn(area, roomType, meterType) {
  const rent = getEstimatedRent(area, roomType);
  const matatuMonthly = area.matatuFare * 2 * 22;
  const electricity = meterType === "shared" ? 1200 : 600;
  const essentials = 5000;
  return { rent, matatuMonthly, electricity, essentials, total: rent + matatuMonthly + electricity + essentials };
}

function photoTag(label, area, index) {
  return `<div class="photo-card photo-${index + 1}"><span>${label}</span><strong>${area.area}</strong></div>`;
}

function renderHomeRankings() {
  const node = document.querySelector("#home-rankings");
  if (!node) return;

  node.innerHTML = rankings.map((item) => `
    <article class="ranking-card">
      <div class="ranking-head">
        <div>
          <p class="eyebrow">Rank ${item.rank}</p>
          <h3>${item.area}</h3>
        </div>
        <strong class="ranking-score">${item.score}</strong>
      </div>
      <div class="status-line">
        <span class="status-dot ${getStatusTone(item.score).className}"></span>
        <span>${getStatusTone(item.score).label}</span>
      </div>
      <p>${item.reason}</p>
      <div class="chip-row">
        <span>${formatKES(item.medianRent)} median rent</span>
        <span>${formatKES(item.burn)} monthly burn</span>
      </div>
    </article>
  `).join("");
}

function renderDashboardPanels() {
  const burnNode = document.querySelector("#burn-meter");
  const truthNode = document.querySelector("#truth-table");
  const alertNode = document.querySelector("#alert-log");
  const hotspotNode = document.querySelector("#zone-hotspots");

  if (!burnNode || !truthNode || !alertNode || !hotspotNode) return;

  const dashboardAreas = ["Zimmerman", "Kahawa West", "Embakasi", "Ngara", "South B"];
  const selected = areaData
    .filter((area) => dashboardAreas.includes(area.area))
    .map((area) => {
      const burn = getMonthlyBurn(area, "bedsitter", "private");
      return { ...area, burn };
    })
    .sort((a, b) => a.burn.total - b.burn.total);

  const maxBurn = Math.max(...selected.map((area) => area.burn.total));

  burnNode.innerHTML = selected.map((area) => `
    <div class="meter-row">
      <div class="meter-label">
        <strong>${area.area}</strong>
        <span>${formatKES(area.burn.total)}</span>
      </div>
      <div class="meter-track">
        <div class="meter-fill" style="width:${(area.burn.total / maxBurn) * 100}%"></div>
      </div>
      <div class="meter-tags">
        <span>${formatKES(area.burn.rent)} rent</span>
        <span>${formatKES(area.burn.matatuMonthly)} matatu</span>
      </div>
    </div>
  `).join("");

  truthNode.innerHTML = `
    <div class="truth-header">
      <span>Zone</span>
      <span>Listed rent</span>
      <span>Truth</span>
    </div>
    ${selected.map((area) => `
      <div class="truth-row">
        <strong>${area.area}</strong>
        <span>${formatKES(area.baseRent)}</span>
        <span>${formatKES(area.burn.total)}</span>
      </div>
    `).join("")}
  `;

  alertNode.innerHTML = `
    <ul class="alert-list">
      <li><span class="status-dot status-risk"></span>KPLC_SHARED_METER :: -KES 28.8K / degree</li>
      <li><span class="status-dot status-warn"></span>DISTANCE_TAX :: +KES 700 / 10 min closer</li>
      <li><span class="status-dot status-good"></span>VALUE_ZONES :: Zimmerman / Kahawa West / Embakasi</li>
      <li><span class="status-dot status-warn"></span>TRANSPORT_LEAKAGE :: Roysambu / Ruaka / Ngong Rd</li>
    </ul>
  `;

  hotspotNode.innerHTML = `
    <div class="hotspot-grade-list">
      <div class="hotspot-grade">
        <strong>GRADE A</strong>
        <span>Zimmerman :: [LOW_RENT] [VALUE_ZONE] [HIGH_COMMUTE]</span>
      </div>
      <div class="hotspot-grade">
        <strong>GRADE A</strong>
        <span>Kahawa West :: [LOW_BURN] [KU_ACCESS] [PRIVATE_METER_EDGE]</span>
      </div>
      <div class="hotspot-grade">
        <strong>GRADE B</strong>
        <span>Ngara :: [WALKABLE] [PREMIUM_ACCESS] [MID_TIER]</span>
      </div>
      <div class="hotspot-grade">
        <strong>GRADE B</strong>
        <span>South B :: [COMFORT] [KCA_LINK] [MID_COST]</span>
      </div>
    </div>
  `;
}

function scoreArea(area, state) {
  const budget = Number(state.budget);
  const burn = getMonthlyBurn(area, state.roomType, state.meter);
  const campusMatch = state.campus === "all" || area.campus === state.campus;
  const walkPenalty = Math.max(0, area.avgWalk - Number(state.walkLimit)) * 18;
  const budgetPenalty = Math.max(0, burn.total - budget) * 0.02;
  const campusBoost = campusMatch ? 22 : 0;
  const tierBoost = area.tier === "Satellite" ? 6 : area.tier === "Inner City" ? 3 : 0;
  const valueBoost = area.valueScore * 0.35;
  return 100 + campusBoost + tierBoost + valueBoost - budgetPenalty - walkPenalty - burn.total / 550;
}

function renderExplore() {
  const resultsNode = document.querySelector("#explore-results");
  if (!resultsNode) return;

  const form = {
    campus: document.querySelector("#campus"),
    budget: document.querySelector("#budget"),
    roomType: document.querySelector("#roomType"),
    meter: document.querySelector("#meter"),
    walkLimit: document.querySelector("#walkLimit"),
    sortBy: document.querySelector("#sortBy")
  };

  const unique = [...new Set(areaData.map((area) => area.campus))].sort();
  unique.forEach((campus) => {
    const option = document.createElement("option");
    option.value = campus;
    option.textContent = campus;
    form.campus.append(option);
  });

  const walkValue = document.querySelector("#walkValue");
  const rentGuidance = document.querySelector("#rentGuidance");
  const budgetSummary = document.querySelector("#budgetSummary");
  const resultTitle = document.querySelector("#resultTitle");
  const resultCount = document.querySelector("#resultCount");
  const resultsSummary = document.querySelector("#resultsSummary");
  const resetFilters = document.querySelector("#resetFilters");

  function getMatchReason(area, state) {
    const reasons = [];
    if (state.campus !== "all" && area.campus === state.campus) reasons.push("campus match");
    if (area.valueScore >= 66) reasons.push("elite value score");
    if (area.matatuFare <= 40) reasons.push("lower transport tax");
    if (area.avgWalk <= Number(state.walkLimit)) reasons.push("walk fits limit");
    return reasons.slice(0, 3);
  }

  function sortAreas(items, sortBy) {
    if (sortBy === "burn") return items.sort((a, b) => a.burn.total - b.burn.total);
    if (sortBy === "rent") return items.sort((a, b) => a.burn.rent - b.burn.rent);
    if (sortBy === "walk") return items.sort((a, b) => a.avgWalk - b.avgWalk);
    return items.sort((a, b) => b.score - a.score);
  }

  function draw() {
    const state = {
      campus: form.campus.value,
      budget: form.budget.value,
      roomType: form.roomType.value,
      meter: form.meter.value,
      walkLimit: form.walkLimit.value,
      sortBy: form.sortBy.value
    };

    walkValue.textContent = `${state.walkLimit} min`;
    rentGuidance.textContent = budgetGuides[state.budget];
    budgetSummary.textContent = `Estimate includes ${state.meter} meter electricity, matatu, and a KES 5,000 essentials buffer.`;

    const sorted = sortAreas(areaData
      .map((area) => {
        const burn = getMonthlyBurn(area, state.roomType, state.meter);
        return { ...area, burn, score: scoreArea(area, state), reasons: getMatchReason(area, state) };
      })
      .filter((area) => state.campus === "all" || area.campus === state.campus || area.score > 55)
      , state.sortBy).slice(0, 8);

    resultTitle.textContent = state.campus === "all" ? "Best student-friendly areas right now" : `Best matches near ${state.campus}`;
    resultCount.textContent = `${sorted.length} areas`;

    if (sorted.length) {
      const best = sorted[0];
      const avgBurn = Math.round(sorted.reduce((sum, area) => sum + area.burn.total, 0) / sorted.length);
      resultsSummary.innerHTML = `
        <article class="summary-tile">
          <p class="eyebrow">Best current pick</p>
          <h3>${best.area}</h3>
          <p>${formatKES(best.burn.total)} monthly burn</p>
        </article>
        <article class="summary-tile">
          <p class="eyebrow">Average burn</p>
          <h3>${formatKES(avgBurn)}</h3>
          <p>Across your visible matches</p>
        </article>
        <article class="summary-tile">
          <p class="eyebrow">Best commute edge</p>
          <h3>${sorted.reduce((bestArea, area) => area.matatuFare < bestArea.matatuFare ? area : bestArea, sorted[0]).area}</h3>
          <p>Lowest fare in this filtered view</p>
        </article>
      `;
    } else {
      resultsSummary.innerHTML = `
        <article class="summary-tile empty-summary">
          <p class="eyebrow">No current matches</p>
          <h3>Try a wider budget or longer walk limit.</h3>
          <p>The current stack is filtering too aggressively for this dataset.</p>
        </article>
      `;
    }

    resultsNode.innerHTML = sorted.map((area) => `
      <article class="explore-card">
        <div class="gallery-strip">
          ${area.gallery.map((label, index) => photoTag(label, area, index)).join("")}
        </div>
        <div class="card-body">
          <div class="card-top">
            <div>
              <p class="eyebrow">${area.campus}</p>
              <h3>${area.area}</h3>
            </div>
            <span class="tier-chip">${area.tier}</span>
          </div>
          <div class="status-line">
            <span class="status-dot ${getStatusTone(area.valueScore).className}"></span>
            <span>${getStatusTone(area.valueScore).label}</span>
          </div>
          <p class="vibe-line">${area.vibe}</p>
          <div class="signal-row">
            ${area.reasons.map((reason) => `<span class="signal-chip">${reason}</span>`).join("")}
          </div>
          <div class="chip-row">
            <span>${roomAdjustments[state.roomType].label}</span>
            <span>${formatKES(area.burn.rent)} estimated rent</span>
            <span>${formatKES(area.matatuFare)} fare</span>
            <span>${area.avgWalk} min walk</span>
          </div>
          <div class="burn-panel">
            <div>
              <p>Total monthly burn</p>
              <strong>${formatKES(area.burn.total)}</strong>
            </div>
            <span class="burn-chip">${state.meter === "shared" ? "Shared meter" : "Private meter"} ${formatKES(area.burn.electricity)}</span>
          </div>
          <p class="card-note">${area.note}</p>
        </div>
      </article>
    `).join("");
  }

  resetFilters.addEventListener("click", () => {
    form.campus.value = "all";
    form.budget.value = "20000";
    form.roomType.value = "bedsitter";
    form.meter.value = "private";
    form.walkLimit.value = "25";
    form.sortBy.value = "best";
    draw();
  });

  Object.values(form).forEach((field) => {
    field.addEventListener("input", draw);
    field.addEventListener("change", draw);
  });

  draw();
}

function renderMap() {
  const surface = document.querySelector("#mapSurface");
  const detail = document.querySelector("#mapDetail");
  if (!surface || !detail) return;

  function drawDetail(area) {
    const burn = getMonthlyBurn(area, "bedsitter", "private");
    detail.innerHTML = `
      <article class="detail-card">
        <p class="eyebrow">${area.campus}</p>
        <h2>${area.area}</h2>
        <p class="vibe-line">${area.vibe}</p>
        <div class="chip-row">
          <span>${area.tier}</span>
          <span>${formatKES(area.baseRent)} base rent</span>
          <span>${formatKES(area.matatuFare)} fare</span>
          <span>${area.avgWalk} min walk</span>
        </div>
        <div class="burn-panel">
          <div>
            <p>Typical bedsitter burn</p>
            <strong>${formatKES(burn.total)}</strong>
          </div>
          <span class="burn-chip">Private meter ${formatKES(burn.electricity)}</span>
        </div>
        <p class="card-note">${area.note}</p>
        <div class="gallery-strip detail-gallery">
          ${area.gallery.map((label, index) => photoTag(label, area, index)).join("")}
        </div>
      </article>
    `;
  }

  drawDetail(areaData[0]);

  if (!window.L) {
    surface.innerHTML = `
      <div class="map-fallback">
        <p class="eyebrow">Map unavailable</p>
        <h3>Leaflet did not load.</h3>
        <p>Check your internet connection, then refresh the page to load the real map tiles.</p>
      </div>
    `;
    return;
  }

  const map = L.map(surface, {
    zoomControl: true,
    scrollWheelZoom: true
  }).setView([-1.272, 36.84], 11);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);

  const markers = new Map();
  let activeArea = areaData[0].area;

  function createIcon(area, active = false) {
    const tone = getStatusTone(area.valueScore);
    return L.divIcon({
      className: "custom-map-marker-wrap",
      html: `
        <button class="custom-map-marker ${active ? "is-active" : ""}" type="button">
          <span class="status-dot ${tone.className}"></span>
          <span>${area.area}</span>
        </button>
      `,
      iconSize: [120, 34],
      iconAnchor: [60, 17]
    });
  }

  function setActive(area) {
    activeArea = area.area;
    drawDetail(area);
    areaData.forEach((item) => {
      const marker = markers.get(item.area);
      if (marker) {
        marker.setIcon(createIcon(item, item.area === activeArea));
      }
    });
  }

  areaData.forEach((area) => {
    const marker = L.marker([area.lat, area.lng], {
      icon: createIcon(area, area.area === activeArea)
    }).addTo(map);

    marker.on("click", () => {
      setActive(area);
    });

    marker.bindTooltip(`${area.area} · ${area.campus}`, {
      direction: "top",
      offset: [0, -18]
    });

    markers.set(area.area, marker);
  });
}

function renderGuide() {
  const insightsNode = document.querySelector("#guide-insights");
  const budgetNode = document.querySelector("#budget-bands");
  const checklistNode = document.querySelector("#checklist");
  const redFlagsNode = document.querySelector("#redFlags");
  if (!insightsNode || !budgetNode || !checklistNode || !redFlagsNode) return;

  insightsNode.innerHTML = insights.map((item) => `
    <article class="insight-card">
      <span class="insight-number">${item.number}</span>
      <h3>${item.title}</h3>
      <p>${item.body}</p>
    </article>
  `).join("");

  budgetNode.innerHTML = budgetBands.map((band) => `
    <article class="budget-band">
      <p class="eyebrow">${band.budget}</p>
      <h3>${band.zones}</h3>
      <p>${band.note}</p>
      <span class="tier-chip">${band.rent}</span>
    </article>
  `).join("");

  checklistNode.innerHTML = checklist.map((item) => `<li>${item}</li>`).join("");
  redFlagsNode.innerHTML = redFlags.map((item) => `<li>${item}</li>`).join("");
}

function animateCounters() {
  const counters = document.querySelectorAll("[data-counter]");
  if (!counters.length) return;

  counters.forEach((counter) => {
    const target = Number(counter.dataset.counter);
    const duration = 1200;
    const start = performance.now();

    function tick(now) {
      const progress = Math.min((now - start) / duration, 1);
      counter.textContent = Math.floor(target * progress).toLocaleString();
      if (progress < 1) {
        requestAnimationFrame(tick);
      }
    }

    requestAnimationFrame(tick);
  });
}

renderHomeRankings();
renderDashboardPanels();
renderExplore();
renderMap();
renderGuide();
animateCounters();
