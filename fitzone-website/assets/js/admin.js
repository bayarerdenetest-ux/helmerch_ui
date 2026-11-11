/* =========================================================
   FitZone — админ хэсгийн JavaScript
   Өгөгдлийг localStorage-д хадгалж CRUD (нэмэх, засах, устгах) үйлдлийг дуурайна.
   Үйлчилгээ, хичээл, дасгалжуулагч, галерей, слайдын өгөгдлийг
   хэрэглэгчийн сайт (main.js) мөн адил fz_admin_<нэр> түлхүүрээс уншдаг.
   ========================================================= */

const A = {
  get(key, fallback) {
    try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch (e) { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; }
    catch (e) {
      alert("Хадгалах зай хүрэлцэхгүй байна (хөтчийн localStorage ~5MB). Зураг/видеоны хэмжээг багасгана уу.");
      return false;
    }
  }
};
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fmt = n => Number(n).toLocaleString("en-US") + "₮";
const pad2 = n => String(n).padStart(2, "0");
const today = () => { const d = new Date(); return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`; };
const shiftYears = (iso, n) => `${+iso.slice(0, 4) + n}${iso.slice(4)}`;
const okImg = s => /^data:image\/(png|jpe?g|gif|webp);base64,[A-Za-z0-9+/=]+$/.test(s || "");

/* ---------- Админ нэвтрэлт (демо) ---------- */
const ADMIN_EMAIL = "admin@fitzone.mn";
const ADMIN_PASS = "admin123";

function adminLoggedIn() {
  try { return sessionStorage.getItem("fz_admin") === "1"; } catch (e) { return false; }
}

/* ---------- Анхны (seed) өгөгдөл ---------- */
const HAS_DATA = typeof FZ_SEED !== "undefined";
const SEED = {
  members: [
    { id: 1, name: "Батбаяр Ганболд", email: "batbayar@mail.mn", phone: "99112233", plan: "Премиум", status: "Идэвхтэй", joined: "2026-01-12" },
    { id: 2, name: "Оюунчимэг Дорж", email: "oyuka@mail.mn", phone: "88114455", plan: "Стандарт", status: "Идэвхтэй", joined: "2026-03-05" },
    { id: 3, name: "Тэмүүжин Бат", email: "temuujin@mail.mn", phone: "95117788", plan: "Энгийн", status: "Түр зогссон", joined: "2025-11-20" },
    { id: 4, name: "Номин Энхтөр", email: "nomin@mail.mn", phone: "99006677", plan: "Стандарт", status: "Идэвхтэй", joined: "2026-06-18" },
    { id: 5, name: "Ганзориг Сүх", email: "ganzorig@mail.mn", phone: "80113344", plan: "Премиум", status: "Идэвхтэй", joined: "2026-08-02" },
    { id: 6, name: "Хулан Мөнх", email: "khulan@mail.mn", phone: "91225566", plan: "Энгийн", status: "Дууссан", joined: "2025-09-14" }
  ],
  payments: [
    { id: 1, member: "Батбаяр Ганболд", plan: "Премиум (жил)", amount: 2490000, method: "Карт", date: "2026-06-12", status: "Төлөгдсөн" },
    { id: 2, member: "Оюунчимэг Дорж", plan: "Стандарт (жил)", amount: 1490000, method: "QPay", date: "2026-07-03", status: "Төлөгдсөн" },
    { id: 3, member: "Хулан Мөнх", plan: "Энгийн (сар)", amount: 89000, method: "Бэлнээр", date: "2026-07-21", status: "Төлөгдсөн" },
    { id: 4, member: "Ганзориг Сүх", plan: "Премиум (сар)", amount: 249000, method: "Карт", date: "2026-08-02", status: "Төлөгдсөн" },
    { id: 5, member: "Номин Энхтөр", plan: "Стандарт (сар)", amount: 149000, method: "QPay", date: "2026-08-18", status: "Төлөгдсөн" },
    { id: 6, member: "Ганзориг Сүх", plan: "Премиум (сар)", amount: 249000, method: "Карт", date: "2026-09-02", status: "Төлөгдсөн" },
    { id: 7, member: "Номин Энхтөр", plan: "Стандарт (сар)", amount: 149000, method: "Дансаар", date: "2026-09-18", status: "Төлөгдсөн" },
    { id: 8, member: "Ганзориг Сүх", plan: "Премиум (сар)", amount: 249000, method: "Карт", date: "2026-10-02", status: "Төлөгдсөн" },
    { id: 9, member: "Тэмүүжин Бат", plan: "Энгийн (сар)", amount: 89000, method: "QPay", date: "2026-10-15", status: "Буцаагдсан" },
    { id: 10, member: "Номин Энхтөр", plan: "Стандарт (сар)", amount: 149000, method: "Дансаар", date: "2026-11-03", status: "Хүлээгдэж буй" },
    { id: 11, member: "Ганзориг Сүх", plan: "Премиум (сар)", amount: 249000, method: "Карт", date: "2026-11-05", status: "Төлөгдсөн" }
  ],
  posts: [
    { id: 1, title: "Дасгалын өмнөх ба дараах хооллолт", category: "Хооллолт", author: "Сараа", date: "2026-10-20", status: "Нийтлэгдсэн", content: "Дасгалын өмнө, дараа юу идэх нь эрч хүч, сэргэлтэд шууд нөлөөлдөг." },
    { id: 2, title: "Анх удаа фитнест явах гарын авлага", category: "Зөвлөгөө", author: "Тэмүүлэн", date: "2026-10-05", status: "Нийтлэгдсэн", content: "Таны эхний 4 долоо хоногийг хялбар болгох зөвлөгөө." },
    { id: 3, title: "Нойр ба сэргэлт: үр дүнгийн нууц", category: "Эрүүл мэнд", author: "Болд", date: "2026-09-22", status: "Нийтлэгдсэн", content: "Булчин дасгалын үеэр биш, амралтын үеэр өсдөг." },
    { id: 4, title: "Өвлийн улиралд идэвхтэй байх 7 арга", category: "Зөвлөгөө", author: "Ану", date: "2026-11-06", status: "Ноорог", content: "Хүйтэн улиралд ч дасгалаа тасалдуулахгүй байх энгийн аргууд.\n\nӨглөө 10 минутын сунгалт хийж, долоо хоногт хамгийн багадаа 3 удаа бүлгийн хичээлд оролцоорой." }
  ]
};
if (HAS_DATA) ["services", "classes", "trainers", "gallery", "slides", "siteimages"].forEach(k => { SEED[k] = FZ_SEED[k]; });

/* Бусад хүснэгтээс сонголт авах туслах функцууд */
const serviceTypes = () => load("services").map(s => s.type);
const trainerShorts = () => load("trainers").map(t => t.short);
const ICONS = ["bi-lightning-charge", "bi-flower1", "bi-fire", "bi-shield-fill", "bi-water", "bi-music-note-beamed", "bi-bicycle",
  "bi-heart-pulse", "bi-person-arms-up", "bi-trophy", "bi-stopwatch", "bi-activity", "bi-dribbble", "bi-snow", "bi-sun"];
const PHS = ["ph-1", "ph-2", "ph-3", "ph-4", "ph-5", "ph-6"];
const GENERAL_ALBUM = typeof FZ_GENERAL_ALBUM !== "undefined" ? FZ_GENERAL_ALBUM : "Клубын орчин";
const IMG_LABEL = "Зураг (JPG/PNG — автоматаар 1000px болгож шахна)";

/* ---------- Хүснэгт бүрийн тохиргоо ----------
   field: [түлхүүр, шошго, төрөл, заавал биш эсэх]
   төрөл: text | number | date | time | tel | email | textarea | lines (мөр бүр нэг утга) |
          image | video | массив/функц (select) | {checks: функц} (олон сонголт) */
const ENTITIES = {
  members: {
    title: "гишүүн",
    columns: [["name", "Нэр"], ["email", "Имэйл"], ["phone", "Утас"], ["plan", "Багц"], ["status", "Төлөв"], ["joined", "Элссэн"]],
    fields: [
      ["name", "Овог нэр", "text"], ["email", "Имэйл", "email"], ["phone", "Утас", "tel"],
      ["plan", "Багц", ["—", "Энгийн", "Стандарт", "Премиум"]], ["status", "Төлөв", ["Идэвхтэй", "Түр зогссон", "Дууссан"]], ["joined", "Элссэн огноо", "date"]
    ]
  },
  services: {
    title: "үйлчилгээ",
    hint: "Энд нэмсэн үйлчилгээ (хичээлийн төрөл) нь сайтын цэс, үйлчилгээний хуудас, хуваарийн шүүлтүүр, дасгалжуулагч, галерейн альбомд автоматаар нэмэгдэнэ.",
    columns: [["media", "Зураг"], ["title", "Нэр"], ["type", "Хичээлийн төрөл"], ["classCount", "Хичээл"], ["status", "Төлөв"]],
    fields: [
      ["title", "Үйлчилгээний нэр (жишээ: Сунгалт ба тэнцвэр)", "text"], ["type", "Хичээлийн төрлийн богино нэр (хуваарьт харагдана)", "text"],
      ["icon", "Дүрс", ICONS], ["ph", "Зураггүй үеийн өнгө", PHS],
      ["short", "Товч тайлбар (картанд харагдана)", "text"], ["status", "Төлөв", ["Идэвхтэй", "Нуусан"]],
      ["intro", "Дэлгэрэнгүй танилцуулга", "textarea"], ["benefits", "Ашиг тус (мөр бүрт нэг)", "lines", true],
      ["image", IMG_LABEL, "image", true]
    ]
  },
  classes: {
    title: "хичээл",
    hint: "Хичээлийн төрөл «Үйлчилгээ» хэсгээс, дасгалжуулагч нь тухайн төрлийг заадаг багш нараас сонгогдоно.",
    columns: [["name", "Хичээл"], ["type", "Төрөл"], ["day", "Өдөр"], ["time", "Цаг"], ["trainer", "Дасгалжуулагч"], ["room", "Танхим"], ["spots", "Суудал"]],
    fields: [
      ["name", "Хичээлийн нэр", "text"], ["type", "Төрөл", serviceTypes],
      ["day", "Өдөр", ["Даваа", "Мягмар", "Лхагва", "Пүрэв", "Баасан", "Бямба", "Ням"]], ["time", "Цаг", "time"],
      ["trainer", "Дасгалжуулагч", trainerShorts], ["room", "Танхим", "text"], ["spots", "Суудлын тоо", "number"]
    ]
  },
  trainers: {
    title: "дасгалжуулагч",
    hint: "«Заадаг хичээл»-ийг одоо байгаа хичээлийн төрлөөс сонгоно. Сайтын дасгалжуулагчийн хуудас, үйлчилгээний хуудсанд автоматаар гарна.",
    columns: [["media", "Зураг"], ["name", "Нэр"], ["short", "Хуваарьт"], ["types", "Заадаг хичээл"], ["experience", "Туршлага"], ["status", "Төлөв"]],
    fields: [
      ["name", "Овог нэр", "text"], ["short", "Хуваарьт харагдах нэр (жишээ: Болд)", "text"],
      ["role", "Албан тушаал (жишээ: Йогийн багш)", "text"], ["phone", "Утас", "tel"],
      ["types", "Заадаг хичээл (нэг ба түүнээс олныг сонгоно)", { checks: serviceTypes }],
      ["experience", "Туршлага (жил)", "number"], ["clients", "Шавийн тоо", "number", true],
      ["rating", "Үнэлгээ (жишээ: 4.9)", "text", true], ["status", "Төлөв", ["Ажиллаж байгаа", "Чөлөөтэй", "Нуусан"]],
      ["bio", "Танилцуулга", "textarea"], ["certs", "Гэрчилгээ (мөр бүрт нэг)", "lines", true],
      ["image", "Дасгалжуулагчийн зураг (дөрвөлжин зураг тохиромжтой)", "image", true]
    ]
  },
  payments: {
    title: "төлбөр",
    columns: [["member", "Гишүүн"], ["plan", "Багц"], ["amount", "Дүн"], ["method", "Хэлбэр"], ["date", "Огноо"], ["status", "Төлөв"]],
    fields: [
      ["member", "Гишүүн", "text"], ["plan", "Багц", "text"], ["amount", "Дүн (₮)", "number"],
      ["method", "Төлбөрийн хэлбэр", ["Карт", "QPay", "Дансаар", "Бэлнээр", "Онлайн"]], ["date", "Огноо", "date"],
      ["status", "Төлөв", ["Төлөгдсөн", "Хүлээгдэж буй", "Буцаагдсан"]]
    ]
  },
  posts: {
    title: "нийтлэл",
    columns: [["media", "Медиа"], ["title", "Гарчиг"], ["category", "Ангилал"], ["author", "Зохиогч"], ["date", "Огноо"], ["status", "Төлөв"]],
    fields: [
      ["title", "Гарчиг", "text"], ["category", "Ангилал", ["Хооллолт", "Зөвлөгөө", "Эрүүл мэнд", "Мэдээ"]],
      ["author", "Зохиогч", "text"], ["date", "Огноо", "date"], ["status", "Төлөв", ["Нийтлэгдсэн", "Ноорог"]],
      ["content", "Агуулга (догол мөрийг шинэ мөрөөр тусгаарлана)", "textarea"],
      ["image", IMG_LABEL, "image", true],
      ["video", "Видео (YouTube холбоос, .mp4 холбоос эсвэл 3MB хүртэлх файл)", "video", true]
    ]
  },
  gallery: {
    title: "зураг",
    hint: "Альбом нь хичээлийн төрөл бүрээр үүснэ. Сайтын «Галерей» хэсэгт альбомоо сонгоход энд нэмсэн зургууд харагдана.",
    columns: [["media", "Зураг"], ["title", "Тайлбар"], ["album", "Альбом"], ["status", "Төлөв"]],
    fields: [
      ["title", "Зургийн тайлбар", "text"], ["album", "Альбом (хичээлийн төрөл)", () => serviceTypes().concat(GENERAL_ALBUM)],
      ["status", "Төлөв", ["Идэвхтэй", "Нуусан"]], ["image", IMG_LABEL, "image", true]
    ]
  },
  slides: {
    title: "слайд",
    hint: "Нүүр хуудасны дээд хэсгийн слайд. Зураг оруулбал арын дэвсгэр болж, зөөлөн томрох (Ken Burns) хөдөлгөөнтэй шилжинэ.",
    columns: [["media", "Зураг"], ["badge", "Шошго"], ["title", "Гарчиг"], ["status", "Төлөв"]],
    fields: [
      ["badge", "Жижиг шошго (жишээ: Шинэ улирал)", "text", true], ["title", "Гарчиг", "text"],
      ["text", "Тайлбар", "textarea", true], ["status", "Төлөв", ["Идэвхтэй", "Нуусан"]],
      ["image", "Арын зураг (хэвтээ, 1600px хүртэл)", "image", true]
    ]
  },
  siteimages: {
    title: "зураг",
    noAdd: true, noDelete: true,
    hint: "Сайтын тогтмол хэсгүүдийн зураг. Зураг оруулаагүй бол өнгөт дэвсгэр харагдана.",
    columns: [["media", "Зураг"], ["place", "Байрлал"]],
    fields: [["place", "Байрлал", "static"], ["image", IMG_LABEL, "image", true]]
  }
};

const STATUS_COLORS = {
  "Идэвхтэй": "success", "Төлөгдсөн": "success", "Нийтлэгдсэн": "success", "Ажиллаж байгаа": "success",
  "Түр зогссон": "warning", "Хүлээгдэж буй": "warning", "Ноорог": "secondary", "Чөлөөтэй": "secondary", "Нуусан": "secondary",
  "Дууссан": "danger", "Буцаагдсан": "danger"
};

const PLAN_NAMES = { basic: "Энгийн", standard: "Стандарт", premium: "Премиум" };

function load(entity) {
  let rows = A.get("fz_admin_" + entity, null);
  const fresh = !rows;
  if (!rows) rows = (SEED[entity] || []).map(r => JSON.parse(JSON.stringify(r)));
  else if (HAS_DATA) rows = fzMigrate(entity, rows);
  /* Сайтаар бүртгүүлсэн хэрэглэгч, сайтаар хийсэн төлбөрийг нэг удаа (давхардуулахгүй) нэмнэ */
  if (entity === "members") {
    const synced = A.get("fz_sync_users", []);
    const add = A.get("fz_users", []).filter(u => !synced.includes(u.email) && !rows.some(r => r.email === u.email));
    if (add.length) {
      const plans = A.get("fz_bookings", []).filter(b => b.kind === "plan");
      add.forEach((u, i) => {
        const p = plans.filter(b => b.email === u.email).pop();
        rows.push({ id: Date.now() + i, name: u.name, email: u.email, phone: u.phone || "", plan: p ? PLAN_NAMES[p.plan] || "—" : "—", status: "Идэвхтэй", joined: u.joined });
      });
      A.set("fz_sync_users", synced.concat(add.map(u => u.email)));
      save(entity, rows);
    }
  }
  if (entity === "payments") {
    const synced = A.get("fz_sync_pay", []);
    const add = A.get("fz_bookings", []).filter(b => b.kind === "plan" && !synced.includes(b.id) && !rows.some(r => r.id === b.id && r.member === b.email));
    if (add.length) {
      add.forEach(b => rows.push({ id: b.id, member: b.email, plan: `${PLAN_NAMES[b.plan] || b.title} (${b.period === "year" ? "жил" : "сар"})`, amount: b.amount, method: b.method || "Онлайн", date: b.date, status: "Төлөгдсөн" }));
      A.set("fz_sync_pay", synced.concat(add.map(b => b.id)));
      save(entity, rows);
    }
  }
  if (fresh && entity === "siteimages") save(entity, rows);
  return rows;
}
const save = (entity, rows) => A.set("fz_admin_" + entity, rows);

function cell(key, value, row) {
  if (key === "media") {
    const img = okImg(row.image) ? `<img src="${row.image}" alt="" style="width:64px;height:40px;object-fit:cover;border-radius:6px">`
      : row.ph ? `<span class="d-inline-flex align-items-center justify-content-center text-white ${esc(row.ph)}" style="width:64px;height:40px;border-radius:6px"><i class="bi ${esc(row.icon || "bi-image")}"></i></span>` : "";
    const vid = row.video ? `<i class="bi bi-camera-video-fill text-primary fs-5 ms-1" title="Видеотой"></i>` : "";
    return img || vid ? img + vid : `<span class="text-muted small">—</span>`;
  }
  if (key === "classCount") return load("classes").filter(c => c.type === row.type).length;
  if (key === "status") return `<span class="badge text-bg-${STATUS_COLORS[value] || "secondary"}">${esc(value)}</span>`;
  if (key === "amount") return fmt(value);
  if (Array.isArray(value)) return value.map(v => `<span class="badge text-bg-light border me-1">${esc(v)}</span>`).join("");
  return esc(value);
}

/* Нэр солигдвол холбоотой бүх өгөгдлийг шинэчилнэ */
function cascade(entity, before, after) {
  if (!before) return;
  if (entity === "services" && before.type !== after.type) {
    save("classes", load("classes").map(c => c.type === before.type ? { ...c, type: after.type } : c));
    save("trainers", load("trainers").map(t => ({ ...t, types: (t.types || []).map(x => x === before.type ? after.type : x) })));
    save("gallery", load("gallery").map(g => g.album === before.type ? { ...g, album: after.type } : g));
  }
  if (entity === "trainers" && before.short !== after.short) {
    save("classes", load("classes").map(c => c.trainer === before.short ? { ...c, trainer: after.short } : c));
  }
}

/* ---------- CRUD хүснэгт ---------- */
function initCrud() {
  const root = $("[data-entity]");
  if (!root) return;
  const entity = root.dataset.entity;
  const cfg = ENTITIES[entity];
  let rows = load(entity);
  let editingId = null;

  if (cfg.hint) root.insertAdjacentHTML("beforebegin", `<div class="alert alert-light border small"><i class="bi bi-info-circle text-primary me-2"></i>${cfg.hint}</div>`);
  if (cfg.noAdd) $("#crudAdd").classList.add("d-none");
  $("#crudHead").innerHTML = cfg.columns.map(c => `<th>${c[1]}</th>`).join("") + `<th class="text-end">Үйлдэл</th>`;

  /* Огноо: одоогоос өмнө/хойш 5 жилийн хязгаартай (275760 он гэх мэт буруу утга орохгүй) */
  const dMin = shiftYears(today(), -5), dMax = shiftYears(today(), 5);
  const media = {};
  const optionsOf = type => typeof type === "function" ? type() : type;
  $("#crudFields").innerHTML = cfg.fields.map(([key, label, type, optional]) => {
    const req = optional ? "" : "required";
    if (type === "static") return `<div class="col-12"><label class="form-label">${label}</label><div class="form-control bg-light" id="f_${key}"></div></div>`;
    if (Array.isArray(type) || typeof type === "function") return `<div class="col-md-6"><label class="form-label" for="f_${key}">${label}</label>
      <select class="form-select" id="f_${key}" ${req}>${optionsOf(type).map(o => `<option>${esc(o)}</option>`).join("")}</select></div>`;
    if (type && type.checks) return `<div class="col-12"><label class="form-label d-block">${label}</label>
      <div class="d-flex flex-wrap gap-3 p-3 border rounded" id="f_${key}">${type.checks().map((o, i) => `
        <div class="form-check"><input class="form-check-input" type="checkbox" value="${esc(o)}" id="c_${key}_${i}"><label class="form-check-label" for="c_${key}_${i}">${esc(o)}</label></div>`).join("")}</div>
      <div class="small text-danger mt-1 d-none" id="e_${key}">Хамгийн багадаа нэгийг сонгоно уу.</div></div>`;
    if (type === "textarea" || type === "lines") return `<div class="col-12"><label class="form-label" for="f_${key}">${label}</label>
      <textarea class="form-control" id="f_${key}" rows="${type === "lines" ? 3 : 5}" ${req}></textarea><div class="invalid-feedback">Энэ талбарыг бөглөнө үү.</div></div>`;
    if (type === "image") return `<div class="col-md-6"><label class="form-label" for="f_${key}">${label}</label>
      <input class="form-control" id="f_${key}" type="file" accept="image/*">
      <div class="d-flex align-items-center gap-2 mt-2"><div id="p_${key}"></div>
      <button type="button" class="btn btn-sm btn-link text-danger d-none" id="x_${key}">Зураг устгах</button></div>
      <div class="small text-danger d-none" id="e_${key}">Зураг сонгоно уу.</div></div>`;
    if (type === "video") return `<div class="col-md-6"><label class="form-label" for="f_${key}">${label}</label>
      <input class="form-control mb-2" id="f_${key}" type="url" placeholder="https://www.youtube.com/watch?v=...">
      <input class="form-control" id="v_${key}" type="file" accept="video/mp4,video/webm">
      <div class="small text-muted mt-1" id="p_${key}"></div></div>`;
    const lim = type === "date" ? `min="${dMin}" max="${dMax}"` : type === "number" ? `min="0"` : "";
    return `<div class="col-md-6"><label class="form-label" for="f_${key}">${label}</label>
      <input class="form-control" id="f_${key}" type="${type}" ${lim} ${req}>
      ${type === "date" ? `<div class="invalid-feedback">${dMin} — ${dMax} хооронд сонгоно уу.</div>` : `<div class="invalid-feedback">Энэ талбарыг бөглөнө үү.</div>`}</div>`;
  }).join("");

  /* Хичээл: сонгосон төрлийг заадаг дасгалжуулагчдыг түрүүлж харуулна */
  const syncTrainerOptions = (keep, force) => {
    const sel = $("#f_trainer");
    if (!sel || entity !== "classes") return;
    const type = $("#f_type").value;
    const all = load("trainers");
    const fit = all.filter(t => (t.types || []).includes(type)).map(t => t.short);
    const rest = all.map(t => t.short).filter(s => !fit.includes(s));
    sel.innerHTML = (fit.length ? `<optgroup label="«${esc(type)}» заадаг">${fit.map(s => `<option>${esc(s)}</option>`).join("")}</optgroup>` : "") +
      (rest.length ? `<optgroup label="Бусад">${rest.map(s => `<option>${esc(s)}</option>`).join("")}</optgroup>` : "");
    /* Төрөл солигдвол тухайн төрлийг заадаг багшийг автоматаар сонгоно; засах үед хадгалсан утгыг үлдээнэ */
    const keepOk = keep && (force || fit.includes(keep) || !fit.length) && [...sel.options].some(o => o.value === keep);
    sel.value = keepOk ? keep : (fit[0] || rest[0] || "");
  };
  if (entity === "classes") $("#f_type").addEventListener("change", () => syncTrainerOptions($("#f_trainer").value));

  /* Зургийг canvas-аар жижигрүүлж localStorage-д багтаана */
  const showImage = key => {
    $("#p_" + key).innerHTML = media[key] ? `<img src="${media[key]}" alt="" style="height:60px;border-radius:8px">` : "";
    $("#x_" + key).classList.toggle("d-none", !media[key]);
  };
  cfg.fields.filter(f => f[2] === "image").forEach(([key]) => {
    $("#f_" + key).addEventListener("change", e => {
      const file = e.target.files[0];
      if (!file) return;
      const img = new Image();
      img.onload = () => {
        const maxSide = entity === "slides" ? 1600 : 1000;
        const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
        const c = document.createElement("canvas");
        c.width = Math.round(img.width * scale);
        c.height = Math.round(img.height * scale);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        media[key] = c.toDataURL("image/jpeg", entity === "slides" ? 0.75 : 0.8);
        URL.revokeObjectURL(img.src);
        $("#e_" + key).classList.add("d-none");
        showImage(key);
      };
      img.onerror = () => alert("Зургийг уншиж чадсангүй. JPG эсвэл PNG файл сонгоно уу.");
      img.src = URL.createObjectURL(file);
    });
    $("#x_" + key).addEventListener("click", () => { media[key] = ""; $("#f_" + key).value = ""; showImage(key); });
  });
  cfg.fields.filter(f => f[2] === "video").forEach(([key]) => {
    $("#v_" + key).addEventListener("change", e => {
      const file = e.target.files[0];
      if (!file) return;
      if (file.size > 3 * 1024 * 1024) {
        alert("Видео файл 3MB-аас бага байх ёстой. Том видеог YouTube-д байршуулаад холбоосыг нь оруулна уу.");
        e.target.value = "";
        return;
      }
      const fr = new FileReader();
      fr.onload = () => { media[key] = fr.result; $("#f_" + key).value = ""; $("#p_" + key).textContent = "Файл сонгогдлоо: " + file.name; };
      fr.readAsDataURL(file);
    });
  });

  const draw = () => {
    const q = $("#crudSearch").value.trim().toLowerCase();
    const filtered = rows.filter(r => !q || Object.entries(r).filter(([k]) => k !== "image" && k !== "video").map(([, v]) => v).join(" ").toLowerCase().includes(q));
    $("#crudBody").innerHTML = filtered.length ? filtered.map(r => `
      <tr>
        ${cfg.columns.map(([k]) => `<td>${cell(k, r[k], r)}</td>`).join("")}
        <td class="text-end text-nowrap">
          <button class="btn btn-sm btn-light" data-edit="${r.id}" title="Засах"><i class="bi bi-pencil"></i></button>
          ${cfg.noDelete ? "" : `<button class="btn btn-sm btn-light text-danger" data-del="${r.id}" title="Устгах"><i class="bi bi-trash"></i></button>`}
        </td>
      </tr>`).join("")
      : `<tr><td colspan="${cfg.columns.length + 1}" class="text-center text-muted py-4">Өгөгдөл олдсонгүй</td></tr>`;
    $("#crudCount").textContent = `${filtered.length} / ${rows.length}`;
  };

  const modal = new bootstrap.Modal($("#crudModal"));
  const openForm = row => {
    editingId = row ? row.id : null;
    $("#crudModalTitle").textContent = row ? `${cfg.title} засах` : `Шинэ ${cfg.title} нэмэх`;
    cfg.fields.forEach(([key, , type]) => {
      const el = $("#f_" + key);
      if (type === "static") { el.textContent = row ? row[key] : ""; return; }
      if (type === "image") { media[key] = row && okImg(row[key]) ? row[key] : ""; el.value = ""; $("#e_" + key).classList.add("d-none"); showImage(key); return; }
      if (type === "video") {
        const v = row ? row[key] || "" : "";
        media[key] = v.startsWith("data:") ? v : "";
        el.value = v.startsWith("data:") ? "" : v;
        $("#v_" + key).value = "";
        $("#p_" + key).textContent = media[key] ? "Хадгалсан видео файлтай" : "";
        return;
      }
      if (type && type.checks) {
        const vals = row ? row[key] || [] : [];
        $$("input", el).forEach(c => { c.checked = vals.includes(c.value); });
        $("#e_" + key).classList.add("d-none");
        return;
      }
      if (type === "lines") { el.value = row ? (row[key] || []).join("\n") : ""; return; }
      const opts = Array.isArray(type) || typeof type === "function" ? optionsOf(type) : null;
      el.value = row ? (row[key] ?? "") : (type === "date" ? today() : opts ? opts[0] : "");
    });
    syncTrainerOptions(row ? row.trainer : "", true);
    $("#crudForm").classList.remove("was-validated");
    modal.show();
  };

  $("#crudAdd").addEventListener("click", () => openForm(null));
  $("#crudSearch").addEventListener("input", draw);
  $("#crudBody").addEventListener("click", e => {
    const ed = e.target.closest("[data-edit]");
    const del = e.target.closest("[data-del]");
    if (ed) openForm(rows.find(r => r.id === +ed.dataset.edit));
    if (del) {
      const r = rows.find(x => x.id === +del.dataset.del);
      let msg = "Энэ мөрийг устгах уу?";
      if (entity === "services") {
        const n = load("classes").filter(c => c.type === r.type).length;
        if (n) msg = `«${r.type}» төрлийн ${n} хичээл хуваарьт байна. Үйлчилгээг устгавал тэдгээр хичээл хуваарьт үлдэнэ. Устгах уу?\n(Түр нуух бол «Төлөв: Нуусан» болгоорой.)`;
      }
      if (!confirm(msg)) return;
      rows = rows.filter(x => x.id !== r.id);
      save(entity, rows);
      draw();
    }
  });
  $("#crudForm").addEventListener("submit", e => {
    e.preventDefault();
    const form = e.target;
    let ok = form.checkValidity();
    const data = {};
    for (const [key, , type, optional] of cfg.fields) {
      if (type === "static") continue;
      if (type === "image") {
        data[key] = media[key] || "";
        if (!optional && !data[key]) { $("#e_" + key).classList.remove("d-none"); ok = false; }
        continue;
      }
      if (type && type.checks) {
        data[key] = $$(`#f_${key} input:checked`).map(c => c.value);
        const bad = !optional && !data[key].length;
        $("#e_" + key).classList.toggle("d-none", !bad);
        if (bad) ok = false;
        continue;
      }
      const v = $("#f_" + key).value.trim();
      if (type === "video") {
        if (v && !/^https?:\/\//i.test(v)) { alert("Видео холбоос http:// эсвэл https://-ээр эхлэх ёстой."); return; }
        data[key] = v || media[key] || "";
        continue;
      }
      if (type === "lines") { data[key] = v.split("\n").map(x => x.trim()).filter(Boolean); continue; }
      data[key] = type === "number" ? +v : v;
    }
    if (!ok) { form.classList.add("was-validated"); return; }
    /* Давхардсан нэрийг шалгана */
    const uniq = { services: "type", trainers: "short" }[entity];
    if (uniq && rows.some(r => r.id !== editingId && String(r[uniq]).toLowerCase() === String(data[uniq]).toLowerCase())) {
      alert(`«${data[uniq]}» нэр аль хэдийн бүртгэгдсэн байна. Өөр нэр оруулна уу.`);
      return;
    }
    const before = editingId ? rows.find(r => r.id === editingId) : null;
    const next = editingId ? rows.map(r => r.id === editingId ? { ...r, ...data } : r) : rows.concat({ id: Date.now(), ...data });
    if (!save(entity, next)) return;
    rows = next;
    cascade(entity, before, { ...before, ...data });
    modal.hide();
    draw();
  });
  $("#crudExport").addEventListener("click", () => {
    const cols = cfg.columns.filter(c => c[0] !== "media");
    const head = cols.map(c => c[1]).join(",");
    const body = rows.map(r => cols.map(([k]) => {
      const v = k === "classCount" ? cell(k, null, r) : Array.isArray(r[k]) ? r[k].join("; ") : r[k];
      return `"${String(v ?? "").replace(/"/g, '""')}"`;
    }).join(",")).join("\n");
    const blob = new Blob(["﻿" + head + "\n" + body], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `fitzone-${entity}.csv`;
    a.click();
  });
  draw();
}

/* ---------- Хянах самбар ---------- */
function initDashboard() {
  if (!$("#kpiMembers")) return;
  const members = load("members"), payments = load("payments"), classes = load("classes");
  const paid = payments.filter(p => p.status === "Төлөгдсөн");
  $("#kpiMembers").textContent = members.length;
  $("#kpiActive").textContent = members.filter(m => m.status === "Идэвхтэй").length;
  $("#kpiRevenue").textContent = fmt(paid.reduce((s, p) => s + Number(p.amount || 0), 0));
  $("#kpiClasses").textContent = classes.length;

  /* Сарын орлогын баганан график — «Төлбөр» хүснэгтийн бодит өгөгдлөөс сүүлийн 6 сараар бүлэглэнэ */
  const now = new Date();
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
    const list = paid.filter(p => String(p.date).slice(0, 7) === key);
    months.push({ key, label: `${d.getMonth() + 1}-р сар`, sum: list.reduce((s, p) => s + Number(p.amount || 0), 0), n: list.length });
  }
  const max = Math.max(1, ...months.map(m => m.sum));
  const short = n => n >= 1e6 ? (n / 1e6).toFixed(n >= 1e7 ? 1 : 2).replace(/\.?0+$/, "") + " сая" : n >= 1e3 ? Math.round(n / 1e3) + " мянга" : String(n);
  $("#revenueChart").innerHTML = months.map(m => `
    <div class="d-flex flex-column align-items-center justify-content-end h-100 flex-fill" title="${m.label}: ${fmt(m.sum)} (${m.n} төлбөр)">
      <div class="small fw-semibold mb-1 text-nowrap">${m.sum ? short(m.sum) : "0"}</div>
      <div class="chart-bar" style="height:0" data-h="${m.sum ? Math.max(2, m.sum / max * 100) : 0}%"></div>
      <div class="small text-muted mt-2 text-nowrap">${m.label}</div>
    </div>`).join("");
  requestAnimationFrame(() => $$("#revenueChart .chart-bar").forEach(b => { b.style.height = b.dataset.h; }));
  const total6 = months.reduce((s, m) => s + m.sum, 0);
  $("#revenueChart").insertAdjacentHTML("afterend", `<div class="small text-muted mt-3">6 сарын нийт: <strong>${fmt(total6)}</strong> · Төлбөрийг «Төлбөр» хэсэгт нэмэх/засахад график шинэчлэгдэнэ.</div>`);

  /* Хичээлийн төрлийн хуваарилалт */
  const types = {};
  classes.forEach(c => { types[c.type] = (types[c.type] || 0) + 1; });
  $("#typeBreakdown").innerHTML = Object.entries(types).sort((a, b) => b[1] - a[1]).map(([t, n]) => `
    <div class="mb-3">
      <div class="d-flex justify-content-between small mb-1"><span>${esc(t)}</span><span class="fw-semibold">${n}</span></div>
      <div class="progress" style="height:8px"><div class="progress-bar bg-primary" style="width:${n / classes.length * 100}%"></div></div>
    </div>`).join("");

  $("#recentPayments").innerHTML = payments.slice().sort((a, b) => String(b.date).localeCompare(String(a.date))).slice(0, 5).map(p => `
    <tr><td>${esc(p.member)}</td><td>${esc(p.plan)}</td><td>${fmt(p.amount)}</td><td>${cell("status", p.status, p)}</td></tr>`).join("");
}

/* ---------- Ирсэн мессежүүд: Шинэ / Уншсан ---------- */
function initMessages() {
  const box = $("#messageList");
  if (!box) return;
  const seed = [
    { id: 1, name: "Энхжин", email: "enkhjin@mail.mn", subject: "Хүүхдийн сэлэлт", text: "8 настай хүүхдэд зориулсан сэлэлтийн хичээл байдаг уу?", date: "2026-11-04" },
    { id: 2, name: "Мөнх-Эрдэнэ", email: "munkh@mail.mn", subject: "Хувийн дасгалжуулагч", text: "Хувийн дасгалжуулагчийн үнэ хэд вэ?", date: "2026-11-06" }
  ];
  let tab = "new";
  const draw = () => {
    const read = A.get("fz_read_msgs", []);
    const deleted = A.get("fz_deleted_msgs", []);
    const all = seed.concat(A.get("fz_messages", [])).filter(m => !deleted.includes(m.id)).reverse();
    const fresh = all.filter(m => !read.includes(m.id)), old = all.filter(m => read.includes(m.id));
    $("#cntNew").textContent = fresh.length;
    $("#cntRead").textContent = old.length;
    $$("#msgTabs [data-tab]").forEach(b => b.classList.toggle("active", b.dataset.tab === tab));
    const list = tab === "new" ? fresh : old;
    box.innerHTML = list.length ? list.map(m => `
      <div class="card kpi-card mb-3${tab === "read" ? " opacity-75" : ""}"><div class="card-body">
        <div class="d-flex justify-content-between flex-wrap gap-2">
          <div><span class="fw-bold">${esc(m.name)}</span> <span class="text-muted small">&lt;${esc(m.email)}&gt;</span></div>
          <span class="small text-muted">${esc(m.date)}</span>
        </div>
        <div class="fw-semibold mt-2">${esc(m.subject)}</div>
        <p class="mb-2 text-muted">${esc(m.text)}</p>
        ${tab === "new"
          ? `<button class="btn btn-sm btn-outline-primary" data-read="${m.id}"><i class="bi bi-check2 me-1"></i>Уншсан гэж тэмдэглэх</button>`
          : `<button class="btn btn-sm btn-outline-secondary me-2" data-unread="${m.id}"><i class="bi bi-arrow-counterclockwise me-1"></i>Уншаагүй болгох</button>
             <button class="btn btn-sm btn-outline-danger" data-delmsg="${m.id}"><i class="bi bi-trash me-1"></i>Устгах</button>`}
      </div></div>`).join("")
      : `<div class="text-center text-muted py-5"><i class="bi ${tab === "new" ? "bi-inbox" : "bi-envelope-open"} display-4"></i><p class="mt-3">${tab === "new" ? "Шинэ мессеж алга." : "Уншсан мессеж алга."}</p></div>`;
  };
  $("#msgTabs").addEventListener("click", e => {
    const b = e.target.closest("[data-tab]");
    if (b) { tab = b.dataset.tab; draw(); }
  });
  box.addEventListener("click", e => {
    const r = e.target.closest("[data-read]"), u = e.target.closest("[data-unread]"), d = e.target.closest("[data-delmsg]");
    if (r) A.set("fz_read_msgs", A.get("fz_read_msgs", []).concat(+r.dataset.read));
    if (u) A.set("fz_read_msgs", A.get("fz_read_msgs", []).filter(id => id !== +u.dataset.unread));
    if (d) {
      if (!confirm("Энэ мессежийг устгах уу?")) return;
      A.set("fz_deleted_msgs", A.get("fz_deleted_msgs", []).concat(+d.dataset.delmsg));
    }
    if (r || u || d) draw();
  });
  draw();
}

/* ---------- Админ нэвтрэх ---------- */
function initAdminLogin() {
  const form = $("#adminLoginForm");
  if (!form) return;
  form.addEventListener("submit", e => {
    e.preventDefault();
    if ($("#aEmail").value.trim().toLowerCase() === ADMIN_EMAIL && $("#aPass").value === ADMIN_PASS) {
      try { sessionStorage.setItem("fz_admin", "1"); } catch (err) { /* */ }
      location.href = "index.html";
    } else {
      $("#adminError").classList.remove("d-none");
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  const isLogin = !!$("#adminLoginForm");
  if (!isLogin && !adminLoggedIn()) { location.href = "login.html"; return; }

  const toggle = $("#sidebarToggle");
  if (toggle) toggle.addEventListener("click", () => $(".admin-sidebar").classList.toggle("show"));
  const logout = $("#adminLogout");
  if (logout) logout.addEventListener("click", e => {
    e.preventDefault();
    try { sessionStorage.removeItem("fz_admin"); } catch (err) { /* */ }
    location.href = "login.html";
  });

  initAdminLogin();
  initDashboard();
  initCrud();
  initMessages();
});
