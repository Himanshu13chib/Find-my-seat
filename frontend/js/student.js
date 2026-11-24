// ===== MIET JAMMU – Student Portal JS =====
const API_BASE = '/api';

const examSelect       = document.getElementById('examSelect');
const rollInput        = document.getElementById('rollInput');
const clearRollBtn     = document.getElementById('clearRollBtn');
const recentSearchesEl = document.getElementById('recentSearches');
const searchForm       = document.getElementById('searchForm');
const searchBtn        = document.getElementById('searchBtn');
const resultArea       = document.getElementById('resultArea');
const errorArea        = document.getElementById('errorArea');
const toastEl          = document.getElementById('studentToast');
const portalDropdownBtn= document.getElementById('portalDropdownBtn');
const portalMenu       = document.getElementById('portalMenu');
const primaryNavigation= document.getElementById('primaryNavigation');
const mobileNavToggle  = document.getElementById('mobileNavToggle');

// Modals
const infoModal        = document.getElementById('infoModal');
const modalTitle       = document.getElementById('modalTitle');
const modalContent     = document.getElementById('modalContent');
const modalCloseBtn    = document.getElementById('modalCloseBtn');

// Nav links
const navExamInfo      = document.getElementById('navExamInfo');
const navSeating       = document.getElementById('navSeating');
const navNotices       = document.getElementById('navNotices');
const navContact       = document.getElementById('navContact');

// Portal Dropdown Toggle
portalDropdownBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  portalMenu.classList.toggle('hidden');
});

document.addEventListener('click', (e) => {
  if (!portalDropdownBtn.contains(e.target)) {
    portalMenu.classList.add('hidden');
  }
  if (!primaryNavigation.contains(e.target) && !mobileNavToggle.contains(e.target)) {
    closeMobileNavigation();
  }
});

mobileNavToggle.addEventListener('click', (e) => {
  e.stopPropagation();
  const isOpen = primaryNavigation.classList.toggle('open');
  mobileNavToggle.setAttribute('aria-expanded', String(isOpen));
  mobileNavToggle.setAttribute('aria-label', isOpen ? 'Close navigation menu' : 'Open navigation menu');
});

function closeMobileNavigation() {
  primaryNavigation.classList.remove('open');
  mobileNavToggle.setAttribute('aria-expanded', 'false');
  mobileNavToggle.setAttribute('aria-label', 'Open navigation menu');
}

// Modal close
modalCloseBtn.addEventListener('click', () => infoModal.classList.add('hidden'));
infoModal.addEventListener('click', (e) => {
  if (e.target === infoModal) infoModal.classList.add('hidden');
});

// Nav Link Handlers
navExamInfo.addEventListener('click', (e) => {
  e.preventDefault();
  closeMobileNavigation();
  modalTitle.textContent = 'Examination Information & Schedule';
  modalContent.innerHTML = `
    <h4>Exam Session Timings</h4>
    <ul>
      <li><strong>Morning Shift:</strong> 09:30 AM – 12:30 PM (Reporting time: 09:00 AM)</li>
      <li><strong>Evening Shift:</strong> 01:30 PM – 04:30 PM (Reporting time: 01:00 PM)</li>
    </ul>
    <h4>Examination Venues &amp; Blocks</h4>
    <p>Examinations take place across Main Academic Block, Tech Wing, and Science Block. Check your allotted Room and Block carefully on your seat allotment card.</p>
  `;
  infoModal.classList.remove('hidden');
});

navSeating.addEventListener('click', (e) => {
  e.preventDefault();
  closeMobileNavigation();
  rollInput.focus();
  rollInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
});

navNotices.addEventListener('click', (e) => {
  e.preventDefault();
  closeMobileNavigation();
  modalTitle.textContent = 'Important Candidate Notices';
  modalContent.innerHTML = `
    <h4>Rules for Examination Hall Entry</h4>
    <ul>
      <li>Candidates must carry their <strong>Official College Identity Card</strong> and <strong>Admit Card</strong> at all times.</li>
      <li>Entry into the examination hall is permitted up to 15 minutes prior to the commencement of the exam.</li>
      <li><strong>Strictly Prohibited:</strong> Mobile phones, programmable calculators, smartwatch devices, unauthorized notes, or bags.</li>
      <li>Any candidate found with unauthorized materials will be reported under the MIET Examination Disciplinary Regulations.</li>
    </ul>
  `;
  infoModal.classList.remove('hidden');
});

navContact.addEventListener('click', (e) => {
  e.preventDefault();
  closeMobileNavigation();
  modalTitle.textContent = 'Contact Examination Cell';
  modalContent.innerHTML = `
    <h4>Office of the Controller of Examinations</h4>
    <p><strong>Model Institute of Engineering &amp; Technology (MIET)</strong><br>
    Kot Bhalwal, Jammu, J&amp;K - 181122</p>
    <br>
    <p><strong>Helpline:</strong> <a href="tel:+911912623110">+91-191-2623110</a> / <a href="tel:+919018312123">+91-9018312123</a></p>
    <p><strong>Email:</strong> <a href="mailto:examcell@mietjammu.in">examcell@mietjammu.in</a></p>
    <p><strong>Hours:</strong> Monday – Saturday: 9:00 AM – 5:00 PM</p>
  `;
  infoModal.classList.remove('hidden');
});

// Load active exams on page load
async function loadExams() {
  try {
    const res = await fetch(`${API_BASE}/seating/exams`);
    const data = await res.json();

    examSelect.innerHTML = '';

    if (!data.exams || data.exams.length === 0) {
      examSelect.innerHTML = '<option value="">— No examinations published yet —</option>';
      checkUrlParams();
      return;
    }

    const defaultOpt = document.createElement('option');
    defaultOpt.value = '';
    defaultOpt.textContent = '— Select Examination (or All Active) —';
    examSelect.appendChild(defaultOpt);

    data.exams.forEach(exam => {
      const opt = document.createElement('option');
      opt.value = exam.id;
      const dateStr = exam.exam_date ? ` (${formatDate(exam.exam_date)})` : '';
      opt.textContent = exam.exam_name + dateStr;
      examSelect.appendChild(opt);
    });

    if (data.exams.length === 1) {
      examSelect.value = data.exams[0].id;
    }

    checkUrlParams();
  } catch (err) {
    examSelect.innerHTML = '<option value="">— Failed to connect to server —</option>';
    console.error('Failed to load exams:', err);
    checkUrlParams();
  }
}

// Check URL query parameters for shared seat lookup links.
function checkUrlParams() {
  const params = new URLSearchParams(window.location.search);
  const roll = params.get('roll');
  const examId = params.get('exam_id');

  if (examId && examSelect.querySelector(`option[value="${examId}"]`)) {
    examSelect.value = examId;
  }

  if (roll) {
    rollInput.value = roll.trim();
    updateClearBtn();
    performLookup(roll.trim(), examSelect.value);
  }
}

// Search seating
searchForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const roll = rollInput.value.trim();
  const examId = examSelect.value;

  if (!roll) {
    showError('Please enter your roll number.');
    rollInput.focus();
    return;
  }

  performLookup(roll, examId);
});

async function performLookup(roll, examId) {
  setSearchLoading(true);
  clearError();

  try {
    let url = `${API_BASE}/seating/lookup?roll=${encodeURIComponent(roll)}`;
    if (examId) url += `&exam_id=${examId}`;

    const res = await fetch(url);
    const data = await res.json();

    if (!res.ok) {
      showError(data.error || 'No seating arrangement found for this roll number.');
    } else {
      saveRecentSearch(roll.toUpperCase());
      showResult(data.data);
    }
  } catch (err) {
    showError('Could not connect to the examination server. Please ensure the backend is running.');
    console.error(err);
  } finally {
    setSearchLoading(false);
  }
}

function setSearchLoading(loading) {
  if (loading) {
    searchBtn.disabled = true;
    searchBtn.innerHTML = `
      <svg class="search-icon" style="animation: spin 0.7s linear infinite;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
      </svg>
      <span>Searching…</span>`;
  } else {
    searchBtn.disabled = false;
    searchBtn.innerHTML = `
      <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
      </svg>
      <span>Find My Seat</span>`;
  }
}

function clearError() {
  errorArea.innerHTML = '';
  errorArea.classList.add('hidden');
}

function showError(message) {
  errorArea.innerHTML = `
    <svg class="error-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="12" cy="12" r="10"/>
      <line x1="12" y1="8" x2="12" y2="12"/>
      <line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
    <div>
      <div class="error-title">No Seat Found</div>
      <div class="error-msg">${escHtml(message)}</div>
    </div>`;
  errorArea.classList.remove('hidden');
}

// Show Exact Result Card matching the mockup design (without classroom sitting matrix)
function showResult(d) {
  const blockVal = d.block && d.block !== 'N/A' ? d.block : 'Block B';
  const floorVal = d.floor_no && d.floor_no !== 'N/A' ? d.floor_no : 'Ground Floor';
  const examDateStr = d.exam_date && d.exam_date !== 'N/A' ? formatDate(d.exam_date) : '';
  const sessionText = examDateStr ? `${escHtml(d.exam_name)} • ${examDateStr}` : escHtml(d.exam_name);

  resultArea.innerHTML = `
    <div class="result-card" id="activeResultCard">
      
      <!-- Status Badge -->
      <div class="card-status-badge">
        <div class="check-circle">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
            <path d="M20 6 9 17l-5-5"/>
          </svg>
        </div>
        <h3 class="card-title">Your Seating Arrangement</h3>
      </div>

      <!-- Roll Number Banner -->
      <div class="roll-banner">
        <div class="roll-banner-left">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
          </svg>
          <span>Roll Number: <strong>${escHtml(d.roll_number)}</strong></span>
        </div>
        ${d.student_name !== 'N/A' ? `
          <div class="student-tag">
            ${escHtml(d.student_name)}${d.branch !== 'N/A' ? ' • ' + escHtml(d.branch) : ''}${d.semester !== 'N/A' ? ' (Sem ' + escHtml(d.semester) + ')' : ''}
          </div>` : ''}
      </div>

      <!-- 5 Detail Items Grid -->
      <div class="seat-details-grid">
        <div class="detail-box">
          <div class="detail-icon-wrap"><svg class="detail-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 21h18"/><path d="M5 21V7l8-4v18"/><path d="M19 21V11l-6-4"/><path d="M9 9v.01M9 12v.01M9 15v.01M9 18v.01"/></svg></div>
          <div class="detail-content">
            <div class="detail-label">Block / Building</div>
            <div class="detail-value">${escHtml(blockVal)}</div>
          </div>
        </div>

        <div class="detail-box">
          <div class="detail-icon-wrap"><svg class="detail-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 20h18"/><path d="M3 20v-5h5v-5h5V5h8"/><path d="M16 9h2M16 13h2"/></svg></div>
          <div class="detail-content">
            <div class="detail-label">Floor</div>
            <div class="detail-value">${escHtml(floorVal)}</div>
          </div>
        </div>

        <div class="detail-box highlight-room">
          <div class="detail-icon-wrap"><svg class="detail-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 21V3h16v18"/><path d="M8 21V7l12-2"/><path d="M16 14h.01"/></svg></div>
          <div class="detail-content">
            <div class="detail-label">Room Number</div>
            <div class="detail-value room-text">${escHtml(d.room_no)}</div>
          </div>
        </div>

        <div class="detail-box">
          <div class="detail-icon-wrap"><svg class="detail-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 4v8h12V4"/><path d="M8 12v8M16 12v8M8 16h8"/></svg></div>
          <div class="detail-content">
            <div class="detail-label">Row</div>
            <div class="detail-value">${escHtml(d.row_no !== 'N/A' ? d.row_no : '—')}</div>
          </div>
        </div>

        <div class="detail-box highlight-desk">
          <div class="detail-icon-wrap"><svg class="detail-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 8h18M5 8v12m14-12v12M3 20h18"/><path d="M8 8V5h8v3"/></svg></div>
          <div class="detail-content">
            <div class="detail-label">Desk</div>
            <div class="detail-value desk-text">${escHtml(d.desk_no !== 'N/A' ? d.desk_no : '—')}</div>
          </div>
        </div>
      </div>

      <!-- Directions & Session Strip -->
      <div class="card-footer-strip">
        <div class="footer-strip-item">
          <svg class="strip-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polygon points="3 11 22 2 13 21 11 13 3 11"/>
          </svg>
          <div>
            <div class="strip-label">Room Directions</div>
            <div class="strip-value">${escHtml(blockVal)} → ${escHtml(floorVal)} → Room ${escHtml(d.room_no)}</div>
          </div>
        </div>

        <div class="footer-strip-item">
          <svg class="strip-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
            <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
          <div>
            <div class="strip-label">Exam Session</div>
            <div class="strip-value">${sessionText}</div>
          </div>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="card-actions no-print">
        <button type="button" class="btn-card-action btn-print-slip" id="printSlipBtn">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="6 9 6 2 18 2 18 9"/>
            <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
            <rect x="6" y="14" width="12" height="8"/>
          </svg>
          Print Seat Slip
        </button>
        <button type="button" class="btn-card-action" id="shareBtn">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
            <polyline points="16 6 12 2 8 6"/>
            <line x1="12" y1="2" x2="12" y2="15"/>
          </svg>
          Share
        </button>
      </div>

    </div>
  `;

  // Attach buttons
  document.getElementById('printSlipBtn').addEventListener('click', () => window.print());

  document.getElementById('shareBtn').addEventListener('click', () => {
    const url = new URL(window.location.href);
    url.searchParams.set('roll', d.roll_number);
    if (examSelect.value) url.searchParams.set('exam_id', examSelect.value);

    navigator.clipboard.writeText(url.toString()).then(() => {
      showToast('Seating link copied to clipboard!');
    }).catch(() => {
      prompt('Copy this seating link:', url.toString());
    });
  });
}

// Toast notification
let toastTimer = null;
function showToast(msg) {
  if (!toastEl) return;
  toastEl.textContent = msg;
  toastEl.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toastEl.classList.add('hidden');
  }, 3000);
}

// Recent Searches Management
function getRecentSearches() {
  try {
    const list = JSON.parse(localStorage.getItem('miet_recent_rolls') || '[]');
    return Array.isArray(list) ? list : [];
  } catch { return []; }
}

function saveRecentSearch(roll) {
  if (!roll) return;
  let list = getRecentSearches().filter(r => r.toUpperCase() !== roll.toUpperCase());
  list.unshift(roll.toUpperCase());
  if (list.length > 5) list = list.slice(0, 5);
  localStorage.setItem('miet_recent_rolls', JSON.stringify(list));
  renderRecentSearches();
}

function renderRecentSearches() {
  if (!recentSearchesEl) return;
  const list = getRecentSearches();
  if (list.length === 0) {
    recentSearchesEl.classList.add('hidden');
    recentSearchesEl.innerHTML = '';
    return;
  }

  recentSearchesEl.innerHTML = `
    <span class="recent-label">Recent:</span>
    ${list.map(r => `<button type="button" class="recent-chip" data-roll="${escHtml(r)}">${escHtml(r)}</button>`).join('')}
  `;
  recentSearchesEl.classList.remove('hidden');

  recentSearchesEl.querySelectorAll('.recent-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      rollInput.value = chip.dataset.roll;
      updateClearBtn();
      performLookup(chip.dataset.roll, examSelect.value);
    });
  });
}

// Clear input button
function updateClearBtn() {
  if (!clearRollBtn) return;
  if (rollInput.value.length > 0) {
    clearRollBtn.classList.remove('hidden');
  } else {
    clearRollBtn.classList.add('hidden');
  }
}

if (clearRollBtn) {
  clearRollBtn.addEventListener('click', () => {
    rollInput.value = '';
    updateClearBtn();
    rollInput.focus();
    clearError();
  });
}

rollInput.addEventListener('input', updateClearBtn);

function formatDate(dateStr) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch { return dateStr; }
}

function escHtml(str) {
  if (!str && str !== 0) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Add CSS keyframe for spinner
const style = document.createElement('style');
style.textContent = '@keyframes spin { to { transform: rotate(360deg); } }';
document.head.appendChild(style);

// Initialize
renderRecentSearches();
loadExams();
