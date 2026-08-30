// ---- WishBack v2 ----
// Data model:
//   People:      { id, name, bday ('MM-DD'), tag }
//   Wish Events: { id, personId, direction ('sent'|'received'), timestamp (ISO), year (number) }
// 'year' is the calendar year of the nearest birthday occurrence to the event's
// timestamp, so the same person's reciprocity can be tracked across multiple years.

const PEOPLE_KEY = 'wishback_people';
const EVENTS_KEY = 'wishback_events';

// ---- Storage ----
function loadPeople() { return JSON.parse(localStorage.getItem(PEOPLE_KEY) || '[]'); }
function savePeople(p) { localStorage.setItem(PEOPLE_KEY, JSON.stringify(p)); }
function loadEvents() { return JSON.parse(localStorage.getItem(EVENTS_KEY) || '[]'); }
function saveEvents(e) { localStorage.setItem(EVENTS_KEY, JSON.stringify(e)); }
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

// ---- Date helpers ----
function bdayToMD(dateInputValue) {
  const [, m, d] = dateInputValue.split('-');
  return `${m}-${d}`;
}
function mdToDateInputValue(md) {
  // datetime <input type=date> needs a full date; year is irrelevant here, use 2000
  const [m, d] = md.split('-');
  return `2000-${m}-${d}`;
}
function nextOccurrence(birthdayMD, from = new Date()) {
  const today = new Date(from);
  today.setHours(0, 0, 0, 0);
  const [month, day] = birthdayMD.split('-').map(Number);
  let next = new Date(today.getFullYear(), month - 1, day);
  if (next < today) next = new Date(today.getFullYear() + 1, month - 1, day);
  return next;
}
function nearestOccurrence(birthdayMD, eventDate) {
  const [month, day] = birthdayMD.split('-').map(Number);
  const y = eventDate.getFullYear();
  const candidates = [
    new Date(y - 1, month - 1, day),
    new Date(y, month - 1, day),
    new Date(y + 1, month - 1, day),
  ];
  return candidates.reduce((closest, c) =>
    Math.abs(c - eventDate) < Math.abs(closest - eventDate) ? c : closest
  );
}
function daysUntil(date) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((date - today) / 86400000);
}
function isSameCalendarDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function formatDateShort(date) {
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
function formatDateTime(iso) {
  return new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ---- Timing classification (playful, not judgmental) ----
function classifyTiming(birthdayMD, eventISO) {
  const eventDate = new Date(eventISO);
  const occurrence = nearestOccurrence(birthdayMD, eventDate);
  if (isSameCalendarDay(eventDate, occurrence)) {
    return eventDate.getHours() >= 21 ? 'lastminute' : 'onday';
  }
  return eventDate < occurrence ? 'early' : 'belated';
}
const TIMING_LABELS = {
  early: { emoji: '🌅', label: 'Early Bird', cls: 'good' },
  onday: { emoji: '🎂', label: 'On the Day', cls: 'good' },
  lastminute: { emoji: '🌙', label: 'Last Minute', cls: 'mid' },
  belated: { emoji: '🕊️', label: 'Belated', cls: 'bad' },
  none: { emoji: '👻', label: "Didn't Wish", cls: 'none' },
};

// ---- CRUD: People ----
function addPerson(name, bday, tag) {
  const people = loadPeople();
  people.push({ id: uid(), name, bday, tag });
  savePeople(people);
}
function updatePerson(id, updates) {
  const people = loadPeople().map(p => p.id === id ? { ...p, ...updates } : p);
  savePeople(people);
}
function deletePerson(id) {
  savePeople(loadPeople().filter(p => p.id !== id));
  saveEvents(loadEvents().filter(e => e.personId !== id));
}

// ---- CRUD: Wish Events ----
function addEvent(personId, direction, timestampISO) {
  const person = loadPeople().find(p => p.id === personId);
  const year = nearestOccurrence(person.bday, new Date(timestampISO)).getFullYear();
  const events = loadEvents();
  events.push({ id: uid(), personId, direction, timestamp: timestampISO, year });
  saveEvents(events);
}
function updateEvent(id, updates) {
  const events = loadEvents();
  const idx = events.findIndex(e => e.id === id);
  if (idx === -1) return;
  const merged = { ...events[idx], ...updates };
  const person = loadPeople().find(p => p.id === merged.personId);
  if (person) merged.year = nearestOccurrence(person.bday, new Date(merged.timestamp)).getFullYear();
  events[idx] = merged;
  saveEvents(events);
}
function deleteEvent(id) {
  saveEvents(loadEvents().filter(e => e.id !== id));
}

// ---- Derived: per-person, per-year grouping ----
function getPersonEvents(personId) {
  return loadEvents().filter(e => e.personId === personId).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}
function getYearGroups(personId) {
  const events = getPersonEvents(personId);
  const years = {};
  events.forEach(e => {
    years[e.year] = years[e.year] || { received: null, sent: null };
    if (!years[e.year][e.direction]) years[e.year][e.direction] = e;
  });
  return years; // { year: { received: event|null, sent: event|null } }
}
function getPersonLatestStatus(person) {
  const years = getYearGroups(person.id);
  const yearKeys = Object.keys(years).map(Number).sort((a, b) => b - a);
  if (yearKeys.length === 0) return { received: null, sent: null, receivedTiming: 'none', sentTiming: 'none' };
  const latest = years[yearKeys[0]];
  return {
    received: latest.received,
    sent: latest.sent,
    receivedTiming: latest.received ? classifyTiming(person.bday, latest.received.timestamp) : 'none',
    sentTiming: latest.sent ? classifyTiming(person.bday, latest.sent.timestamp) : 'none',
  };
}

// ---- View routing ----
const views = ['dashboard', 'calendar', 'circle'];
function setView(view) {
  views.forEach(v => {
    document.getElementById(`view-${v}`).hidden = v !== view;
  });
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.view === view));
  if (view === 'calendar') renderCalendar();
}
document.getElementById('tabs').addEventListener('click', (e) => {
  const btn = e.target.closest('.tab');
  if (btn) setView(btn.dataset.view);
});

// ---- Modal helpers ----
function openModal(id) { document.getElementById(id).hidden = false; }
function closeModal(id) { document.getElementById(id).hidden = true; }
document.querySelectorAll('[data-close-modal]').forEach(btn => {
  btn.addEventListener('click', () => closeModal(btn.dataset.closeModal));
});
document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
  backdrop.addEventListener('click', (e) => { if (e.target === backdrop) backdrop.hidden = true; });
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-backdrop').forEach(b => { if (!b.hidden) b.hidden = true; });
  }
});

// ================= DASHBOARD =================
function renderDashboard() {
  const people = loadPeople();
  renderScore(people);
  renderStats(people);
  renderRecent();
  renderSidebar(people);
}

function renderScore(people) {
  const scoreCard = document.getElementById('scoreCard');
  const scoreNumber = document.getElementById('scoreNumber');
  const scoreBreakdown = document.getElementById('scoreBreakdown');

  const yearInstances = [];
  people.forEach(p => {
    const years = getYearGroups(p.id);
    Object.values(years).forEach(y => yearInstances.push(y));
  });

  if (yearInstances.length === 0) {
    scoreCard.hidden = true;
    return;
  }
  scoreCard.hidden = false;

  const reciprocated = yearInstances.filter(y => y.received && y.sent).length;
  const pct = Math.round((reciprocated / yearInstances.length) * 100);
  const onTime = yearInstances.filter(y => y.received).length; // computed below more precisely in stats
  scoreNumber.textContent = `${pct}%`;
  scoreBreakdown.textContent = `${reciprocated}/${yearInstances.length} birthday-years reciprocated`;
}

function renderStats(people) {
  const events = loadEvents();
  const received = events.filter(e => e.direction === 'received');
  const sent = events.filter(e => e.direction === 'sent');

  let reciprocatedYears = 0;
  people.forEach(p => {
    Object.values(getYearGroups(p.id)).forEach(y => { if (y.received && y.sent) reciprocatedYears++; });
  });

  const statsGrid = document.getElementById('statsGrid');
  statsGrid.innerHTML = `
    <div class="stat-box"><div class="num">${people.length}</div><div class="label">People tracked</div></div>
    <div class="stat-box"><div class="num">${received.length}</div><div class="label">Wishes received</div></div>
    <div class="stat-box"><div class="num">${sent.length}</div><div class="label">Wishes sent</div></div>
    <div class="stat-box pink"><div class="num">${reciprocatedYears}</div><div class="label">Reciprocated birthdays</div></div>
  `;

  renderTimingBreakdown(people, events);
}

function renderTimingBreakdown(people, events) {
  const timingCounts = { early: 0, onday: 0, lastminute: 0, belated: 0 };
  events.forEach(e => {
    const person = people.find(p => p.id === e.personId);
    if (!person) return;
    const t = classifyTiming(person.bday, e.timestamp);
    if (timingCounts[t] !== undefined) timingCounts[t]++;
  });

  const timingRow = document.getElementById('timingRow');
  const keys = ['early', 'onday', 'lastminute', 'belated'];

  if (events.length === 0) {
    timingRow.innerHTML = `<p class="empty-state">Timing categories will appear once you log a wish.</p>`;
    return;
  }

  timingRow.innerHTML = keys.map(key => {
    const t = TIMING_LABELS[key];
    return `
      <div class="timing-chip">
        <span class="timing-chip-emoji">${t.emoji}</span>
        <span class="timing-chip-num">${timingCounts[key]}</span>
        <span class="timing-chip-label">${t.label}</span>
      </div>`;
  }).join('');
}

function renderRecent() {
  const events = loadEvents().sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 6);
  const recentList = document.getElementById('recentList');
  if (events.length === 0) {
    recentList.innerHTML = `<p class="empty-state">Wish events you log will show up here.</p>`;
    return;
  }
  const people = loadPeople();
  recentList.innerHTML = events.map(ev => {
    const person = people.find(p => p.id === ev.personId);
    if (!person) return '';
    const verb = ev.direction === 'received' ? 'wished you' : 'you wished them';
    const t = TIMING_LABELS[classifyTiming(person.bday, ev.timestamp)];
    return `
      <div class="recent-row">
        <div>
          <div class="name">${escapeHtml(person.name)} ${verb}</div>
          <div class="sub">${formatDateTime(ev.timestamp)}</div>
        </div>
        <span class="pill">${t.emoji} ${t.label}</span>
      </div>`;
  }).join('');
}

// ---- Sidebar: Today action center ----
function renderSidebar(people) {
  const greeting = document.getElementById('greeting');
  const hour = new Date().getHours();
  const greetWord = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  greeting.textContent = `${greetWord} 🌤️`;

  const todayBirthdays = document.getElementById('todayBirthdays');
  const weekHeadline = document.getElementById('weekHeadline');
  const weekList = document.getElementById('weekList');

  const withNext = people.map(p => ({ ...p, next: nextOccurrence(p.bday), days: daysUntil(nextOccurrence(p.bday)) }));
  const today = withNext.filter(p => p.days === 0);
  const thisWeek = withNext.filter(p => p.days > 0 && p.days <= 7).sort((a, b) => a.days - b.days);

  todayBirthdays.innerHTML = today.map(p => `
    <div class="today-card">
      <p>🎉 It's ${escapeHtml(p.name)}'s birthday today!</p>
      <div class="today-actions">
        <button class="btn-mini" data-quick-sent="${p.id}">I wished them</button>
        <button class="btn-mini" data-open-person="${p.id}">Log their wish →</button>
      </div>
    </div>
  `).join('');

  if (thisWeek.length === 0) {
    weekHeadline.textContent = today.length ? '' : 'No birthdays coming up this week.';
  } else {
    weekHeadline.textContent = `You have ${thisWeek.length} birthday${thisWeek.length === 1 ? '' : 's'} coming up this week.`;
  }

  weekList.innerHTML = thisWeek.map(p => `
    <div class="week-row">
      <span>🎂 ${escapeHtml(p.name)} — ${p.days === 1 ? 'Tomorrow' : formatDateShort(p.next)}</span>
      <button class="btn-mini" data-open-person="${p.id}">View</button>
    </div>
  `).join('');

  document.querySelectorAll('[data-quick-sent]').forEach(btn => {
    btn.addEventListener('click', () => { addEvent(btn.dataset.quickSent, 'sent', new Date().toISOString()); renderEverything(); });
  });
  document.querySelectorAll('[data-open-person]').forEach(btn => {
    btn.addEventListener('click', () => openPersonDetail(btn.dataset.openPerson));
  });
}

// ================= CALENDAR =================
let calCursor = new Date();
calCursor.setDate(1);

document.getElementById('calPrev').addEventListener('click', () => { calCursor.setMonth(calCursor.getMonth() - 1); renderCalendar(); });
document.getElementById('calNext').addEventListener('click', () => { calCursor.setMonth(calCursor.getMonth() + 1); renderCalendar(); });

function renderCalendar() {
  const people = loadPeople();
  const label = document.getElementById('calMonthLabel');
  label.textContent = calCursor.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

  const grid = document.getElementById('calendarGrid');
  const dowNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  let html = dowNames.map(d => `<div class="cal-dow">${d}</div>`).join('');

  const year = calCursor.getFullYear();
  const month = calCursor.getMonth();
  const firstDow = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const byDay = {};
  people.forEach(p => {
    const [m, d] = p.bday.split('-').map(Number);
    if (m - 1 === month) {
      byDay[d] = byDay[d] || [];
      byDay[d].push(p);
    }
  });

  for (let i = 0; i < firstDow; i++) html += `<div class="cal-day empty"></div>`;

  for (let day = 1; day <= daysInMonth; day++) {
    const peopleToday = byDay[day] || [];
    const now = new Date();
    const isToday = now.getFullYear() === year && now.getMonth() === month && now.getDate() === day;
    html += `
      <div class="cal-day ${peopleToday.length ? 'has-birthday' : ''} ${isToday ? 'is-today' : ''}">
        <div class="day-num">${day}</div>
        ${peopleToday.map(p => `<button class="cal-birthday-chip" data-open-person="${p.id}">🎂 ${escapeHtml(p.name)}</button>`).join('')}
      </div>`;
  }

  grid.innerHTML = html;
  grid.querySelectorAll('[data-open-person]').forEach(btn => {
    btn.addEventListener('click', () => openPersonDetail(btn.dataset.openPerson));
  });
}

// ================= YOUR CIRCLE =================
const searchInput = document.getElementById('searchInput');
const tagFilter = document.getElementById('tagFilter');
const upcomingFilter = document.getElementById('upcomingFilter');
[searchInput, tagFilter, upcomingFilter].forEach(el => el.addEventListener('input', renderCircle));

function renderCircle() {
  const people = loadPeople();

  // populate tag filter options
  const tags = [...new Set(people.map(p => p.tag).filter(Boolean))];
  const currentTagValue = tagFilter.value;
  tagFilter.innerHTML = `<option value="">All relationships</option>` + tags.map(t => `<option value="${escapeHtml(t)}">${escapeHtml(t)}</option>`).join('');
  tagFilter.value = tags.includes(currentTagValue) ? currentTagValue : '';

  let filtered = people;
  const q = searchInput.value.trim().toLowerCase();
  if (q) filtered = filtered.filter(p => p.name.toLowerCase().includes(q));
  if (tagFilter.value) filtered = filtered.filter(p => p.tag === tagFilter.value);
  if (upcomingFilter.checked) filtered = filtered.filter(p => daysUntil(nextOccurrence(p.bday)) <= 30);

  const circleList = document.getElementById('circleList');
  if (filtered.length === 0) {
    circleList.innerHTML = `<p class="empty-state">🔍 No one matches yet — try a different search or filter, or add someone new above.</p>`;
    return;
  }

  circleList.innerHTML = filtered.map(p => {
    const status = getPersonLatestStatus(p);
    const rt = TIMING_LABELS[status.receivedTiming];
    const st = TIMING_LABELS[status.sentTiming];
    return `
      <div class="person-card" data-open-person="${p.id}">
        <div class="name">${escapeHtml(p.name)}</div>
        <div class="meta">${formatDateShort(nextOccurrence(p.bday))}${p.tag ? ' · ' + escapeHtml(p.tag) : ''}</div>
        <div class="badges">
          <span class="badge ${rt.cls}">${rt.emoji} ${status.received ? 'They wished you' : 'Not yet'}</span>
          <span class="badge ${st.cls}">${st.emoji} ${status.sent ? 'You wished them' : 'Not yet'}</span>
        </div>
      </div>`;
  }).join('');

  circleList.querySelectorAll('[data-open-person]').forEach(card => {
    card.addEventListener('click', () => openPersonDetail(card.dataset.openPerson));
  });
}

// ---- Add person (Circle view form) ----
document.getElementById('personForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const name = document.getElementById('personName').value.trim();
  const bdayValue = document.getElementById('personBday').value;
  const tag = document.getElementById('personTag').value.trim();
  if (!name || !bdayValue) return;
  addPerson(name, bdayToMD(bdayValue), tag);
  e.target.reset();
  renderEverything();
});

// ================= PERSON DETAIL MODAL =================
function openPersonDetail(personId) {
  const person = loadPeople().find(p => p.id === personId);
  if (!person) return;

  const body = document.getElementById('personModalBody');
  const events = getPersonEvents(personId);

  body.innerHTML = `
    <div class="person-detail-head">
      <h2>${escapeHtml(person.name)}</h2>
      <div class="meta">${formatDateShort(nextOccurrence(person.bday))}${person.tag ? ' · ' + escapeHtml(person.tag) : ''}</div>
    </div>

    <div class="person-detail-actions">
      <button class="btn-secondary" id="editPersonBtn">Edit person</button>
      <button class="btn-danger" id="deletePersonBtn">Delete person</button>
    </div>

    <h3 style="margin-bottom:6px;font-size:0.95rem;">Wish history</h3>
    <div id="eventHistory">
      ${events.length === 0
        ? `<p class="empty-state">No wish events logged yet.</p>`
        : events.map(ev => {
            const t = TIMING_LABELS[classifyTiming(person.bday, ev.timestamp)];
            const verb = ev.direction === 'received' ? 'They wished you' : 'You wished them';
            return `
              <div class="event-row">
                <div class="event-info">
                  <strong>${verb}</strong>
                  <span>${formatDateTime(ev.timestamp)} · ${t.emoji} ${t.label} · ${ev.year}</span>
                </div>
                <div class="event-actions">
                  <button class="icon-btn" data-edit-event="${ev.id}" title="Edit">✏️</button>
                  <button class="icon-btn" data-delete-event="${ev.id}" title="Delete">🗑️</button>
                </div>
              </div>`;
          }).join('')
      }
    </div>

    <div class="quick-log">
      <select id="quickLogDirection">
        <option value="received">They wished me</option>
        <option value="sent">I wished them</option>
      </select>
      <input type="datetime-local" id="quickLogDatetime" />
      <button class="btn-primary" id="quickLogNowBtn">Log now</button>
      <button class="btn-secondary" id="quickLogAtTimeBtn">Log at that time</button>
    </div>
  `;

  document.getElementById('editPersonBtn').addEventListener('click', () => openEditPerson(person));
  document.getElementById('deletePersonBtn').addEventListener('click', () => {
    if (confirm(`Remove ${person.name} and all their wish history? This can't be undone.`)) {
      deletePerson(personId);
      closeModal('personModal');
      renderEverything();
    }
  });

  body.querySelectorAll('[data-edit-event]').forEach(btn => {
    btn.addEventListener('click', () => openEditEvent(events.find(e => e.id === btn.dataset.editEvent)));
  });
  body.querySelectorAll('[data-delete-event]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (confirm('Delete this wish event?')) {
        deleteEvent(btn.dataset.deleteEvent);
        renderEverything();
        openPersonDetail(personId);
      }
    });
  });

  document.getElementById('quickLogNowBtn').addEventListener('click', () => {
    const direction = document.getElementById('quickLogDirection').value;
    addEvent(personId, direction, new Date().toISOString());
    renderEverything();
    openPersonDetail(personId);
  });
  document.getElementById('quickLogAtTimeBtn').addEventListener('click', () => {
    const direction = document.getElementById('quickLogDirection').value;
    const dt = document.getElementById('quickLogDatetime').value;
    if (!dt) return;
    addEvent(personId, direction, new Date(dt).toISOString());
    renderEverything();
    openPersonDetail(personId);
  });

  openModal('personModal');
}

// ---- Edit person modal ----
function openEditPerson(person) {
  document.getElementById('editPersonId').value = person.id;
  document.getElementById('editPersonName').value = person.name;
  document.getElementById('editPersonBday').value = mdToDateInputValue(person.bday);
  document.getElementById('editPersonTag').value = person.tag || '';
  openModal('editPersonModal');
}
document.getElementById('editPersonForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const id = document.getElementById('editPersonId').value;
  const name = document.getElementById('editPersonName').value.trim();
  const bday = bdayToMD(document.getElementById('editPersonBday').value);
  const tag = document.getElementById('editPersonTag').value.trim();
  updatePerson(id, { name, bday, tag });
  closeModal('editPersonModal');
  renderEverything();
  openPersonDetail(id);
});

// ---- Edit event modal ----
function openEditEvent(event) {
  document.getElementById('editEventId').value = event.id;
  document.getElementById('editEventDirection').value = event.direction;
  const d = new Date(event.timestamp);
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  document.getElementById('editEventDatetime').value = local;
  openModal('editEventModal');
}
document.getElementById('editEventForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const id = document.getElementById('editEventId').value;
  const direction = document.getElementById('editEventDirection').value;
  const dt = document.getElementById('editEventDatetime').value;
  const personId = loadEvents().find(ev => ev.id === id)?.personId;
  updateEvent(id, { direction, timestamp: new Date(dt).toISOString() });
  closeModal('editEventModal');
  renderEverything();
  if (personId) openPersonDetail(personId);
});

// ================= GLOBAL RENDER =================
function renderEverything() {
  renderDashboard();
  renderCircle();
  if (!document.getElementById('view-calendar').hidden) renderCalendar();
}

renderEverything();
