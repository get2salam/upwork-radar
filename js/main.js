const CONFIG = {
  slug: 'upwork-radar',
  title: 'Upwork Radar',
  boardTitle: 'Opportunity radar',
  boardSubtitle: 'A local-first shortlist board for high-fit freelance leads.',
  categories: ['AI', 'Automation', 'Scraping', 'Content'],
  states: ['Seen', 'Shortlisted', 'Applying', 'Passed'],
  items: [
    {
      title: 'Legal AI prototype request',
      category: 'AI',
      state: 'Shortlisted',
      score: 9,
      effort: 4,
      winChance: 8,
      budget: 3200,
      deadline: '2026-04-28',
      deliverable: 'Clickable prototype and scoped technical plan',
      hook: 'Lead with domain overlap and rapid prototype discipline.',
      note: 'High-fit because the problem space overlaps with long-term domain ambition.',
    },
    {
      title: 'Small browser automation fix',
      category: 'Automation',
      state: 'Passed',
      score: 4,
      effort: 1,
      winChance: 3,
      budget: 250,
      deadline: '2026-04-25',
      deliverable: 'One small browser workflow patch',
      hook: 'Quick fix, but low leverage and weak signal.',
      note: 'Easy money, but little signal and weak leverage.',
    },
    {
      title: 'Large scraping rebuild',
      category: 'Scraping',
      state: 'Applying',
      score: 8,
      effort: 5,
      winChance: 7,
      budget: 4800,
      deadline: '2026-04-27',
      deliverable: 'Stable scraper rebuild with retry and audit flow',
      hook: 'Stress reliability, observability, and data recovery.',
      note: 'Worth it if the proposal highlights reliability and delivery discipline.',
    },
  ],
};

const STORAGE_KEY = `${CONFIG.slug}/state/v2`;
const NUMBER_FIELDS = new Set(['score', 'effort', 'winChance', 'budget']);
const refs = {
  boardTitle: document.querySelector('[data-role="board-title"]'),
  boardSubtitle: document.querySelector('[data-role="board-subtitle"]'),
  stats: document.querySelector('[data-role="stats"]'),
  insights: document.querySelector('[data-role="insights"]'),
  count: document.querySelector('[data-role="count"]'),
  list: document.querySelector('[data-role="list"]'),
  editor: document.querySelector('[data-role="editor"]'),
  secondaryPrimary: document.querySelector('[data-role="secondary-primary"]'),
  secondarySecondary: document.querySelector('[data-role="secondary-secondary"]'),
  search: document.querySelector('[data-field="search"]'),
  category: document.querySelector('[data-field="category"]'),
  status: document.querySelector('[data-field="status"]'),
  importFile: document.querySelector('#import-file'),
};

const toastHost = (() => {
  const host = document.createElement('div');
  host.className = 'toast-host';
  host.setAttribute('role', 'status');
  host.setAttribute('aria-live', 'polite');
  host.setAttribute('aria-atomic', 'true');
  document.body.appendChild(host);
  return host;
})();

function showToast(message) {
  const node = document.createElement('div');
  node.className = 'toast';
  node.textContent = message;
  toastHost.appendChild(node);
  requestAnimationFrame(() => node.classList.add('is-visible'));
  setTimeout(() => {
    node.classList.remove('is-visible');
    setTimeout(() => node.remove(), 200);
  }, 2200);
}

function uid() {
  return `${CONFIG.slug}_${Math.random().toString(36).slice(2, 10)}`;
}

function todayISO(offset = 0) {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + offset);
  return date.toISOString().slice(0, 10);
}

function daysFromToday(value) {
  if (!value) return 999;
  const today = new Date(`${todayISO()}T00:00:00`);
  const target = new Date(`${value}T00:00:00`);
  return Math.round((target - today) / 86400000);
}

function formatDate(value) {
  if (!value) return 'No date';
  return new Date(`${value}T00:00:00`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

function formatMoney(value) {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(Number(value || 0));
}

function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function safeNumber(value, fallback, min, max) {
  if (value === null || value === undefined || value === '') return fallback;
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.min(Math.max(num, min), max);
}

function safeDeadline(value, fallback) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return fallback;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? fallback : value;
}

function normalize(item = {}) {
  return {
    id: item.id || uid(),
    title: item.title || 'New lead',
    category: CONFIG.categories.includes(item.category) ? item.category : CONFIG.categories[0],
    state: CONFIG.states.includes(item.state) ? item.state : CONFIG.states[0],
    score: safeNumber(item.score, 7, 1, 10),
    effort: safeNumber(item.effort, 3, 1, 10),
    winChance: safeNumber(item.winChance, 5, 1, 10),
    budget: safeNumber(item.budget, 1000, 0, Number.MAX_SAFE_INTEGER),
    deadline: safeDeadline(item.deadline, todayISO(3)),
    deliverable: item.deliverable || 'Key deliverable or scope',
    hook: item.hook || 'Why you are a strong fit for this opportunity.',
    note: item.note || 'Capture the angle, risk, and next move before you write the proposal.',
  };
}

function priority(item) {
  const deadlineBoost = Math.max(0, 4 - Math.max(daysFromToday(item.deadline), 0)) * 5;
  const stateBoost = item.state === 'Applying' ? 10 : item.state === 'Shortlisted' ? 6 : item.state === 'Seen' ? 2 : -12;
  const budgetBoost = Math.min(Math.round(item.budget / 250), 40);
  return item.score * 6 + item.winChance * 5 + budgetBoost + deadlineBoost + stateBoost - item.effort * 4;
}

function seedState() {
  return {
    boardTitle: CONFIG.boardTitle,
    boardSubtitle: CONFIG.boardSubtitle,
    items: CONFIG.items.map((item) => normalize(item)),
    ui: { search: '', category: 'all', status: 'all', selectedId: null },
  };
}

function hydrate() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return seedState();
    const parsed = JSON.parse(raw);
    return {
      ...seedState(),
      ...parsed,
      items: (parsed.items || []).map((item) => normalize(item)),
      ui: { ...seedState().ui, ...(parsed.ui || {}) },
    };
  } catch (error) {
    console.warn('Falling back to seed state', error);
    return seedState();
  }
}

let state = hydrate();
if (!state.ui.selectedId && state.items[0]) state.ui.selectedId = state.items[0].id;

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function filteredItems() {
  const query = state.ui.search.trim().toLowerCase();
  return [...state.items]
    .filter((item) => state.ui.category === 'all' || item.category === state.ui.category)
    .filter((item) => state.ui.status === 'all' || item.state === state.ui.status)
    .filter((item) => !query || `${item.title} ${item.note} ${item.category} ${item.state} ${item.deliverable} ${item.hook}`.toLowerCase().includes(query))
    .sort((a, b) => priority(b) - priority(a) || daysFromToday(a.deadline) - daysFromToday(b.deadline));
}

function selectedItem() {
  return state.items.find((item) => item.id === state.ui.selectedId) || filteredItems()[0] || null;
}

function commit(nextState) {
  state = nextState;
  if (!state.ui.selectedId && state.items[0]) state.ui.selectedId = state.items[0].id;
  persist();
  render();
}

function updateSelected(field, value) {
  const target = selectedItem();
  if (!target) return;
  commit({
    ...state,
    items: state.items.map((item) => item.id === target.id ? { ...item, [field]: NUMBER_FIELDS.has(field) ? Number(value) : value } : item),
  });
}

function addItem() {
  const item = normalize({ title: 'New lead', deliverable: 'Key deliverable', hook: 'Why you are a strong fit.' });
  commit({
    ...state,
    items: [item, ...state.items],
    ui: { ...state.ui, selectedId: item.id },
  });
  showToast('Added a new lead.');
}

function removeSelected() {
  const target = selectedItem();
  if (!target) return;
  const nextItems = state.items.filter((item) => item.id !== target.id);
  commit({
    ...state,
    items: nextItems,
    ui: { ...state.ui, selectedId: nextItems[0]?.id || null },
  });
  showToast('Removed lead.');
}

function exportState() {
  const blob = new Blob([JSON.stringify({ schema: `${CONFIG.slug}/v2`, ...state }, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${CONFIG.slug}.json`;
  link.click();
  URL.revokeObjectURL(url);
  showToast('Downloaded backup.');
}

async function importState(file) {
  const raw = await file.text();
  const parsed = JSON.parse(raw);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Backup must be a JSON object.');
  }
  if (parsed.items !== undefined && !Array.isArray(parsed.items)) {
    throw new Error('Backup "items" must be an array.');
  }
  commit({
    ...seedState(),
    ...parsed,
    items: (parsed.items || []).map((item) => normalize(item)),
    ui: { ...seedState().ui, ...(parsed.ui || {}) },
  });
  showToast('Imported backup.');
}

function cleanFragment(value, fallback) {
  const trimmed = String(value || '').trim().replace(/[\s.,;:!?-]+$/, '');
  return (trimmed || fallback).toLowerCase();
}

function proposalOpener(item) {
  const deliverable = cleanFragment(item.deliverable, 'the engagement');
  const hook = cleanFragment(item.hook, 'a focused first milestone');
  return `Hi, this looks like a strong fit. I would approach the ${deliverable} by focusing on ${hook} and shipping a clear first milestone quickly.`;
}

async function copyProposalOpener() {
  const target = selectedItem();
  if (!target) return;
  const text = proposalOpener(target);
  try {
    await navigator.clipboard.writeText(text);
    showToast('Copied proposal opener.');
  } catch (error) {
    window.prompt('Copy this proposal opener:', text);
  }
}

function moveApplying() {
  const target = selectedItem();
  if (!target) return;
  commit({
    ...state,
    items: state.items.map((item) => item.id === target.id ? { ...item, state: 'Applying', winChance: Math.max(item.winChance, 6) } : item),
  });
  showToast('Moved lead to applying.');
}

function markPassed() {
  const target = selectedItem();
  if (!target) return;
  commit({
    ...state,
    items: state.items.map((item) => item.id === target.id ? { ...item, state: 'Passed' } : item),
  });
  showToast('Marked lead as passed.');
}

function toneForDeadline(item) {
  const days = daysFromToday(item.deadline);
  if (days <= 1) return 'danger';
  if (days <= 3) return 'warn';
  return 'success';
}

function renderStats(items) {
  const liveValue = state.items.filter((item) => item.state !== 'Passed').reduce((sum, item) => sum + item.budget, 0);
  const applying = state.items.filter((item) => item.state === 'Applying').length;
  const avgWin = state.items.length ? (state.items.reduce((sum, item) => sum + item.winChance, 0) / state.items.length).toFixed(1) : '0.0';
  const urgent = state.items.filter((item) => daysFromToday(item.deadline) <= 3 && item.state !== 'Passed').length;
  const cards = [
    ['Leads', String(state.items.length), 'tracked opportunities'],
    ['Live pipeline', formatMoney(liveValue), 'budget still worth chasing'],
    ['Applying now', String(applying), `${urgent} close within 3 days`],
    ['Win chance', avgWin, 'average confidence across the board'],
  ];
  refs.stats.innerHTML = cards.map(([label, valueText, note]) => `
    <article class="card stat">
      <span>${label}</span>
      <strong>${valueText}</strong>
      <small>${note}</small>
    </article>
  `).join('');
  refs.count.textContent = items[0] ? `Top: ${items[0].title}` : 'No leads';
}

function renderInsights(items) {
  const soonest = [...state.items].filter((item) => item.state !== 'Passed').sort((a, b) => daysFromToday(a.deadline) - daysFromToday(b.deadline))[0];
  const biggest = [...state.items].sort((a, b) => b.budget - a.budget)[0];
  const strongest = items[0];
  const cards = [
    {
      label: 'Best current bet',
      title: strongest?.title || 'No lead yet',
      body: strongest ? `Priority ${priority(strongest)}, ${strongest.winChance}/10 win chance.` : 'Add a lead to surface the strongest opportunity.',
    },
    {
      label: 'Closes soonest',
      title: soonest?.title || 'No deadline yet',
      body: soonest ? `${formatDate(soonest.deadline)} · ${formatMoney(soonest.budget)} budget.` : 'Deadlines help decide what deserves immediate effort.',
    },
    {
      label: 'Largest budget',
      title: biggest?.title || 'No budget data',
      body: biggest ? `${formatMoney(biggest.budget)} with ${biggest.winChance}/10 confidence.` : 'The biggest opportunity will surface here.',
    },
  ];
  refs.insights.innerHTML = cards.map((card) => `
    <article class="card insight-card">
      <p class="eyebrow">${card.label}</p>
      <h3>${escapeHtml(card.title)}</h3>
      <p>${card.body}</p>
    </article>
  `).join('');
}

function renderList(items) {
  if (!items.length) {
    refs.list.innerHTML = `
      <div class="empty">
        <strong>No leads yet</strong>
        <p>Add promising gigs and rank the ones worth pursuing.</p>
      </div>
    `;
    return;
  }

  refs.list.innerHTML = items.map((item) => `
    <button class="item ${item.id === state.ui.selectedId ? 'is-selected' : ''}" type="button" data-id="${item.id}" aria-pressed="${item.id === state.ui.selectedId}">
      <div class="item-top">
        <strong>${escapeHtml(item.title)}</strong>
        <span class="score">${priority(item)}</span>
      </div>
      <p>${escapeHtml(item.deliverable)}</p>
      <div class="badge-row">
        <span class="pill ${toneForDeadline(item)}">Deadline ${formatDate(item.deadline)}</span>
        <span class="pill">${formatMoney(item.budget)}</span>
        <span class="pill">${item.winChance}/10 fit</span>
      </div>
      <div class="meta">
        <span>${item.category}</span>
        <span>${item.state}</span>
        <span>Effort ${item.effort}/10</span>
        <span>${escapeHtml(item.hook)}</span>
      </div>
    </button>
  `).join('');
}

function renderEditor(item) {
  if (!item) {
    refs.editor.innerHTML = `
      <div class="empty">
        <strong>No selection</strong>
        <p>Pick a lead or create a new one.</p>
      </div>
    `;
    return;
  }

  refs.editor.innerHTML = `
    <div class="editor-head">
      <div>
        <p class="eyebrow">Lead editor</p>
        <h3>${escapeHtml(item.title)}</h3>
      </div>
      <span class="score">Priority ${priority(item)}</span>
    </div>
    <div class="editor-grid">
      <label class="field">
        <span>Lead title</span>
        <input type="text" data-item-field="title" value="${escapeHtml(item.title)}" />
      </label>
      <label class="field">
        <span>Deliverable</span>
        <input type="text" data-item-field="deliverable" value="${escapeHtml(item.deliverable)}" />
      </label>
      <label class="field">
        <span>Proposal angle</span>
        <input type="text" data-item-field="hook" value="${escapeHtml(item.hook)}" />
      </label>
      <label class="field">
        <span>Notes</span>
        <textarea data-item-field="note">${escapeHtml(item.note)}</textarea>
      </label>
      <div class="field-grid">
        <label class="field">
          <span>Type</span>
          <select data-item-field="category">${CONFIG.categories.map((entry) => `<option value="${entry}" ${item.category === entry ? 'selected' : ''}>${entry}</option>`).join('')}</select>
        </label>
        <label class="field">
          <span>Status</span>
          <select data-item-field="state">${CONFIG.states.map((entry) => `<option value="${entry}" ${item.state === entry ? 'selected' : ''}>${entry}</option>`).join('')}</select>
        </label>
      </div>
      <div class="field-grid">
        <label class="field">
          <span>Deadline</span>
          <input type="date" data-item-field="deadline" value="${item.deadline}" />
        </label>
        <label class="field">
          <span>Budget</span>
          <input type="number" min="0" step="50" data-item-field="budget" value="${item.budget}" />
        </label>
      </div>
      <div class="field-grid three">
        <label class="field range-wrap">
          <span>Win chance</span>
          <input type="range" min="1" max="10" data-item-field="winChance" value="${item.winChance}" />
          <output>${item.winChance} / 10</output>
        </label>
        <label class="field range-wrap">
          <span>Signal</span>
          <input type="range" min="1" max="10" data-item-field="score" value="${item.score}" />
          <output>${item.score} / 10</output>
        </label>
        <label class="field range-wrap">
          <span>Effort</span>
          <input type="range" min="1" max="10" data-item-field="effort" value="${item.effort}" />
          <output>${item.effort} / 10</output>
        </label>
      </div>
      <div class="quick-actions">
        <button class="btn" type="button" data-action="move-applying">Move to applying</button>
        <button class="btn" type="button" data-action="copy-opener">Copy proposal opener</button>
        <button class="btn" type="button" data-action="mark-passed">Pass this lead</button>
      </div>
      <div class="editor-actions">
        <span class="helper">Deadline ${formatDate(item.deadline)}, ${formatMoney(item.budget)} budget, ${item.winChance}/10 fit.</span>
        <button class="btn btn-danger" type="button" data-action="remove-current">Remove</button>
      </div>
    </div>
  `;
}

function renderPanels() {
  const live = [...state.items].filter((item) => item.state !== 'Passed').sort((a, b) => daysFromToday(a.deadline) - daysFromToday(b.deadline) || priority(b) - priority(a));
  refs.secondaryPrimary.innerHTML = `
    <div class="secondary-head">
      <div>
        <p class="eyebrow">Deadline queue</p>
        <h3>What needs a proposal next</h3>
      </div>
      <span class="chip">${live.length} live</span>
    </div>
    <div class="stack">
      ${live.slice(0, 4).map((item) => `
        <div class="mini-card">
          <div class="inline-split">
            <strong>${escapeHtml(item.title)}</strong>
            <span class="pill ${toneForDeadline(item)}">${formatDate(item.deadline)}</span>
          </div>
          <p>${formatMoney(item.budget)} · ${item.state} · ${item.winChance}/10 win chance.</p>
        </div>
      `).join('') || `<div class="empty"><strong>No live leads</strong><p>Passed leads fall out of the active queue automatically.</p></div>`}
    </div>
  `;

  const item = selectedItem();
  refs.secondarySecondary.innerHTML = item ? `
    <div class="secondary-head">
      <div>
        <p class="eyebrow">Proposal snapshot</p>
        <h3>${escapeHtml(item.title)}</h3>
      </div>
      <span class="chip">${formatMoney(item.budget)}</span>
    </div>
    <div class="stack">
      <div class="mini-card">
        <strong>Suggested opener</strong>
        <p>${escapeHtml(proposalOpener(item))}</p>
      </div>
      <ul class="metric-list">
        <li><span>Primary hook</span><strong>${escapeHtml(item.hook)}</strong></li>
        <li><span>Deliverable</span><strong>${escapeHtml(item.deliverable)}</strong></li>
        <li><span>Best next move</span><strong>${item.state === 'Applying' ? 'Finish the proposal today' : 'Shortlist and tailor the opener'}</strong></li>
      </ul>
    </div>
  ` : `
    <div class="empty">
      <strong>No proposal preview</strong>
      <p>Select a lead to generate a pitch angle.</p>
    </div>
  `;
}

function render() {
  refs.boardTitle.textContent = state.boardTitle;
  refs.boardSubtitle.textContent = state.boardSubtitle;
  refs.search.value = state.ui.search;
  refs.category.innerHTML = `<option value="all">All types</option>${CONFIG.categories.map((entry) => `<option value="${entry}" ${state.ui.category === entry ? 'selected' : ''}>${entry}</option>`).join('')}`;
  refs.status.innerHTML = `<option value="all">All statuses</option>${CONFIG.states.map((entry) => `<option value="${entry}" ${state.ui.status === entry ? 'selected' : ''}>${entry}</option>`).join('')}`;
  const items = filteredItems();
  if (!items.some((item) => item.id === state.ui.selectedId)) state.ui.selectedId = items[0]?.id || null;
  renderStats(items);
  renderInsights(items);
  renderList(items);
  renderEditor(selectedItem());
  renderPanels();
}

document.addEventListener('click', (event) => {
  const itemButton = event.target.closest('.item');
  if (itemButton) {
    commit({ ...state, ui: { ...state.ui, selectedId: itemButton.dataset.id } });
    return;
  }

  const action = event.target.closest('[data-action]')?.dataset.action;
  if (!action) return;
  if (action === 'new') addItem();
  if (action === 'reset') { commit(seedState()); showToast('Re-seeded sample board.'); }
  if (action === 'remove-current') removeSelected();
  if (action === 'export') exportState();
  if (action === 'import') refs.importFile.click();
  if (action === 'move-applying') moveApplying();
  if (action === 'copy-opener') copyProposalOpener();
  if (action === 'mark-passed') markPassed();
});

document.addEventListener('input', (event) => {
  const field = event.target.dataset.field;
  if (field === 'search') {
    commit({ ...state, ui: { ...state.ui, search: event.target.value } });
    return;
  }
  const itemField = event.target.dataset.itemField;
  if (itemField) updateSelected(itemField, event.target.value);
});

document.addEventListener('change', async (event) => {
  const field = event.target.dataset.field;
  if (field === 'category' || field === 'status') {
    commit({ ...state, ui: { ...state.ui, [field]: event.target.value } });
    return;
  }
  if (event.target.id === 'import-file') {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      await importState(file);
    } catch (error) {
      console.error(error);
      showToast(error?.message ? `Import failed: ${error.message}` : 'Import failed.');
    } finally {
      event.target.value = '';
    }
  }
});

document.addEventListener('keydown', (event) => {
  if (event.target.closest('input, textarea, select')) return;
  if (event.key.toLowerCase() === 'n') {
    event.preventDefault();
    addItem();
  }
  if (event.key === '/') {
    event.preventDefault();
    refs.search.focus();
  }
});

render();
