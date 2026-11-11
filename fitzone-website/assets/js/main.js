/* =========================================================
   FitZone — хэрэглэгчийн хэсгийн JavaScript
   Статик сайт тул нэвтрэлт, захиалгыг localStorage-д хадгалж дуурайна.
   ========================================================= */

/* ---------- localStorage туслах функцууд ---------- */
const store = {
  get(key, fallback) {
    try {
      const v = localStorage.getItem(key);
      return v ? JSON.parse(v) : fallback;
    } catch (e) { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* хадгалах боломжгүй */ }
  },
  remove(key) {
    try { localStorage.removeItem(key); } catch (e) { /* */ }
  }
};

const money = n => n.toLocaleString("en-US") + "₮";
const qs = (sel, root = document) => root.querySelector(sel);
const qsa = (sel, root = document) => [...root.querySelectorAll(sel)];
const param = name => new URLSearchParams(location.search).get(name);
const escapeHtml = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

/* ---------- Огнооны туслах функцууд (YYYY-MM-DD мөрөөр ажиллана) ---------- */
const pad = n => String(n).padStart(2, "0");
const todayISO = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const isoParts = iso => iso.split("-").map(Number);
function addDays(iso, n) {
  const [y, m, d] = isoParts(iso);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}
function addMonths(iso, n) {
  const [y, m, d] = isoParts(iso);
  const last = new Date(Date.UTC(y, m - 1 + n + 1, 0)).getUTCDate();
  return new Date(Date.UTC(y, m - 1 + n, Math.min(d, last))).toISOString().slice(0, 10);
}
const showDate = iso => iso ? iso.replace(/-/g, ".") : "—";

/* Он / Сар / Өдөр гэсэн 3 сонголттой огноо сонгогч.
   min-ээс өмнөх, max-аас хойших огноог сонгох боломжгүй. */
function datePicker(id, opts) {
  const Y = qs(`#${id}Y`), M = qs(`#${id}M`), D = qs(`#${id}D`);
  if (!Y) return null;
  let range = { min: opts.min, max: opts.max };
  const daysIn = (y, m) => new Date(Date.UTC(y, m, 0)).getUTCDate();
  const fill = (sel, from, to, cur, label, off = () => false) => {
    let html = "";
    for (let i = from; i <= to; i++) html += `<option value="${i}"${off(i) ? " disabled" : ""}>${label(i)}</option>`;
    sel.innerHTML = html;
    sel.value = cur;
  };
  const current = () => `${Y.value}-${pad(M.value)}-${pad(D.value)}`;
  function render(val) {
    let v = val || range.min;
    if (v < range.min) v = range.min;
    if (v > range.max) v = range.max;
    let [y, m, d] = isoParts(v);
    const [minY, minM, minD] = isoParts(range.min), [maxY, maxM, maxD] = isoParts(range.max);
    fill(Y, minY, maxY, y, i => i + " он");
    const mFrom = y === minY ? minM : 1, mTo = y === maxY ? maxM : 12;
    m = Math.min(Math.max(m, mFrom), mTo);
    /* Бүх 12 сарыг харуулна; сонгох боломжгүй сар саарал өнгөтэй */
    fill(M, 1, 12, m, i => pad(i) + " сар", i => i < mFrom || i > mTo);
    const dFrom = (y === minY && m === minM) ? minD : 1;
    const dTo = (y === maxY && m === maxM) ? maxD : daysIn(y, m);
    d = Math.min(Math.max(d, dFrom), dTo);
    fill(D, 1, daysIn(y, m), d, i => pad(i) + " өдөр", i => i < dFrom || i > dTo);
  }
  [Y, M, D].forEach(sel => sel.addEventListener("change", () => {
    /* Сар/он солигдоход өдрийг тохирох хязгаарт оруулна */
    const y = +Y.value, m = +M.value;
    const d = Math.min(+D.value, daysIn(y, m));
    render(`${y}-${pad(m)}-${pad(d)}`);
    if (opts.onChange) opts.onChange(current());
  }));
  render(opts.value);
  return {
    get: current,
    set: v => render(v),
    setRange: (min, max, v) => { range = { min, max }; render(v || current()); }
  };
}

/* ---------- Гишүүнчлэлийн эрх ---------- */
const planEnd = (start, period) => addDays(addMonths(start, period === "year" ? 12 : 1), -1);
function userPlans(email) {
  return store.get("fz_bookings", [])
    .filter(b => b.email === email && b.kind === "plan")
    .map(b => {
      const start = b.start || b.date;
      return { ...b, start, end: b.end || planEnd(start, b.period) };
    })
    .sort((a, b) => a.start.localeCompare(b.start));
}
function planStatus(p) {
  const t = todayISO();
  if (p.end < t) return ["Дууссан", "secondary"];
  if (p.start > t) return ["Эхлээгүй", "warning"];
  return ["Идэвхтэй", "success"];
}
const overlaps = (a, b) => !(a.end < b.start || a.start > b.end);

/* ---------- Нийтлэл: зураг, видео ---------- */
const STATIC_POSTS = { 1: "blog-nutrition.html", 2: "blog-beginner.html", 3: "blog-recovery.html" };
function youtubeId(url) {
  const m = /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([\w-]{11})/.exec(url || "");
  return m ? m[1] : null;
}
function postImage(r, cls = "post-media") {
  return r.image && /^data:image\//.test(r.image) ? `<img src="${r.image}" class="${cls}" alt="${escapeHtml(r.title)}">` : "";
}
function postVideo(r) {
  const yt = youtubeId(r.video);
  if (yt) return `<div class="ratio ratio-16x9 mb-4"><iframe src="https://www.youtube.com/embed/${yt}" title="${escapeHtml(r.title)}" allowfullscreen></iframe></div>`;
  if (r.video && (/^data:video\//.test(r.video) || /^https?:\/\/\S+\.(mp4|webm|ogg)(\?\S*)?$/i.test(r.video)))
    return `<video src="${escapeHtml(r.video)}" class="post-media mb-4" controls></video>`;
  return "";
}

function currentUser() {
  const email = store.get("fz_current", null);
  if (!email) return null;
  return store.get("fz_users", []).find(u => u.email === email) || null;
}

function toast(message, type = "success") {
  let box = qs("#toastBox");
  if (!box) {
    box = document.createElement("div");
    box.id = "toastBox";
    box.className = "toast-container position-fixed top-0 end-0 p-3";
    box.style.zIndex = 2000;
    document.body.appendChild(box);
  }
  const el = document.createElement("div");
  el.className = `toast align-items-center text-bg-${type} border-0`;
  el.innerHTML = `<div class="d-flex"><div class="toast-body">${escapeHtml(message)}</div>
    <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button></div>`;
  box.appendChild(el);
  new bootstrap.Toast(el, { delay: 3000 }).show();
}

/* ---------- Навигацийн хэрэглэгчийн хэсэг ---------- */
function renderNavUser() {
  const slot = qs("#navUser");
  if (!slot) return;
  const user = currentUser();
  if (user) {
    slot.innerHTML = `
      <div class="dropdown">
        <a class="btn btn-outline-light btn-sm dropdown-toggle" href="#" data-bs-toggle="dropdown">
          <i class="bi bi-person-circle me-1"></i>${escapeHtml(user.name.split(" ")[0])}
        </a>
        <ul class="dropdown-menu dropdown-menu-end">
          <li><h6 class="dropdown-header">${escapeHtml(user.email)}</h6></li>
          <li><a class="dropdown-item" href="profile.html"><i class="bi bi-person me-2"></i>Профайл</a></li>
          <li><a class="dropdown-item" href="my-bookings.html"><i class="bi bi-calendar-check me-2"></i>Миний хичээл</a></li>
          <li><a class="dropdown-item" href="my-membership.html"><i class="bi bi-award me-2"></i>Миний гишүүнчлэл</a></li>
          <li><a class="dropdown-item" href="body-stats.html"><i class="bi bi-activity me-2"></i>Биеийн хэмжилтийн түүх</a></li>
          <li><hr class="dropdown-divider"></li>
          <li><a class="dropdown-item" href="#" id="logoutBtn"><i class="bi bi-box-arrow-right me-2"></i>Гарах</a></li>
        </ul>
      </div>`;
    qs("#logoutBtn").addEventListener("click", e => {
      e.preventDefault();
      store.remove("fz_current");
      location.href = "index.html";
    });
  } else {
    slot.innerHTML = `
      <a href="login.html" class="btn btn-outline-light btn-sm me-2">Нэвтрэх</a>
      <a href="register.html" class="btn btn-primary btn-sm">Бүртгүүлэх</a>`;
  }
}

/* Нэвтрэх шаардлагатай хуудсууд */
function requireLogin() {
  if (!currentUser()) {
    location.href = "login.html?next=" + encodeURIComponent(location.pathname.split("/").pop() + location.search);
    return false;
  }
  return true;
}

/* ---------- Ерөнхий: back-to-top, тоолуур ---------- */
function initCommon() {
  const btn = qs("#backToTop");
  if (btn) {
    window.addEventListener("scroll", () => { btn.style.display = scrollY > 400 ? "block" : "none"; });
    btn.addEventListener("click", () => scrollTo({ top: 0, behavior: "smooth" }));
  }

  const counters = qsa(".counter");
  if (counters.length) {
    const io = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        const target = +el.dataset.target;
        let cur = 0;
        const step = Math.max(1, Math.ceil(target / 60));
        const timer = setInterval(() => {
          cur = Math.min(target, cur + step);
          el.textContent = cur.toLocaleString("en-US") + (el.dataset.suffix || "");
          if (cur >= target) clearInterval(timer);
        }, 20);
        io.unobserve(el);
      });
    });
    counters.forEach(c => io.observe(c));
  }

  /* Bootstrap-ийн формын шалгалт */
  qsa("form.needs-validation").forEach(form => {
    form.addEventListener("submit", e => {
      if (!form.checkValidity()) {
        e.preventDefault();
        e.stopImmediatePropagation();
      }
      form.classList.add("was-validated");
    }, true);
  });

  const year = qs("#year");
  if (year) year.textContent = new Date().getFullYear();
}

/* ---------- Хичээлийн хуваарь ---------- */
function bookClass(id) {
  const user = currentUser();
  if (!user) {
    toast("Хичээлд бүртгүүлэхийн тулд эхлээд нэвтэрнэ үү.", "warning");
    setTimeout(() => { location.href = "login.html?next=schedule.html"; }, 1200);
    return;
  }
  const c = fzClasses().find(x => x.id === id);
  const bookings = store.get("fz_bookings", []);
  if (bookings.some(b => b.email === user.email && b.kind === "class" && b.classId === id)) {
    toast("Та энэ хичээлд аль хэдийн бүртгүүлсэн байна.", "warning");
    return;
  }
  bookings.push({
    id: Date.now(), email: user.email, kind: "class", classId: id,
    title: c.name, detail: `${c.day} ${c.time} · ${c.trainer} · ${c.room}`, date: new Date().toISOString().slice(0, 10)
  });
  store.set("fz_bookings", bookings);
  toast(`«${c.name}» хичээлд амжилттай бүртгүүллээ!`);
}

/* Нэвтэрсэн хэрэглэгчийн бүртгүүлсэн хичээлийн дугаарууд */
function bookedClassIds() {
  const user = currentUser();
  if (!user) return [];
  return store.get("fz_bookings", []).filter(b => b.email === user.email && b.kind === "class").map(b => b.classId);
}

function initSchedule() {
  const body = qs("#scheduleBody");
  if (!body) return;
  let day = "Бүгд";
  /* Үйлчилгээний хуудаснаас ?type=Бокс гэж ирвэл зөвхөн тэр төрлийг харуулна */
  const classes = fzClasses();
  const types = [...new Set(fzTypes().concat(classes.map(c => c.type)))];
  qs("#typeFilter").innerHTML = ["Бүгд"].concat(types).map(t => `<option>${escapeHtml(t)}</option>`).join("");
  let type = types.includes(param("type")) ? param("type") : "Бүгд";
  qs("#typeFilter").value = type;
  const banner = qs("#typeBanner");
  const draw = () => {
    if (banner) {
      banner.classList.toggle("d-none", type === "Бүгд");
      banner.querySelector("span").textContent = type;
    }
    const booked = bookedClassIds();
    const rows = classes.filter(c => (day === "Бүгд" || c.day === day) && (type === "Бүгд" || c.type === type));
    body.innerHTML = rows.length ? rows.map(c => `
      <tr>
        <td><span class="badge bg-dark">${c.day}</span></td>
        <td class="fw-bold">${c.time}</td>
        <td>${escapeHtml(c.name)}<div class="small text-muted d-md-none">${escapeHtml(c.trainer)} · ${escapeHtml(c.room || "—")}</div></td>
        <td class="d-none d-md-table-cell"><span class="badge rounded-pill text-bg-light border">${escapeHtml(c.type)}</span></td>
        <td class="d-none d-md-table-cell">${trainerLink(c.trainer)}</td>
        <td class="d-none d-lg-table-cell">${escapeHtml(c.room || "—")}</td>
        <td class="d-none d-lg-table-cell">${c.spots} хүн</td>
        <td class="text-end">${booked.includes(c.id)
          ? `<a href="my-bookings.html" class="btn btn-sm btn-success text-nowrap" title="Миний хичээл рүү очих"><i class="bi bi-check2-circle me-1"></i>Бүртгүүлсэн</a>`
          : `<button class="btn btn-sm btn-primary" data-book="${c.id}">Бүртгүүлэх</button>`}</td>
      </tr>`).join("")
      : `<tr><td colspan="8" class="text-center text-muted py-4">Сонгосон шүүлтүүрт тохирох хичээл алга.</td></tr>`;
    qs("#scheduleCount").textContent = rows.length;
  };
  qsa("[data-day]").forEach(btn => btn.addEventListener("click", () => {
    qsa("[data-day]").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    day = btn.dataset.day;
    draw();
  }));
  qs("#typeFilter").addEventListener("change", e => {
    type = e.target.value;
    history.replaceState(null, "", type === "Бүгд" ? "schedule.html" : "schedule.html?type=" + encodeURIComponent(type));
    draw();
  });
  if (banner) banner.querySelector("button").addEventListener("click", () => {
    type = "Бүгд";
    qs("#typeFilter").value = type;
    history.replaceState(null, "", "schedule.html");
    draw();
  });
  body.addEventListener("click", e => {
    const b = e.target.closest("[data-book]");
    if (b) { bookClass(+b.dataset.book); draw(); }
  });
  draw();
}

/* ---------- Гишүүнчлэл: сар/жилийн сэлгэлт ---------- */
function initMembership() {
  const toggle = qs("#billingToggle");
  if (!toggle) return;
  const draw = () => {
    const yearly = toggle.checked;
    qsa("[data-plan-price]").forEach(el => {
      const plan = FZ_PLANS[el.dataset.planPrice];
      el.innerHTML = `${money(yearly ? plan.year : plan.month)} <small>/ ${yearly ? "жил" : "сар"}</small>`;
    });
    qsa("[data-plan-link]").forEach(a => {
      a.href = `booking.html?plan=${a.dataset.planLink}&period=${yearly ? "year" : "month"}`;
    });
  };
  toggle.addEventListener("change", draw);
  draw();
}

/* ---------- BMI ба илчлэгийн тооцоолуур ---------- */
function initBmi() {
  const form = qs("#bmiForm");
  if (!form) return;
  form.addEventListener("submit", e => {
    e.preventDefault();
    const h = +qs("#bmiHeight").value / 100;
    const w = +qs("#bmiWeight").value;
    if (!h || !w) return;
    const bmi = w / (h * h);
    let label, cls, advice;
    if (bmi < 18.5) { label = "Жингийн дутагдалтай"; cls = "info"; advice = "Хүч чадлын дасгал болон илчлэг өндөртэй эрүүл хооллолт зөвлөж байна."; }
    else if (bmi < 25) { label = "Хэвийн жин"; cls = "success"; advice = "Сайн байна! Одоогийн хэв маягаа хадгалж, долоо хоногт 3–4 удаа дасгал хийгээрэй."; }
    else if (bmi < 30) { label = "Илүүдэл жин"; cls = "warning"; advice = "Кардио болон HIIT хичээлүүдийг илчлэгийн бага зэргийн дутагдалтай хооллолттой хослуулаарай."; }
    else { label = "Таргалалт"; cls = "danger"; advice = "Эмчтэй зөвлөлдөж, дасгалжуулагчтай хамт аюулгүй хөтөлбөр гаргахыг зөвлөж байна."; }
    const pct = Math.min(100, Math.max(0, (bmi - 15) / 25 * 100));
    qs("#bmiResult").innerHTML = `
      <div class="alert alert-${cls} mb-0">
        <div class="display-6 fw-bold">${bmi.toFixed(1)}</div>
        <div class="fw-semibold mb-2">${label}</div>
        <div class="progress mb-2" style="height:8px"><div class="progress-bar bg-${cls}" style="width:${pct}%"></div></div>
        <div class="small">${advice}</div>
      </div>`;
  });

  const cal = qs("#calForm");
  cal.addEventListener("submit", e => {
    e.preventDefault();
    const age = +qs("#calAge").value, h = +qs("#calHeight").value, w = +qs("#calWeight").value;
    const male = qs("#calGender").value === "male";
    const act = +qs("#calActivity").value;
    if (!age || !h || !w) return;
    /* Mifflin–St Jeor тэгшитгэл */
    const bmr = 10 * w + 6.25 * h - 5 * age + (male ? 5 : -161);
    const tdee = Math.round(bmr * act);
    qs("#calResult").innerHTML = `
      <div class="row g-2 text-center">
        <div class="col-4"><div class="p-3 bg-light-fz rounded"><div class="small text-muted">Турах</div><div class="fw-bold fs-5">${tdee - 500}</div><div class="small">ккал</div></div></div>
        <div class="col-4"><div class="p-3 rounded text-white bg-primary"><div class="small">Хадгалах</div><div class="fw-bold fs-5">${tdee}</div><div class="small">ккал</div></div></div>
        <div class="col-4"><div class="p-3 bg-light-fz rounded"><div class="small text-muted">Булчин нэмэх</div><div class="fw-bold fs-5">${tdee + 300}</div><div class="small">ккал</div></div></div>
      </div>
      <p class="small text-muted mt-2 mb-0">Суурь бодисын солилцоо (BMR): ${Math.round(bmr)} ккал/өдөр</p>`;
  });
}

/* ---------- Холбоо барих ---------- */
function initContact() {
  const form = qs("#contactForm");
  if (!form) return;
  form.addEventListener("submit", e => {
    e.preventDefault();
    const msgs = store.get("fz_messages", []);
    msgs.push({ id: Date.now(), name: qs("#cName").value, email: qs("#cEmail").value, subject: qs("#cSubject").value, text: qs("#cMessage").value, date: new Date().toISOString().slice(0, 10) });
    store.set("fz_messages", msgs);
    form.reset();
    form.classList.remove("was-validated");
    toast("Таны мессежийг хүлээн авлаа. Бид 24 цагийн дотор хариулна.");
  });
}

/* ---------- Бүртгүүлэх / Нэвтрэх ---------- */
function initAuth() {
  const reg = qs("#registerForm");
  if (reg) {
    reg.addEventListener("submit", e => {
      e.preventDefault();
      const pass = qs("#rPass"), pass2 = qs("#rPass2");
      if (pass.value !== pass2.value) {
        pass2.setCustomValidity("mismatch");
        reg.classList.add("was-validated");
        return;
      }
      const users = store.get("fz_users", []);
      const email = qs("#rEmail").value.trim().toLowerCase();
      if (users.some(u => u.email === email)) {
        toast("Энэ имэйлээр бүртгэл үүссэн байна. Нэвтэрнэ үү.", "warning");
        return;
      }
      users.push({ name: qs("#rName").value.trim(), email, phone: qs("#rPhone").value.trim(), password: pass.value, joined: new Date().toISOString().slice(0, 10), goal: "Ерөнхий бие бялдар" });
      store.set("fz_users", users);
      store.set("fz_current", email);
      toast("Бүртгэл амжилттай үүслээ!");
      setTimeout(() => { location.href = "profile.html"; }, 900);
    });
    qs("#rPass2").addEventListener("input", e => e.target.setCustomValidity(""));
    /* Дүрмийн цонхны «Зөвшөөрч байна» товч — чагтыг тэмдэглээд цонхыг хаана */
    qs("#rulesAccept").addEventListener("click", () => {
      qs("#rTerms").checked = true;
      bootstrap.Modal.getInstance(qs("#rulesModal")).hide();
    });
  }

  const login = qs("#loginForm");
  if (login) {
    login.addEventListener("submit", e => {
      e.preventDefault();
      const email = qs("#lEmail").value.trim().toLowerCase();
      const user = store.get("fz_users", []).find(u => u.email === email && u.password === qs("#lPass").value);
      if (!user) {
        qs("#loginError").classList.remove("d-none");
        return;
      }
      store.set("fz_current", email);
      const next = param("next");
      location.href = next && /^[\w\-.]+\.html(\?[\w=&\-]*)?$/.test(next) ? next : "profile.html";
    });
  }
}

/* ---------- Профайл ---------- */
function initProfile() {
  const form = qs("#profileForm");
  if (!form || !requireLogin()) return;
  const user = currentUser();
  qs("#pAvatar").textContent = user.name.trim().charAt(0).toUpperCase();
  qs("#pTitle").textContent = user.name;
  qs("#pJoined").textContent = user.joined;
  qs("#pName").value = user.name;
  qs("#pEmail").value = user.email;
  qs("#pPhone").value = user.phone || "";
  qs("#pGoal").value = user.goal || "Ерөнхий бие бялдар";
  const bookings = store.get("fz_bookings", []).filter(b => b.email === user.email);
  qs("#pClassCount").textContent = bookings.filter(b => b.kind === "class").length;
  const active = userPlans(user.email).find(p => planStatus(p)[0] === "Идэвхтэй");
  qs("#pPlan").textContent = active ? `${active.title} (${showDate(active.end)} хүртэл)` : "Идэвхтэй эрхгүй";

  form.addEventListener("submit", e => {
    e.preventDefault();
    const users = store.get("fz_users", []);
    const u = users.find(x => x.email === user.email);
    u.name = qs("#pName").value.trim();
    u.phone = qs("#pPhone").value.trim();
    u.goal = qs("#pGoal").value;
    store.set("fz_users", users);
    qs("#pTitle").textContent = u.name;
    renderNavUser();
    toast("Мэдээлэл хадгалагдлаа.");
  });
}

/* ---------- Миний хичээл ---------- */
function initMyBookings() {
  const list = qs("#bookingList");
  if (!list || !requireLogin()) return;
  const user = currentUser();
  const draw = () => {
    const mine = store.get("fz_bookings", []).filter(b => b.email === user.email && b.kind === "class").reverse();
    list.innerHTML = mine.length ? mine.map(b => `
      <div class="card fz-card h-auto mb-3">
        <div class="card-body d-flex flex-wrap align-items-center gap-3">
          <div class="icon-circle"><i class="bi bi-calendar-event"></i></div>
          <div class="flex-grow-1">
            <div class="fw-bold">${escapeHtml(b.title)}</div>
            <div class="small text-muted">${escapeHtml(b.detail)}</div>
            <div class="small text-muted">Бүртгүүлсэн: ${showDate(b.date)}</div>
          </div>
          <span class="badge text-bg-success">Бүртгүүлсэн</span>
          <button class="btn btn-sm btn-outline-danger" data-cancel="${b.id}">Цуцлах</button>
        </div>
      </div>`).join("")
      : `<div class="text-center py-5"><i class="bi bi-calendar-x display-4 text-muted"></i>
         <p class="mt-3 text-muted">Та одоогоор хичээлд бүртгүүлээгүй байна.</p>
         <a href="schedule.html" class="btn btn-primary">Хуваарь харах</a></div>`;
  };
  list.addEventListener("click", e => {
    const b = e.target.closest("[data-cancel]");
    if (!b || !confirm("Энэ хичээлийн бүртгэлийг цуцлах уу?")) return;
    store.set("fz_bookings", store.get("fz_bookings", []).filter(x => x.id !== +b.dataset.cancel));
    toast("Бүртгэл цуцлагдлаа.", "secondary");
    draw();
  });
  draw();
}

/* ---------- Гишүүнчлэлийн карт (захиалга, миний гишүүнчлэл хуудсанд хоёуланд нь) ---------- */
function planCard(p, withActions) {
  const [label, color] = planStatus(p);
  const t = todayISO();
  let progress = "";
  if (label === "Идэвхтэй") {
    const total = (Date.parse(p.end) - Date.parse(p.start)) / 864e5 + 1;
    const used = (Date.parse(t) - Date.parse(p.start)) / 864e5 + 1;
    const left = Math.round(total - used);
    progress = `<div class="progress mt-2" style="height:6px"><div class="progress-bar bg-primary" style="width:${Math.round(used / total * 100)}%"></div></div>
                <div class="small text-muted mt-1">${left} хоног үлдсэн</div>`;
  }
  return `
    <div class="card fz-card h-auto mb-3">
      <div class="card-body d-flex flex-wrap align-items-center gap-3">
        <div class="icon-circle"><i class="bi bi-award"></i></div>
        <div class="flex-grow-1" style="min-width:220px">
          <div class="fw-bold">${escapeHtml(p.title)} · ${p.period === "year" ? "1 жил" : "1 сар"}</div>
          <div class="small"><i class="bi bi-calendar-range me-1 text-primary"></i>${showDate(p.start)} — ${showDate(p.end)}</div>
          <div class="small text-muted">Төлсөн: ${showDate(p.date)}${p.method ? " · " + escapeHtml(p.method) : ""}</div>
          ${progress}
        </div>
        ${p.amount ? `<div class="fw-bold">${money(p.amount)}</div>` : ""}
        <span class="badge text-bg-${color}">${label}</span>
        ${withActions && label === "Эхлээгүй" ? `<button class="btn btn-sm btn-outline-primary" data-change="${p.id}"><i class="bi bi-calendar-event me-1"></i>Огноо өөрчлөх</button>` : ""}
      </div>
    </div>`;
}

/* ---------- Миний гишүүнчлэл ---------- */
function initMembershipPage() {
  const list = qs("#membershipList");
  if (!list || !requireLogin()) return;
  const user = currentUser();
  let editing = null;
  const t = todayISO();
  const picker = datePicker("mStart", {
    min: t, max: addMonths(t, 60), value: t,
    onChange: v => { qs("#mEnd").textContent = showDate(planEnd(v, editing.period)); }
  });
  const modal = new bootstrap.Modal(qs("#dateModal"));

  const draw = () => {
    const plans = userPlans(user.email).reverse();
    list.innerHTML = plans.length ? plans.map(p => planCard(p, true)).join("")
      : `<div class="text-center py-5"><i class="bi bi-award display-4 text-muted"></i>
         <p class="mt-3 text-muted">Танд гишүүнчлэлийн эрх алга.</p>
         <a href="membership.html" class="btn btn-primary">Багц сонгох</a></div>`;
  };

  list.addEventListener("click", e => {
    const b = e.target.closest("[data-change]");
    if (!b) return;
    editing = userPlans(user.email).find(p => p.id === +b.dataset.change);
    picker.setRange(t, addMonths(t, 60), editing.start);
    qs("#dateModalInfo").textContent = `${editing.title}-ийн эрх хараахан эхлээгүй тул эхлэх өдрийг өнөөдрөөс хойш өөрчилж болно. Өөр эрхтэйгээ давхцахгүй байх ёстой.`;
    qs("#mEnd").textContent = showDate(planEnd(editing.start, editing.period));
    qs("#dateModalError").classList.add("d-none");
    modal.show();
  });

  qs("#dateSave").addEventListener("click", () => {
    const start = picker.get();
    const range = { start, end: planEnd(start, editing.period) };
    const clash = userPlans(user.email).find(p => p.id !== editing.id && overlaps(range, p));
    if (clash) {
      const err = qs("#dateModalError");
      err.textContent = `Энэ хугацаа таны «${clash.title}» эрхтэй (${showDate(clash.start)} — ${showDate(clash.end)}) давхцаж байна. Өөр өдөр сонгоно уу.`;
      err.classList.remove("d-none");
      return;
    }
    const all = store.get("fz_bookings", []);
    const rec = all.find(b => b.id === editing.id);
    rec.start = range.start;
    rec.end = range.end;
    rec.period = editing.period;
    store.set("fz_bookings", all);
    modal.hide();
    toast(`Эхлэх огноо ${showDate(range.start)} болж өөрчлөгдлөө.`);
    draw();
  });
  draw();
}

/* ---------- Багц захиалах, төлбөр (дуурайлга) ---------- */
function initBooking() {
  const form = qs("#bookingForm");
  if (!form || !requireLogin()) return;
  const user = currentUser();
  const planSel = qs("#bPlan"), periodSel = qs("#bPeriod");
  if (FZ_PLANS[param("plan")]) planSel.value = param("plan");
  if (param("period") === "year") periodSel.value = "year";

  qs("#bName").value = user.name;
  qs("#bEmail").value = user.email;
  qs("#bEmail").readOnly = true;
  qs("#bPhone").value = user.phone || "";

  /* Өмнөх эрхүүд: шинэ эрх нь хамгийн сүүлийн эрх дууссаны маргаашаас эрт эхлэх боломжгүй */
  const t = todayISO();
  const live = userPlans(user.email).filter(p => p.end >= t);
  const lastEnd = live.reduce((m, p) => (p.end > m ? p.end : m), "");
  const earliest = lastEnd && addDays(lastEnd, 1) > t ? addDays(lastEnd, 1) : t;

  if (live.length) {
    qs("#currentPlans").innerHTML = `
      <div class="card fz-card h-auto mb-4 border-start border-4 border-warning">
        <div class="card-body p-4">
          <h5 class="mb-1"><i class="bi bi-info-circle text-warning me-2"></i>Танд хүчинтэй гишүүнчлэлийн эрх байна</h5>
          <p class="small text-muted">Давхардал үүсэхгүйн тулд шинэ эрх нь <strong>${showDate(earliest)}</strong>-өөс эхэлнэ (одоогийн эрх дууссаны дараа).</p>
          ${live.map(p => planCard(p, false)).join("")}
        </div>
      </div>`;
  }

  const draw = () => {
    const tt = total();
    qs("#sumPlan").textContent = `${tt.p.name} (${periodSel.value === "year" ? "1 жил" : "1 сар"})`;
    qs("#sumBase").textContent = money(tt.base);
    qs("#sumPromo").textContent = tt.promo ? "−" + money(tt.promo) : "0₮";
    qs("#sumTotal").textContent = money(tt.sum);
    const start = picker.get();
    qs("#sumRange").textContent = `${showDate(start)} — ${showDate(planEnd(start, periodSel.value))}`;
  };
  const picker = datePicker("bStart", { min: earliest, max: addMonths(t, 60), value: earliest, onChange: () => draw() });
  qs("#bStartHint").textContent = live.length
    ? `Өмнөх эрх дууссаны дараах ${showDate(earliest)}-өөс хойших дурын өдрийг сонгож болно. Саарал өдрүүд өмнөх эрхтэй давхцана.`
    : "Өнөөдрөөс эхлэн 5 жилийн дотор сонгоно.";

  const total = () => {
    const p = FZ_PLANS[planSel.value];
    const base = periodSel.value === "year" ? p.year : p.month;
    const promo = qs("#bPromo").value.trim().toUpperCase() === "FIT10" ? Math.round(base * 0.1) : 0;
    return { p, base, promo, sum: base - promo };
  };
  [planSel, periodSel].forEach(el => el.addEventListener("change", draw));
  qs("#bPromo").addEventListener("input", draw);
  draw();

  form.addEventListener("submit", e => {
    e.preventDefault();
    qs("#payAmount").textContent = money(total().sum);
    new bootstrap.Modal(qs("#payModal")).show();
  });

  qs("#payConfirm").addEventListener("click", () => {
    const tt = total();
    const start = picker.get();
    const range = { start, end: planEnd(start, periodSel.value) };
    const clash = userPlans(user.email).find(p => overlaps(range, p));
    if (clash) {
      bootstrap.Modal.getInstance(qs("#payModal")).hide();
      toast("Сонгосон хугацаа таны өөр эрхтэй давхцаж байна.", "danger");
      return;
    }
    const method = qs("input[name=payMethod]:checked").value;
    const bookings = store.get("fz_bookings", []);
    bookings.push({
      id: Date.now(), email: user.email, kind: "plan", plan: planSel.value, period: periodSel.value,
      title: `${tt.p.name} багц`, detail: `${periodSel.value === "year" ? "Жилийн" : "Сарын"} гишүүнчлэл · ${method}`,
      method, amount: tt.sum, date: t, start: range.start, end: range.end
    });
    store.set("fz_bookings", bookings);
    bootstrap.Modal.getInstance(qs("#payModal")).hide();
    qs("#bookingWrap").innerHTML = `
      <div class="text-center py-5">
        <div class="icon-circle mb-3" style="width:90px;height:90px;font-size:2.5rem"><i class="bi bi-check-lg"></i></div>
        <h2>Төлбөр амжилттай!</h2>
        <p class="text-muted">${tt.p.name} багцын төлбөр ${money(tt.sum)} хүлээн авлаа.<br>
        Эрх ${showDate(range.start)} — ${showDate(range.end)} хүртэл хүчинтэй.</p>
        <a href="my-membership.html" class="btn btn-primary">Миний гишүүнчлэл</a>
      </div>`;
  });
}

/* ---------- Биеийн хэмжилтийн түүх ---------- */
function initMeasures() {
  const form = qs("#measureForm");
  if (!form || !requireLogin()) return;
  const user = currentUser();
  const t = todayISO();
  const picker = datePicker("msDate", { min: addMonths(t, -60), max: t, value: t });
  const mine = () => store.get("fz_measures", []).filter(m => m.email === user.email)
    .sort((a, b) => a.date.localeCompare(b.date) || a.id - b.id);

  const chart = rows => {
    if (rows.length < 2) return `<p class="text-muted small py-5 text-center">График гаргахын тулд хамгийн багадаа 2 хэмжилт оруулна уу.</p>`;
    const W = 600, H = 220, L = 40, R = 16, T = 16, B = 30;
    const ws = rows.map(r => r.weight);
    const lo = Math.floor(Math.min(...ws) - 1), hi = Math.ceil(Math.max(...ws) + 1);
    const x = i => L + i * (W - L - R) / (rows.length - 1);
    const y = v => T + (hi - v) * (H - T - B) / (hi - lo);
    const grid = [lo, (lo + hi) / 2, hi].map(v => `<line class="grid" x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}"/><text x="${L - 6}" y="${y(v) + 4}" text-anchor="end">${v.toFixed(0)}</text>`).join("");
    const pts = rows.map((r, i) => `${x(i)},${y(r.weight)}`).join(" ");
    const dots = rows.map((r, i) => `<circle class="dot" cx="${x(i)}" cy="${y(r.weight)}" r="4"><title>${showDate(r.date)} ${r.time || ""}: ${r.weight} кг</title></circle>`).join("");
    const labels = rows.map((r, i) => (rows.length <= 6 || i % Math.ceil(rows.length / 6) === 0 || i === rows.length - 1)
      ? `<text x="${x(i)}" y="${H - 8}" text-anchor="middle">${r.date.slice(5).replace("-", ".")}</text>` : "").join("");
    return `<svg class="measure-chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Жингийн өөрчлөлт">${grid}<polyline class="line" points="${pts}"/>${dots}${labels}</svg>`;
  };

  const draw = () => {
    const rows = mine();
    const last = rows[rows.length - 1];
    if (last && !qs("#msHeight").value) qs("#msHeight").value = last.height;
    qs("#measureChart").innerHTML = chart(rows);
    if (rows.length >= 2) {
      const d = (last.weight - rows[0].weight).toFixed(1);
      qs("#measureDelta").innerHTML = `Эхнээс: <strong class="${d <= 0 ? "text-success" : "text-danger"}">${d > 0 ? "+" : ""}${d} кг</strong>`;
    } else qs("#measureDelta").textContent = "";
    qs("#measureBody").innerHTML = rows.length ? rows.slice().reverse().map(r => {
      const bmi = r.weight / Math.pow(r.height / 100, 2);
      return `<tr><td>${showDate(r.date)}${r.time ? `<div class="small text-muted">${r.time}</div>` : ""}</td><td class="fw-semibold">${r.weight} кг</td><td>${bmi.toFixed(1)}</td>
        <td>${r.fat ? r.fat + "%" : "—"}</td><td>${r.waist ? r.waist + " см" : "—"}</td>
        <td class="text-end"><button class="btn btn-sm btn-light text-danger" data-del-m="${r.id}" title="Устгах"><i class="bi bi-trash"></i></button></td></tr>`;
    }).join("") : `<tr><td colspan="6" class="text-center text-muted py-4">Хэмжилт оруулаагүй байна.</td></tr>`;
  };

  form.addEventListener("submit", e => {
    e.preventDefault();
    if (!form.checkValidity()) return;
    const all = store.get("fz_measures", []);
    const date = picker.get();
    const now = new Date();
    const rec = {
      id: Date.now(), email: user.email, date, time: `${pad(now.getHours())}:${pad(now.getMinutes())}`,
      weight: +qs("#msWeight").value, height: +qs("#msHeight").value,
      fat: qs("#msFat").value ? +qs("#msFat").value : null, waist: qs("#msWaist").value ? +qs("#msWaist").value : null
    };
    /* Хэмжилт бүр тусдаа мөр болж түүхэнд нэмэгдэнэ (нэг өдөр хэд ч байж болно) */
    all.push(rec);
    store.set("fz_measures", all);
    qs("#msWeight").value = ""; qs("#msFat").value = ""; qs("#msWaist").value = "";
    form.classList.remove("was-validated");
    toast("Хэмжилт түүхэнд нэмэгдлээ.");
    draw();
  });
  qs("#measureBody").addEventListener("click", e => {
    const b = e.target.closest("[data-del-m]");
    if (!b || !confirm("Энэ хэмжилтийг устгах уу?")) return;
    store.set("fz_measures", store.get("fz_measures", []).filter(m => m.id !== +b.dataset.delM));
    draw();
  });
  draw();
}

/* ---------- Блог: админаас нэмсэн нийтлэлүүд ---------- */
function adminPosts() { return store.get("fz_admin_posts", null); }
const isPublished = r => r.status === "Нийтлэгдсэн";

function initBlogList() {
  const grid = qs("#postGrid");
  if (!grid) return;
  const posts = adminPosts();
  if (!posts) return; /* админ нийтлэлд өөрчлөлт оруулаагүй */
  /* Админ устгасан эсвэл ноорог болгосон анхны нийтлэлийг нууна */
  qsa("[data-post-id]", grid).forEach(col => {
    const r = posts.find(p => p.id === +col.dataset.postId);
    col.classList.toggle("d-none", !r || !isPublished(r));
  });
  const fresh = posts.filter(p => !STATIC_POSTS[p.id] && isPublished(p)).sort((a, b) => String(b.date).localeCompare(String(a.date)));
  grid.insertAdjacentHTML("afterbegin", fresh.map(p => `
    <div class="col-md-6 col-lg-4">
      <div class="card fz-card">
        ${postImage(p) || (youtubeId(p.video) ? `<img src="https://img.youtube.com/vi/${youtubeId(p.video)}/hqdefault.jpg" class="post-media" alt="">` : `<div class="img-ph wide ph-5"><i class="bi ${p.video ? "bi-play-circle" : "bi-newspaper"}"></i></div>`)}
        <div class="card-body p-4">
          <div class="small text-muted mb-2"><span class="badge text-bg-light border me-2">${escapeHtml(p.category)}</span>${showDate(p.date)}${p.video ? ' · <i class="bi bi-camera-video"></i> видео' : ""}</div>
          <h5 class="card-title"><a href="post.html?id=${p.id}" class="text-reset text-decoration-none">${escapeHtml(p.title)}</a></h5>
          <p class="text-muted small">${escapeHtml((p.content || "").slice(0, 110))}${(p.content || "").length > 110 ? "..." : ""}</p>
          <a href="post.html?id=${p.id}" class="fw-semibold text-decoration-none">Унших <i class="bi bi-arrow-right"></i></a>
        </div>
      </div>
    </div>`).join(""));
}

function initPost() {
  const art = qs("#postArticle");
  if (!art) return;
  const id = +param("id");
  if (STATIC_POSTS[id]) { location.replace(STATIC_POSTS[id]); return; }
  const posts = adminPosts() || [];
  const r = posts.find(p => p.id === id && isPublished(p));
  if (!r) {
    art.innerHTML = `<div class="text-center py-5"><i class="bi bi-file-earmark-x display-4 text-muted"></i><p class="mt-3 text-muted">Нийтлэл олдсонгүй.</p><a href="blog.html" class="btn btn-primary">Бүх нийтлэл</a></div>`;
    return;
  }
  document.title = r.title + " | FitZone фитнес клуб";
  qs(".page-header h1").textContent = r.title;
  qs(".page-header .breadcrumb-item.active").textContent = r.title;
  qs(".page-header .lead").textContent = `${r.category} · ${r.author}`;
  const body = (r.content || "").split(/\n\s*\n|\n/).filter(Boolean).map(t => `<p>${escapeHtml(t)}</p>`).join("");
  art.innerHTML = `
    ${postImage(r, "post-media mb-4")}
    ${postVideo(r)}
    <div class="small text-muted mb-3"><span class="badge bg-primary me-2">${escapeHtml(r.category)}</span><i class="bi bi-person me-1"></i>${escapeHtml(r.author)} · <i class="bi bi-calendar me-1"></i>${showDate(r.date)}</div>
    ${body}`;
  const others = posts.filter(p => p.id !== id && isPublished(p)).slice(0, 5);
  qs("#postSide").innerHTML = others.map(p => `<li class="mb-3"><a href="${STATIC_POSTS[p.id] || "post.html?id=" + p.id}" class="text-decoration-none fw-semibold">${escapeHtml(p.title)}</a><div class="small text-muted">${showDate(p.date)}</div></li>`).join("");
}

/* ---------- Хайлт ---------- */
function initSearch() {
  const out = qs("#searchResults");
  if (!out) return;
  const q = (param("q") || "").trim();
  qs("#searchInput").value = q;
  if (!q) { out.innerHTML = `<p class="text-muted">Хайх үгээ оруулна уу.</p>`; return; }
  const words = q.toLowerCase().split(/\s+/);
  const pages = FZ_PAGES.filter(p => words.some(w => (p.title + " " + p.text).toLowerCase().includes(w)));
  const classes = fzClasses().filter(c => words.some(w => (c.name + " " + c.type + " " + c.trainer).toLowerCase().includes(w)));
  /* Үйлчилгээ, дасгалжуулагчийг админы өгөгдлөөс хайна */
  fzServices().forEach(sv => {
    if (words.some(w => (sv.title + " " + sv.type + " " + sv.short).toLowerCase().includes(w))) pages.push({ title: sv.title, url: serviceUrl(sv) });
  });
  fzTrainers().forEach(t => {
    if (words.some(w => (t.name + " " + t.role + " " + (t.types || []).join(" ")).toLowerCase().includes(w))) pages.push({ title: `${t.name} — ${t.role}`, url: trainerUrl(t) });
  });
  qs("#searchSummary").textContent = `«${q}» — ${pages.length + classes.length} илэрц олдлоо`;
  out.innerHTML =
    (pages.length ? `<h5 class="mb-3">Хуудсууд</h5><div class="list-group mb-4">${pages.map(p => `
      <a href="${p.url}" class="list-group-item list-group-item-action py-3">
        <div class="fw-semibold">${escapeHtml(p.title)}</div><div class="small text-muted">${escapeHtml(p.url)}</div></a>`).join("")}</div>` : "") +
    (classes.length ? `<h5 class="mb-3">Хичээлүүд</h5><div class="list-group">${classes.map(c => `
      <a href="schedule.html?type=${encodeURIComponent(c.type)}" class="list-group-item list-group-item-action py-3">
        <div class="fw-semibold">${escapeHtml(c.name)}</div><div class="small text-muted">${c.day} ${c.time} · ${escapeHtml(c.trainer)}</div></a>`).join("")}</div>` : "") ||
    `<div class="text-center py-5"><i class="bi bi-search display-4 text-muted"></i><p class="mt-3 text-muted">Илэрц олдсонгүй. Өөр үгээр хайж үзнэ үү.</p></div>`;
}

/* =========================================================
   Админаас удирддаг контент: үйлчилгээ, дасгалжуулагч,
   галерейн альбом, нүүрний слайд, сайтын зураг
   ========================================================= */
const safeImg = s => /^data:image\/(png|jpe?g|gif|webp);base64,[A-Za-z0-9+/=]+$/.test(s || "") ? s : "";

/* Зураг байвал зураг, байхгүй бол өнгөт дэвсгэр + дүрс */
function mediaBox(item, shape = "wide", extra = "") {
  item = item || {};
  const img = safeImg(item.image);
  if (img) return `<div class="img-ph ${shape} has-img ${extra}"><img src="${img}" alt="${escapeHtml(item.title || item.name || "")}" loading="lazy"></div>`;
  return `<div class="img-ph ${shape} ${escapeHtml(item.ph || "ph-1")} ${extra}"><i class="bi ${escapeHtml(item.icon || "bi-image")}"></i></div>`;
}
/* HTML-д байгаа орлуулгыг админы зургаар солих */
function swapImage(el, src) {
  const img = safeImg(src);
  if (!el || !img) return;
  el.className = el.className.replace(/\bph-\d\b/g, "") + " has-img";
  el.innerHTML = `<img src="${img}" alt="">`;
}

const trainerByShort = short => fzTrainers().find(t => t.short === short);
function trainerLink(short) {
  const t = trainerByShort(short);
  return t ? `<a href="${trainerUrl(t)}" class="text-decoration-none">${escapeHtml(short)}</a>` : escapeHtml(short || "—");
}
const trainerAvatar = t => mediaBox({ ...t, icon: "bi-person-fill" }, "square", "avatar-sm");

function serviceCardHtml(s, col = "col-md-6 col-lg-4") {
  return `
        <div class="${col}">
          <div class="card fz-card">
            ${mediaBox(s)}
            <div class="card-body p-4">
              <h5 class="card-title">${escapeHtml(s.title)}</h5>
              <p class="text-muted">${escapeHtml(s.short)}</p>
              <a href="${serviceUrl(s)}" class="fw-semibold text-decoration-none">Дэлгэрэнгүй <i class="bi bi-arrow-right"></i></a>
            </div>
          </div>
        </div>`;
}
function trainerCardHtml(t, col = "col-sm-6 col-lg-3") {
  return `
        <div class="${col} trainer-item" data-types="${escapeHtml((t.types || []).join("|"))}">
          <div class="card fz-card text-center">
            ${mediaBox({ ...t, icon: "bi-person-fill" }, "square")}
            <div class="card-body">
              <h5 class="card-title mb-1">${escapeHtml(t.name)}</h5>
              <p class="text-muted small mb-2">${escapeHtml(t.role)}</p>
              <p class="small mb-3"><i class="bi bi-star-fill text-warning"></i> ${escapeHtml(t.rating || "5.0")} · ${+t.experience || 0} жил туршлага</p>
              <a href="${trainerUrl(t)}" class="btn btn-sm btn-outline-primary">Профайл үзэх</a>
            </div>
          </div>
        </div>`;
}
function classTable(rows, mode = "trainer") {
  if (!rows.length) return `<p class="text-muted small">Одоогоор хуваарьт хичээл алга.</p>`;
  return `<div class="table-responsive card fz-card h-auto"><table class="table table-sm align-middle mb-0">
    <thead class="table-light"><tr><th>Өдөр</th><th>Цаг</th><th>Хичээл</th><th>${mode === "trainer" ? "Дасгалжуулагч" : "Төрөл"}</th><th class="d-none d-md-table-cell">Танхим</th></tr></thead>
    <tbody>${rows.map(c => `<tr><td><span class="badge bg-dark">${escapeHtml(c.day)}</span></td><td class="fw-semibold">${escapeHtml(c.time)}</td><td>${escapeHtml(c.name)}</td>
      <td>${mode === "trainer" ? trainerLink(c.trainer) : `<a href="schedule.html?type=${encodeURIComponent(c.type)}" class="text-decoration-none">${escapeHtml(c.type)}</a>`}</td>
      <td class="d-none d-md-table-cell">${escapeHtml(c.room || "—")}</td></tr>`).join("")}</tbody></table></div>`;
}
function setHeader(title, lead) {
  document.title = title + " | FitZone фитнес клуб";
  const h = qs(".page-header");
  if (!h) return;
  qs("h1", h).textContent = title;
  qs(".breadcrumb-item.active", h).textContent = title;
  qs(".lead", h).textContent = lead || "";
}
function notFound(box, text, href, label) {
  box.innerHTML = `<section class="section"><div class="container text-center py-5"><i class="bi bi-search display-4 text-muted"></i>
    <p class="mt-3 text-muted">${text}</p><a href="${href}" class="btn btn-primary">${label}</a></div></section>`;
}
const sectionTitle = (eyebrow, title) => `<div class="section-title"><span class="eyebrow">${eyebrow}</span><h2>${title}</h2></div>`;

/* ---------- Навигацийн «Үйлчилгээ» цэс ---------- */
function renderNavServices() {
  const ul = qs("#navServices");
  if (!ul) return;
  ul.innerHTML = `<li><a class="dropdown-item fw-semibold" href="services.html">Бүх үйлчилгээ</a></li><li><hr class="dropdown-divider"></li>` +
    fzServices().map(s => `<li><a class="dropdown-item" href="${serviceUrl(s)}"><i class="bi ${escapeHtml(s.icon || "bi-grid")} me-2"></i>${escapeHtml(s.title)}</a></li>`).join("");
}

/* ---------- Үйлчилгээ, дасгалжуулагчийн жагсаалт ---------- */
function initLists() {
  const svc = fzServices().map(s => serviceCardHtml(s)).join("") || `<p class="text-muted text-center">Үйлчилгээ бүртгэгдээгүй байна.</p>`;
  ["#homeServices", "#serviceGrid"].forEach(sel => { const el = qs(sel); if (el) el.innerHTML = svc; });
  const home = qs("#homeTrainers");
  if (home) { home.classList.add("justify-content-center"); home.innerHTML = fzTrainers().map(t => trainerCardHtml(t)).join(""); }

  const grid = qs("#trainerGrid");
  if (!grid) return;
  const trainers = fzTrainers();
  const types = fzTypes().filter(ty => trainers.some(t => (t.types || []).includes(ty)));
  const bar = qs("#trainerFilters");
  bar.innerHTML = [["all", "Бүгд"]].concat(types.map(t => [t, t])).map(([k, l], i) =>
    `<button class="btn btn-outline-secondary btn-sm filter-btn${i ? "" : " active"}" data-filter="${escapeHtml(k)}">${escapeHtml(l)}</button>`).join("");
  grid.innerHTML = trainers.map(t => trainerCardHtml(t)).join("") || `<p class="text-muted text-center">Дасгалжуулагч бүртгэгдээгүй байна.</p>`;
  bar.addEventListener("click", e => {
    const btn = e.target.closest("[data-filter]");
    if (!btn) return;
    qsa("[data-filter]", bar).forEach(b => b.classList.toggle("active", b === btn));
    const f = btn.dataset.filter;
    qsa(".trainer-item", grid).forEach(it => it.classList.toggle("d-none", f !== "all" && !it.dataset.types.split("|").includes(f)));
  });
}

/* ---------- Үйлчилгээний дэлгэрэнгүй (service-*.html, service.html?id=) ---------- */
function initServiceDetail() {
  const box = qs("#serviceDetail");
  if (!box) return;
  const id = +(box.dataset.id || param("id"));
  const s = fzServices().find(x => x.id === id);
  if (!s) {
    setHeader("Үйлчилгээ олдсонгүй", "");
    notFound(box, "Ийм үйлчилгээ олдсонгүй эсвэл түр нуусан байна.", "services.html", "Бүх үйлчилгээ");
    return;
  }
  setHeader(s.title, s.short);
  const trainers = fzTrainers().filter(t => (t.types || []).includes(s.type));
  const classes = fzClasses().filter(c => c.type === s.type);
  const photos = fzGallery().filter(g => g.album === s.type);
  const others = fzServices().filter(o => o.id !== s.id).slice(0, 3);
  const type = encodeURIComponent(s.type);
  const feat = (s.features || []).map(([i, t]) => `
            <div class="col-6"><div class="d-flex align-items-center p-3 bg-light-fz rounded"><i class="bi ${escapeHtml(i)} text-primary fs-4 me-3"></i><span class="fw-semibold small">${escapeHtml(t)}</span></div></div>`).join("");
  const ben = (s.benefits || []).map(b => `<li class="mb-2"><i class="bi bi-check-circle-fill text-primary me-2"></i>${escapeHtml(b)}</li>`).join("");
  box.innerHTML = `
  <section class="section">
    <div class="container">
      <div class="row g-5">
        <div class="col-lg-8">
          ${mediaBox(s, "wide", "mb-4 detail-media")}
          <h2 class="mb-3">${escapeHtml(s.title)}</h2>
          <p class="lead">${escapeHtml(s.intro || s.short)}</p>
          ${s.body ? `<p class="text-muted">${escapeHtml(s.body)}</p>` : ""}
          ${feat ? `<h4 class="mt-4 mb-3">Онцлог</h4><div class="row g-3 mb-4">${feat}</div>` : ""}
          ${ben ? `<h4 class="mb-3">Ашиг тус</h4><ul class="list-unstyled">${ben}</ul>` : ""}
          <h4 class="mt-4 mb-3">Долоо хоногийн хуваарь</h4>
          ${classTable(classes)}
          <div class="d-flex justify-content-between align-items-center mt-5 mb-3">
            <h4 class="mb-0">Зургийн альбом</h4>
            ${photos.length ? `<a href="gallery.html?album=${type}" class="small fw-semibold text-decoration-none">Бүгдийг үзэх (${photos.length}) <i class="bi bi-arrow-right"></i></a>` : ""}
          </div>
          ${photos.length ? `<div class="row g-3">${photos.slice(0, 4).map(g => `<div class="col-6 col-md-3"><a href="gallery.html?album=${type}" class="d-block" title="${escapeHtml(g.title)}">${mediaBox(g, "square")}</a></div>`).join("")}</div>`
            : `<p class="text-muted small">Энэ хичээлийн зураг хараахан ороогүй байна.</p>`}
        </div>
        <div class="col-lg-4">
          <div class="card fz-card h-auto mb-4 sticky-side">
            <div class="card-body p-4">
              <h5 class="mb-3">Хичээлд бүртгүүлэх</h5>
              <p class="small text-muted">«${escapeHtml(s.type)}» төрлийн ${classes.length} хичээл долоо хоногт орно.</p>
              <a href="schedule.html?type=${type}" class="btn btn-primary w-100 mb-2">«${escapeHtml(s.type)}» хуваарь харах</a>
              <a href="membership.html" class="btn btn-outline-primary w-100">Гишүүнчлэлийн багц</a>
              <hr>
              <div class="small text-muted mb-2">Заадаг дасгалжуулагч</div>
              ${trainers.length ? trainers.map(t => `<a href="${trainerUrl(t)}" class="d-flex align-items-center gap-2 mb-2 text-decoration-none">${trainerAvatar(t)}<span class="fw-semibold">${escapeHtml(t.name)}</span></a>`).join("")
                : `<div class="small text-muted">Одоогоор тодорхойгүй</div>`}
              <hr>
              <div class="small"><i class="bi bi-clock me-2 text-primary"></i>Өдөр бүр 06:00–23:00</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
  ${others.length ? `<section class="section bg-light-fz"><div class="container">${sectionTitle("Бусад", "Бусад үйлчилгээ")}<div class="row g-4">${others.map(o => serviceCardHtml(o)).join("")}</div></div></section>` : ""}`;
}

/* ---------- Дасгалжуулагчийн дэлгэрэнгүй (trainer-*.html, trainer.html?id=) ---------- */
function initTrainerDetail() {
  const box = qs("#trainerDetail");
  if (!box) return;
  const id = +(box.dataset.id || param("id"));
  const t = fzTrainers().find(x => x.id === id);
  if (!t) {
    setHeader("Дасгалжуулагч олдсонгүй", "");
    notFound(box, "Ийм дасгалжуулагч олдсонгүй.", "trainers.html", "Бүх дасгалжуулагч");
    return;
  }
  setHeader(t.name, t.role);
  const services = fzServices().filter(s => (t.types || []).includes(s.type));
  const classes = fzClasses().filter(c => c.trainer === t.short);
  const others = fzTrainers().filter(o => o.id !== t.id).slice(0, 3);
  const certs = (t.certs || []).map(c => `<li class="mb-2"><i class="bi bi-patch-check-fill text-primary me-2"></i>${escapeHtml(c)}</li>`).join("");
  const skills = (t.skills || []).map(([n, v]) => `
          <div class="mb-3"><div class="d-flex justify-content-between small mb-1"><span>${escapeHtml(n)}</span><span class="fw-semibold">${+v}%</span></div>
          <div class="progress" style="height:8px"><div class="progress-bar bg-primary" style="width:${+v}%"></div></div></div>`).join("");
  box.innerHTML = `
  <section class="section">
    <div class="container">
      <div class="row g-5">
        <div class="col-lg-4">
          <div class="card fz-card h-auto">
            ${mediaBox({ ...t, icon: "bi-person-fill" }, "square", "detail-media")}
            <div class="card-body text-center p-4">
              <h4 class="mb-1">${escapeHtml(t.name)}</h4>
              <p class="text-muted">${escapeHtml(t.role)}</p>
              <div class="row text-center g-0 border-top border-bottom py-3 mb-3">
                <div class="col"><div class="fw-bold fs-5">${+t.experience || 0}</div><div class="small text-muted">жил</div></div>
                <div class="col border-start"><div class="fw-bold fs-5">${+t.clients || 0}+</div><div class="small text-muted">шавь</div></div>
                <div class="col border-start"><div class="fw-bold fs-5">${escapeHtml(t.rating || "5.0")}</div><div class="small text-muted">үнэлгээ</div></div>
              </div>
              ${t.status === "Чөлөөтэй" ? `<span class="badge text-bg-secondary">Түр чөлөөтэй</span>` : `<span class="badge text-bg-success">Ажиллаж байгаа</span>`}
            </div>
          </div>
        </div>
        <div class="col-lg-8">
          <h3>Танилцуулга</h3>
          <p class="text-muted">${escapeHtml(t.bio || "")}</p>
          ${certs ? `<h4 class="mt-4">Гэрчилгээ</h4><ul class="list-unstyled">${certs}</ul>` : ""}
          ${skills ? `<h4 class="mt-4 mb-3">Ур чадвар</h4>${skills}` : ""}
          <h4 class="mt-4 mb-3">Заадаг хичээлийн төрөл</h4>
          <div class="mb-4">${services.map(s => `<a href="${serviceUrl(s)}" class="badge text-bg-light border text-decoration-none me-2 mb-2 p-2"><i class="bi ${escapeHtml(s.icon)} me-1"></i>${escapeHtml(s.title)}</a>`).join("") || `<span class="text-muted small">—</span>`}</div>
          <h4 class="mb-3">Долоо хоногийн хичээл</h4>
          ${classTable(classes, "type")}
          <div class="card bg-light-fz border-0 p-4 mt-4">
            <h5>Хувийн дасгалд цаг захиалах</h5>
            <p class="text-muted small">${escapeHtml(t.short)} дасгалжуулагчтай хувийн дасгал хийх бол бидэнд мэдэгдээрэй — 24 цагийн дотор холбогдоно.</p>
            <div><a href="contact.html" class="btn btn-primary me-2">Цаг захиалах</a><a href="schedule.html" class="btn btn-outline-primary">Бүлгийн хичээл</a></div>
          </div>
        </div>
      </div>
    </div>
  </section>
  ${others.length ? `<section class="section bg-light-fz"><div class="container">${sectionTitle("Баг", "Бусад дасгалжуулагчид")}<div class="row g-4 justify-content-center">${others.map(o => trainerCardHtml(o, "col-sm-6 col-lg-4")).join("")}</div></div></section>` : ""}`;
}

/* ---------- Галерей: хичээлийн төрөл бүрийн альбом ---------- */
function initGallery() {
  const root = qs("#galleryRoot");
  if (!root) return;
  const items = fzGallery();
  const names = [...new Set(fzTypes().concat(FZ_GENERAL_ALBUM, items.map(g => g.album)))];
  const albums = names.map(n => ({ name: n, items: items.filter(g => g.album === n) })).filter(a => a.items.length);
  const icon = n => n === FZ_GENERAL_ALBUM ? "bi-building" : (fzServices().find(s => s.type === n) || {}).icon || "bi-images";
  const modal = new bootstrap.Modal(qs("#lightbox"));
  let current = [], idx = 0;

  const showLb = () => {
    const g = current[idx];
    qs("#lightboxImg").innerHTML = mediaBox(g, "wide", "lightbox-media");
    qs("#lightboxCaption").textContent = g.title;
    qs("#lightboxCount").textContent = `${idx + 1} / ${current.length}`;
  };
  const step = n => { idx = (idx + n + current.length) % current.length; showLb(); };
  qs("#lightboxPrev").addEventListener("click", () => step(-1));
  qs("#lightboxNext").addEventListener("click", () => step(1));
  document.addEventListener("keydown", e => {
    if (!qs("#lightbox").classList.contains("show")) return;
    if (e.key === "ArrowLeft") step(-1);
    if (e.key === "ArrowRight") step(1);
  });

  const albumLink = (name, cls, label) => `<a href="gallery.html?album=${encodeURIComponent(name)}" data-album="${escapeHtml(name)}" class="${cls}">${label}</a>`;
  const render = name => {
    const a = albums.find(x => x.name === name);
    if (!a) {
      root.innerHTML = albums.length ? `
      <p class="text-center text-muted mb-5">Хичээлийн төрлөө сонгоод тухайн альбомын зургуудыг үзээрэй.</p>
      <div class="row g-5">${albums.map(al => {
        const cover = al.items.find(g => safeImg(g.image)) || al.items[0];
        return `
        <div class="col-sm-6 col-lg-4">
          ${albumLink(al.name, "album-card", `
            <div class="album-stack">${mediaBox(cover, "wide")}</div>
            <div class="d-flex justify-content-between align-items-center mt-3">
              <h5 class="mb-0"><i class="bi ${escapeHtml(icon(al.name))} text-primary me-2"></i>${escapeHtml(al.name)}</h5>
              <span class="badge rounded-pill text-bg-light border">${al.items.length} зураг</span>
            </div>`)}
        </div>`;
      }).join("")}</div>` : `<p class="text-center text-muted">Зураг ороогүй байна.</p>`;
      return;
    }
    current = a.items;
    const svc = fzServices().find(s => s.type === a.name);
    root.innerHTML = `
      <div class="d-flex flex-wrap gap-2 justify-content-between align-items-center mb-4">
        <a href="gallery.html" data-album="" class="btn btn-outline-secondary btn-sm"><i class="bi bi-grid-3x3-gap me-1"></i>Бүх альбом</a>
        <div class="d-flex flex-wrap gap-2">${albums.map(al => albumLink(al.name, `btn btn-sm ${al.name === a.name ? "btn-primary" : "btn-outline-secondary"}`, escapeHtml(al.name))).join("")}</div>
      </div>
      <h3 class="mb-1"><i class="bi ${escapeHtml(icon(a.name))} text-primary me-2"></i>${escapeHtml(a.name)}</h3>
      <p class="text-muted small mb-4">${a.items.length} зураг${svc ? ` · <a href="${serviceUrl(svc)}">Үйлчилгээний мэдээлэл</a> · <a href="schedule.html?type=${encodeURIComponent(a.name)}">Хичээлийн хуваарь</a>` : ""}</p>
      <div class="row g-4">${a.items.map((g, i) => `
        <div class="col-6 col-md-4 col-lg-3">
          <div class="gallery-item" data-idx="${i}">${mediaBox(g, "square")}<div class="small fw-semibold mt-2">${escapeHtml(g.title)}</div></div>
        </div>`).join("")}</div>`;
  };

  root.addEventListener("click", e => {
    const al = e.target.closest("[data-album]");
    if (al) {
      e.preventDefault();
      const n = al.dataset.album;
      history.pushState(null, "", n ? "gallery.html?album=" + encodeURIComponent(n) : "gallery.html");
      render(n);
      scrollTo({ top: root.getBoundingClientRect().top + scrollY - 140, behavior: "smooth" });
      return;
    }
    const it = e.target.closest(".gallery-item");
    if (it) { idx = +it.dataset.idx; showLb(); modal.show(); }
  });
  window.addEventListener("popstate", () => render(param("album")));
  render(param("album"));
}

/* ---------- Нүүрний слайдер ---------- */
function initHero() {
  const el = qs("#heroCarousel");
  if (!el) return;
  const slides = fzSlides();
  if (slides.length) {
    qs(".carousel-indicators", el).innerHTML = slides.map((s, i) =>
      `<button type="button" data-bs-target="#heroCarousel" data-bs-slide-to="${i}"${i ? "" : ' class="active" aria-current="true"'} aria-label="Слайд ${i + 1}"></button>`).join("");
    qs(".carousel-inner", el).innerHTML = slides.map((s, i) => {
      const img = safeImg(s.image);
      return `
        <div class="carousel-item${i ? "" : " active"}">
          ${img ? `<div class="hero-bg" style="background-image:url('${img}')"></div>` : ""}
          <div class="container h-100 position-relative">
            <div class="row align-items-center" style="min-height:78vh">
              <div class="col-lg-7 hero-text">
                ${s.badge ? `<span class="badge bg-primary mb-3 px-3 py-2">${escapeHtml(s.badge)}</span>` : ""}
                <h1 class="mb-3">${escapeHtml(s.title)}</h1>
                ${s.text ? `<p class="lead mb-4">${escapeHtml(s.text)}</p>` : ""}
                <div><a href="membership.html" class="btn btn-primary btn-lg me-2 mb-2">Багц сонгох</a><a href="schedule.html" class="btn btn-outline-light btn-lg mb-2">Хуваарь харах</a></div>
              </div>
              ${img ? "" : `<div class="col-lg-5 text-center d-none d-lg-block hero-art"><i class="bi ${escapeHtml(s.icon || "bi-lightning-charge-fill")} hero-icon"></i></div>`}
            </div>
          </div>
        </div>`;
    }).join("");
    qsa(".carousel-control-prev, .carousel-control-next, .carousel-indicators", el).forEach(x => x.classList.toggle("d-none", slides.length < 2));
  }
  bootstrap.Carousel.getOrCreateInstance(el, { interval: 6500, ride: "carousel", pause: false }).cycle();
  /* Эхний слайдын бичвэр ч гэсэн хөдөлгөөнтэй орж ирнэ */
  requestAnimationFrame(() => requestAnimationFrame(() => el.closest(".hero").classList.add("ready")));
}

/* ---------- Сайтын бусад зураг ба нийтлэлийн зураг ---------- */
function applySiteImages() {
  qsa("[data-siteimg]").forEach(el => swapImage(el, fzSiteImage(el.dataset.siteimg)));
  const posts = adminPosts();
  if (!posts) return;
  qsa("[data-post-id]").forEach(col => {
    const r = posts.find(p => p.id === +col.dataset.postId);
    if (r) swapImage(qs(".img-ph", col), r.image);
  });
  qsa("[data-post-img]").forEach(el => {
    const r = posts.find(p => p.id === +el.dataset.postImg);
    if (r) swapImage(el, r.image);
  });
}

function initDynamic() {
  renderNavServices();
  initHero();
  initLists();
  initServiceDetail();
  initTrainerDetail();
  initGallery();
  applySiteImages();
}

/* ---------- Мэдээллийн товхимол ---------- */
function initNewsletter() {
  qsa(".newsletter-form").forEach(f => f.addEventListener("submit", e => {
    e.preventDefault();
    f.reset();
    toast("Мэдээллийн товхимолд амжилттай бүртгүүллээ!");
  }));
}

document.addEventListener("DOMContentLoaded", () => {
  renderNavUser();
  initDynamic();
  initCommon();
  initSchedule();
  initMembership();
  initBmi();
  initGallery();
  initContact();
  initAuth();
  initProfile();
  initMyBookings();
  initMembershipPage();
  initBooking();
  initMeasures();
  initBlogList();
  initPost();
  initSearch();
  initNewsletter();
});
