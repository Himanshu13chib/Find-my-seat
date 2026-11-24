// ===== MIET JAMMU – Admin Portal JS =====
const API_BASE = '/api';

// ---- State ----
let authToken = localStorage.getItem('miet_admin_token');
let currentSection = 'dashboard';
let modalExamId = null;
let modalExamName = '';
let modalPage = 1;
let modalSearch = '';
let modalSearchTimer = null;
let selectedUploadFile = null;

// ---- DOM Elements ----
const loginScreen      = document.getElementById('loginScreen');
const dashboard        = document.getElementById('dashboard');
const loginForm        = document.getElementById('loginForm');
const loginError       = document.getElementById('loginError');
const loginBtn         = document.getElementById('loginBtn');
const adminNameEl      = document.getElementById('adminName');
const sidebarEl        = document.getElementById('sidebarEl');
const sidebarToggle    = document.getElementById('sidebarToggle');
const sidebarLinks     = document.querySelectorAll('.sidebar-item');
const sidebarLogout    = document.getElementById('sidebarLogout');
const adminProfileBtn  = document.getElementById('adminProfileBtn');
const adminDropdownMenu= document.getElementById('adminDropdownMenu');
const dropChangePw     = document.getElementById('dropChangePw');
const dropLogout       = document.getElementById('dropLogout');
const toast            = document.getElementById('toast');

// Dashboard elements
const dashTotalStudents= document.getElementById('dashTotalStudents');
const dashTotalRooms   = document.getElementById('dashTotalRooms');
const dashUnassigned   = document.getElementById('dashUnassigned');
const dashUploadForm   = document.getElementById('dashUploadForm');
const dashExamName     = document.getElementById('dashExamName');
const dashExamDate     = document.getElementById('dashExamDate');
const dashDropzone     = document.getElementById('dashDropzone');
const dashFileInput    = document.getElementById('dashFileInput');
const dashChooseFileBtn= document.getElementById('dashChooseFileBtn');
const dashBrowseLink   = document.getElementById('dashBrowseLink');
const dashFileSelected = document.getElementById('dashFileSelected');
const dashFileNameText = document.getElementById('dashFileNameText');
const dashFileClear    = document.getElementById('dashFileClear');
const dashDownloadTemplate = document.getElementById('dashDownloadTemplate');
const parseStatusBadge = document.getElementById('parseStatusBadge');
const previewTableBody = document.getElementById('previewTableBody');
const dashUploadProg   = document.getElementById('dashUploadProgress');
const dashProgFill     = document.getElementById('dashProgFill');
const dashProgText     = document.getElementById('dashProgText');
const dashPublishBtn   = document.getElementById('dashPublishBtn');
const recentExamsTable = document.getElementById('recentExamsTable');

// Manage Exams
const refreshExamsBtn  = document.getElementById('refreshExamsBtn');
const manageExamsTable = document.getElementById('manageExamsTable');

// Reports
const roomChartExamSelect = document.getElementById('roomChartExamSelect');
const roomCardsContainer  = document.getElementById('roomCardsContainer');

// Modals
const examModal        = document.getElementById('examModal');
const modalClose       = document.getElementById('modalClose');
const modalTitle       = document.getElementById('modalTitle');
const modalSearchEl    = document.getElementById('modalSearch');
const modalBody        = document.getElementById('modalBody');
const modalPag         = document.getElementById('modalPagination');
const btnAddSeat       = document.getElementById('btnAddSeat');
const btnExportModal   = document.getElementById('btnExportModal');

const seatEditModal    = document.getElementById('seatEditModal');
const seatEditModalClose = document.getElementById('seatEditModalClose');
const seatEditForm     = document.getElementById('seatEditForm');
const seatEditModalTitle = document.getElementById('seatEditModalTitle');
const btnCancelEditSeat= document.getElementById('btnCancelEditSeat');

const printNoticeModal = document.getElementById('printNoticeModal');
const printModalClose  = document.getElementById('printModalClose');
const printModalTitle  = document.getElementById('printModalTitle');
const printDocumentContent = document.getElementById('printDocumentContent');
const btnTriggerPrint  = document.getElementById('btnTriggerPrint');

// ---- Initialization ----
if (authToken) {
  showDashboard();
} else {
  showLogin();
}

// ---- Authentication Handlers ----
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = document.getElementById('loginUsername').value.trim();
  const password = document.getElementById('loginPassword').value;

  if (!username || !password) {
    showLoginError('Please enter username and password.');
    return;
  }

  loginBtn.disabled = true;
  loginBtn.textContent = 'Verifying credentials…';
  hideLoginError();

  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();

    if (!res.ok) {
      showLoginError(data.error || 'Invalid credentials.');
    } else {
      authToken = data.token;
      localStorage.setItem('miet_admin_token', authToken);
      if (adminNameEl) adminNameEl.textContent = data.username || username;
      showDashboard();
    }
  } catch (err) {
    showLoginError('Could not reach backend server. Please verify backend is running on port 3000.');
  } finally {
    loginBtn.disabled = false;
    loginBtn.textContent = 'Sign In to Dashboard';
  }
});

function showLoginError(msg) {
  loginError.textContent = msg;
  loginError.classList.remove('hidden');
}
function hideLoginError() { loginError.classList.add('hidden'); }

// Password visibility toggle
document.getElementById('pwToggle').addEventListener('click', () => {
  const pwInput = document.getElementById('loginPassword');
  pwInput.type = pwInput.type === 'password' ? 'text' : 'password';
});

// Logout triggers
sidebarLogout.addEventListener('click', (e) => { e.preventDefault(); doLogout(); });
dropLogout.addEventListener('click', (e) => { e.preventDefault(); doLogout(); });

function doLogout() {
  authToken = null;
  localStorage.removeItem('miet_admin_token');
  showLogin();
}

function showLogin() {
  loginScreen.classList.remove('hidden');
  dashboard.classList.add('hidden');
}

function showDashboard() {
  loginScreen.classList.add('hidden');
  dashboard.classList.remove('hidden');
  const stored = localStorage.getItem('miet_admin_token');
  if (stored) authToken = stored;
  loadSection('dashboard');
}

// Sidebar toggle (mobile & desktop)
sidebarToggle.addEventListener('click', () => {
  const isOpen = sidebarEl.classList.toggle('open');
  sidebarToggle.setAttribute('aria-expanded', String(isOpen));
  sidebarToggle.setAttribute('aria-label', isOpen ? 'Close navigation menu' : 'Open navigation menu');
});

// Admin Topbar Profile Dropdown
adminProfileBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  adminDropdownMenu.classList.toggle('hidden');
});

document.addEventListener('click', (e) => {
  if (!adminProfileBtn.contains(e.target)) {
    adminDropdownMenu.classList.add('hidden');
  }
  if (window.innerWidth < 768 && sidebarEl.classList.contains('open') &&
      !sidebarEl.contains(e.target) && !sidebarToggle.contains(e.target)) {
    sidebarEl.classList.remove('open');
    sidebarToggle.setAttribute('aria-expanded', 'false');
    sidebarToggle.setAttribute('aria-label', 'Open navigation menu');
  }
});

dropChangePw.addEventListener('click', (e) => {
  e.preventDefault();
  adminDropdownMenu.classList.add('hidden');
  setActiveSection('settings');
  loadSection('settings');
});

// ---- Navigation ----
sidebarLinks.forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    const section = link.dataset.section;
    if (!section) return;
    setActiveSection(section);
    loadSection(section);
    if (window.innerWidth < 768) {
      sidebarEl.classList.remove('open');
      sidebarToggle.setAttribute('aria-expanded', 'false');
      sidebarToggle.setAttribute('aria-label', 'Open navigation menu');
    }
  });
});

function setActiveSection(section) {
  sidebarLinks.forEach(l => l.classList.toggle('active', l.dataset.section === section));
  currentSection = section;
}

function loadSection(section) {
  document.querySelectorAll('.content-section').forEach(s => {
    s.classList.remove('active', 'hidden');
  });

  // The uploader lives on the dashboard. Send the Upload navigation item
  // there and bring the form into view instead of showing its old placeholder.
  const targetId = section === 'upload' ? 'section-dashboard' : 'section-' + section;
  const el = document.getElementById(targetId);
  if (el) {
    el.classList.remove('hidden');
    el.classList.add('active');
  }

  if (section === 'dashboard' || section === 'upload') loadDashboardData();
  if (section === 'manage') loadManageExams();
  if (section === 'reports') initRoomReports();

  if (section === 'upload') {
    requestAnimationFrame(() => dashUploadForm?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }
}

// ---- API Helper ----
async function apiFetch(url, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
  const res = await fetch(url, { ...options, headers });

  if (res.status === 401) {
    authToken = null;
    localStorage.removeItem('miet_admin_token');
    showLogin();
    throw new Error('Session expired. Please log in again.');
  }
  return res;
}

// Toast
let toastTimer = null;
function showToast(msg, type = 'success') {
  toast.textContent = msg;
  toast.className = `toast ${type === 'error' ? 'error' : ''}`;
  toast.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.add('hidden'), 3500);
}

// ==========================================
// SECTION 1: DASHBOARD & UPLOAD MANAGEMENT
// ==========================================
async function loadDashboardData() {
  try {
    const res = await apiFetch(`${API_BASE}/admin/stats`);
    const data = await res.json();

    dashTotalStudents.textContent = data.stats.totalStudents.toLocaleString();
    
    // Calculate total unique rooms across exams or default
    const roomsCount = Math.max(Math.ceil(data.stats.totalStudents / 25), data.stats.totalExams > 0 ? 5 : 0);
    dashTotalRooms.textContent = roomsCount.toString();
    dashUnassigned.textContent = '0';

    if (!data.recentExams || data.recentExams.length === 0) {
      recentExamsTable.innerHTML = '<p class="empty-state">No examination arrangements uploaded yet.</p>';
      return;
    }

    recentExamsTable.innerHTML = buildExamTable(data.recentExams, false);
  } catch (err) {
    console.error('Failed to load dashboard statistics:', err);
  }
}

// File Chooser triggers
dashChooseFileBtn.addEventListener('click', () => dashFileInput.click());
dashBrowseLink.addEventListener('click', () => dashFileInput.click());

dashFileInput.addEventListener('change', () => {
  if (dashFileInput.files[0]) handleFileSelection(dashFileInput.files[0]);
});

// Drag & Drop
dashDropzone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dashDropzone.classList.add('dragover');
});
dashDropzone.addEventListener('dragleave', () => dashDropzone.classList.remove('dragover'));
dashDropzone.addEventListener('drop', (e) => {
  e.preventDefault();
  dashDropzone.classList.remove('dragover');
  if (e.dataTransfer.files[0]) handleFileSelection(e.dataTransfer.files[0]);
});

dashFileClear.addEventListener('click', () => clearSelectedFile());

function handleFileSelection(file) {
  selectedUploadFile = file;
  dashFileNameText.textContent = `${file.name} (${formatBytes(file.size)})`;
  dashFileSelected.classList.remove('hidden');

  // Auto-populate exam title if empty
  if (!dashExamName.value.trim()) {
    const baseName = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
    dashExamName.value = `Examination – ${baseName}`;
  }

  // Parse file locally for preview
  parseFileForPreview(file);
}

function clearSelectedFile() {
  selectedUploadFile = null;
  dashFileInput.value = '';
  dashFileSelected.classList.add('hidden');
  parseStatusBadge.classList.add('hidden');
}

// Read top lines of CSV / spreadsheet to populate preview table
function parseFileForPreview(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const content = e.target.result;
      const lines = content.split(/\r?\n/).filter(line => line.trim().length > 0);
      if (lines.length > 1) {
        const rowsHtml = lines.slice(1, 6).map(line => {
          const parts = line.split(',').map(p => p.replace(/^"|"$/g, '').trim());
          const roll  = parts[0] || '—';
          const room  = parts[4] || '101';
          const floor = parts[5] || '1';
          const row   = parts[6] || 'A';
          const desk  = parts[7] || '1';
          const block = parts[8] || 'B';

          return `
            <tr>
              <td><strong>${escHtml(roll)}</strong></td>
              <td>${escHtml(block)}</td>
              <td>${escHtml(floor)}</td>
              <td>${escHtml(room)}</td>
              <td>${escHtml(row)}</td>
              <td>${escHtml(desk)}</td>
              <td><span class="badge-valid"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg> Valid</span></td>
            </tr>
          `;
        }).join('');

        previewTableBody.innerHTML = rowsHtml;
        parseStatusBadge.classList.remove('hidden');
      }
    } catch {
      // Fallback preview
      parseStatusBadge.classList.remove('hidden');
    }
  };
  reader.readAsText(file);
}

// Download a blank CSV template
dashDownloadTemplate.addEventListener('click', () => {
  const csvContent = 'Roll No,Name,Branch,Semester,Room No,Floor,Row,Desk,Block\n';
  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'miet_seating_template.csv';
  a.click();
  URL.revokeObjectURL(url);
});

// Publish Arrangement Action
dashPublishBtn.addEventListener('click', async () => {
  const examName = dashExamName.value.trim();
  const examDate = dashExamDate.value;

  if (!examName) {
    showToast('Please enter an Examination Title.', 'error');
    dashExamName.focus();
    return;
  }
  if (!selectedUploadFile) {
    showToast('Please choose or drag a seating arrangement file (.csv or .xlsx).', 'error');
    return;
  }

  dashPublishBtn.disabled = true;
  dashPublishBtn.innerHTML = `
    <svg style="animation: spin 0.7s linear infinite;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
    </svg>
    <span>Publishing Seating Arrangement…</span>`;

  dashUploadProg.classList.remove('hidden');
  dashProgFill.style.width = '30%';
  dashProgText.textContent = 'Parsing records & storing in database…';

  try {
    const formData = new FormData();
    formData.append('file', selectedUploadFile);
    formData.append('exam_name', examName);
    if (examDate) formData.append('exam_date', examDate);

    const res = await fetch(`${API_BASE}/upload`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${authToken}` },
      body: formData
    });
    const data = await res.json();

    dashProgFill.style.width = '100%';
    dashProgText.textContent = 'Published successfully!';

    if (!res.ok) {
      showToast(data.error || 'Failed to publish seating.', 'error');
    } else {
      showToast(`Successfully published ${data.stats.inserted} student seats!`);
      clearSelectedFile();
      dashExamName.value = '';
      dashExamDate.value = '';
      loadDashboardData();
    }
  } catch (err) {
    showToast('Upload error: ' + err.message, 'error');
  } finally {
    dashPublishBtn.disabled = false;
    dashPublishBtn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="22" y1="2" x2="11" y2="13"/>
        <polygon points="22 2 15 22 11 13 2 9 22 2"/>
      </svg>
      <span>Publish Arrangement</span>`;
    setTimeout(() => dashUploadProg.classList.add('hidden'), 2500);
  }
});

// ==========================================
// SECTION 2 & 3: MANAGE EXAMINATIONS
// ==========================================
async function loadManageExams() {
  manageExamsTable.innerHTML = '<p class="empty-state">Loading published exams…</p>';
  try {
    const res = await apiFetch(`${API_BASE}/admin/exams`);
    const data = await res.json();

    if (!data.exams || data.exams.length === 0) {
      manageExamsTable.innerHTML = '<p class="empty-state">No examination seating published yet.</p>';
      return;
    }

    manageExamsTable.innerHTML = buildExamTable(data.exams, true);
    attachExamRowEvents();
  } catch (err) {
    manageExamsTable.innerHTML = `<p class="empty-state">Failed to load: ${escHtml(err.message)}</p>`;
  }
}

refreshExamsBtn.addEventListener('click', loadManageExams);

function buildExamTable(exams, showActions) {
  const rows = exams.map(e => `
    <tr>
      <td><strong>${escHtml(e.exam_name)}</strong></td>
      <td>${e.exam_date ? formatDate(e.exam_date) : '—'}</td>
      <td><strong>${(e.student_count || 0).toLocaleString()}</strong></td>
      <td>${escHtml(e.uploaded_by || 'Admin')}</td>
      <td>${formatDateTime(e.uploaded_at)}</td>
      <td><span class="badge-${e.is_active ? 'active' : 'inactive'}">${e.is_active ? 'Active' : 'Inactive'}</span></td>
      ${showActions ? `
      <td>
        <div style="display:flex;gap:6px;flex-wrap:wrap;">
          <button class="btn-tbl-action btn-view-seats" data-id="${e.id}" data-name="${escHtml(e.exam_name)}">Seats</button>
          <button class="btn-tbl-action btn-view-rooms" data-id="${e.id}">Rooms</button>
          <button class="btn-tbl-action btn-export-csv" data-id="${e.id}" data-name="${escHtml(e.exam_name)}">⬇ Export</button>
          <button class="btn-tbl-action btn-toggle-exam" data-id="${e.id}">${e.is_active ? 'Deactivate' : 'Activate'}</button>
          <button class="btn-tbl-action btn-del-tbl" data-id="${e.id}" data-name="${escHtml(e.exam_name)}">Delete</button>
        </div>
      </td>` : ''}
    </tr>`).join('');

  return `<table>
    <thead><tr>
      <th>Exam Title</th><th>Date</th><th>Candidates</th><th>Publisher</th><th>Published On</th><th>Status</th>
      ${showActions ? '<th>Actions</th>' : ''}
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
}

function attachExamRowEvents() {
  document.querySelectorAll('.btn-view-seats').forEach(btn => {
    btn.addEventListener('click', () => openExamModal(btn.dataset.id, btn.dataset.name));
  });

  document.querySelectorAll('.btn-view-rooms').forEach(btn => {
    btn.addEventListener('click', () => {
      setActiveSection('reports');
      loadSection('reports');
      setTimeout(() => {
        if (roomChartExamSelect) {
          roomChartExamSelect.value = btn.dataset.id;
          roomChartExamSelect.dispatchEvent(new Event('change'));
        }
      }, 250);
    });
  });

  document.querySelectorAll('.btn-export-csv').forEach(btn => {
    btn.addEventListener('click', () => exportExamCsv(btn.dataset.id, btn.dataset.name));
  });

  document.querySelectorAll('.btn-toggle-exam').forEach(btn => {
    btn.addEventListener('click', () => toggleExam(btn.dataset.id));
  });

  document.querySelectorAll('.btn-del-tbl').forEach(btn => {
    btn.addEventListener('click', () => deleteExam(btn.dataset.id, btn.dataset.name));
  });
}

async function exportExamCsv(examId, examName) {
  try {
    showToast('Exporting CSV…');
    const res = await apiFetch(`${API_BASE}/admin/exams/${examId}/export`);
    if (!res.ok) throw new Error('Export failed.');

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `seating_${(examName || 'exam').replace(/[^a-zA-Z0-9_-]/g, '_')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Seating data exported to CSV.');
  } catch (err) {
    showToast('Failed to export: ' + err.message, 'error');
  }
}

async function toggleExam(id) {
  try {
    const res = await apiFetch(`${API_BASE}/admin/exams/${id}/toggle`, { method: 'PATCH' });
    const data = await res.json();
    showToast(data.message);
    loadManageExams();
  } catch (err) {
    showToast('Failed to toggle exam status.', 'error');
  }
}

async function deleteExam(id, name) {
  if (!confirm(`Delete exam "${name}" and all associated student seating allocations? This action cannot be reversed.`)) return;
  try {
    const res = await apiFetch(`${API_BASE}/admin/exams/${id}`, { method: 'DELETE' });
    const data = await res.json();
    showToast(data.message);
    loadManageExams();
    loadDashboardData();
  } catch (err) {
    showToast('Failed to delete exam.', 'error');
  }
}

// ==========================================
// EXAM SEATS MODAL INSPECTOR
// ==========================================
function openExamModal(examId, examName) {
  modalExamId = examId;
  modalExamName = examName;
  modalPage = 1;
  modalSearch = '';
  modalSearchEl.value = '';
  modalTitle.textContent = `Allotted Seats – ${examName}`;
  examModal.classList.remove('hidden');
  loadModalSeats();
}

modalClose.addEventListener('click', () => examModal.classList.add('hidden'));
examModal.addEventListener('click', (e) => { if (e.target === examModal) examModal.classList.add('hidden'); });

btnExportModal.addEventListener('click', () => {
  if (modalExamId) exportExamCsv(modalExamId, modalExamName);
});

modalSearchEl.addEventListener('input', (e) => {
  clearTimeout(modalSearchTimer);
  modalSearch = e.target.value;
  modalPage = 1;
  modalSearchTimer = setTimeout(loadModalSeats, 300);
});

async function loadModalSeats() {
  modalBody.innerHTML = '<p class="empty-state">Loading candidate seats…</p>';
  modalPag.innerHTML = '';

  try {
    let url = `${API_BASE}/admin/exams/${modalExamId}/seats?page=${modalPage}&limit=50`;
    if (modalSearch) url += `&search=${encodeURIComponent(modalSearch)}`;

    const res = await apiFetch(url);
    const data = await res.json();

    if (!data.seats || data.seats.length === 0) {
      modalBody.innerHTML = '<p class="empty-state">No student seats found matching query.</p>';
      return;
    }

    const rows = data.seats.map(s => `
      <tr>
        <td><strong>${escHtml(s.roll_number)}</strong></td>
        <td>${escHtml(s.student_name || '—')}</td>
        <td>${escHtml(s.branch || '—')}</td>
        <td>${escHtml(s.semester || '—')}</td>
        <td><strong style="color:#1d4ed8;">${escHtml(s.room_no)}</strong></td>
        <td>${escHtml(s.floor_no || '—')}</td>
        <td>${escHtml(s.row_no || '—')}</td>
        <td><strong>${escHtml(s.desk_no || '—')}</strong></td>
        <td>${escHtml(s.block || '—')}</td>
        <td>
          <div style="display:flex;gap:4px;">
            <button type="button" class="btn-tbl-action btn-edit-seat" data-seat='${JSON.stringify(s).replace(/'/g, "&apos;")}'>Edit</button>
            <button type="button" class="btn-tbl-action btn-del-tbl btn-del-seat" data-id="${s.id}" data-roll="${escHtml(s.roll_number)}">✕</button>
          </div>
        </td>
      </tr>`).join('');

    modalBody.innerHTML = `<table>
      <thead><tr>
        <th>Roll No</th><th>Student Name</th><th>Branch</th><th>Sem</th>
        <th>Room</th><th>Floor</th><th>Row</th><th>Desk</th><th>Block</th><th>Action</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>`;

    modalBody.querySelectorAll('.btn-edit-seat').forEach(btn => {
      btn.addEventListener('click', () => {
        const s = JSON.parse(btn.dataset.seat);
        openSeatEditModal(s);
      });
    });

    modalBody.querySelectorAll('.btn-del-seat').forEach(btn => {
      btn.addEventListener('click', () => {
        deleteSingleSeat(btn.dataset.id, btn.dataset.roll);
      });
    });

    const { total, totalPages, page } = data.pagination;
    modalPag.innerHTML = `
      <span>Showing ${(page-1)*50 + 1}–${Math.min(page*50, total)} of ${total} students</span>
      <div style="display:flex;gap:4px;">
        <button class="btn-pag" ${page <= 1 ? 'disabled' : ''} id="prevPage">‹ Prev</button>
        <button class="btn-pag active">${page}</button>
        <button class="btn-pag" ${page >= totalPages ? 'disabled' : ''} id="nextPage">Next ›</button>
      </div>`;

    document.getElementById('prevPage')?.addEventListener('click', () => { modalPage--; loadModalSeats(); });
    document.getElementById('nextPage')?.addEventListener('click', () => { modalPage++; loadModalSeats(); });

  } catch (err) {
    modalBody.innerHTML = `<p class="empty-state">Failed to load: ${escHtml(err.message)}</p>`;
  }
}

// Seat Add / Edit
btnAddSeat.addEventListener('click', () => openSeatEditModal(null));

function openSeatEditModal(seat) {
  if (seat) {
    seatEditModalTitle.textContent = `Edit Seat – ${seat.roll_number}`;
    document.getElementById('editSeatId').value    = seat.id;
    document.getElementById('editRoll').value      = seat.roll_number || '';
    document.getElementById('editName').value      = seat.student_name || '';
    document.getElementById('editBranch').value    = seat.branch || '';
    document.getElementById('editSemester').value  = seat.semester || '';
    document.getElementById('editRoom').value      = seat.room_no || '';
    document.getElementById('editFloor').value     = seat.floor_no || '';
    document.getElementById('editRow').value       = seat.row_no || '';
    document.getElementById('editDesk').value      = seat.desk_no || '';
    document.getElementById('editBlock').value     = seat.block || '';
  } else {
    seatEditModalTitle.textContent = 'Add Student Seat';
    seatEditForm.reset();
    document.getElementById('editSeatId').value = '';
  }
  seatEditModal.classList.remove('hidden');
}

seatEditModalClose.addEventListener('click', () => seatEditModal.classList.add('hidden'));
btnCancelEditSeat.addEventListener('click', () => seatEditModal.classList.add('hidden'));
seatEditModal.addEventListener('click', (e) => { if (e.target === seatEditModal) seatEditModal.classList.add('hidden'); });

seatEditForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const seatId = document.getElementById('editSeatId').value;
  const payload = {
    roll_number:  document.getElementById('editRoll').value.trim(),
    student_name: document.getElementById('editName').value.trim(),
    branch:       document.getElementById('editBranch').value.trim(),
    semester:     document.getElementById('editSemester').value.trim(),
    room_no:      document.getElementById('editRoom').value.trim(),
    floor_no:     document.getElementById('editFloor').value.trim(),
    row_no:       document.getElementById('editRow').value.trim(),
    desk_no:      document.getElementById('editDesk').value.trim(),
    block:        document.getElementById('editBlock').value.trim()
  };

  try {
    let res;
    if (seatId) {
      res = await apiFetch(`${API_BASE}/admin/seats/${seatId}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
    } else {
      res = await apiFetch(`${API_BASE}/admin/exams/${modalExamId}/seats`, {
        method: 'POST',
        body: JSON.stringify(payload)
      });
    }
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to save seat.');

    showToast(data.message);
    seatEditModal.classList.add('hidden');
    loadModalSeats();
    loadDashboardData();
  } catch (err) {
    showToast(err.message, 'error');
  }
});

async function deleteSingleSeat(seatId, rollNumber) {
  if (!confirm(`Delete seat allotment for Roll No. "${rollNumber}"?`)) return;
  try {
    const res = await apiFetch(`${API_BASE}/admin/seats/${seatId}`, { method: 'DELETE' });
    const data = await res.json();
    showToast(data.message);
    loadModalSeats();
    loadDashboardData();
  } catch (err) {
    showToast('Failed to delete seat: ' + err.message, 'error');
  }
}

// ==========================================
// SECTION 4: ROOM REPORTS & NOTICES
// ==========================================
async function initRoomReports() {
  roomChartExamSelect.innerHTML = '<option value="">— Loading examinations… —</option>';
  try {
    const res = await apiFetch(`${API_BASE}/admin/exams`);
    const data = await res.json();

    roomChartExamSelect.innerHTML = '<option value="">— Select an Examination —</option>';
    if (!data.exams || data.exams.length === 0) {
      roomCardsContainer.innerHTML = '<p class="empty-state">No examinations available.</p>';
      return;
    }

    data.exams.forEach(exam => {
      const opt = document.createElement('option');
      opt.value = exam.id;
      opt.textContent = `${exam.exam_name} (${exam.student_count} candidates)`;
      roomChartExamSelect.appendChild(opt);
    });

    if (data.exams.length > 0 && !roomChartExamSelect.value) {
      roomChartExamSelect.value = data.exams[0].id;
      loadRoomCards(data.exams[0].id);
    }
  } catch (err) {
    roomChartExamSelect.innerHTML = '<option value="">— Failed to load exams —</option>';
  }
}

roomChartExamSelect.addEventListener('change', () => {
  const examId = roomChartExamSelect.value;
  if (examId) loadRoomCards(examId);
  else roomCardsContainer.innerHTML = '<p class="empty-state">Select an examination to view room charts.</p>';
});

async function loadRoomCards(examId) {
  roomCardsContainer.innerHTML = '<p class="empty-state">Loading room summaries…</p>';
  try {
    const res = await apiFetch(`${API_BASE}/admin/exams/${examId}/rooms`);
    const data = await res.json();

    if (!data.rooms || data.rooms.length === 0) {
      roomCardsContainer.innerHTML = '<p class="empty-state">No room assignments found for this examination.</p>';
      return;
    }

    const cardsHtml = data.rooms.map(r => `
      <div class="room-card-box">
        <div class="room-card-top">
          <div class="room-title-tag">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
            Room ${escHtml(r.room_no)}
          </div>
          <span class="room-count-pill">${r.student_count} Candidates</span>
        </div>
        <div class="room-meta-info">
          <div>Floor: <strong>${escHtml(r.floor_no || 'Ground Floor')}</strong></div>
          <div>Block: <strong>${escHtml(r.block || 'Block B')}</strong></div>
          <div>Branches: <strong>${escHtml(r.branches || 'All')}</strong></div>
          <div>Roll Range: <strong>${escHtml(r.min_roll)} – ${escHtml(r.max_roll)}</strong></div>
        </div>
        <div class="room-card-buttons">
          <button type="button" class="btn-room-btn btn-door-notice" data-exam="${examId}" data-room="${escHtml(r.room_no)}">
            📋 Door Notice
          </button>
          <button type="button" class="btn-room-btn btn-attendance-sheet" data-exam="${examId}" data-room="${escHtml(r.room_no)}">
            📝 Attendance Roll
          </button>
        </div>
      </div>
    `).join('');

    roomCardsContainer.innerHTML = cardsHtml;

    roomCardsContainer.querySelectorAll('.btn-door-notice').forEach(btn => {
      btn.addEventListener('click', () => openDoorNotice(btn.dataset.exam, btn.dataset.room));
    });

    roomCardsContainer.querySelectorAll('.btn-attendance-sheet').forEach(btn => {
      btn.addEventListener('click', () => openAttendanceSheet(btn.dataset.exam, btn.dataset.room));
    });

  } catch (err) {
    roomCardsContainer.innerHTML = `<p class="empty-state">Failed to load rooms: ${escHtml(err.message)}</p>`;
  }
}

// Print Document Modal Actions
printModalClose.addEventListener('click', () => printNoticeModal.classList.add('hidden'));
btnTriggerPrint.addEventListener('click', () => window.print());
printNoticeModal.addEventListener('click', (e) => { if (e.target === printNoticeModal) printNoticeModal.classList.add('hidden'); });

async function openDoorNotice(examId, roomNo) {
  printModalTitle.textContent = `Hall Door Notice – Room ${roomNo}`;
  printDocumentContent.innerHTML = '<p class="empty-state">Generating official door notice…</p>';
  printNoticeModal.classList.remove('hidden');

  try {
    const res = await apiFetch(`${API_BASE}/admin/exams/${examId}/rooms/${encodeURIComponent(roomNo)}`);
    const data = await res.json();
    const exam = data.exam;
    const seats = data.seats;

    const rows = seats.map((s, idx) => `
      <tr>
        <td style="text-align:center;width:45px;">${idx + 1}</td>
        <td><strong>${escHtml(s.roll_number)}</strong></td>
        <td>${escHtml(s.student_name || '—')}</td>
        <td>${escHtml(s.branch || '—')}</td>
        <td style="text-align:center;font-weight:800;color:#1d4ed8;">${escHtml(s.desk_no || '—')}</td>
        <td style="text-align:center;">${escHtml(s.row_no || '—')}</td>
      </tr>
    `).join('');

    printDocumentContent.innerHTML = `
      <div class="paper-sheet">
        <div class="paper-header">
          <div class="paper-college-title">Model Institute of Engineering &amp; Technology (MIET), Jammu</div>
          <div class="paper-college-sub">Office of the Controller of Examinations • Examination Cell</div>
          <div class="paper-notice-title">EXAMINATION HALL DOOR NOTICE</div>
        </div>

        <div class="paper-meta-grid">
          <div>Examination: <strong>${escHtml(exam.exam_name)}</strong></div>
          <div>Date: <strong>${exam.exam_date ? formatDate(exam.exam_date) : 'Scheduled Date'}</strong></div>
          <div>Room Number: <strong style="font-size:1.15rem;color:#1d4ed8;">Room ${escHtml(roomNo)}</strong></div>
          <div>Floor: <strong>${escHtml(seats[0]?.floor_no || 'Ground Floor')}</strong></div>
          <div>Block: <strong>${escHtml(seats[0]?.block || 'Block B')}</strong></div>
          <div>Total Candidates: <strong>${seats.length}</strong></div>
        </div>

        <table class="paper-table">
          <thead>
            <tr>
              <th style="width:45px;text-align:center;">S.No</th>
              <th>Roll Number</th>
              <th>Candidate Name</th>
              <th>Branch</th>
              <th style="text-align:center;">Desk No.</th>
              <th style="text-align:center;">Row</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>

        <div style="font-size:0.8rem;color:#475569;margin-top:12px;border:1px dashed #94a3b8;padding:8px 12px;border-radius:4px;">
          <strong>Candidate Instructions:</strong> Verify your Roll Number and Desk Number allotted. College ID and Admit Card are mandatory for entry. Electronic gadgets, mobile phones, and bags are prohibited.
        </div>

        <div class="paper-footer-signatures">
          <div class="paper-sig-box">
            <div class="paper-sig-line"></div>
            <span>Prepared By</span>
          </div>
          <div class="paper-sig-box">
            <div class="paper-sig-line"></div>
            <span>Room Invigilator</span>
          </div>
          <div class="paper-sig-box">
            <div class="paper-sig-line"></div>
            <span>Center Superintendent</span>
          </div>
        </div>
      </div>
    `;

  } catch (err) {
    printDocumentContent.innerHTML = `<p class="empty-state">Failed to load door notice: ${escHtml(err.message)}</p>`;
  }
}

async function openAttendanceSheet(examId, roomNo) {
  printModalTitle.textContent = `Invigilator Attendance Sheet – Room ${roomNo}`;
  printDocumentContent.innerHTML = '<p class="empty-state">Generating invigilator attendance roll…</p>';
  printNoticeModal.classList.remove('hidden');

  try {
    const res = await apiFetch(`${API_BASE}/admin/exams/${examId}/rooms/${encodeURIComponent(roomNo)}`);
    const data = await res.json();
    const exam = data.exam;
    const seats = data.seats;

    const rows = seats.map((s, idx) => `
      <tr>
        <td style="text-align:center;width:40px;">${idx + 1}</td>
        <td><strong>${escHtml(s.roll_number)}</strong></td>
        <td>${escHtml(s.student_name || '—')}</td>
        <td>${escHtml(s.branch || '—')}</td>
        <td style="text-align:center;font-weight:700;">${escHtml(s.desk_no || '—')}</td>
        <td style="width:140px;border-bottom:1px dashed #94a3b8;"></td>
        <td style="width:150px;border-bottom:1px dashed #94a3b8;"></td>
      </tr>
    `).join('');

    printDocumentContent.innerHTML = `
      <div class="paper-sheet">
        <div class="paper-header">
          <div class="paper-college-title">Model Institute of Engineering &amp; Technology (MIET), Jammu</div>
          <div class="paper-college-sub">Examination Cell • Invigilator's Attendance &amp; Answer Book Record</div>
          <div class="paper-notice-title">ROOM ATTENDANCE ROLL</div>
        </div>

        <div class="paper-meta-grid">
          <div>Examination: <strong>${escHtml(exam.exam_name)}</strong></div>
          <div>Date: <strong>${exam.exam_date ? formatDate(exam.exam_date) : '—'}</strong></div>
          <div>Room No: <strong>Room ${escHtml(roomNo)} (${escHtml(seats[0]?.floor_no || '—')})</strong></div>
          <div>Total Allotted: <strong>${seats.length}</strong></div>
          <div>Present: ________</div>
          <div>Absent: ________</div>
        </div>

        <table class="paper-table">
          <thead>
            <tr>
              <th style="width:40px;text-align:center;">S.No</th>
              <th>Roll Number</th>
              <th>Candidate Name</th>
              <th>Branch</th>
              <th style="text-align:center;">Desk</th>
              <th style="width:140px;">Answer Book No.</th>
              <th style="width:150px;">Student Signature</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>

        <div class="paper-footer-signatures">
          <div class="paper-sig-box">
            <div class="paper-sig-line"></div>
            <span>Invigilator Name &amp; Signature</span>
          </div>
          <div class="paper-sig-box">
            <div class="paper-sig-line"></div>
            <span>Deputy Superintendent</span>
          </div>
          <div class="paper-sig-box">
            <div class="paper-sig-line"></div>
            <span>Chief Exam Superintendent</span>
          </div>
        </div>
      </div>
    `;

  } catch (err) {
    printDocumentContent.innerHTML = `<p class="empty-state">Failed to load attendance roll: ${escHtml(err.message)}</p>`;
  }
}

// ==========================================
// SECTION 5: CHANGE PASSWORD
// ==========================================
document.getElementById('changePasswordForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const currentPw = document.getElementById('currentPw').value;
  const newPw     = document.getElementById('newPw').value;
  const confirmPw = document.getElementById('confirmPw').value;
  const result    = document.getElementById('pwResult');

  if (newPw !== confirmPw) {
    result.className = 'login-error';
    result.textContent = 'New passwords do not match.';
    result.classList.remove('hidden');
    return;
  }

  try {
    const res = await apiFetch(`${API_BASE}/auth/change-password`, {
      method: 'POST',
      body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw })
    });
    const data = await res.json();

    if (!res.ok) {
      result.className = 'login-error';
      result.textContent = data.error || 'Failed to update password.';
    } else {
      result.className = 'status-badge-ready';
      result.style.display = 'block';
      result.style.marginTop = '10px';
      result.textContent = 'Password changed successfully.';
      document.getElementById('changePasswordForm').reset();
      showToast('Admin password updated successfully.');
    }
    result.classList.remove('hidden');
  } catch (err) {
    result.className = 'login-error';
    result.textContent = err.message;
    result.classList.remove('hidden');
  }
});

// Helper formatting functions
function escHtml(str) {
  if (!str && str !== 0) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch { return dateStr; }
}

function formatDateTime(dateStr) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch { return dateStr; }
}

function formatBytes(bytes) {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}
