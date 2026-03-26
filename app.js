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

function campusMatches(areaCampus, selectedCampus) {
  if (selectedCampus === "all") return true;
  return areaCampus.split("/").includes(selectedCampus);
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

function renderCommandHome() {
  const selectorNode = document.querySelector("#homeZoneSelector");
  const surface = document.querySelector("#intelSurface");
  if (!selectorNode || !surface) return;

  const campusSelect = document.querySelector("#homeCampus");
  const rentSlider = document.querySelector("#homeTargetRent");
  const rentValue = document.querySelector("#homeTargetRentValue");
  const zoneName = document.querySelector("#selectedZoneName");
  const zoneTier = document.querySelector("#selectedZoneTier");
  const zoneHook = document.querySelector("#selectedZoneHook");
  const burnBars = document.querySelector("#burnBars");
  const hiddenCostDelta = document.querySelector("#hiddenCostDelta");
  const zoneTags = document.querySelector("#selectedZoneTags");
  const truth = document.querySelector("#intelTruth");
  const alerts = document.querySelector("#homeAlerts");
  const zonePulse = document.querySelector("#zonePulse");

  campusChoices.forEach((campus) => {
    const option = document.createElement("option");
    option.value = campus;
    option.textContent = campus;
    campusSelect.append(option);
  });

  let activeArea = "Zimmerman";

  function getHomeTags(area) {
    const tags = [];
    if (area.valueScore >= 66) tags.push("VALUE_ZONE");
    if (area.matatuFare <= 40) tags.push("LOW_TRANSPORT");
    if (area.avgWalk <= 20) tags.push("PREMIUM_ACCESS");
    if (area.baseRent <= 6500) tags.push("LOW_RENT");
    if (area.tier === "Satellite") tags.push("SATELLITE_EDGE");
    return tags.slice(0, 3);
  }

  function getBoardAreas(filteredAreas) {
    const limit = window.innerWidth <= 560 ? 3 : 4;
    const rest = filteredAreas
      .filter((area) => area.area !== activeArea)
      .sort((a, b) => b.valueScore - a.valueScore);

    return [
      filteredAreas.find((area) => area.area === activeArea),
      ...rest
    ].filter(Boolean).slice(0, limit);
  }

  function drawSelectors(filteredAreas) {
    selectorNode.innerHTML = filteredAreas.map((area) => `
      <button class="zone-chip ${area.area === activeArea ? "active" : ""}" type="button" data-zone="${area.area}">
        ${area.area}
      </button>
    `).join("");

    selectorNode.querySelectorAll("[data-zone]").forEach((button) => {
      button.addEventListener("click", () => {
        activeArea = button.dataset.zone;
        draw();
      });
    });
  }

  function drawMap(filteredAreas) {
    const boardAreas = getBoardAreas(filteredAreas);

    surface.innerHTML = boardAreas.map((area) => `
      <button
        class="intel-hotspot ${area.area === activeArea ? "active" : ""}"
        type="button"
        data-zone="${area.area}"
      >
        <span class="hotspot-header">
          <span class="status-dot ${getStatusTone(area.valueScore).className}"></span>
          <strong>${area.area}</strong>
        </span>
        <small>${area.campus}</small>
        <span class="hotspot-metrics">
          <span>${getStatusTone(area.valueScore).label}</span>
          <span>${formatKES(area.matatuFare)} fare</span>
          <span>${area.avgWalk} min walk</span>
        </span>
      </button>
    `).join("");

    surface.querySelectorAll("[data-zone]").forEach((button) => {
      button.addEventListener("click", () => {
        activeArea = button.dataset.zone;
        draw();
      });
    });
  }

  function draw() {
    const campus = campusSelect.value;
    const filteredAreas = areaData.filter((area) => campusMatches(area.campus, campus));
    if (!filteredAreas.find((area) => area.area === activeArea)) {
      activeArea = filteredAreas[0].area;
    }

    const area = areaData.find((item) => item.area === activeArea);
    const listedRent = area.baseRent;
    const burn = getMonthlyBurn(area, "bedsitter", "private");
    const hidden = burn.total - listedRent;
    const target = Number(rentSlider.value);
    const targetGap = burn.total - target;
    const max = Math.max(burn.total, target, listedRent);

    rentValue.textContent = formatKES(target);
    drawSelectors(filteredAreas);
    drawMap(filteredAreas);

    zoneName.textContent = area.area;
    zoneTier.textContent = area.tier;
    zoneHook.textContent = area.note;

    burnBars.innerHTML = `
      <div class="burn-bar-set">
        <div class="burn-bar-label">
          <span>Listed rent</span>
          <strong>${formatKES(listedRent)}</strong>
        </div>
        <div class="bar-shell">
          <div class="bar-outer" style="width:${(burn.total / max) * 100}%">
            <div class="bar-inner" style="width:${(listedRent / burn.total) * 100}%"></div>
          </div>
        </div>
      </div>
      <div class="burn-bar-set">
        <div class="burn-bar-label">
          <span>Reality</span>
          <strong>${formatKES(burn.total)}</strong>
        </div>
        <div class="bar-shell">
          <div class="bar-outer reality-bar" style="width:${(burn.total / max) * 100}%"></div>
        </div>
      </div>
    `;

    hiddenCostDelta.innerHTML = `
      <strong>Hidden costs delta: ${formatKES(hidden)}</strong>
      <span>${formatKES(burn.matatuMonthly)} matatu + ${formatKES(burn.electricity)} KPLC + essentials buffer.</span>
    `;

    zoneTags.innerHTML = getHomeTags(area).map((tag) => `<span>${tag}</span>`).join("");

    truth.innerHTML = `
      <div class="truth-compact">
        <article class="truth-stat">
          <span>Listed</span>
          <strong>${formatKES(listedRent)}</strong>
        </article>
        <article class="truth-stat">
          <span>Reality</span>
          <strong>${formatKES(burn.total)}</strong>
        </article>
        <article class="truth-stat">
          <span>Hidden gap</span>
          <strong>${formatKES(hidden)}</strong>
        </article>
      </div>
      <div class="truth-mini-note">${area.area} :: target ${formatKES(target)} :: ${targetGap > 0 ? `${formatKES(targetGap)} above burn` : "target covers burn"}</div>
    `;

    alerts.innerHTML = `
      <ul class="alert-list">
        <li><span class="status-dot status-risk"></span>KPLC_SHARED_METER :: +KES 600 / month</li>
        <li><span class="status-dot status-warn"></span>DISTANCE_TAX :: +KES 700 / 10 min closer</li>
        <li><span class="status-dot status-good"></span>ACTIVE_ZONE :: ${area.area} :: ${getStatusTone(area.valueScore).label}</li>
      </ul>
    `;

    zonePulse.innerHTML = `
      <div class="pulse-grid">
        <div><span>Campus</span><strong>${area.campus}</strong></div>
        <div><span>Fare</span><strong>${formatKES(area.matatuFare)}</strong></div>
        <div><span>Walk</span><strong>${area.avgWalk} min</strong></div>
        <div><span>Score</span><strong>${area.valueScore}</strong></div>
      </div>
    `;
  }

  campusSelect.addEventListener("change", draw);
  rentSlider.addEventListener("input", draw);
  window.addEventListener("resize", draw);
  draw();
}

function scoreArea(area, state) {
  const budget = Number(state.budget);
  const burn = getMonthlyBurn(area, state.roomType, state.meter);
  const campusMatch = campusMatches(area.campus, state.campus);
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

  campusChoices.forEach((campus) => {
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

  function getVisibleLimit() {
    if (window.innerWidth <= 560) return 4;
    if (window.innerWidth <= 900) return 6;
    return 8;
  }

  function getMatchReason(area, state) {
    const reasons = [];
    if (campusMatches(area.campus, state.campus) && state.campus !== "all") reasons.push("campus match");
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
      .filter((area) => campusMatches(area.campus, state.campus) || state.campus === "all" || area.score > 55)
      , state.sortBy).slice(0, getVisibleLimit());

    resultTitle.textContent = state.campus === "all" ? "Best student-friendly areas right now" : `Best matches near ${state.campus}`;
    resultCount.textContent = `${sorted.length} areas`;

    if (sorted.length) {
      const best = sorted[0];
      const avgBurn = Math.round(sorted.reduce((sum, area) => sum + area.burn.total, 0) / sorted.length);
      const commuteEdge = sorted.reduce((bestArea, area) => area.matatuFare < bestArea.matatuFare ? area : bestArea, sorted[0]);
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
          <h3>${commuteEdge.area}</h3>
          <p>${formatKES(commuteEdge.matatuFare)} fare in this filtered view</p>
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
        <div class="explore-visual">
          <div class="photo-card photo-1 hero-photo">
            <span>${area.campus}</span>
            <strong>${area.area}</strong>
          </div>
          <div class="mini-gallery">
            ${area.gallery.slice(1).map((label, index) => photoTag(label, area, index + 1)).join("")}
          </div>
        </div>
        <div class="card-body">
          <div class="card-top">
            <div class="title-stack">
              <p class="eyebrow">${area.campus}</p>
              <h3>${area.area}</h3>
              <p class="vibe-line">${area.vibe}</p>
            </div>
            <div class="card-side-meta">
              <span class="tier-chip">${area.tier}</span>
              <div class="status-line">
                <span class="status-dot ${getStatusTone(area.valueScore).className}"></span>
                <span>${getStatusTone(area.valueScore).label}</span>
              </div>
            </div>
          </div>
          <div class="signal-row">
            ${area.reasons.map((reason) => `<span class="signal-chip">${reason}</span>`).join("")}
          </div>
          <div class="metric-grid">
            <div class="metric-pill">
              <span>Rent</span>
              <strong>${formatKES(area.burn.rent)}</strong>
            </div>
            <div class="metric-pill">
              <span>Matatu</span>
              <strong>${formatKES(area.matatuFare)}</strong>
            </div>
            <div class="metric-pill">
              <span>Walk</span>
              <strong>${area.avgWalk} min</strong>
            </div>
            <div class="metric-pill">
              <span>Room</span>
              <strong>${roomAdjustments[state.roomType].label}</strong>
            </div>
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

  window.addEventListener("resize", draw);

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
    const hasDecimal = !Number.isInteger(target);

    function tick(now) {
      const progress = Math.min((now - start) / duration, 1);
      const value = target * progress;
      counter.textContent = hasDecimal ? value.toFixed(1) : Math.floor(value).toLocaleString();
      if (progress < 1) {
        requestAnimationFrame(tick);
      }
    }

    requestAnimationFrame(tick);
  });
}

function setupMobileBriefing() {
  const tabs = document.querySelectorAll("[data-brief-tab]");
  const panels = document.querySelectorAll("[data-brief-group]");
  if (!tabs.length || !panels.length) return;

  let activeTab = "summary";

  function applyState() {
    const mobile = window.innerWidth <= 560;

    panels.forEach((panel) => {
      panel.classList.remove("brief-hidden");

      if (!mobile) {
        return;
      }

      const group = panel.dataset.briefGroup;
      if (group !== activeTab) {
        panel.classList.add("brief-hidden");
      }
    });

    tabs.forEach((tab) => {
      tab.classList.toggle("active", tab.dataset.briefTab === activeTab);
    });
  }

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      activeTab = tab.dataset.briefTab;
      applyState();
    });
  });

  window.addEventListener("resize", applyState);
  applyState();
}

renderHomeRankings();
renderDashboardPanels();
renderCommandHome();
renderExplore();
renderMap();
renderGuide();
animateCounters();
setupMobileBriefing();
