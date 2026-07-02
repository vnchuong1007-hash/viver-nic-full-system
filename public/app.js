let currentUser = null;
let coursesCache = [];
let workshopsCache = [];

const tokenKey = "viver_token";
const userKey = "viver_user";

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => document.querySelectorAll(selector);

function getToken() {
  return localStorage.getItem(tokenKey);
}

function saveSession(token, user) {
  localStorage.setItem(tokenKey, token);
  localStorage.setItem(userKey, JSON.stringify(user));
  currentUser = user;
  updateNav();
}

function clearSession() {
  localStorage.removeItem(tokenKey);
  localStorage.removeItem(userKey);
  currentUser = null;
  updateNav();
}

function authHeaders() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${getToken()}`
  };
}

function showMessage(text, type = "success") {
  const msg = $("#message");
  if (!msg) return alert(text);

  msg.textContent = text;
  msg.className = `message ${type === "error" ? "error" : ""}`;
  msg.classList.remove("hidden");

  setTimeout(() => msg.classList.add("hidden"), 4000);
}

async function api(url, options = {}) {
  const res = await fetch(url, options);
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.message || "Có lỗi xảy ra.");
  }

  return data;
}

function updateNav() {
  const nav = $("#navActions");
  if (!nav) return;

  if (!currentUser) {
    nav.innerHTML = `
      <a href="#account" class="btn ghost">Đăng nhập</a>
      <a href="#account" class="btn primary">Đăng ký</a>
    `;
    $("#profileName").textContent = "Chưa đăng nhập";
    $("#profileRole").textContent = "Vui lòng đăng nhập để chỉnh hồ sơ.";
    return;
  }

  nav.innerHTML = `
    <span class="user-chip">${currentUser.fullname} • ${currentUser.role}</span>
    <button class="btn danger" onclick="logout()">Đăng xuất</button>
  `;

  fillProfile(currentUser);
}

function fillProfile(user) {
  $("#profileName").textContent = user.fullname || "Người dùng ViVer";
  $("#profileRole").textContent = `${user.email} • ${user.role}`;
  $("#profileAvatar").src = user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.fullname || "ViVer")}&background=165DFF&color=fff`;

  const form = $("#profileForm");
  if (!form) return;

  form.avatar.value = user.avatar || "";
  form.fullname.value = user.fullname || "";
  form.phone.value = user.phone || "";
  form.birthday.value = user.birthday || "";
  form.gender.value = user.gender || "";
  form.interests.value = user.interests || "";
  form.skills.value = user.skills || "";
}

function logout() {
  clearSession();
  showMessage("Đã đăng xuất.");
}

$("#menuToggle")?.addEventListener("click", () => {
  $("#menu")?.classList.toggle("show");
});

$("#registerForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = e.target;

  try {
    const data = await api("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(new FormData(form)))
    });

    form.reset();
    showMessage(data.message);
    loadAdminStats();
  } catch (error) {
    showMessage(error.message, "error");
  }
});

$("#loginForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = e.target;

  try {
    const data = await api("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(new FormData(form)))
    });

    saveSession(data.token, data.user);
    form.reset();
    showMessage(data.message);
    loadProfile();

    if (data.user.role === "admin") {
      loadAdminStats();
      loadAdminUsers();
    }
  } catch (error) {
    showMessage(error.message, "error");
  }
});

async function sendForgotOtp() {
  const email = $("#forgotEmail").value;
  const msg = $("#forgotMsg");

  try {
    const data = await api("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email })
    });

    msg.textContent = data.message;
  } catch (error) {
    msg.textContent = error.message;
  }
}

async function resetPassword() {
  const email = $("#forgotEmail").value;
  const otp = $("#resetOtp").value;
  const newPassword = $("#newPassword").value;
  const msg = $("#forgotMsg");

  try {
    const data = await api("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, otp, newPassword })
    });

    msg.textContent = data.message;
  } catch (error) {
    msg.textContent = error.message;
  }
}

async function loadProfile() {
  if (!getToken()) return;

  try {
    const user = await api("/api/profile", { headers: authHeaders() });
    currentUser = user;
    localStorage.setItem(userKey, JSON.stringify(user));
    fillProfile(user);
    updateNav();
  } catch {
    clearSession();
  }
}

$("#profileForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();

  if (!getToken()) {
    showMessage("Bạn cần đăng nhập trước.", "error");
    return;
  }

  try {
    const data = await api("/api/profile", {
      method: "PUT",
      headers: authHeaders(),
      body: JSON.stringify(Object.fromEntries(new FormData(e.target)))
    });

    currentUser = data.user;
    localStorage.setItem(userKey, JSON.stringify(data.user));
    fillProfile(data.user);
    showMessage(data.message);
  } catch (error) {
    showMessage(error.message, "error");
  }
});

$("#logoutBtn")?.addEventListener("click", logout);

async function loadCourses() {
  coursesCache = await api("/api/courses");
  renderCourses(coursesCache);
  renderAdminCourses(coursesCache);
  loadAdminStats();
}

function renderCourses(courses) {
  const grid = $("#coursesGrid");
  if (!grid) return;

  const keyword = ($("#courseSearch")?.value || "").toLowerCase();
  const category = $("#categoryFilter")?.value || "";

  const filtered = courses.filter(c => {
    const text = `${c.title} ${c.category} ${c.instructor} ${c.description}`.toLowerCase();
    return text.includes(keyword) && (!category || c.category === category);
  });

  grid.innerHTML = filtered.map(course => `
    <article class="course-card">
      <img src="${course.image}" alt="${course.title}">
      <div>
        <span class="badge">${course.category} • ${course.level}</span>
        <h3>${course.title}</h3>
        <p>${course.description || ""}</p>
        <p class="hint">Giảng viên: ${course.instructor} • ${course.duration}</p>
        <button class="btn primary" onclick="enrollCourse(${course.id})">Đăng ký học</button>
      </div>
    </article>
  `).join("");
}

async function enrollCourse(id) {
  if (!getToken()) return showMessage("Bạn cần đăng nhập để đăng ký khóa học.", "error");

  try {
    const data = await api(`/api/courses/${id}/enroll`, {
      method: "POST",
      headers: authHeaders()
    });

    showMessage(data.message);
  } catch (error) {
    showMessage(error.message, "error");
  }
}

$("#courseSearch")?.addEventListener("input", () => renderCourses(coursesCache));
$("#categoryFilter")?.addEventListener("change", () => renderCourses(coursesCache));

async function loadWorkshops() {
  workshopsCache = await api("/api/workshops");
  renderWorkshops(workshopsCache);
  renderAdminWorkshops(workshopsCache);
  loadAdminStats();
}

function renderWorkshops(workshops) {
  const grid = $("#workshopsGrid");
  if (!grid) return;

  grid.innerHTML = workshops.map(w => `
    <article class="workshop-card">
      <span>${w.eventTime ? new Date(w.eventTime).toLocaleString("vi-VN") : "Sắp diễn ra"}</span>
      <h3>${w.title}</h3>
      <p>${w.description || ""}</p>
      <p>Diễn giả: ${w.speaker}</p>
      <p>Địa điểm: ${w.location} • ${w.seats} chỗ</p>
      <button class="btn light" onclick="registerWorkshop(${w.id})">Đăng ký</button>
    </article>
  `).join("");
}

async function registerWorkshop(id) {
  if (!getToken()) return showMessage("Bạn cần đăng nhập để đăng ký workshop.", "error");

  try {
    const data = await api(`/api/workshops/${id}/register`, {
      method: "POST",
      headers: authHeaders()
    });

    showMessage(data.message);
  } catch (error) {
    showMessage(error.message, "error");
  }
}

async function loadAdminStats() {
  if (!getToken()) return;

  try {
    const stats = await api("/api/admin/stats", { headers: authHeaders() });

    $("#statUsers").textContent = stats.users;
    $("#statCourses").textContent = stats.courses;
    $("#statWorkshops").textContent = stats.workshops;

    $("#adminUsers").textContent = stats.users;
    $("#adminStudents").textContent = stats.students;
    $("#adminCourses").textContent = stats.courses;
    $("#adminWorkshops").textContent = stats.workshops;
  } catch {
    $("#statCourses").textContent = coursesCache.length;
    $("#statWorkshops").textContent = workshopsCache.length;
  }
}

async function loadAdminUsers() {
  if (!getToken()) return showMessage("Bạn cần đăng nhập admin.", "error");

  try {
    const users = await api("/api/admin/users", { headers: authHeaders() });
    const tbody = $("#usersTable");

    tbody.innerHTML = users.map(user => `
      <tr>
        <td>${user.id}</td>
        <td><input value="${user.fullname || ""}" onchange="updateUserField(${user.id}, 'fullname', this.value)"></td>
        <td>${user.email}</td>
        <td><input value="${user.phone || ""}" onchange="updateUserField(${user.id}, 'phone', this.value)"></td>
        <td>
          <select onchange="updateUserField(${user.id}, 'role', this.value)">
            <option value="student" ${user.role === "student" ? "selected" : ""}>Student</option>
            <option value="instructor" ${user.role === "instructor" ? "selected" : ""}>Instructor</option>
            <option value="admin" ${user.role === "admin" ? "selected" : ""}>Admin</option>
          </select>
        </td>
        <td>
          <select onchange="updateUserField(${user.id}, 'status', this.value)">
            <option value="active" ${user.status === "active" ? "selected" : ""}>Active</option>
            <option value="locked" ${user.status === "locked" ? "selected" : ""}>Locked</option>
          </select>
        </td>
        <td><button class="btn danger small" onclick="deleteUser(${user.id})">Xóa</button></td>
      </tr>
    `).join("");
  } catch (error) {
    showMessage(error.message, "error");
  }
}

async function updateUserField(id, field, value) {
  try {
    const data = await api(`/api/admin/users/${id}`, {
      method: "PUT",
      headers: authHeaders(),
      body: JSON.stringify({ [field]: value })
    });

    showMessage(data.message);
    loadAdminStats();
  } catch (error) {
    showMessage(error.message, "error");
  }
}

async function deleteUser(id) {
  if (!confirm("Bạn có chắc muốn xóa người dùng này?")) return;

  try {
    const data = await api(`/api/admin/users/${id}`, {
      method: "DELETE",
      headers: authHeaders()
    });

    showMessage(data.message);
    loadAdminUsers();
    loadAdminStats();
  } catch (error) {
    showMessage(error.message, "error");
  }
}

function renderAdminCourses(courses) {
  const tbody = $("#adminCoursesTable");
  if (!tbody) return;

  tbody.innerHTML = courses.map(c => `
    <tr>
      <td>${c.id}</td>
      <td>${c.title}</td>
      <td>${c.category}</td>
      <td>${c.level}</td>
      <td>${c.instructor}</td>
      <td>
        <div class="action-row">
          <button class="btn ghost small" onclick="editCourse(${c.id})">Sửa</button>
          <button class="btn danger small" onclick="deleteCourse(${c.id})">Xóa</button>
        </div>
      </td>
    </tr>
  `).join("");
}

$("#courseForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const form = e.target;
  const payload = Object.fromEntries(new FormData(form));
  const id = payload.id;
  delete payload.id;

  try {
    const data = await api(id ? `/api/admin/courses/${id}` : "/api/admin/courses", {
      method: id ? "PUT" : "POST",
      headers: authHeaders(),
      body: JSON.stringify(payload)
    });

    showMessage(data.message);
    form.reset();
    loadCourses();
  } catch (error) {
    showMessage(error.message, "error");
  }
});

function editCourse(id) {
  const course = coursesCache.find(c => c.id === id);
  if (!course) return;

  const form = $("#courseForm");
  Object.keys(course).forEach(key => {
    if (form[key]) form[key].value = course[key] || "";
  });

  location.hash = "#admin";
}

function resetCourseForm() {
  $("#courseForm").reset();
  $("#courseForm").id.value = "";
}

async function deleteCourse(id) {
  if (!confirm("Bạn có chắc muốn xóa khóa học này?")) return;

  try {
    const data = await api(`/api/admin/courses/${id}`, {
      method: "DELETE",
      headers: authHeaders()
    });

    showMessage(data.message);
    loadCourses();
  } catch (error) {
    showMessage(error.message, "error");
  }
}

function renderAdminWorkshops(workshops) {
  const tbody = $("#adminWorkshopsTable");
  if (!tbody) return;

  tbody.innerHTML = workshops.map(w => `
    <tr>
      <td>${w.id}</td>
      <td>${w.title}</td>
      <td>${w.speaker}</td>
      <td>${w.eventTime ? new Date(w.eventTime).toLocaleString("vi-VN") : ""}</td>
      <td>${w.location}</td>
      <td>
        <div class="action-row">
          <button class="btn ghost small" onclick="editWorkshop(${w.id})">Sửa</button>
          <button class="btn danger small" onclick="deleteWorkshop(${w.id})">Xóa</button>
        </div>
      </td>
    </tr>
  `).join("");
}

$("#workshopForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const form = e.target;
  const payload = Object.fromEntries(new FormData(form));
  const id = payload.id;
  delete payload.id;

  try {
    const data = await api(id ? `/api/admin/workshops/${id}` : "/api/admin/workshops", {
      method: id ? "PUT" : "POST",
      headers: authHeaders(),
      body: JSON.stringify(payload)
    });

    showMessage(data.message);
    form.reset();
    loadWorkshops();
  } catch (error) {
    showMessage(error.message, "error");
  }
});

function editWorkshop(id) {
  const workshop = workshopsCache.find(w => w.id === id);
  if (!workshop) return;

  const form = $("#workshopForm");
  Object.keys(workshop).forEach(key => {
    if (form[key]) form[key].value = workshop[key] || "";
  });

  location.hash = "#admin";
}

function resetWorkshopForm() {
  $("#workshopForm").reset();
  $("#workshopForm").id.value = "";
}

async function deleteWorkshop(id) {
  if (!confirm("Bạn có chắc muốn xóa workshop này?")) return;

  try {
    const data = await api(`/api/admin/workshops/${id}`, {
      method: "DELETE",
      headers: authHeaders()
    });

    showMessage(data.message);
    loadWorkshops();
  } catch (error) {
    showMessage(error.message, "error");
  }
}

$$(".tab-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    $$(".tab-btn").forEach(b => b.classList.remove("active"));
    $$(".admin-panel").forEach(p => p.classList.remove("active"));
    btn.classList.add("active");
    $(`#${btn.dataset.tab}`)?.classList.add("active");
  });
});

function initSession() {
  const savedUser = localStorage.getItem(userKey);
  if (savedUser) currentUser = JSON.parse(savedUser);
  updateNav();
}

async function init() {
  initSession();
  await Promise.all([loadCourses(), loadWorkshops()]);
  if (getToken()) await loadProfile();
  if (currentUser?.role === "admin") {
    loadAdminStats();
    loadAdminUsers();
  }
}

init();
const themeBtn = document.getElementById("themeBtn");

const themes = ["dark", "purple", "green", "red"];
let themeIndex = 0;

themeBtn?.addEventListener("click", () => {
  document.body.classList.remove(...themes);

  themeIndex = (themeIndex + 1) % themes.length;

  document.body.classList.add(themes[themeIndex]);
});
function closeAuthModal() {
  const modal = document.getElementById("authModal");
  if (modal) {
    modal.style.display = "none";
    sessionStorage.setItem("authClosed", "true");
  }
}

window.addEventListener("load", function () {
  const modal = document.getElementById("authModal");
  if (modal && sessionStorage.getItem("authClosed") !== "true") {
    modal.style.display = "flex";
  }
});