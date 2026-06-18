const DATA_URL = "src/data/pokemon-odyssey-data.json?v=timeline-v3";

const TYPE_COLORS = {
  Normal: "#7f8792",
  Fire: "#d45b36",
  Water: "#3578d4",
  Electric: "#c89719",
  Grass: "#2e8b54",
  Ice: "#4b9db4",
  Fighting: "#b34d45",
  Poison: "#8c5ab7",
  Ground: "#9b7740",
  Flying: "#5c79c9",
  Psychic: "#c94f79",
  Bug: "#799a34",
  Rock: "#8d7b53",
  Ghost: "#5f548a",
  Dragon: "#5c62bf",
  Dark: "#5d5360",
  Steel: "#607d8b",
  Aether: "#0b7468",
};

const TYPE_EFFECTIVENESS = {
  Normal: { Rock: 0.5, Ghost: 0, Steel: 0.5 },
  Fire: { Fire: 0.5, Water: 0.5, Grass: 2, Ice: 2, Bug: 2, Rock: 0.5, Dragon: 0.5, Steel: 2, Aether: 0.5 },
  Water: { Fire: 2, Water: 0.5, Grass: 0.5, Ground: 2, Rock: 2, Dragon: 0.5, Aether: 0.5 },
  Electric: { Water: 2, Electric: 0.5, Grass: 0.5, Ground: 0, Flying: 2, Dragon: 0.5 },
  Grass: { Fire: 0.5, Water: 2, Grass: 0.5, Poison: 0.5, Ground: 2, Flying: 0.5, Bug: 0.5, Rock: 2, Dragon: 0.5, Steel: 0.5 },
  Ice: { Fire: 0.5, Water: 0.5, Grass: 2, Ice: 0.5, Ground: 2, Flying: 2, Dragon: 2, Steel: 0.5 },
  Fighting: { Normal: 2, Ice: 2, Poison: 0.5, Flying: 0.5, Psychic: 0.5, Bug: 0.5, Rock: 2, Ghost: 0, Dark: 2, Steel: 2 },
  Poison: { Grass: 2, Poison: 0.5, Ground: 0.5, Rock: 0.5, Ghost: 0.5, Steel: 0, Aether: 2 },
  Ground: { Fire: 2, Electric: 2, Grass: 0.5, Poison: 2, Flying: 0, Bug: 0.5, Rock: 2, Steel: 2, Aether: 0.5 },
  Flying: { Electric: 0.5, Grass: 2, Fighting: 2, Bug: 2, Rock: 0.5, Steel: 0.5, Aether: 0.5 },
  Psychic: { Fighting: 2, Poison: 2, Psychic: 0.5, Dark: 0, Steel: 0.5 },
  Bug: { Fire: 0.5, Grass: 2, Fighting: 0.5, Poison: 0.5, Flying: 0.5, Psychic: 2, Ghost: 0.5, Dark: 2, Steel: 0.5 },
  Rock: { Fire: 2, Ice: 2, Fighting: 0.5, Ground: 0.5, Flying: 2, Bug: 2, Steel: 0.5 },
  Ghost: { Normal: 0, Psychic: 2, Ghost: 2, Dark: 0.5, Steel: 0.5 },
  Dragon: { Dragon: 2, Steel: 0.5 },
  Dark: { Fighting: 0.5, Psychic: 2, Ghost: 2, Dark: 0.5, Steel: 0.5, Aether: 2 },
  Steel: { Fire: 0.5, Water: 0.5, Electric: 0.5, Ice: 2, Rock: 2, Steel: 0.5 },
  Aether: { Dark: 0.5, Poison: 0.5, Aether: 0.5 },
};

const SPRITE_ALIASES = {
  ratreecate: "raticate",
  yggdreon: "eevee",
  goreon: "eevee",
  gorochu: "raichu",
  reefsola: "corsola",
  deepmaiden: "bellossom",
  narmer: "whiscash",
  tlachtga: "mismagius",
  dinogator: "feraligatr",
  "av-dragon": "dragonite",
  "plusle-bb": "plusle",
  "minun-bb": "minun",
  "blaziken-bb": "blaziken",
  "kecleon-bb": "kecleon",
  "mawile-bb": "mawile",
  "farfetchd-galar": "farfetchd",
  "scream-tail": "scream-tail",
  "sandy-shock": "sandy-shocks",
};

const STAT_KEYS = ["hp", "atk", "def", "spa", "spd", "spe"];
const SORT_FALLBACKS = ["availability", "dex", "name"];
const CHECKPOINT_MODES = ["", "include", "exclude"];
const EVOLUTION_FILTERS = [
  { id: "base", label: "Base stage" },
  { id: "middle", label: "Middle stage" },
  { id: "final", label: "Final evolution" },
  { id: "standalone", label: "Standalone" },
  { id: "can-evolve", label: "Can evolve" },
  { id: "item-gated", label: "Item-gated line" },
  { id: "stone-gated", label: "Stone-gated line" },
];

const state = {
  data: null,
  pokemon: [],
  statRanges: {},
  guideById: new Map(),
  abilityDefinitions: new Map(),
  selectedId: "",
  mobileDetailOpen: false,
  abilityPopoverOpen: false,
  search: "",
  checkpointModes: {},
  sources: new Set(),
  types: new Set(),
  abilities: new Set(),
  weaknessTypes: new Set(),
  resistTypes: new Set(),
  evolutionFilters: new Set(),
  abilitySearch: "",
  roles: new Set(),
  archetype: "All",
  sort: "availability",
  spoilerSafe: true,
  teams: [],
  activeTeamId: "",
};

const $ = (selector) => document.querySelector(selector);

const elements = {
  search: $("#search-input"),
  phaseFilters: $("#phase-filters"),
  sourceFilters: $("#source-filters"),
  typeFilters: $("#type-filters"),
  weaknessFilters: $("#weakness-filters"),
  resistFilters: $("#resist-filters"),
  abilityFilters: $("#ability-filters"),
  abilitySearch: $("#ability-filter-search"),
  roleFilters: $("#role-filters"),
  evolutionFilters: $("#evolution-filters"),
  archetype: $("#archetype-filter"),
  sort: $("#sort-select"),
  grid: $("#pokemon-grid"),
  detail: $("#detail-content"),
  resultCount: $("#result-count"),
  filterCopy: $("#active-filter-copy"),
  reset: $("#reset-filters"),
  addSelected: $("#add-selected"),
  spoilerToggle: $("#spoiler-toggle"),
  teamSelect: $("#team-select"),
  newTeam: $("#new-team"),
  renameTeam: $("#rename-team"),
  deleteTeam: $("#delete-team"),
  teamSlots: $("#team-slots"),
  teamAnalysis: $("#team-analysis"),
  teamDefense: $("#team-defense"),
  mobileDetailModal: $("#mobile-detail-modal"),
  mobileDetailContent: $("#mobile-detail-content"),
  mobileDetailTitle: $("#mobile-detail-title"),
  mobileDetailClose: $("#mobile-detail-close"),
  abilityPopover: $("#ability-popover"),
  abilityPopoverTitle: $("#ability-popover-title"),
  abilityPopoverText: $("#ability-popover-text"),
  abilityPopoverClose: $("#ability-popover-close"),
};

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  }[char]));
}

function slugName(mon) {
  const explicit = SPRITE_ALIASES[mon.id];
  if (explicit) return explicit;
  return mon.name
    .toLowerCase()
    .replace("♀", "-f")
    .replace("♂", "-m")
    .replace(/\(.*?\)/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function spriteUrl(mon) {
  if (mon.sprite?.path) return mon.sprite.path;
  return `https://img.pokemondb.net/sprites/home/normal/${slugName(mon)}.png`;
}

function typeBadge(type) {
  return `<span class="type-badge" style="background:${TYPE_COLORS[type] || "#6b7280"}">${escapeHtml(type)}</span>`;
}

function attackTypes() {
  return Object.keys(TYPE_COLORS);
}

function abilityKey(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function abilityDefinition(name) {
  return state.abilityDefinitions.get(abilityKey(name));
}

function abilityList() {
  return [...new Set(state.pokemon.flatMap((mon) => mon.abilities || []))]
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));
}

function abilityTooltipAttrs(ability) {
  const definition = abilityDefinition(ability);
  if (!definition) return "";
  const tooltip = `${definition.effect} (${definition.section})`;
  return ` data-tooltip="${escapeHtml(tooltip)}" title="${escapeHtml(tooltip)}"`;
}

function abilityBadges(abilities, limit = Infinity) {
  const visible = (abilities || []).slice(0, limit);
  const extra = (abilities || []).length - visible.length;
  const badges = visible.map((ability) => {
    const definition = abilityDefinition(ability);
    const tooltipAttrs = abilityTooltipAttrs(ability);
    return definition
      ? `<button class="ability-badge has-tooltip" type="button"${tooltipAttrs}>${escapeHtml(ability)}</button>`
      : `<span class="ability-badge">${escapeHtml(ability)}</span>`;
  });
  if (extra > 0) badges.push(`<span class="ability-badge">+${extra}</span>`);
  return badges.join("") || `<span class="muted">Ability unknown</span>`;
}

function roleBadges(roles, limit = 3) {
  const visible = roles.slice(0, limit);
  const extra = roles.length - visible.length;
  return [
    ...visible.map((role) => `<span class="role-badge">${escapeHtml(role)}</span>`),
    extra > 0 ? `<span class="role-badge">+${extra}</span>` : "",
  ].join("");
}

function cssSlug(value) {
  return String(value || "unknown").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function progressionCheckpoints() {
  return state.data?.facets?.checkpoints || [];
}

function checkpointById(id) {
  return progressionCheckpoints().find((checkpoint) => checkpoint.id === id);
}

function fallbackCheckpoint() {
  return { id: "unknown", sort: 99, label: "Unknown", shortLabel: "Unknown", levelCap: null };
}

function pokemonCheckpoint(mon) {
  return mon.timeline?.checkpoint || mon.availability?.checkpoint || fallbackCheckpoint();
}

function checkpointLabel(checkpoint, compact = false) {
  const cp = checkpoint || fallbackCheckpoint();
  const label = compact ? (cp.shortLabel || cp.label) : cp.label;
  return cp.levelCap ? `${label} · Lv.${cp.levelCap}` : label;
}

function checkpointMode(id) {
  return state.checkpointModes[id] || "";
}

function cycleCheckpointMode(id) {
  const current = checkpointMode(id);
  const next = CHECKPOINT_MODES[(CHECKPOINT_MODES.indexOf(current) + 1) % CHECKPOINT_MODES.length];
  if (next) state.checkpointModes[id] = next;
  else delete state.checkpointModes[id];
}

function checkpointIdsByMode(mode) {
  return Object.entries(state.checkpointModes)
    .filter(([, value]) => value === mode)
    .map(([id]) => id);
}

function checkpointSortsByMode(mode) {
  return checkpointIdsByMode(mode)
    .map((id) => checkpointById(id)?.sort)
    .filter((sort) => Number.isFinite(sort));
}

function checkpointModeLabel(mode) {
  if (mode === "include") return "Included";
  if (mode === "exclude") return "Excluded";
  return "";
}

function evolutionFilterMatch(mon, filter) {
  const canEvolve = mon.evolutionMethod?.kind && mon.evolutionMethod.kind !== "none";
  const hasIncoming = Boolean(mon.incomingEvolution);
  if (filter === "base") return !hasIncoming && canEvolve;
  if (filter === "middle") return hasIncoming && canEvolve;
  if (filter === "final") return hasIncoming && !canEvolve;
  if (filter === "standalone") return !hasIncoming && !canEvolve;
  if (filter === "can-evolve") return canEvolve;
  if (filter === "item-gated") return Boolean(mon.evolutionMethod?.isItemBased || mon.incomingEvolution?.isItemBased);
  if (filter === "stone-gated") return Boolean(mon.evolutionMethod?.isStoneBased || mon.incomingEvolution?.isStoneBased);
  return false;
}

function hasWeakness(mon, attackType) {
  return defensiveMultiplier(attackType, mon.types) > 1;
}

function hasResistanceOrImmunity(mon, attackType) {
  return defensiveMultiplier(attackType, mon.types) < 1;
}

function checkpointBadge(checkpoint) {
  const cp = checkpoint || fallbackCheckpoint();
  return `<span class="checkpoint-badge checkpoint-${escapeHtml(cssSlug(cp.id || cp.label))}" title="${escapeHtml(checkpointLabel(cp))}">${escapeHtml(checkpointLabel(cp, true))}</span>`;
}

function evolutionMethodTone(method) {
  if (!method || method.kind === "none") return "final";
  if (method.isStoneBased) return "stone";
  if (method.isItemBased) return "item";
  if (method.kind === "level") return "level";
  if (method.kind === "friendship") return "friendship";
  return "special";
}

function evolutionSummary(method) {
  if (!method) return "";
  if (method.kind === "none") return "Final stage";
  const parts = [...(method.levels || []), ...(method.items || [])];
  if (parts.length) return parts.join(" / ");
  return method.raw || method.label || "";
}

function evolutionBadge(label, method) {
  if (!label) return "";
  return `<span class="evolution-badge evo-${evolutionMethodTone(method)}">${escapeHtml(label)}</span>`;
}

function evolutionBadges(mon) {
  const badges = [];
  if (mon.incomingEvolution) badges.push(evolutionBadge(mon.incomingEvolution.label, mon.incomingEvolution));
  if (mon.evolutionMethod?.kind && mon.evolutionMethod.kind !== "none") {
    badges.push(evolutionBadge(mon.evolutionMethod.label, mon.evolutionMethod));
  }
  if (!badges.length && mon.evolutionMethod?.kind === "none") badges.push(evolutionBadge("Final stage", mon.evolutionMethod));
  return badges.join("") || `<span class="evolution-badge evo-special">Evolution unknown</span>`;
}

function evolutionCardBadge(mon) {
  const methods = [mon.incomingEvolution, mon.evolutionMethod].filter(Boolean);
  const method = methods.find((candidate) => candidate.isStoneBased) || methods.find((candidate) => candidate.isItemBased);
  if (!method?.isItemBased) return "";
  const label = method.isStoneBased ? "Stone evolution" : "Item evolution";
  return evolutionBadge(label, method);
}

function familyEvolutionHint(mon) {
  if (mon.incomingEvolution) return `From ${mon.incomingEvolution.fromName}: ${evolutionSummary(mon.incomingEvolution)}`;
  if (mon.evolutionMethod?.kind && mon.evolutionMethod.kind !== "none") return `Evolves: ${evolutionSummary(mon.evolutionMethod)}`;
  return "Final stage";
}

function statValue(mon, stat) {
  return mon.stats?.[stat] ?? 0;
}

function computeStatRanges(pokemon) {
  return STAT_KEYS.reduce((ranges, stat) => {
    const values = pokemon
      .map((mon) => mon.stats?.[stat])
      .filter((value) => Number.isFinite(value));
    ranges[stat] = {
      min: Math.min(...values),
      max: Math.max(...values),
    };
    return ranges;
  }, {});
}

function statBarWidth(value, stat) {
  const range = state.statRanges[stat];
  if (!range || !Number.isFinite(value)) return 0;
  if (range.max === range.min) return 100;
  return Math.max(0, Math.min(100, ((value - range.min) / (range.max - range.min)) * 100));
}

function statBars(mon, compact = true) {
  const stats = compact ? STAT_KEYS : STAT_KEYS;
  const className = compact ? "stat-bars" : "stat-bars detail-stat-bars";
  return `<div class="${className}">${stats.map((stat) => {
    const value = statValue(mon, stat);
    const width = statBarWidth(value, stat);
    const range = state.statRanges[stat] || {};
    return `
      <div class="stat-bar">
        <span>${stat.toUpperCase()}</span>
        <span class="bar-track" title="${stat.toUpperCase()} range: ${range.min ?? "-"}-${range.max ?? "-"}">
          <span class="bar-fill" style="width:${width}%"></span>
        </span>
        <span>${value || "-"}</span>
      </div>`;
  }).join("")}</div>`;
}

function normalizedSearchText(mon) {
  return [
    mon.displayName,
    mon.name,
    mon.types.join(" "),
    mon.abilities.join(" "),
    mon.roles.join(" "),
    mon.archetype,
    mon.evolution,
    mon.evolutionMethod?.label,
    mon.incomingEvolution?.label,
    mon.timeline?.checkpoint?.label,
    mon.timeline?.checkpoint?.shortLabel,
    mon.timeline?.source,
    mon.timeline?.reason,
    mon.availability?.phase,
    mon.availability?.source,
    mon.availability?.details,
    mon.familyEncounters?.map((record) => record.source).join(" "),
    mon.learnset.map((move) => move.move).join(" "),
  ].join(" ").toLowerCase();
}

function wonderTradeRecord(mon) {
  return (mon.directEncounters || []).find((record) => record.source === "Wonder Trade");
}

function hasWonderTradeAvailability(mon) {
  return Boolean(wonderTradeRecord(mon));
}

function filterPokemon() {
  const query = state.search.trim().toLowerCase();
  const includedCheckpointSorts = checkpointSortsByMode("include");
  const excludedCheckpointSorts = checkpointSortsByMode("exclude");
  const includeLimit = includedCheckpointSorts.length ? Math.max(...includedCheckpointSorts) : null;
  const excludeLimit = excludedCheckpointSorts.length ? Math.max(...excludedCheckpointSorts) : null;
  return state.pokemon.filter((mon) => {
    const checkpointSort = pokemonCheckpoint(mon).sort ?? 99;
    if (query && !normalizedSearchText(mon).includes(query)) return false;
    if (includeLimit !== null && checkpointSort > includeLimit) return false;
    if (excludeLimit !== null && checkpointSort <= excludeLimit) return false;
    if (state.sources.has("wonderTrade") && !hasWonderTradeAvailability(mon)) return false;
    if (state.types.size && !mon.types.some((type) => state.types.has(type))) return false;
    if (state.abilities.size && !mon.abilities?.some((ability) => state.abilities.has(ability))) return false;
    if (state.weaknessTypes.size && ![...state.weaknessTypes].every((type) => hasWeakness(mon, type))) return false;
    if (state.resistTypes.size && ![...state.resistTypes].every((type) => hasResistanceOrImmunity(mon, type))) return false;
    if (state.evolutionFilters.size && ![...state.evolutionFilters].some((filter) => evolutionFilterMatch(mon, filter))) return false;
    if (state.roles.size && !mon.roles.some((role) => state.roles.has(role))) return false;
    if (state.archetype !== "All" && mon.archetype !== state.archetype) return false;
    return true;
  }).sort(sortPokemon);
}

function sortPokemon(a, b) {
  const primary = comparePokemonBySort(a, b, state.sort);
  if (primary) return primary;
  for (const fallback of SORT_FALLBACKS) {
    if (fallback === state.sort) continue;
    const comparison = comparePokemonBySort(a, b, fallback);
    if (comparison) return comparison;
  }
  return 0;
}

function comparePokemonBySort(a, b, sortKey) {
  if (sortKey === "dex") return dexNumber(a) - dexNumber(b);
  if (sortKey === "bst") return (b.baseTotal || 0) - (a.baseTotal || 0);
  if (sortKey === "buff") return ((b.statDelta?.total || 0) - (a.statDelta?.total || 0));
  if (sortKey === "name") return a.displayName.localeCompare(b.displayName);
  if (sortKey?.startsWith("stat:")) {
    const stat = sortKey.slice(5);
    if (STAT_KEYS.includes(stat)) return statValue(b, stat) - statValue(a, stat);
  }
  return availabilityRank(a) - availabilityRank(b)
    || availabilityLevel(a) - availabilityLevel(b)
    || dexNumber(a) - dexNumber(b);
}

function dexNumber(mon) {
  return Number(mon.gameDexId || 9999);
}

function availabilityRank(mon) {
  return pokemonCheckpoint(mon).sort ?? 99;
}

function availabilityLevel(mon) {
  return mon.availability?.level ? Number(mon.availability.level.match(/\d+/)?.[0] || 999) : 999;
}

function renderFilters() {
  elements.phaseFilters.innerHTML = progressionCheckpoints().map((checkpoint) => {
    const mode = checkpointMode(checkpoint.id);
    const marker = mode === "include" ? "+" : mode === "exclude" ? "−" : "";
    const title = mode === "include"
      ? `Including Pokemon available by ${checkpointLabel(checkpoint)}. Click again to exclude this point.`
      : mode === "exclude"
        ? `Excluding Pokemon available by ${checkpointLabel(checkpoint)}. Click again to clear.`
        : `Click to include Pokemon available by ${checkpointLabel(checkpoint)}. Click twice to exclude this point.`;
    return `
      <button class="checkpoint-chip ${mode}" data-checkpoint="${escapeHtml(checkpoint.id)}" type="button" title="${escapeHtml(title)}" aria-label="${escapeHtml(`${checkpointLabel(checkpoint)} ${checkpointModeLabel(mode) || "neutral"}`)}">
        <span class="checkpoint-mode-marker">${escapeHtml(marker)}</span>
        <span>${escapeHtml(checkpoint.shortLabel || checkpoint.label)}</span>
        ${checkpoint.levelCap ? `<small>Lv.${escapeHtml(checkpoint.levelCap)}</small>` : ""}
      </button>
    `;
  }).join("");

  elements.sourceFilters.innerHTML = `
    <button class="source-chip ${state.sources.has("wonderTrade") ? "active" : ""}" data-source="wonderTrade" type="button">Wonder Trade</button>
  `;

  elements.typeFilters.innerHTML = state.data.facets.types.map((type) => `
    <button class="type-chip ${state.types.has(type) ? "active" : ""}" data-type="${escapeHtml(type)}" type="button" style="${state.types.has(type) ? "" : `border-color:${TYPE_COLORS[type] || "#d7dee8"}55`}">${escapeHtml(type)}</button>
  `).join("");

  elements.weaknessFilters.innerHTML = attackTypes().map((type) => `
    <button class="filter-chip matchup-filter-chip ${state.weaknessTypes.has(type) ? "active" : ""}" data-weakness="${escapeHtml(type)}" type="button" style="${state.weaknessTypes.has(type) ? "" : `border-color:${TYPE_COLORS[type] || "#d7dee8"}55`}">${escapeHtml(type)}</button>
  `).join("");

  elements.resistFilters.innerHTML = attackTypes().map((type) => `
    <button class="filter-chip matchup-filter-chip ${state.resistTypes.has(type) ? "active" : ""}" data-resist="${escapeHtml(type)}" type="button" style="${state.resistTypes.has(type) ? "" : `border-color:${TYPE_COLORS[type] || "#d7dee8"}55`}">${escapeHtml(type)}</button>
  `).join("");

  const abilityQuery = state.abilitySearch.trim().toLowerCase();
  const visibleAbilities = abilityList().filter((ability) => {
    const definition = abilityDefinition(ability);
    return !abilityQuery
      || ability.toLowerCase().includes(abilityQuery)
      || definition?.effect?.toLowerCase().includes(abilityQuery);
  });
  elements.abilityFilters.innerHTML = visibleAbilities.length ? visibleAbilities.map((ability) => {
    const hasDefinition = Boolean(abilityDefinition(ability));
    const classes = [
      "filter-chip",
      "ability-filter-chip",
      hasDefinition ? "has-tooltip" : "",
      state.abilities.has(ability) ? "active" : "",
    ].filter(Boolean).join(" ");
    return `<button class="${classes}" data-ability="${escapeHtml(ability)}" type="button"${abilityTooltipAttrs(ability)}>${escapeHtml(ability)}</button>`;
  }).join("") : `<p class="muted filter-empty">No abilities match.</p>`;

  elements.roleFilters.innerHTML = state.data.facets.roles.map((role) => `
    <button class="filter-chip ${state.roles.has(role) ? "active" : ""}" data-role="${escapeHtml(role)}" type="button">${escapeHtml(role)}</button>
  `).join("");

  elements.evolutionFilters.innerHTML = EVOLUTION_FILTERS.map((filter) => `
    <button class="filter-chip ${state.evolutionFilters.has(filter.id) ? "active" : ""}" data-evolution-filter="${escapeHtml(filter.id)}" type="button">${escapeHtml(filter.label)}</button>
  `).join("");

  elements.archetype.innerHTML = ["All", ...state.data.facets.archetypes].map((name) => `
    <option value="${escapeHtml(name)}" ${state.archetype === name ? "selected" : ""}>${escapeHtml(name)}</option>
  `).join("");
}

function renderGrid() {
  const results = filterPokemon();
  elements.resultCount.textContent = `${results.length} result${results.length === 1 ? "" : "s"}`;
  elements.filterCopy.textContent = activeFilterCopy();

  if (!results.length) {
    elements.grid.innerHTML = `<div class="empty-state">No Pokemon match the active filters.</div>`;
    return;
  }

  elements.grid.innerHTML = results.map((mon) => pokemonCard(mon)).join("");
}

function activeFilterCopy() {
  const parts = [];
  if (state.search) parts.push(`search "${state.search}"`);
  const included = checkpointIdsByMode("include").map((id) => checkpointById(id)).filter(Boolean);
  const excluded = checkpointIdsByMode("exclude").map((id) => checkpointById(id)).filter(Boolean);
  if (included.length) parts.push(`available by ${included.map((checkpoint) => checkpointLabel(checkpoint)).join(", ")}`);
  if (excluded.length) parts.push(`not already by ${excluded.map((checkpoint) => checkpointLabel(checkpoint)).join(", ")}`);
  if (state.sources.has("wonderTrade")) parts.push("Wonder Trade");
  if (state.types.size) parts.push([...state.types].join(", "));
  if (state.weaknessTypes.size) parts.push(`weak to ${[...state.weaknessTypes].join(", ")}`);
  if (state.resistTypes.size) parts.push(`resists ${[...state.resistTypes].join(", ")}`);
  if (state.abilities.size) parts.push([...state.abilities].join(", "));
  if (state.roles.size) parts.push([...state.roles].join(", "));
  if (state.archetype !== "All") parts.push(state.archetype);
  if (state.evolutionFilters.size) {
    const labels = [...state.evolutionFilters]
      .map((id) => EVOLUTION_FILTERS.find((filter) => filter.id === id)?.label || id)
      .join(", ");
    parts.push(labels);
  }
  return parts.length ? parts.join(" · ") : "Showing the full Odyssey dex with parsed documentation.";
}

function pokemonCard(mon) {
  const delta = mon.statDelta?.total ?? 0;
  const deltaChip = delta ? `<span class="stat-badge role-badge">${delta > 0 ? "+" : ""}${delta} BST</span>` : "";
  const selected = state.selectedId === mon.id ? "selected" : "";
  return `
    <article class="pokemon-card ${selected}" data-id="${escapeHtml(mon.id)}">
      <div class="card-main">
        ${spriteFrame(mon)}
        <div>
          <h3>${escapeHtml(mon.displayName)}</h3>
          <div class="card-subline">#${escapeHtml(mon.gameDexId || "???")} · ${escapeHtml(mon.archetype)}</div>
          <div class="type-row">${mon.types.map(typeBadge).join("")}</div>
        </div>
      </div>
      <div class="card-body">
        <div class="badge-row">
          ${checkpointBadge(pokemonCheckpoint(mon))}
          <span class="stat-badge role-badge">${mon.baseTotal || "-"} BST</span>
          ${deltaChip}
          ${evolutionCardBadge(mon)}
        </div>
        <p class="availability-line">${availabilityCopy(mon, true)}</p>
        <div class="role-row">${roleBadges(mon.roles)}</div>
        ${statBars(mon)}
      </div>
      <div class="card-footer">
        <span class="ability-row">${abilityBadges(mon.abilities, 2)}</span>
        <button class="small-button" data-add="${escapeHtml(mon.id)}" type="button">Add</button>
      </div>
    </article>
  `;
}

function spriteFrame(mon) {
  const frameClass = `sprite-frame${mon.sprite?.path ? " local-sprite" : ""}`;
  return `
    <span class="${frameClass}">
      <img src="${spriteUrl(mon)}" alt="${escapeHtml(mon.displayName)} sprite" loading="lazy" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';" />
      <span class="sprite-fallback">${escapeHtml(mon.displayName[0] || "?")}</span>
    </span>
  `;
}

function availabilityCopy(mon, short = false) {
  const wonderTrade = state.sources.has("wonderTrade") ? wonderTradeRecord(mon) : null;
  if (wonderTrade) {
    const phase = wonderTrade.startAvailable ? "Start" : (wonderTrade.checkpointLabel || wonderTrade.phase || "First Stratum");
    const via = wonderTrade.via && wonderTrade.via !== mon.displayName ? ` via ${wonderTrade.via}` : "";
    if (state.spoilerSafe) return `${phase}${via} · Wonder Trade`;
    const level = wonderTrade.level ? ` · Lv. ${wonderTrade.level}` : "";
    return `${wonderTrade.area || "Wonder Trade"}${via}${level} · Wonder Trade`;
  }

  const timeline = mon.timeline || {};
  const availability = mon.availability || {};
  const checkpoint = timeline.checkpoint || availability.checkpoint || fallbackCheckpoint();
  if (timeline.startAvailable) return state.spoilerSafe ? "Start · Wonder Trade" : `${timeline.encounter?.area || "Wonder Trade"} · Wonder Trade`;
  if (!availability.details && !timeline.source) return `${checkpointLabel(checkpoint)} availability`;
  if (state.spoilerSafe) {
    const via = availability.via && availability.via !== mon.displayName ? ` via ${availability.via}` : "";
    return `By ${checkpointLabel(checkpoint)}${via} · ${timeline.source || availability.source}`;
  }
  const level = availability.level ? ` · Lv. ${availability.level}` : "";
  const rate = availability.rate ? ` · ${availability.rate}` : "";
  const via = availability.via && availability.via !== mon.displayName ? ` via ${availability.via}` : "";
  return `${availability.details}${via}${level}${rate}`;
}

function renderDetail() {
  const mon = getSelected();
  if (!mon) {
    elements.detail.innerHTML = `<div class="empty-detail">Select a Pokemon to inspect stats, learnset, availability evidence, and guide roles.</div>`;
    return;
  }
  elements.detail.innerHTML = pokemonDetailMarkup(mon);
}

function pokemonDetailMarkup(mon, options = {}) {
  const { includeHero = true } = options;
  const guideEntries = mon.guideEntryIds.map((id) => state.guideById.get(id)).filter(Boolean);
  const hero = includeHero ? `
    <div class="detail-hero">
      ${spriteFrame(mon)}
      <div class="detail-title">
        <p class="eyebrow">#${escapeHtml(mon.gameDexId || "???")} · ${escapeHtml(mon.archetype)}</p>
        <h2>${escapeHtml(mon.displayName)}</h2>
        <div class="type-row">${mon.types.map(typeBadge).join("")}</div>
        <p class="availability-line">${availabilityCopy(mon)}</p>
        <div class="detail-actions">
          <button class="primary-button detail-add-button" data-add="${escapeHtml(mon.id)}" type="button">Add to team</button>
        </div>
      </div>
    </div>
  ` : "";
  return `
    ${hero}
    <section class="detail-section">
      <h3>Core Data</h3>
      <div class="badge-row">
        ${checkpointBadge(pokemonCheckpoint(mon))}
        ${abilityBadges(mon.abilities)}
        ${evolutionBadges(mon)}
      </div>
      <div class="role-row" style="margin-top:10px">${roleBadges(mon.roles, 8)}</div>
    </section>
    <section class="detail-section">
      <h3>Defensive Matchups</h3>
      ${pokemonMatchupSection(mon)}
    </section>
    <section class="detail-section">
      <h3>Evolution Family</h3>
      ${familySection(mon)}
    </section>
    <section class="detail-section">
      <h3>Odyssey vs Vanilla</h3>
      ${statProfileSection(mon)}
    </section>
    <section class="detail-section">
      <h3>Availability Evidence</h3>
      ${availabilitySection(mon)}
    </section>
    <section class="detail-section">
      <h3>Guide Notes</h3>
      ${guideSection(guideEntries)}
    </section>
    <section class="detail-section">
      <h3>Learnset</h3>
      ${learnsetSection(mon)}
    </section>
  `;
}

function isMobileDetailLayout() {
  return window.matchMedia("(max-width: 860px)").matches;
}

function renderMobileDetail() {
  if (!elements.mobileDetailContent) return;
  const mon = getSelected();
  if (!mon) return;
  elements.mobileDetailTitle.textContent = mon.displayName;
  elements.mobileDetailContent.innerHTML = pokemonDetailMarkup(mon);
}

function openMobileDetail(id) {
  state.selectedId = id;
  state.mobileDetailOpen = true;
  closeAbilityPopover();
  renderMobileDetail();
  renderDetail();
  elements.mobileDetailModal.classList.add("open");
  elements.mobileDetailModal.setAttribute("aria-hidden", "false");
  document.body.classList.add("mobile-detail-open");
}

function closeMobileDetail() {
  state.mobileDetailOpen = false;
  closeAbilityPopover();
  elements.mobileDetailModal.classList.remove("open");
  elements.mobileDetailModal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("mobile-detail-open");
}

function showAbilityPopover(badge) {
  const tooltip = badge?.dataset.tooltip || badge?.getAttribute("title") || "";
  if (!tooltip) return;
  document.querySelectorAll(".ability-badge[aria-expanded='true']").forEach((item) => {
    item.setAttribute("aria-expanded", "false");
  });
  badge.setAttribute("aria-expanded", "true");
  elements.abilityPopoverTitle.textContent = badge.textContent.trim();
  elements.abilityPopoverText.textContent = tooltip;
  elements.abilityPopover.classList.add("open");
  elements.abilityPopover.setAttribute("aria-hidden", "false");
  state.abilityPopoverOpen = true;
}

function closeAbilityPopover() {
  if (!elements.abilityPopover) return;
  state.abilityPopoverOpen = false;
  elements.abilityPopover.classList.remove("open");
  elements.abilityPopover.setAttribute("aria-hidden", "true");
  document.querySelectorAll(".ability-badge[aria-expanded='true']").forEach((item) => {
    item.setAttribute("aria-expanded", "false");
  });
}

function handleAbilityClick(event) {
  const badge = event.target.closest(".ability-badge.has-tooltip");
  if (!badge) return false;
  showAbilityPopover(badge);
  return true;
}

function familySection(mon) {
  const family = (mon.family || [])
    .map((id) => state.pokemon.find((candidate) => candidate.id === id))
    .filter(Boolean);
  if (family.length <= 1) {
    return `<p class="muted">No parsed evolution relatives for this entry.</p>`;
  }
  return `
    <div class="family-chain">
      ${family.map((relative) => `
        <button class="family-member ${relative.id === mon.id ? "active" : ""}" data-family-id="${escapeHtml(relative.id)}" type="button">
          ${spriteFrame(relative)}
          <span>
            <strong>${escapeHtml(relative.displayName)}</strong>
            <small>#${escapeHtml(relative.gameDexId || "???")} · ${escapeHtml(relative.types.join(" / ") || "Unknown type")}</small>
            <em>${escapeHtml(familyEvolutionHint(relative))}</em>
          </span>
        </button>
      `).join("")}
    </div>
  `;
}

function statProfileSection(mon) {
  if (!mon.stats) return statTable(mon);
  return `
    ${statBars(mon, false)}
    ${statTable(mon)}
  `;
}

function statTable(mon) {
  if (!mon.stats) return `<p class="muted">No parsed stat table was found for this entry.</p>`;
  const rows = [
    ["HP", "hp"],
    ["Atk", "atk"],
    ["Def", "def"],
    ["Sp. Atk", "spa"],
    ["Sp. Def", "spd"],
    ["Speed", "spe"],
    ["Total", "total"],
  ];
  return `
    <table class="stat-table">
      <thead><tr><th>Stat</th><th>Odyssey</th><th>Vanilla</th><th>Delta</th></tr></thead>
      <tbody>
        ${rows.map(([label, key]) => {
          const current = key === "total" ? mon.baseTotal : mon.stats?.[key];
          const vanilla = key === "total" ? mon.vanillaTotal : mon.vanillaStats?.[key];
          const delta = key === "total" ? mon.statDelta?.total : mon.statDelta?.[key];
          const deltaClass = delta > 0 ? "positive" : delta < 0 ? "negative" : "";
          return `<tr><td>${label}</td><td>${current ?? "-"}</td><td>${vanilla ?? "-"}</td><td class="${deltaClass}">${delta ? `${delta > 0 ? "+" : ""}${delta}` : "-"}</td></tr>`;
        }).join("")}
      </tbody>
    </table>
  `;
}

function pokemonMatchupSection(mon) {
  if (!mon.types?.length) return `<p class="muted">No parsed type data for this entry.</p>`;
  const matchups = defensiveMatchups(mon.types)
    .filter((matchup) => matchup.multiplier !== 1)
    .sort((a, b) => b.multiplier - a.multiplier || attackTypes().indexOf(a.type) - attackTypes().indexOf(b.type));
  if (!matchups.length) return `<p class="muted">No non-neutral defensive matchups parsed.</p>`;
  const neutralCount = attackTypes().length - matchups.length;
  return `
    <div class="matchup-grid">
      ${matchups.map((matchup) => matchupPill(matchup)).join("")}
    </div>
    <p class="matchup-note">${neutralCount} neutral attack type${neutralCount === 1 ? "" : "s"}.</p>
  `;
}

function defensiveMatchups(defenderTypes) {
  return attackTypes().map((type) => ({
    type,
    multiplier: defensiveMultiplier(type, defenderTypes),
  }));
}

function matchupPill({ type, multiplier }) {
  return `
    <span class="matchup-pill ${matchupTone(multiplier)}">
      <span class="matchup-type-name" style="--type-color:${TYPE_COLORS[type] || "#6b7280"}">${escapeHtml(type)}</span>
      <strong>${escapeHtml(multiplierLabel(multiplier))}</strong>
    </span>
  `;
}

function matchupTone(multiplier) {
  if (multiplier === 0) return "immune";
  if (multiplier < 1) return "resist";
  if (multiplier > 1) return "weak";
  return "neutral";
}

function multiplierLabel(value) {
  if (value === 0.25) return "1/4x";
  if (value === 0.5) return "1/2x";
  if (value === 0) return "0x";
  if (Number.isInteger(value)) return `${value}x`;
  return `${Number(value.toFixed(2))}x`;
}

function recordTimingLabel(record) {
  if (record.startAvailable) return "Start";
  if (record.checkpointLabel) return record.levelCap ? `${record.checkpointLabel} · Lv.${record.levelCap}` : record.checkpointLabel;
  return record.phase || "Unknown";
}

function requirementText(requirement, exact = false) {
  const parts = [requirement.label].filter(Boolean);
  if (requirement.specialGate) {
    const gate = requirement.specialGate;
    parts.push(exact ? `${gate.source} · ${checkpointLabel(gate.checkpoint)}` : `Gate by ${checkpointLabel(gate.checkpoint)}`);
  }
  if (requirement.items?.length) {
    parts.push(...requirement.items.map((item) => {
      const timing = checkpointLabel(item.checkpoint);
      if (!exact) return `${item.item} source by ${timing}`;
      return `${item.item}: ${item.source}${item.location ? ` · ${item.location}` : ""}${item.method ? ` · ${item.method}` : ""}`;
    }));
  }
  if (requirement.missingItems?.length) parts.push(`Missing source for ${requirement.missingItems.join(", ")}`);
  return parts.join(" · ");
}

function timelineRequirementList(timeline, exact = false) {
  if (!timeline.requirements?.length) return "";
  return `
    <div class="requirement-list">
      ${timeline.requirements.map((requirement) => `<p>${escapeHtml(requirementText(requirement, exact))}</p>`).join("")}
    </div>
  `;
}

function availabilitySection(mon) {
  const records = mon.familyEncounters || [];
  const timeline = mon.timeline || {};
  const checkpoint = timeline.checkpoint || pokemonCheckpoint(mon);
  const exact = records.slice(0, 6).map((record) => `
    <div class="encounter-card">
      <strong>${escapeHtml(recordTimingLabel(record))} · ${escapeHtml(record.via || record.pokemon)}</strong>
      <p>${escapeHtml(record.area)} - ${escapeHtml(record.method)}${record.level ? ` · Lv. ${escapeHtml(record.level)}` : ""}${record.rate ? ` · ${escapeHtml(record.rate)}` : ""}</p>
      <p>${escapeHtml(record.source)}</p>
    </div>
  `).join("");

  if (!records.length && checkpoint.id === "unknown") {
    return `<p class="muted">No direct encounter was parsed. Check guide notes or source docs for special cases.</p>`;
  }

  const summary = `
    <div class="encounter-card">
      <strong>${escapeHtml(timeline.startAvailable ? "Start" : checkpointLabel(checkpoint))} availability</strong>
      <p>${escapeHtml(timeline.reason || `Earliest parsed route uses ${mon.availability?.via || mon.displayName}.`)}</p>
      ${timelineRequirementList(timeline, !state.spoilerSafe)}
    </div>
  `;

  if (!state.spoilerSafe) return summary + exact;

  return `
    ${summary}
    <details>
      <summary>Show exact parsed locations</summary>
      <div style="margin-top:8px">${exact}</div>
    </details>
  `;
}

function guideSection(entries) {
  if (!entries.length) return `<p class="muted">No role entry from the teambuilding guide was matched.</p>`;
  return entries.map((entry) => `
    <div class="guide-card">
      <strong>${escapeHtml(entry.role)}${entry.availability ? ` · ${escapeHtml(entry.availability)}` : ""}</strong>
      ${entry.item || entry.ability ? `<p>${escapeHtml([entry.item, entry.ability].filter(Boolean).join(" · "))}</p>` : ""}
      ${entry.moves?.length ? `<p>${escapeHtml(entry.moves.join(", "))}</p>` : ""}
      ${entry.howToObtain ? `<p>${escapeHtml(entry.howToObtain)}</p>` : ""}
      <p>Guide page ${entry.page}</p>
    </div>
  `).join("");
}

function learnsetSection(mon) {
  if (!mon.learnset?.length) return `<p class="muted">No learnset rows were parsed for this entry.</p>`;
  return `<div class="moves-list">${mon.learnset.map((move) => `
    <span class="move-pill"><span>${escapeHtml(move.move)}</span><span>${escapeHtml(move.level)}</span></span>
  `).join("")}</div>`;
}

function getSelected() {
  return state.pokemon.find((mon) => mon.id === state.selectedId) || state.pokemon[0];
}

function activeTeam() {
  return state.teams.find((team) => team.id === state.activeTeamId) || state.teams[0];
}

function saveTeams() {
  localStorage.setItem("odysseyTeams", JSON.stringify({ teams: state.teams, activeTeamId: state.activeTeamId }));
}

function loadTeams() {
  const saved = JSON.parse(localStorage.getItem("odysseyTeams") || "null");
  if (saved?.teams?.length) {
    state.teams = saved.teams;
    state.activeTeamId = saved.activeTeamId || saved.teams[0].id;
    return;
  }
  state.teams = [{
    id: crypto.randomUUID(),
    name: "Run 1",
    slots: ["plusle", "minun", null, null, null, null],
  }];
  state.activeTeamId = state.teams[0].id;
}

function renderTeams() {
  const team = activeTeam();
  elements.teamSelect.innerHTML = state.teams.map((item) => `
    <option value="${item.id}" ${item.id === state.activeTeamId ? "selected" : ""}>${escapeHtml(item.name)}</option>
  `).join("");

  elements.teamSlots.innerHTML = team.slots.map((id, index) => {
    const mon = state.pokemon.find((item) => item.id === id);
    if (!mon) return `<button class="team-slot empty" data-slot="${index}" type="button">Empty slot ${index + 1}</button>`;
    return `
      <div class="team-slot" data-slot="${index}">
        ${spriteFrame(mon)}
        <div>
          <span class="slot-name">${escapeHtml(mon.displayName)}</span>
          <span class="slot-meta">${escapeHtml(mon.types.join(" / "))} · ${escapeHtml(checkpointLabel(pokemonCheckpoint(mon), true))}</span>
        </div>
        <button class="slot-remove" data-remove-slot="${index}" type="button" title="Remove">×</button>
      </div>
    `;
  }).join("");

  elements.teamAnalysis.innerHTML = teamAnalysis(team).map((chip) => `
    <span class="analysis-chip ${chip.tone}">${escapeHtml(chip.label)}</span>
  `).join("");

  elements.teamDefense.innerHTML = teamDefenseSection(team);
}

function teamMembers(team) {
  return team.slots.map((id) => state.pokemon.find((mon) => mon.id === id)).filter(Boolean);
}

function teamAnalysis(team) {
  const members = teamMembers(team);
  if (!members.length) return [{ label: "No team members yet", tone: "warn" }];
  const roles = new Set(members.flatMap((mon) => mon.roles));
  const chips = [];
  const missing = [];
  if (![...roles].some((role) => role.includes("Damage"))) missing.push("damage");
  if (![...roles].some((role) => role.includes("Support"))) missing.push("support");
  if (![...roles].some((role) => role.includes("Fake Out"))) missing.push("Fake Out");
  if (![...roles].some((role) => role.includes("Redirection"))) missing.push("redirection");
  if (![...roles].some((role) => role.includes("Intimidate"))) missing.push("Intimidate");
  chips.push({ label: `${members.length}/6 filled`, tone: members.length === 6 ? "good" : "" });
  chips.push({ label: `${new Set(members.flatMap((mon) => mon.types)).size} team types`, tone: "good" });
  if (missing.length) chips.push({ label: `Missing ${missing.slice(0, 3).join(", ")}`, tone: "warn" });
  else chips.push({ label: "Core doubles roles covered", tone: "good" });

  const weaknesses = sharedWeaknesses(members);
  if (weaknesses.length) chips.push({ label: `Shared weak: ${weaknesses.slice(0, 3).join(", ")}`, tone: "warn" });
  else chips.push({ label: "No major shared weakness", tone: "good" });

  const latestCheckpoint = members.reduce((latest, mon) => {
    const checkpoint = pokemonCheckpoint(mon);
    return checkpoint.sort > latest.sort ? checkpoint : latest;
  }, { sort: 0, label: "Start", shortLabel: "Start" });
  chips.push({
    label: `Online by ${checkpointLabel(latestCheckpoint, true)}`,
    tone: latestCheckpoint.sort <= 2 ? "good" : latestCheckpoint.sort >= 9 ? "warn" : "",
  });
  return chips;
}

function sharedWeaknesses(members) {
  return attackTypes().filter((type) => {
    const weakCount = members.filter((mon) => defensiveMultiplier(type, mon.types) > 1).length;
    return weakCount >= Math.max(2, Math.ceil(members.length / 2));
  });
}

function teamDefenseSection(team) {
  const members = teamMembers(team);
  if (!members.length) {
    return `<section class="team-defense-panel"><p class="muted">Add Pokemon to see team defensive matchups.</p></section>`;
  }
  const summaries = attackTypes()
    .map((type) => teamMatchupSummary(type, members))
    .sort(sortTeamMatchups);

  return `
    <section class="team-defense-panel" aria-label="Team defensive matchups">
      <div class="team-defense-heading">
        <p class="eyebrow">Defensive matchups</p>
        <span>${members.length} Pokemon · attack type multipliers</span>
      </div>
      <div class="team-matchup-grid">
        ${summaries.map(teamMatchupCard).join("")}
      </div>
    </section>
  `;
}

function teamMatchupSummary(type, members) {
  const matchups = members.map((mon) => ({
    name: mon.displayName,
    multiplier: defensiveMultiplier(type, mon.types),
  }));
  const weak = matchups.filter((item) => item.multiplier > 1).length;
  const resist = matchups.filter((item) => item.multiplier > 0 && item.multiplier < 1).length;
  const immune = matchups.filter((item) => item.multiplier === 0).length;
  const average = matchups.reduce((sum, item) => sum + item.multiplier, 0) / members.length;
  const max = Math.max(...matchups.map((item) => item.multiplier));
  const pressure = weak * 10 + max + average;
  const tone = weak >= Math.max(2, Math.ceil(members.length / 2)) || max >= 4
    ? "warn"
    : (immune > 0 || resist >= Math.ceil(members.length / 2) ? "good" : "");

  return { type, weak, resist, immune, average, max, pressure, tone, matchups, total: members.length };
}

function sortTeamMatchups(a, b) {
  return b.pressure - a.pressure || attackTypes().indexOf(a.type) - attackTypes().indexOf(b.type);
}

function teamMatchupCard(summary) {
  const title = summary.matchups
    .map((item) => `${item.name}: ${multiplierLabel(item.multiplier)}`)
    .join(" · ");
  return `
    <div class="team-matchup-card ${summary.tone}" title="${escapeHtml(title)}">
      <span class="team-matchup-type" style="--type-color:${TYPE_COLORS[summary.type] || "#6b7280"}">${escapeHtml(summary.type)}</span>
      <strong>${summary.weak}/${summary.total} weak</strong>
      <small>${summary.resist} resist · ${summary.immune} immune · avg ${escapeHtml(multiplierLabel(summary.average))}</small>
    </div>
  `;
}

function defensiveMultiplier(attackType, defenderTypes) {
  return defenderTypes.reduce((mult, defender) => {
    return mult * (TYPE_EFFECTIVENESS[attackType]?.[defender] ?? 1);
  }, 1);
}

function addToTeam(id) {
  const team = activeTeam();
  const emptyIndex = team.slots.findIndex((slot) => !slot);
  const targetIndex = emptyIndex >= 0 ? emptyIndex : 5;
  team.slots[targetIndex] = id;
  saveTeams();
  renderTeams();
}

function wireEvents() {
  elements.search.addEventListener("input", () => {
    state.search = elements.search.value;
    renderGrid();
  });
  elements.sort.addEventListener("change", () => {
    state.sort = elements.sort.value;
    renderGrid();
  });
  elements.archetype.addEventListener("change", () => {
    state.archetype = elements.archetype.value;
    renderGrid();
  });
  elements.spoilerToggle.addEventListener("change", () => {
    closeAbilityPopover();
    state.spoilerSafe = elements.spoilerToggle.checked;
    renderGrid();
    renderDetail();
    if (state.mobileDetailOpen) renderMobileDetail();
  });
  elements.reset.addEventListener("click", () => {
    state.search = "";
    state.checkpointModes = {};
    state.sources.clear();
    state.types.clear();
    state.abilities.clear();
    state.weaknessTypes.clear();
    state.resistTypes.clear();
    state.evolutionFilters.clear();
    state.abilitySearch = "";
    state.roles.clear();
    state.archetype = "All";
    state.sort = "availability";
    elements.search.value = "";
    elements.abilitySearch.value = "";
    elements.sort.value = state.sort;
    renderFilters();
    renderGrid();
  });
  elements.phaseFilters.addEventListener("click", (event) => {
    const checkpoint = event.target.closest("[data-checkpoint]")?.dataset.checkpoint;
    if (!checkpoint) return;
    cycleCheckpointMode(checkpoint);
    renderFilters();
    renderGrid();
  });
  elements.sourceFilters.addEventListener("click", (event) => {
    const source = event.target.closest("[data-source]")?.dataset.source;
    if (!source) return;
    toggleSet(state.sources, source);
    renderFilters();
    renderGrid();
  });
  elements.typeFilters.addEventListener("click", (event) => {
    const type = event.target.closest("[data-type]")?.dataset.type;
    if (!type) return;
    toggleSet(state.types, type);
    renderFilters();
    renderGrid();
  });
  elements.weaknessFilters.addEventListener("click", (event) => {
    const type = event.target.closest("[data-weakness]")?.dataset.weakness;
    if (!type) return;
    toggleSet(state.weaknessTypes, type);
    renderFilters();
    renderGrid();
  });
  elements.resistFilters.addEventListener("click", (event) => {
    const type = event.target.closest("[data-resist]")?.dataset.resist;
    if (!type) return;
    toggleSet(state.resistTypes, type);
    renderFilters();
    renderGrid();
  });
  elements.abilitySearch.addEventListener("input", () => {
    state.abilitySearch = elements.abilitySearch.value;
    renderFilters();
  });
  elements.abilityFilters.addEventListener("click", (event) => {
    const button = event.target.closest("[data-ability]");
    const ability = button?.dataset.ability;
    if (!ability) return;
    if (isMobileDetailLayout()) showAbilityPopover(button);
    toggleSet(state.abilities, ability);
    renderFilters();
    renderGrid();
  });
  elements.evolutionFilters.addEventListener("click", (event) => {
    const filter = event.target.closest("[data-evolution-filter]")?.dataset.evolutionFilter;
    if (!filter) return;
    toggleSet(state.evolutionFilters, filter);
    renderFilters();
    renderGrid();
  });
  elements.roleFilters.addEventListener("click", (event) => {
    const role = event.target.closest("[data-role]")?.dataset.role;
    if (!role) return;
    toggleSet(state.roles, role);
    renderFilters();
    renderGrid();
  });
  elements.grid.addEventListener("click", (event) => {
    if (handleAbilityClick(event)) return;
    const addId = event.target.closest("[data-add]")?.dataset.add;
    if (addId) {
      addToTeam(addId);
      return;
    }
    const card = event.target.closest("[data-id]");
    if (!card) return;
    closeAbilityPopover();
    if (isMobileDetailLayout()) {
      openMobileDetail(card.dataset.id);
      return;
    }
    state.selectedId = card.dataset.id;
    renderGrid();
    renderDetail();
  });
  elements.detail.addEventListener("click", (event) => {
    if (handleAbilityClick(event)) return;
    const addId = event.target.closest("[data-add]")?.dataset.add;
    if (addId) {
      addToTeam(addId);
      return;
    }
    const familyId = event.target.closest("[data-family-id]")?.dataset.familyId;
    if (!familyId) return;
    closeAbilityPopover();
    state.selectedId = familyId;
    renderGrid();
    renderDetail();
  });
  elements.mobileDetailModal.addEventListener("click", (event) => {
    if (handleAbilityClick(event)) return;
    if (event.target.closest("[data-mobile-detail-close]")) {
      closeMobileDetail();
      return;
    }
    const addId = event.target.closest("[data-add]")?.dataset.add;
    if (addId) {
      addToTeam(addId);
      return;
    }
    const familyId = event.target.closest("[data-family-id]")?.dataset.familyId;
    if (!familyId) return;
    closeAbilityPopover();
    state.selectedId = familyId;
    renderMobileDetail();
    renderDetail();
  });
  elements.mobileDetailClose.addEventListener("click", closeMobileDetail);
  elements.abilityPopoverClose.addEventListener("click", closeAbilityPopover);
  document.addEventListener("click", (event) => {
    if (!state.abilityPopoverOpen) return;
    if (event.target.closest("#ability-popover") || event.target.closest(".ability-badge.has-tooltip, .ability-filter-chip.has-tooltip")) return;
    closeAbilityPopover();
  });
  window.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    if (state.abilityPopoverOpen) {
      closeAbilityPopover();
      return;
    }
    if (state.mobileDetailOpen) closeMobileDetail();
  });
  window.addEventListener("resize", () => {
    if (!isMobileDetailLayout() && state.mobileDetailOpen) closeMobileDetail();
  });
  elements.addSelected.addEventListener("click", () => {
    const selected = getSelected();
    if (selected) addToTeam(selected.id);
  });
  elements.teamSelect.addEventListener("change", () => {
    state.activeTeamId = elements.teamSelect.value;
    saveTeams();
    renderTeams();
  });
  elements.newTeam.addEventListener("click", () => {
    const index = state.teams.length + 1;
    const team = { id: crypto.randomUUID(), name: `Run ${index}`, slots: ["plusle", "minun", null, null, null, null] };
    state.teams.push(team);
    state.activeTeamId = team.id;
    saveTeams();
    renderTeams();
  });
  elements.renameTeam.addEventListener("click", () => {
    const team = activeTeam();
    const name = prompt("Team name", team.name);
    if (!name?.trim()) return;
    team.name = name.trim().slice(0, 40);
    saveTeams();
    renderTeams();
  });
  elements.deleteTeam.addEventListener("click", () => {
    if (state.teams.length === 1) return;
    state.teams = state.teams.filter((team) => team.id !== state.activeTeamId);
    state.activeTeamId = state.teams[0].id;
    saveTeams();
    renderTeams();
  });
  elements.teamSlots.addEventListener("click", (event) => {
    const removeIndex = event.target.closest("[data-remove-slot]")?.dataset.removeSlot;
    if (removeIndex !== undefined) {
      activeTeam().slots[Number(removeIndex)] = null;
      saveTeams();
      renderTeams();
    }
  });
}

function toggleSet(set, value) {
  if (set.has(value)) set.delete(value);
  else set.add(value);
}

async function init() {
  const response = await fetch(DATA_URL);
  state.data = await response.json();
  state.pokemon = state.data.pokemon;
  state.statRanges = computeStatRanges(state.pokemon);
  state.guideById = new Map(state.data.guideEntries.map((entry) => [entry.id, entry]));
  state.abilityDefinitions = new Map((state.data.abilityDefinitions || []).map((entry) => [entry.id, entry]));
  state.selectedId = state.pokemon.find((mon) => mon.id === "plusle")?.id || state.pokemon[0]?.id;
  loadTeams();
  renderFilters();
  renderGrid();
  renderDetail();
  renderTeams();
  wireEvents();
}

init().catch((error) => {
  console.error(error);
  elements.grid.innerHTML = `<div class="empty-state">Could not load Odyssey data. Start a local server from the project root and reload.</div>`;
});
