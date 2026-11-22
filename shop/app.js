// ============================================================
// CẤU HÌNH KẾT NỐI HỆ THỐNG BRICMC
// ============================================================
const API_URL = "https://script.google.com/macros/s/AKfycbz56SdjDNItGzSE_fvqZ3BjNXTTD34EG0-FymEhEtnl36nCQZHbA32l_NQb4pJyHKuHUA/exec";
const BANK_ID = "MB";               // Mã ngân hàng VietQR (VD: MB, VCB, TCB, ACB, BIDV, VPB...)
const ACCOUNT_NO = "0338837876";    // <-- Thay bằng Số tài khoản ngân hàng liên kết SePay của bạn
const ACCOUNT_NAME = "NGUYEN DUC HIEP"; // Tên chủ tài khoản không dấu

let allPackages = {};
let activeCategory = "Tất cả";
let currentBalance = 0;
let selectedPackage = null;
let cardPollTimer = null;
let qrPollTimer = null;

function formatXu(num) {
  return Number(num || 0).toLocaleString("vi-VN") + " Xu";
}

function formatVnd(num) {
  return Number(num || 0).toLocaleString("vi-VN") + "đ";
}

function getPlayerName() {
  return document.getElementById("playerInput").value.trim();
}

function showCardStatus(type, msg) {
  const box = document.getElementById("cardStatusBox");
  box.className = "status-banner " + type;
  box.textContent = msg;
  box.classList.remove("hidden");
}

// ============================================================
// TẢI DANH SÁCH GÓI & VÍ XU
// ============================================================
async function loadPackages() {
  try {
    const res = await fetch(`${API_URL}?action=get_packages`);
    const data = await res.json();
    if (data.ok && data.packages) {
      allPackages = data.packages;
      renderCategories();
      renderPackages();
    }
  } catch (err) {
    document.getElementById("packagesGrid").innerHTML =
      `<div class="status-banner error">Không tải được danh sách gói. Vui lòng kiểm tra lại API_URL.</div>`;
  }
}

async function refreshWallet(silent = false) {
  const player = getPlayerName();
  if (!player) {
    if (!silent) alert("Vui lòng nhập tên nhân vật Minecraft của bạn!");
    return;
  }
  localStorage.setItem("bricmc_player", player);

  try {
    const res = await fetch(`${API_URL}?action=get_wallet&player=${encodeURIComponent(player)}`);
    const data = await res.json();
    if (data.ok) {
      currentBalance = Number(data.balance) || 0;
      document.getElementById("walletBalance").textContent = formatXu(currentBalance);
      document.getElementById("walletTotal").textContent = formatXu(data.total_deposited);
      renderHistory(data.recent_topups || [], data.recent_orders || []);
      renderPackages();
    }
  } catch (err) {
    if (!silent) alert("Lỗi kết nối máy chủ khi kiểm tra ví.");
  }
}

function renderCategories() {
  const cats = ["Tất cả"];
  Object.values(allPackages).forEach((pkg) => {
    const c = pkg.category || "Khác";
    if (!cats.includes(c)) cats.push(c);
  });

  const container = document.getElementById("categoryFilters");
  container.innerHTML = cats
    .map(
      (c) =>
        `<button class="cat-pill ${c === activeCategory ? "active" : ""}" onclick="selectCategory('${c}')">${c}</button>`
    )
    .join("");
}

function selectCategory(cat) {
  activeCategory = cat;
  renderCategories();
  renderPackages();
}

function renderPackages() {
  const grid = document.getElementById("packagesGrid");
  const list = Object.values(allPackages).filter(
    (p) => activeCategory === "Tất cả" || p.category === activeCategory
  );

  if (!list.length) {
    grid.innerHTML = `<div class="empty-text">Chưa có gói nào trong danh mục này.</div>`;
    return;
  }

  grid.innerHTML = list
    .map((pkg) => {
      const cleanDesc = pkg.description.replace(/\\n/g, "\n");
      return `
        <div class="pkg-card">
          <div>
            <span class="pkg-cat">${pkg.category}</span>
            <h3 class="pkg-title">${pkg.name}</h3>
            <p class="pkg-desc">${cleanDesc}</p>
          </div>
          <div class="pkg-footer">
            <span class="pkg-price">${formatXu(pkg.price)}</span>
            <button class="btn btn-primary" onclick="openBuyModal('${pkg.package_id}')">Mua Ngay</button>
          </div>
        </div>
      `;
    })
    .join("");
}

function renderHistory(topups, orders) {
  const topupBox = document.getElementById("topupHistoryList");
  if (!topups.length) {
    topupBox.innerHTML = `<p class="empty-text">Chưa có giao dịch nạp Xu nào.</p>`;
  } else {
    topupBox.innerHTML = topups
      .map((t) => {
        const isPaid = t.status === "PAID" || t.status === "SUCCESS";
        const badge = isPaid
          ? `<span class="badge badge-ok">+${formatXu(t.amount)}</span>`
          : `<span class="badge badge-wait">${t.status}</span>`;
        return `
          <div class="history-item">
            <div>
              <strong>${t.topup_id}</strong> (${t.method === "CARD_VINA" ? "Thẻ Vina" : "Bank QR"})
              <div class="hint">${t.created_at}</div>
            </div>
            ${badge}
          </div>
        `;
      })
      .join("");
  }

  const orderBox = document.getElementById("orderHistoryList");
  if (!orders.length) {
    orderBox.innerHTML = `<p class="empty-text">Chưa có đơn mua gói nào.</p>`;
  } else {
    orderBox.innerHTML = orders
      .map((o) => {
        const badge =
          o.status === "CLAIMED"
            ? `<span class="badge badge-ok">Đã nhận trong game</span>`
            : `<span class="badge badge-wait">Đang phát vào game...</span>`;
        return `
          <div class="history-item">
            <div>
              <strong>${o.package_name}</strong> (${o.order_id})
              <div class="hint">${o.created_at} • -${formatXu(o.amount)}</div>
            </div>
            ${badge}
          </div>
        `;
      })
      .join("");
  }
}

// ============================================================
// NẠP THẺ CÀO VINAPHONE VÀO VÍ XU
// ============================================================
async function submitCardTopup() {
  const player = getPlayerName();
  if (!player) {
    alert("Vui lòng nhập tên nhân vật Minecraft ở Bước 1 trước!");
    document.getElementById("playerInput").focus();
    return;
  }

  const amount = document.getElementById("cardAmountSelect").value;
  const serial = document.getElementById("cardSerial").value.trim();
  const code = document.getElementById("cardCode").value.trim();

  if (!serial || !code) {
    showCardStatus("error", "Vui lòng nhập đầy đủ Số Seri và Mã thẻ cào!");
    return;
  }

  const btn = document.getElementById("submitCardBtn");
  btn.disabled = true;
  btn.textContent = "Đang gửi thẻ...";
  showCardStatus("info", "Đang kết nối cổng gạch thẻ Vinaphone...");

  try {
    const url = `${API_URL}?action=submit_card&player=${encodeURIComponent(player)}&telco=VINAPHONE&amount=${amount}&serial=${encodeURIComponent(serial)}&code=${encodeURIComponent(code)}`;
    const res = await fetch(url);
    const data = await res.json();

    if (!data.ok) {
      showCardStatus("error", data.error || "Thẻ bị từ chối!");
      return;
    }

    document.getElementById("cardSerial").value = "";
    document.getElementById("cardCode").value = "";

    if (data.card_status === "SUCCESS") {
      showCardStatus("success", `Nạp thành công! Đã cộng +${formatXu(data.amount)} vào ví của ${player}.`);
      await refreshWallet(true);
    } else {
      showCardStatus("info", `Thẻ mã ${data.request_id} đang chờ nhà mạng duyệt (10–30 giây)...`);
      startCardPolling(data.request_id);
    }
  } catch (err) {
    showCardStatus("error", "Lỗi mạng khi gửi thẻ. Vui lòng thử lại!");
  } finally {
    btn.disabled = false;
    btn.textContent = "Nạp Thẻ Vào Ví Ngay";
  }
}

function startCardPolling(requestId) {
  if (cardPollTimer) clearInterval(cardPollTimer);
  let attempts = 0;

  cardPollTimer = setInterval(async () => {
    attempts++;
    if (attempts > 30) {
      clearInterval(cardPollTimer);
      return;
    }
    try {
      const res = await fetch(`${API_URL}?action=check_card&request_id=${encodeURIComponent(requestId)}`);
      const data = await res.json();
      if (!data.ok) return;

      if (data.status === "SUCCESS") {
        clearInterval(cardPollTimer);
        showCardStatus("success", `Thẻ hợp lệ! Đã cộng +${formatXu(data.real_amount)} vào Ví Xu.`);
        await refreshWallet(true);
      } else if (data.status === "WRONG_AMOUNT") {
        clearInterval(cardPollTimer);
        showCardStatus("error", "Thẻ bị báo SAI MỆNH GIÁ! Vui lòng liên hệ Admin để đối soát.");
        await refreshWallet(true);
      } else if (data.status.startsWith("FAILED")) {
        clearInterval(cardPollTimer);
        showCardStatus("error", `Thẻ không hợp lệ (${data.status}). Vui lòng kiểm tra lại mã thẻ.`);
        await refreshWallet(true);
      }
    } catch (e) {}
  }, 4000);
}

// ============================================================
// NẠP CHUYỂN KHOẢN BANK QR VÀO VÍ XU (SEPAY)
// ============================================================
async function createQrTopup() {
  const player = getPlayerName();
  if (!player) {
    alert("Vui lòng nhập tên nhân vật Minecraft ở Bước 1 trước!");
    document.getElementById("playerInput").focus();
    return;
  }

  const amount = Math.floor(Number(document.getElementById("qrAmountInput").value) || 0);
  if (amount < 10000) {
    alert("Số tiền nạp QR tối thiểu là 10.000đ!");
    return;
  }

  const btn = document.getElementById("createQrBtn");
  btn.disabled = true;
  btn.textContent = "Đang tạo QR...";

  try {
    const res = await fetch(`${API_URL}?action=create_topup&player=${encodeURIComponent(player)}&amount=${amount}`);
    const data = await res.json();
    if (!data.ok) {
      alert(data.error || "Không tạo được mã QR");
      return;
    }

    const qrUrl = `https://img.vietqr.io/image/${BANK_ID}-${ACCOUNT_NO}-compact2.png?amount=${data.amount}&addInfo=${encodeURIComponent(data.transfer_note)}&accountName=${encodeURIComponent(ACCOUNT_NAME)}`;
    document.getElementById("qrImage").src = qrUrl;
    document.getElementById("qrShowAmount").textContent = formatVnd(data.amount);
    document.getElementById("qrShowNote").textContent = data.transfer_note;
    document.getElementById("qrPollStatus").textContent = "Đang chờ hệ thống ngân hàng xác nhận tự động...";
    document.getElementById("qrDisplayBox").classList.remove("hidden");

    startQrPolling(data.topup_id);
  } catch (err) {
    alert("Lỗi kết nối khi tạo mã QR!");
  } finally {
    btn.disabled = false;
    btn.textContent = "Tạo Mã QR Nạp Xu";
  }
}

function startQrPolling(topupId) {
  if (qrPollTimer) clearInterval(qrPollTimer);
  let attempts = 0;

  qrPollTimer = setInterval(async () => {
    attempts++;
    if (attempts > 75) {
      clearInterval(qrPollTimer);
      return;
    }
    try {
      const res = await fetch(`${API_URL}?action=check_topup&topup_id=${encodeURIComponent(topupId)}`);
      const data = await res.json();
      if (data.ok && data.status === "PAID") {
        clearInterval(qrPollTimer);
        document.getElementById("qrPollStatus").textContent =
          `Đã nhận thanh toán! Cộng +${formatXu(data.amount)} vào Ví Xu thành công.`;
        await refreshWallet(true);
      }
    } catch (e) {}
  }, 4000);
}

// ============================================================
// MUA GÓI BẰNG SỐ DƯ VÍ XU
// ============================================================
async function openBuyModal(packageId) {
  const player = getPlayerName();
  if (!player) {
    alert("Vui lòng nhập tên nhân vật Minecraft ở Bước 1 trước!");
    document.getElementById("playerInput").focus();
    return;
  }

  await refreshWallet(true);
  selectedPackage = allPackages[packageId];
  if (!selectedPackage) return;

  document.getElementById("modalPkgName").textContent = selectedPackage.name;
  document.getElementById("modalPkgDesc").textContent = selectedPackage.description.replace(/\\n/g, "\n");
  document.getElementById("modalPkgPrice").textContent = formatXu(selectedPackage.price);
  document.getElementById("modalCurBalance").textContent = formatXu(currentBalance);

  const choiceWrap = document.getElementById("choiceWrapper");
  if (selectedPackage.allow_choice) {
    choiceWrap.classList.remove("hidden");
  } else {
    choiceWrap.classList.add("hidden");
  }

  const alertBox = document.getElementById("modalAlert");
  const confirmBtn = document.getElementById("confirmBuyBtn");

  if (currentBalance < selectedPackage.price) {
    const missing = selectedPackage.price - currentBalance;
    alertBox.className = "status-banner error";
    alertBox.textContent = `Bạn còn thiếu ${formatXu(missing)}. Hãy nạp thêm thẻ cào hoặc QR ở Bước 2!`;
    alertBox.classList.remove("hidden");
    confirmBtn.textContent = "Nạp Thêm Xu Ngay";
  } else {
    alertBox.classList.add("hidden");
    confirmBtn.textContent = "Thanh Toán Bằng Ví Xu";
  }

  document.getElementById("buyModal").classList.remove("hidden");
}

async function handleConfirmBuy() {
  if (!selectedPackage) return;
  const player = getPlayerName();

  // Nếu thiếu tiền -> đóng modal và cuộn lên khung nạp tiền
  if (currentBalance < selectedPackage.price) {
    document.getElementById("buyModal").classList.add("hidden");
    document.getElementById("topupSection").scrollIntoView({ behavior: "smooth" });
    return;
  }

  const btn = document.getElementById("confirmBuyBtn");
  btn.disabled = true;
  btn.textContent = "Đang xử lý...";

  const choice = selectedPackage.allow_choice ? document.getElementById("choiceSelect").value : "";

  try {
    const url = `${API_URL}?action=buy_package&player=${encodeURIComponent(player)}&package_id=${encodeURIComponent(selectedPackage.package_id)}&choice_item=${encodeURIComponent(choice)}`;
    const res = await fetch(url);
    const data = await res.json();

    const alertBox = document.getElementById("modalAlert");
    if (!data.ok) {
      alertBox.className = "status-banner error";
      alertBox.textContent = data.error || "Không thể hoàn tất giao dịch!";
      alertBox.classList.remove("hidden");
      return;
    }

    alertBox.className = "status-banner success";
    alertBox.textContent = `Mua thành công ${data.package_name} (Mã đơn: ${data.order_id})! Vật phẩm sẽ tự động gửi vào game sau vài giây.`;
    alertBox.classList.remove("hidden");
    await refreshWallet(true);
    document.getElementById("modalCurBalance").textContent = formatXu(currentBalance);
  } catch (err) {
    alert("Lỗi kết nối máy chủ khi thanh toán!");
  } finally {
    btn.disabled = false;
    btn.textContent = "Thanh Toán Bằng Ví Xu";
  }
}

// ============================================================
// KHỞI TẠO SỰ KIỆN TRANG
// ============================================================
document.addEventListener("DOMContentLoaded", () => {
  const savedPlayer = localStorage.getItem("bricmc_player");
  if (savedPlayer) {
    document.getElementById("playerInput").value = savedPlayer;
    refreshWallet(true);
  }

  loadPackages();

  document.getElementById("checkWalletBtn").addEventListener("click", () => refreshWallet(false));
  document.getElementById("submitCardBtn").addEventListener("click", submitCardTopup);
  document.getElementById("createQrBtn").addEventListener("click", createQrTopup);
  document.getElementById("closeModalBtn").addEventListener("click", () => {
    document.getElementById("buyModal").classList.add("hidden");
  });
  document.getElementById("confirmBuyBtn").addEventListener("click", handleConfirmBuy);

  document.getElementById("copyNoteBtn").addEventListener("click", () => {
    const note = document.getElementById("qrShowNote").textContent;
    navigator.clipboard.writeText(note);
    alert("Đã copy nội dung chuyển khoản: " + note);
  });

  // Chuyển Tab Thẻ Cào / QR
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
      document.querySelectorAll(".tab-panel").forEach((p) => p.classList.remove("active"));
      btn.classList.add("active");
      document.getElementById(btn.dataset.tab).classList.add("active");
    });
  });

  // Chọn nhanh mệnh giá QR
  document.querySelectorAll(".amt-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      document.querySelectorAll(".amt-chip").forEach((c) => c.classList.remove("active"));
      chip.classList.add("active");
      document.getElementById("qrAmountInput").value = chip.dataset.amt;
    });
  });
});
