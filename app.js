/* ============================================================
   BRICMC Web Portal — Application Logic
   ============================================================ */

// ---- Central Configuration ----
const SERVER_CONFIG = {
  serverName: "BRICMC",
  ip: "bric.pikamc.vn",
  port: "25002",
  pricePerBlock: 5,
  worldBorder: 40000,
  newbieHours: 24,
  combatSeconds: 15,
  voiceChatUrl: "https://20.249.17.241.sslip.io/",
  discordUrl: "https://discord.gg/mRwDYFe6g",
};

// ---- Rank Definitions ----
const RANKS = {
  guest:  { name: "Guest",  color: "#9ca3af", mcColor: "§7" },
  member: { name: "Member", color: "#4ade80", mcColor: "§a" },
  vip:    { name: "VIP",    color: "#facc15", mcColor: "§e" },
  mvp:    { name: "MVP",    color: "#22d3ee", mcColor: "§b" },
  admin:  { name: "Admin",  color: "#f87171", mcColor: "§c" },
  owner:  { name: "Owner",  color: "#dc2626", mcColor: "§4" },
};

// ---- Team Definitions ----
const TEAMS = {
  none:    { name: "No tiem",   tag: "",          color: "#9ca3af" },
  dragon:  { name: "Dragon",    tag: "[Dragon]",  color: "#ef4444" },
  phoenix: { name: "Phoenix",   tag: "[Phoenix]", color: "#f59e0b" },
  titan:   { name: "Titan",     tag: "[Titan]",   color: "#3b82f6" },
  shadow:  { name: "Shadow",    tag: "[Shadow]",  color: "#a855f7" },
  wolf:    { name: "Wolf",      tag: "[Wolf]",    color: "#6b7280" },
};

// ---- State ----
let currentRank = "guest";
let currentTeam = "none";
let currentPlayerName = "Steve";

// ============================================================
// INIT
// ============================================================
document.addEventListener("DOMContentLoaded", () => {
  applyServerConfig();
  lucide.createIcons();
  initNavbar();
  initMobileMenu();
  initScoreboard();
  initLandCalculator();
  initWikiTabs();
  initCommandSearch();
  initAdminFilters();
  initScrollAnimations();
  initSmoothScroll();
  updateLandCalc();
});

// ============================================================
// AUTO-SYNC DOM FROM SERVER_CONFIG
// ============================================================
function applyServerConfig() {
  document.title = `${SERVER_CONFIG.serverName} — Máy Chủ Minecraft Bedrock Sinh Tồn & PvP`;

  // Sync Server Name
  document.querySelectorAll("[data-server-name]").forEach((el) => {
    el.textContent = SERVER_CONFIG.serverName;
  });

  // Sync IP & Port
  document.querySelectorAll("[data-ip-only]").forEach((el) => {
    el.textContent = SERVER_CONFIG.ip;
  });
  document.querySelectorAll("[data-port-only]").forEach((el) => {
    el.textContent = SERVER_CONFIG.port;
  });
  document.querySelectorAll("[data-ip-port]").forEach((el) => {
    el.textContent = `${SERVER_CONFIG.ip}:${SERVER_CONFIG.port}`;
  });

  const ipDisplay = document.getElementById("ip-display");
  if (ipDisplay) {
    ipDisplay.innerHTML = `<span data-ip-only>${SERVER_CONFIG.ip}</span><span class="text-gray-500">:</span><span data-port-only>${SERVER_CONFIG.port}</span>`;
  }

  // Sync Voice Chat links & text
  document.querySelectorAll("[data-voice-link]").forEach((el) => {
    el.setAttribute("href", SERVER_CONFIG.voiceChatUrl);
  });
  document.querySelectorAll("[data-voice-url-text]").forEach((el) => {
    el.textContent = SERVER_CONFIG.voiceChatUrl;
  });

  // Sync Discord links & text
  document.querySelectorAll("[data-discord-link]").forEach((el) => {
    el.setAttribute("href", SERVER_CONFIG.discordUrl);
  });
  document.querySelectorAll("[data-discord-url-text]").forEach((el) => {
    el.textContent = SERVER_CONFIG.discordUrl;
  });

  // Sync Price per Block & World Border
  document.querySelectorAll("[data-price-per-block]").forEach((el) => {
    el.textContent = `$${SERVER_CONFIG.pricePerBlock} / block`;
  });
  document.querySelectorAll("[data-world-border]").forEach((el) => {
    el.textContent = `±${SERVER_CONFIG.worldBorder.toLocaleString("vi-VN")} block`;
  });
}

// ============================================================
// TOAST
// ============================================================
function showToast(message, type = "success") {
  const container = document.getElementById("toast-container");
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;

  const icons = { success: "check-circle", info: "info", warning: "alert-triangle" };
  toast.innerHTML = `<i data-lucide="${icons[type] || 'info'}" style="width:16px;height:16px"></i><span>${message}</span>`;
  container.appendChild(toast);
  lucide.createIcons({ nodes: [toast] });

  setTimeout(() => {
    toast.classList.add("toast-exit");
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ============================================================
// NAVBAR
// ============================================================
function initNavbar() {
  const nav = document.getElementById("navbar");
  const links = document.querySelectorAll(".nav-link");
  const sections = document.querySelectorAll("section[id]");

  window.addEventListener("scroll", () => {
    nav.classList.toggle("scrolled", window.scrollY > 50);

    let current = "";
    sections.forEach((sec) => {
      if (window.scrollY >= sec.offsetTop - 120) current = sec.id;
    });
    links.forEach((link) => {
      link.classList.toggle("active", link.getAttribute("href") === `#${current}`);
    });
  });
}

// ============================================================
// MOBILE MENU
// ============================================================
function initMobileMenu() {
  const btn = document.getElementById("mobile-menu-btn");
  const menu = document.getElementById("mobile-menu");
  if (!btn || !menu) return;

  btn.addEventListener("click", () => {
    menu.classList.toggle("open");
    const isOpen = menu.classList.contains("open");
    btn.setAttribute("aria-expanded", isOpen);
    document.body.style.overflow = isOpen ? "hidden" : "";
  });

  menu.querySelectorAll("a").forEach((a) => {
    a.addEventListener("click", () => {
      menu.classList.remove("open");
      document.body.style.overflow = "";
    });
  });
}

// ============================================================
// CLIPBOARD HELPERS (IP, VOICE CHAT, DISCORD)
// ============================================================
function copyTextToClipboard(text, successHtml) {
  navigator.clipboard.writeText(text).then(() => {
    showToast(successHtml, "success");
  }).catch(() => {
    const ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    ta.remove();
    showToast(successHtml, "success");
  });
}

function copyIP() {
  const text = `${SERVER_CONFIG.ip}:${SERVER_CONFIG.port}`;
  copyTextToClipboard(text, `Đã sao chép IP & Port: <strong>${text}</strong>`);
}

function copyVoiceUrl() {
  copyTextToClipboard(
    SERVER_CONFIG.voiceChatUrl,
    `Đã sao chép link Voice Chat: <strong>${SERVER_CONFIG.voiceChatUrl}</strong>`
  );
}

function copyDiscordUrl() {
  copyTextToClipboard(
    SERVER_CONFIG.discordUrl,
    `Đã sao chép link Discord: <strong>${SERVER_CONFIG.discordUrl}</strong>`
  );
}

// ============================================================
// OPEN MINECRAFT
// ============================================================
function openMinecraft() {
  const url = `minecraft://?addExternalServer=${SERVER_CONFIG.serverName}|${SERVER_CONFIG.ip}:${SERVER_CONFIG.port}`;
  window.location.href = url;
  showToast("Đang mở Minecraft... Nếu không tự mở, hãy thêm server thủ công.", "info");
}

// ============================================================
// SCOREBOARD INTERACTIVITY
// ============================================================
function initScoreboard() {
  const nameInput = document.getElementById("sb-player-input");
  if (nameInput) {
    nameInput.addEventListener("input", (e) => {
      currentPlayerName = e.target.value || "Steve";
      updateScoreboardDisplay();
      updateNameTag();
    });
  }

  document.querySelectorAll(".rank-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      document.querySelectorAll(".rank-chip").forEach((c) => c.classList.remove("active"));
      chip.classList.add("active");
      currentRank = chip.dataset.rank;
      updateScoreboardDisplay();
      updateNameTag();
    });
  });

  document.querySelectorAll(".team-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      document.querySelectorAll(".team-chip").forEach((c) => c.classList.remove("active", "active-team"));
      chip.classList.add("active-team");
      currentTeam = chip.dataset.team;
      updateScoreboardDisplay();
      updateNameTag();
    });
  });

  updateScoreboardDisplay();
  updateNameTag();
}

function updateScoreboardDisplay() {
  const rankEl = document.getElementById("sb-rank-value");
  const teamEl = document.getElementById("sb-team-value");
  const playerEl = document.getElementById("sb-player-name");

  if (rankEl) {
    const r = RANKS[currentRank];
    rankEl.textContent = r.name;
    rankEl.style.color = r.color;
  }
  if (teamEl) {
    const t = TEAMS[currentTeam];
    teamEl.textContent = t.tag || "No tiem";
    teamEl.style.color = t.color;
  }
  if (playerEl) {
    playerEl.textContent = currentPlayerName;
  }
}

function updateNameTag() {
  const rankLine = document.getElementById("nametag-rank");
  const nameLine = document.getElementById("nametag-name");
  if (!rankLine || !nameLine) return;

  const r = RANKS[currentRank];
  const t = TEAMS[currentTeam];

  rankLine.textContent = `[${r.name}]`;
  rankLine.style.color = r.color;

  nameLine.innerHTML = "";
  if (t.tag) {
    const teamSpan = document.createElement("span");
    teamSpan.textContent = t.tag + " ";
    teamSpan.style.color = t.color;
    nameLine.appendChild(teamSpan);
  }
  const nameSpan = document.createElement("span");
  nameSpan.textContent = currentPlayerName;
  nameSpan.style.color = "#fff";
  nameLine.appendChild(nameSpan);
}

// ============================================================
// LAND CALCULATOR
// ============================================================
function initLandCalculator() {
  const widthSlider = document.getElementById("land-width");
  const lengthSlider = document.getElementById("land-length");
  const widthInput = document.getElementById("land-width-num");
  const lengthInput = document.getElementById("land-length-num");

  if (widthSlider) {
    widthSlider.addEventListener("input", () => {
      widthInput.value = widthSlider.value;
      clearActivePkg();
      updateLandCalc();
    });
  }
  if (lengthSlider) {
    lengthSlider.addEventListener("input", () => {
      lengthInput.value = lengthSlider.value;
      clearActivePkg();
      updateLandCalc();
    });
  }
  if (widthInput) {
    widthInput.addEventListener("change", () => {
      let v = Math.max(5, Math.min(150, parseInt(widthInput.value) || 5));
      widthInput.value = v;
      widthSlider.value = v;
      clearActivePkg();
      updateLandCalc();
    });
  }
  if (lengthInput) {
    lengthInput.addEventListener("change", () => {
      let v = Math.max(5, Math.min(150, parseInt(lengthInput.value) || 5));
      lengthInput.value = v;
      lengthSlider.value = v;
      clearActivePkg();
      updateLandCalc();
    });
  }
}

function setLandPackage(w, l, btnEl) {
  document.getElementById("land-width").value = w;
  document.getElementById("land-length").value = l;
  document.getElementById("land-width-num").value = w;
  document.getElementById("land-length-num").value = l;

  document.querySelectorAll(".land-pkg-btn").forEach((b) => b.classList.remove("active"));
  if (btnEl) btnEl.classList.add("active");

  updateLandCalc();
}

function clearActivePkg() {
  document.querySelectorAll(".land-pkg-btn").forEach((b) => b.classList.remove("active"));
}

function updateLandCalc() {
  const w = parseInt(document.getElementById("land-width")?.value) || 15;
  const l = parseInt(document.getElementById("land-length")?.value) || 15;
  const totalBlocks = w * l;
  const totalCost = totalBlocks * SERVER_CONFIG.pricePerBlock;
  const refund = Math.floor(totalCost * 0.7);

  const blocksEl = document.getElementById("result-blocks");
  const costEl = document.getElementById("result-cost");
  const refundEl = document.getElementById("result-refund");
  const dimAEl = document.getElementById("land-dim-a");
  const dimBEl = document.getElementById("land-dim-b");

  if (blocksEl) blocksEl.textContent = totalBlocks.toLocaleString("vi-VN");
  if (costEl) costEl.textContent = `$${totalCost.toLocaleString("vi-VN")}`;
  if (refundEl) refundEl.textContent = `$${refund.toLocaleString("vi-VN")}`;
  if (dimAEl) dimAEl.textContent = `${w} block`;
  if (dimBEl) dimBEl.textContent = `${l} block`;
}

// ============================================================
// WIKI TABS
// ============================================================
function initWikiTabs() {
  document.querySelectorAll(".wiki-tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = btn.dataset.tab;
      document.querySelectorAll(".wiki-tab-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      document.querySelectorAll(".wiki-panel").forEach((p) => {
        p.classList.toggle("hidden", p.id !== target);
      });
    });
  });
}

// ============================================================
// COMMAND SEARCH
// ============================================================
function initCommandSearch() {
  const searchInput = document.getElementById("command-search");
  if (!searchInput) return;

  searchInput.addEventListener("input", () => {
    const query = searchInput.value.toLowerCase().trim();
    document.querySelectorAll(".cmd-row").forEach((row) => {
      const cmd = row.querySelector(".cmd-code")?.textContent.toLowerCase() || "";
      const desc = row.querySelector(".cmd-desc")?.textContent.toLowerCase() || "";
      row.style.display = !query || cmd.includes(query) || desc.includes(query) ? "" : "none";
    });
    document.querySelectorAll(".cmd-group").forEach((group) => {
      const hasVisible = Array.from(group.querySelectorAll(".cmd-row")).some(
        (r) => r.style.display !== "none"
      );
      const title = group.querySelector(".cmd-group-title");
      if (title) title.style.display = hasVisible ? "" : "none";
    });
  });
}

function copyCommand(cmd) {
  copyTextToClipboard(cmd, `Đã sao chép lệnh <code>${cmd}</code>`);
}

// ============================================================
// ADMIN FILTER BUTTONS
// ============================================================
function initAdminFilters() {
  document.querySelectorAll(".admin-filter-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const filter = btn.dataset.filter;
      const isAll = filter === "all";

      if (isAll) {
        document.querySelectorAll(".admin-filter-btn").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
      } else {
        document.querySelector('.admin-filter-btn[data-filter="all"]')?.classList.remove("active");
        btn.classList.toggle("active");
      }

      const activeFilters = Array.from(document.querySelectorAll(".admin-filter-btn.active")).map(
        (b) => b.dataset.filter
      );

      document.querySelectorAll("#admin-panel .cmd-group").forEach((group) => {
        const groupPlugin = group.dataset.plugin;
        if (activeFilters.includes("all") || activeFilters.length === 0) {
          group.style.display = "";
        } else {
          group.style.display = activeFilters.includes(groupPlugin) ? "" : "none";
        }
      });
    });
  });
}

// ============================================================
// RANK STORE — PREVIEW
// ============================================================
function previewRank(rankId) {
  if (!RANKS[rankId]) return;
  currentRank = rankId;

  document.querySelectorAll(".rank-chip").forEach((c) => {
    c.classList.toggle("active", c.dataset.rank === rankId);
  });

  updateScoreboardDisplay();
  updateNameTag();

  document.getElementById("hero")?.scrollIntoView({ behavior: "smooth", block: "start" });
  showToast(`Đang xem thử Rank: [${RANKS[rankId].name}] trên NameTag`, "info");
}

// ============================================================
// PAYMENT MODAL
// ============================================================
function openPaymentModal(itemName, itemPrice) {
  const modal = document.getElementById("payment-modal");
  const modalTitle = document.getElementById("modal-item-name");
  const modalPrice = document.getElementById("modal-item-price");

  if (modalTitle) modalTitle.textContent = itemName;
  if (modalPrice) modalPrice.textContent = itemPrice || "";
  if (modal) modal.classList.add("show");
  document.body.style.overflow = "hidden";
}

function closePaymentModal() {
  const modal = document.getElementById("payment-modal");
  if (modal) modal.classList.remove("show");
  document.body.style.overflow = "";
}

document.addEventListener("click", (e) => {
  if (e.target.classList.contains("modal-overlay") && e.target.classList.contains("show")) {
    closePaymentModal();
  }
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closePaymentModal();
});

// ============================================================
// SCROLL ANIMATIONS
// ============================================================
function initScrollAnimations() {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
        }
      });
    },
    { threshold: 0.1, rootMargin: "0px 0px -50px 0px" }
  );

  document.querySelectorAll(".fade-up").forEach((el) => observer.observe(el));
}

// ============================================================
// SMOOTH SCROLL
// ============================================================
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const target = document.querySelector(link.getAttribute("href"));
      if (target) {
        target.scrollIntoView({ behavior: "smooth" });
      }
    });
  });
}