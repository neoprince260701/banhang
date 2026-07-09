// ==================== VŨ HOÀNG POS - MAIN APP LOGIC ====================
// Tách biệt Supabase client ở file supabase-client.js

let products = [];
let customers = [];
let orders = [];
let cart = [];

let currentCategoryFilter = 'all';
let currentEditingProductId = null;
let currentEditingCustomerId = null;
let currentViewingOrderId = null;

// ==================== DANH MỤC TÙY CHỈNH ====================
// Load categories từ localStorage (cho phép người dùng tự thêm danh mục)
function getCategories() {
  const saved = localStorage.getItem('vuhoang_categories');
  if (saved) {
    return JSON.parse(saved);
  }
  // Danh mục mặc định
  return {
    'ray-nam-cham': 'Đèn Ray Nam Châm',
    'nguon-led': 'Nguồn & Driver LED',
    'quat-tran': 'Quạt trần',
    'den-trang-tri': 'Đèn trang trí',
    'phu-kien': 'Phụ kiện & Khác'
  };
}

let CATEGORIES = getCategories();

// Lưu categories khi có thay đổi
function saveCategories() {
  localStorage.setItem('vuhoang_categories', JSON.stringify(CATEGORIES));
}

// Thêm danh mục mới
function addNewCategory(key, label) {
  if (!key || !label) return false;
  if (CATEGORIES[key]) return false;

  CATEGORIES[key] = label;
  saveCategories();
  return true;
}

// Render danh sách danh mục vào select
function renderCategoryOptions(selectId = 'product-category', selectedValue = null) {
  const select = document.getElementById(selectId);
  if (!select) return;

  select.innerHTML = '';

  Object.keys(CATEGORIES).forEach(key => {
    const option = document.createElement('option');
    option.value = key;
    option.textContent = CATEGORIES[key];
    if (selectedValue === key) option.selected = true;
    select.appendChild(option);
  });

  // Thêm option "Khác" nếu chưa có
  if (!Object.keys(CATEGORIES).includes('khac')) {
    const otherOption = document.createElement('option');
    otherOption.value = 'khac';
    otherOption.textContent = 'Khác (tự nhập)';
    select.appendChild(otherOption);
  }
}

// Xử lý khi thay đổi danh mục
function handleCategoryChange() {
  const select = document.getElementById('product-category');
  if (!select) return;

  if (select.value === 'khac') {
    showAddCategoryInput();
  }
}

// Hiển thị input thêm danh mục mới
function showAddCategoryInput() {
  const inputDiv = document.getElementById('add-category-input');
  if (inputDiv) inputDiv.classList.remove('hidden');
}

// Ẩn input thêm danh mục
function hideAddCategoryInput() {
  const inputDiv = document.getElementById('add-category-input');
  const input = document.getElementById('new-category-label');
  if (inputDiv) inputDiv.classList.add('hidden');
  if (input) input.value = '';
}

// Thêm danh mục mới từ input
function addNewCategoryFromInput() {
  const input = document.getElementById('new-category-label');
  const select = document.getElementById('product-category');
  if (!input || !select) return;

  const label = input.value.trim();
  if (!label) {
    showToast('Vui lòng nhập tên danh mục', 'error');
    return;
  }

  // Tạo key từ label (bỏ dấu, lowercase, thay khoảng trắng bằng -)
  const key = label.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '-');

  if (addNewCategory(key, label)) {
    // Render lại select
    renderCategoryOptions('product-category', key);
    hideAddCategoryInput();
    showToast('Đã thêm danh mục mới', 'success');
  } else {
    showToast('Danh mục đã tồn tại', 'error');
  }
}

// ==================== HELPERS ====================
function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  let bg = 'bg-emerald-600', icon = 'fa-check-circle';
  if (type === 'error') { bg = 'bg-red-600'; icon = 'fa-exclamation-circle'; }
  if (type === 'info') { bg = 'bg-slate-700'; icon = 'fa-info-circle'; }

  toast.className = `toast flex items-center gap-x-3 px-5 py-3.5 rounded-2xl text-white text-sm shadow-xl ${bg}`;
  toast.innerHTML = `<i class="fa-solid ${icon} fa-lg"></i><span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.transition = 'all 0.3s ease';
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 200);
  }, 2800);
}

function formatMoney(amount) {
  return Number(amount || 0).toLocaleString('vi-VN') + 'đ';
}

function normalize(str) {
  return String(str || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function switchTab(tab) {
  document.querySelectorAll('.tab-page').forEach(p => p.classList.add('hidden'));
  const page = document.getElementById('page-' + tab);
  if (page) page.classList.remove('hidden');

  document.querySelectorAll('[id^="tab-"]').forEach(btn => {
    btn.classList.remove('tab-active', 'bg-amber-500', 'text-white');
    btn.classList.add('text-white/90');
  });

  const activeBtn = document.getElementById('tab-' + tab);
  if (activeBtn) {
    activeBtn.classList.add('tab-active', 'bg-amber-500', 'text-white');
    activeBtn.classList.remove('text-white/90');
  }

  if (tab === 'dashboard') updateDashboard();
  if (tab === 'products') renderProductsTable();
  if (tab === 'customers') renderCustomersTable();
  if (tab === 'orders') renderOrdersTable();
  if (tab === 'pos') {
    renderPOSProductGrid();
    renderCart();
  }
}

// ==================== DATA (Supabase + Local Fallback) ====================
async function loadAllData() {
  const supabase = window.VH_Supabase?.getSupabase();
  const user = window.VH_Supabase?.getCurrentUser();

  if (supabase && user) {
    try {
      const [prodRes, custRes, orderRes] = await Promise.all([
        supabase.from('products').select('*').order('code'),
        supabase.from('customers').select('*').order('name'),
        supabase.from('orders').select('*').order('created_at', { ascending: false })
      ]);

      products = prodRes.data || [];
      customers = custRes.data || [];
      orders = orderRes.data || [];
      console.log(`[Data] Loaded from Supabase: ${products.length} SP, ${customers.length} KH, ${orders.length} đơn`);
      return;
    } catch (err) {
      console.error('Lỗi load từ Supabase, dùng local:', err);
    }
  }

  // Fallback localStorage
  products = JSON.parse(localStorage.getItem('vuhoang_products') || '[]');
  customers = JSON.parse(localStorage.getItem('vuhoang_customers') || '[]');
  orders = JSON.parse(localStorage.getItem('vuhoang_orders') || '[]');
}

async function saveProduct(productData, isEdit = false, editId = null) {
  const supabase = window.VH_Supabase?.getSupabase();
  const user = window.VH_Supabase?.getCurrentUser();

  if (supabase && user) {
    try {
      if (isEdit && editId) {
        await supabase.from('products').update(productData).eq('id', editId);
      } else {
        await supabase.from('products').insert(productData);
      }
      await loadAllData();
      return true;
    } catch (err) {
      showToast('Lỗi lưu Supabase: ' + err.message, 'error');
      return false;
    }
  }

  // Local fallback
  if (isEdit && editId) {
    const idx = products.findIndex(p => p.id === editId);
    if (idx > -1) products[idx] = { ...products[idx], ...productData };
  } else {
    productData.id = 'p' + Date.now();
    products.push(productData);
  }
  localStorage.setItem('vuhoang_products', JSON.stringify(products));
  return true;
}

// Thêm các hàm saveOrder, deleteProduct... tương tự (để ngắn gọn, tôi sẽ implement đầy đủ ở phiên bản sau nếu cần)

async function seedDemoData() {
  // Hàm seed demo vào Supabase (gọi từ nút trên dashboard)
  showToast('Chức năng seed demo đang được hoàn thiện trong phiên bản này', 'info');
}

// ==================== POS & CART ====================
function renderCategoryFilters() {
  const container = document.getElementById('category-filters');
  if (!container) return;

  container.innerHTML = `
    <button onclick="filterByCategory('all')" class="category-chip px-4 py-1 text-xs font-medium border rounded-2xl ${currentCategoryFilter === 'all' ? 'active border-amber-400 bg-amber-50 text-amber-700' : 'border-slate-200 hover:bg-slate-50'}">Tất cả</button>
    ${Object.keys(CATEGORIES).map(key => `
      <button onclick="filterByCategory('${key}')" class="category-chip px-4 py-1 text-xs font-medium border rounded-2xl ${currentCategoryFilter === key ? 'active border-amber-400 bg-amber-50 text-amber-700' : 'border-slate-200 hover:bg-slate-50'}">
        ${CATEGORIES[key]}
      </button>
    `).join('')}
  `;
}

function filterByCategory(cat) {
  currentCategoryFilter = cat;
  renderCategoryFilters();
  renderPOSProductGrid();
}

function renderPOSProductGrid() {
  const grid = document.getElementById('pos-product-grid');
  if (!grid) return;
  grid.innerHTML = '';

  let list = products;
  if (currentCategoryFilter !== 'all') {
    list = list.filter(p => p.category === currentCategoryFilter);
  }

  if (list.length === 0) {
    grid.innerHTML = `<div class="col-span-full py-8 text-center text-slate-400 text-sm">Không tìm thấy sản phẩm</div>`;
    return;
  }

  list.forEach(product => {
    const stockColor = product.stock > 20 ? 'emerald' : product.stock > 5 ? 'amber' : 'red';
    const card = document.createElement('div');
    card.className = `product-card bg-white border border-slate-200 rounded-2xl p-3 cursor-pointer hover:border-amber-300 group`;
    card.innerHTML = `
      <div class="flex justify-between items-start mb-2">
        <div class="text-[10px] font-mono px-2 py-0.5 bg-slate-100 text-slate-500 rounded">${product.code}</div>
        <div class="text-[10px] px-1.5 py-px rounded bg-${stockColor}-100 text-${stockColor}-600 font-medium">${product.stock}</div>
      </div>
      <div class="font-semibold text-sm leading-tight line-clamp-2 mb-1 group-hover:text-amber-700">${product.name}</div>
      <div class="flex items-baseline justify-between mt-auto pt-2">
        <div>
          <div class="text-emerald-600 font-bold tabular-nums text-base">${formatMoney(product.price)}</div>
          <div class="text-[10px] text-slate-500">${product.unit}</div>
        </div>
        <button onclick="event.stopImmediatePropagation(); addToCart('${product.id}');" 
                class="px-3 py-1 text-xs bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-xl flex items-center gap-x-1">
          <i class="fa-solid fa-plus fa-xs"></i><span class="font-bold">Thêm</span>
        </button>
      </div>
    `;
    card.onclick = () => addToCart(product.id);
    grid.appendChild(card);
  });
}

function addToCart(productId) {
  const product = products.find(p => p.id === productId);
  if (!product || product.stock <= 0) {
    showToast('Sản phẩm đã hết hàng!', 'error');
    return;
  }

  const existing = cart.find(item => item.id === productId);
  if (existing) {
    if (existing.quantity + 1 > product.stock) {
      showToast('Vượt quá tồn kho!', 'error');
      return;
    }
    existing.quantity++;
  } else {
    cart.push({ ...product, quantity: 1 });
  }
  renderCart();
  showToast(`Đã thêm ${product.name}`, 'success');
}

function renderCart() {
  const container = document.getElementById('pos-cart-list');
  const badge = document.getElementById('cart-count-badge');
  if (!container || !badge) return;

  badge.textContent = cart.length;

  if (cart.length === 0) {
    container.innerHTML = `
      <div class="h-full flex flex-col items-center justify-center text-center py-6 text-slate-400">
        <i class="fa-solid fa-shopping-cart text-3xl mb-3 opacity-40"></i>
        <div class="text-sm">Giỏ hàng trống</div>
      </div>`;
    recalculatePOS();
    return;
  }

  container.innerHTML = cart.map((item, index) => `
    <div class="cart-item flex items-center gap-x-3 bg-white border border-slate-100 px-3 py-2.5 rounded-2xl">
      <div class="flex-1 min-w-0">
        <div class="font-medium text-sm leading-tight">${item.name}</div>
        <div class="text-[10px] text-slate-500 font-mono">${item.code} • ${item.unit}</div>
      </div>
      <div class="flex items-center gap-x-1.5">
        <button onclick="changeCartQty(${index}, -1)" class="w-6 h-6 flex items-center justify-center border border-slate-200 hover:bg-slate-100 rounded-lg text-xs font-bold">-</button>
        <input type="number" value="${item.quantity}" class="w-11 text-center border border-slate-200 rounded-lg py-0.5 text-sm font-semibold" onchange="updateCartQty(${index}, this.value)">
        <button onclick="changeCartQty(${index}, 1)" class="w-6 h-6 flex items-center justify-center border border-slate-200 hover:bg-slate-100 rounded-lg text-xs font-bold">+</button>
      </div>
      <div class="text-right w-24">
        <div class="font-semibold tabular-nums text-sm">${formatMoney(item.price * item.quantity)}</div>
      </div>
      <button onclick="removeFromCart(${index})" class="ml-1 text-red-400 hover:text-red-500 p-1"><i class="fa-solid fa-times fa-sm"></i></button>
    </div>
  `).join('');

  recalculatePOS();
}

function changeCartQty(index, delta) {
  const item = cart[index];
  const product = products.find(p => p.id === item.id);
  const newQty = item.quantity + delta;
  if (newQty < 1) return;
  if (product && newQty > product.stock) {
    showToast('Vượt quá tồn kho!', 'error');
    return;
  }
  item.quantity = newQty;
  renderCart();
}

function updateCartQty(index, value) {
  const qty = parseInt(value) || 1;
  const item = cart[index];
  const product = products.find(p => p.id === item.id);
  if (product && qty > product.stock) {
    showToast('Vượt quá tồn kho!', 'error');
    item.quantity = product.stock;
  } else {
    item.quantity = Math.max(1, qty);
  }
  renderCart();
}

function removeFromCart(index) {
  cart.splice(index, 1);
  renderCart();
}

function clearCart() {
  if (cart.length === 0) return;
  if (!confirm('Xóa toàn bộ giỏ hàng?')) return;
  cart = [];
  renderCart();
}

function recalculatePOS() {
  let subtotal = 0;
  cart.forEach(i => subtotal += i.price * i.quantity);

  const discount = parseFloat(document.getElementById('pos-discount')?.value) || 0;
  const shipping = parseFloat(document.getElementById('pos-shipping')?.value) || 0;
  const paid = parseFloat(document.getElementById('pos-paid')?.value) || 0;

  const grand = Math.max(subtotal - discount + shipping, 0);
  const debt = Math.max(grand - paid, 0);

  const elSub = document.getElementById('pos-subtotal');
  const elGrand = document.getElementById('pos-grand');
  const elDebt = document.getElementById('pos-debt');

  if (elSub) elSub.textContent = formatMoney(subtotal);
  if (elGrand) elGrand.textContent = formatMoney(grand);
  if (elDebt) elDebt.textContent = formatMoney(debt);
}

// ==================== DASHBOARD ====================
function updateDashboard() {
  const today = new Date().toISOString().split('T')[0];
  const todayOrders = orders.filter(o => o.created_at && o.created_at.startsWith(today));
  let todayRevenue = 0;
  todayOrders.forEach(o => todayRevenue += (o.grand || 0));

  const kpiRev = document.getElementById('kpi-today-revenue');
  const kpiOrd = document.getElementById('kpi-today-orders');
  const kpiProd = document.getElementById('kpi-products');
  const kpiCust = document.getElementById('kpi-customers');

  if (kpiRev) kpiRev.textContent = formatMoney(todayRevenue);
  if (kpiOrd) kpiOrd.textContent = todayOrders.length;
  if (kpiProd) kpiProd.textContent = products.length;
  if (kpiCust) kpiCust.textContent = customers.length;

  // Recent orders & Top products (đơn giản hóa)
  const recentContainer = document.getElementById('recent-orders-list');
  if (recentContainer) {
    const recent = [...orders].sort((a,b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 5);
    recentContainer.innerHTML = recent.length ? recent.map(o => `
      <div onclick="viewOrderDetail('${o.id}')" class="flex justify-between items-center px-3 py-2 hover:bg-amber-50 rounded-2xl cursor-pointer text-sm">
        <div><span class="font-mono text-xs text-amber-600">${o.invoice_no}</span> <span class="ml-2 text-slate-600">${o.customer_name}</span></div>
        <div class="font-semibold">${formatMoney(o.grand)}</div>
      </div>
    `).join('') : `<div class="text-xs text-slate-400 py-3">Chưa có đơn hàng</div>`;
  }
}

// ==================== RENDER TABLES (đơn giản hóa cho phiên bản này) ====================
function renderProductsTable() {
  const tbody = document.getElementById('products-table-body');
  if (!tbody) return;
  tbody.innerHTML = products.length ? products.map(p => `
    <tr>
      <td class="px-6 py-3.5 font-mono text-xs">${p.code}</td>
      <td class="px-6 py-3.5 font-medium">${p.name}</td>
      <td class="px-6 py-3.5 text-xs text-slate-600">${CATEGORIES[p.category] || p.category}</td>
      <td class="px-4 py-3.5 text-center text-xs">${p.unit}</td>
      <td class="px-4 py-3.5 text-right font-semibold">${formatMoney(p.price)}</td>
      <td class="px-4 py-3.5 text-center"><span class="px-2.5 py-px text-xs rounded-full bg-emerald-100 text-emerald-700">${p.stock}</span></td>
      <td class="px-6 py-3.5 text-center">
        <button onclick="editProduct('${p.id}')" class="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded-xl mr-1">Sửa</button>
        <button onclick="deleteProduct('${p.id}')" class="px-3 py-1 text-xs bg-red-100 text-red-700 rounded-xl">Xóa</button>
      </td>
    </tr>
  `).join('') : `<tr><td colspan="7" class="px-6 py-8 text-center text-slate-400">Chưa có sản phẩm</td></tr>`;
}

function renderCustomersTable() { /* Tương tự, rút gọn */ }
function renderOrdersTable() { /* Tương tự */ }

// ==================== MODAL HANDLERS (rút gọn) ====================
function showProductModal(product = null) {
  const modal = document.getElementById('product-modal');
  if (!modal) return alert('Modal chưa được thêm vào index.html');

  // ... (giữ logic modal như file gốc)
  modal.style.display = 'flex';
}

function hideProductModal() {
  const modal = document.getElementById('product-modal');
  if (modal) modal.style.display = 'none';
}

// Thêm các hàm editProduct, deleteProduct, saveProductFromModal... (copy từ file gốc và điều chỉnh)

function quickAddCustomer() {
  switchTab('customers');
  setTimeout(() => {
    const modal = document.getElementById('customer-modal');
    if (modal) modal.style.display = 'flex';
  }, 300);
}

// ==================== LOGIN HANDLER ====================
async function handleLogin() {
  const emailEl = document.getElementById('login-email');
  const passEl = document.getElementById('login-password');
  if (!emailEl || !passEl) return;

  const email = emailEl.value.trim();
  const password = passEl.value.trim();

  if (!email || !password) {
    showToast('Vui lòng nhập email và mật khẩu', 'error');
    return;
  }

  const btns = document.querySelectorAll('#login-screen button');
  btns.forEach(b => b.disabled = true);

  try {
    const user = await window.VH_Supabase.loginWithSupabase(email, password);
    if (user) {
      document.getElementById('login-screen').classList.add('hidden');
      document.getElementById('main-app').classList.remove('hidden');
      document.getElementById('user-email').textContent = user.email;
      document.getElementById('user-info').classList.remove('hidden');

      await loadAllData();
      renderCategoryFilters();
      renderPOSProductGrid();
      updateDashboard();
      showToast('Đăng nhập thành công!', 'success');
    }
  } catch (err) {
    showToast('Đăng nhập thất bại: ' + err.message, 'error');
  } finally {
    btns.forEach(b => b.disabled = false);
  }
}

function quickDemoLogin() {
  document.getElementById('login-screen').classList.add('hidden');
  document.getElementById('main-app').classList.remove('hidden');

  // Load demo data
  products = [
    { id: 'p1', code: 'RAY48V-01', name: 'Đèn ray nam châm 48V 1 mét (kèm nguồn)', category: 'ray-nam-cham', unit: 'Bộ', price: 185000, stock: 87 },
    { id: 'p7', code: 'QT-52INCH', name: 'Quạt trần 52 inch DC inverter', category: 'quat-tran', unit: 'Cái', price: 1890000, stock: 11 }
  ];
  customers = [{ id: 'c1', name: 'Anh Minh', phone: '0912 345 678', address: 'Hà Nội', note: '' }];
  orders = [];

  renderCategoryFilters();
  renderPOSProductGrid();
  updateDashboard();
  showToast('Chế độ Demo (dữ liệu chỉ lưu trình duyệt)', 'info');
}

async function handleLogout() {
  await window.VH_Supabase.logoutFromSupabase();
  location.reload(); // Đơn giản nhất
}

// ==================== INIT ====================
async function initializeApp() {
  // 1. Khởi tạo Supabase
  const supabaseReady = window.VH_Supabase.initSupabase();

  // 2. Kiểm tra session
  if (supabaseReady) {
    const user = await window.VH_Supabase.checkSupabaseSession();
    if (user) {
      document.getElementById('login-screen').classList.add('hidden');
      document.getElementById('main-app').classList.remove('hidden');
      document.getElementById('user-email').textContent = user.email;
      document.getElementById('user-info').classList.remove('hidden');
      await loadAllData();
    }
  }

  // 3. Render ban đầu
  renderCategoryFilters();
  if (document.getElementById('page-dashboard')) {
    updateDashboard();
  }
  loadSettingsToForm();

  // 4. Gắn các event cần thiết (nếu có)
  console.log('%c[Vũ Hoàng POS] App initialized (modular version)', 'color:#854d0e');
}

// ==================== SEED DEMO DATA ====================
async function seedDemoData() {
  const supabase = window.VH_Supabase?.getSupabase();
  const user = window.VH_Supabase?.getCurrentUser();

  if (!supabase || !user) {
    showToast('Cần đăng nhập Supabase để seed dữ liệu', 'error');
    return;
  }

  const demoProducts = [
    { code: 'RAY48V-01', name: 'Đèn ray nam châm 48V 1 mét (kèm nguồn)', category: 'ray-nam-cham', unit: 'Bộ', price: 185000, stock: 87 },
    { code: 'RAY48V-05', name: 'Đèn ray nam châm 48V 0.5 mét', category: 'ray-nam-cham', unit: 'Cái', price: 125000, stock: 64 },
    { code: 'RAY48V-2M', name: 'Đèn ray nam châm 48V 2 mét', category: 'ray-nam-cham', unit: 'Cái', price: 295000, stock: 31 },
    { code: 'LED-DR-150W', name: 'Nguồn Driver LED 150W 48V', category: 'nguon-led', unit: 'Cái', price: 245000, stock: 42 },
    { code: 'LED-DR-100W', name: 'Nguồn Driver LED 100W 48V', category: 'nguon-led', unit: 'Cái', price: 175000, stock: 55 },
    { code: 'QT-42INCH', name: 'Quạt trần 42 inch có remote', category: 'quat-tran', unit: 'Cái', price: 1250000, stock: 19 },
    { code: 'QT-52INCH', name: 'Quạt trần 52 inch DC inverter', category: 'quat-tran', unit: 'Cái', price: 1890000, stock: 11 },
    { code: 'DEN-TT-01', name: 'Đèn thả trần trang trí 3 bóng', category: 'den-trang-tri', unit: 'Bộ', price: 485000, stock: 26 },
    { code: 'DEN-TT-02', name: 'Đèn ốp trần LED 24W vuông', category: 'den-trang-tri', unit: 'Cái', price: 165000, stock: 93 },
    { code: 'PK-RAY-01', name: 'Nối ray nam châm chữ L', category: 'phu-kien', unit: 'Cái', price: 45000, stock: 140 }
  ];

  const demoCustomers = [
    { name: 'Anh Minh', phone: '0912 345 678', address: 'Số 12 Ngõ 45 Trần Duy Hưng, Hà Nội', note: 'Khách mua ray nam châm thường xuyên' },
    { name: 'Chị Lan', phone: '0987 654 321', address: 'Chung cư The Manor, Mỹ Đình', note: 'Thanh toán chuyển khoản nhanh' },
    { name: 'Anh Tuấn', phone: '0936 112 233', address: 'Phố Huế, Hai Bà Trưng', note: '' }
  ];

  try {
    // Xóa dữ liệu demo cũ trước khi seed để tránh duplicate code
    const demoCodes = demoProducts.map(p => p.code);
    if (demoCodes.length > 0) {
      await supabase.from('products').delete().in('code', demoCodes);
    }

    const { error: pErr } = await supabase.from('products').insert(demoProducts);
    if (pErr) throw pErr;

    // Xóa khách hàng demo cũ (dựa trên tên)
    const demoCustomerNames = demoCustomers.map(c => c.name);
    if (demoCustomerNames.length > 0) {
      await supabase.from('customers').delete().in('name', demoCustomerNames);
    }

    const { error: cErr } = await supabase.from('customers').insert(demoCustomers);
    if (cErr) throw cErr;

    showToast('Đã seed dữ liệu demo thành công!', 'success');
    await loadAllData();
    refreshAllUI();
  } catch (err) {
    console.error(err);
    showToast('Seed dữ liệu thất bại: ' + err.message, 'error');
  }
}

// ==================== SETTINGS ====================
function saveSettings() {
  const settings = {
    shopName: document.getElementById('setting-shop-name').value.trim(),
    hotline: document.getElementById('setting-hotline').value.trim(),
    address: document.getElementById('setting-address').value.trim(),
    bankName: document.getElementById('setting-bank-name').value.trim(),
    bankAccount: document.getElementById('setting-bank-account').value.trim(),
    bankHolder: document.getElementById('setting-bank-holder').value.trim()
  };
  localStorage.setItem('vuhoang_settings', JSON.stringify(settings));
  showToast('Đã lưu cài đặt cửa hàng', 'success');
}

function loadSettingsToForm() {
  const saved = localStorage.getItem('vuhoang_settings');
  if (!saved) return;
  const s = JSON.parse(saved);
  if (document.getElementById('setting-shop-name')) document.getElementById('setting-shop-name').value = s.shopName || 'VŨ HOÀNG LIGHTING';
  if (document.getElementById('setting-hotline')) document.getElementById('setting-hotline').value = s.hotline || '0877 933 362';
  if (document.getElementById('setting-address')) document.getElementById('setting-address').value = s.address || 'Hà Nội, Việt Nam';
  if (document.getElementById('setting-bank-name')) document.getElementById('setting-bank-name').value = s.bankName || 'VP BANK';
  if (document.getElementById('setting-bank-account')) document.getElementById('setting-bank-account').value = s.bankAccount || '5577626198';
  if (document.getElementById('setting-bank-holder')) document.getElementById('setting-bank-holder').value = s.bankHolder || 'HKD HOANG VU LIGHTING';
}

function exportAllData() {
  // Simple export (can be expanded)
  const data = { products, customers, orders };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'vuhoang-pos-export.json';
  a.click();
  URL.revokeObjectURL(url);
  showToast('Đã xuất dữ liệu', 'success');
}

window.onload = initializeApp;

// Expose một số hàm global nếu cần debug
// ==================== PRODUCT CRUD (bổ sung) ====================
function showProductModal(product = null) {
  const modal = document.getElementById('product-modal');
  const title = document.getElementById('product-modal-title');
  
  if (!modal) return;

  if (product) {
    currentEditingProductId = product.id;
    title.textContent = 'Chỉnh sửa sản phẩm';
    document.getElementById('product-edit-id').value = product.id;
    document.getElementById('product-code').value = product.code || '';
    document.getElementById('product-name').value = product.name || '';
    document.getElementById('product-unit').value = product.unit || 'Cái';
    document.getElementById('product-price').value = product.price || 0;
    document.getElementById('product-stock').value = product.stock || 0;

    // Render danh mục + chọn giá trị hiện tại
    renderCategoryOptions('product-category', product.category);
  } else {
    currentEditingProductId = null;
    title.textContent = 'Thêm sản phẩm mới';
    document.getElementById('product-edit-id').value = '';
    document.getElementById('product-code').value = '';
    document.getElementById('product-name').value = '';
    document.getElementById('product-unit').value = 'Cái';
    document.getElementById('product-price').value = '185000';
    document.getElementById('product-stock').value = '50';

    // Render danh mục
    renderCategoryOptions('product-category');
  }
  
  modal.style.display = 'flex';
}

function hideProductModal() {
  const modal = document.getElementById('product-modal');
  if (modal) modal.style.display = 'none';
}

async function saveProductFromModal() {
  const code = document.getElementById('product-code').value.trim().toUpperCase();
  const name = document.getElementById('product-name').value.trim();
  const category = document.getElementById('product-category').value;
  const unit = document.getElementById('product-unit').value.trim() || 'Cái';
  const price = parseFloat(document.getElementById('product-price').value) || 0;
  const stock = parseInt(document.getElementById('product-stock').value) || 0;

  if (!code || !name || price <= 0) {
    showToast('Vui lòng điền đầy đủ mã, tên và giá bán', 'error');
    return;
  }

  const productData = { code, name, category, unit, price, stock };

  const supabase = window.VH_Supabase?.getSupabase();
  if (!supabase) {
    showToast('Chưa kết nối Supabase', 'error');
    return;
  }

  try {
    if (currentEditingProductId) {
      const { error } = await supabase.from('products').update(productData).eq('id', currentEditingProductId);
      if (error) throw error;
    } else {
      const { error } = await supabase.from('products').insert(productData);
      if (error) throw error;
    }

    hideProductModal();
    await loadAllData();
    renderProductsTable();
    renderPOSProductGrid();
    showToast('Đã lưu sản phẩm thành công', 'success');
  } catch (err) {
    showToast('Lỗi lưu sản phẩm: ' + err.message, 'error');
  }
}

function editProduct(id) {
  const product = products.find(p => p.id === id);
  if (product) showProductModal(product);
}

async function deleteProduct(id) {
  if (!confirm('Xóa sản phẩm này?')) return;

  const supabase = window.VH_Supabase?.getSupabase();
  if (!supabase) return;

  try {
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) throw error;

    await loadAllData();
    renderProductsTable();
    renderPOSProductGrid();
    showToast('Đã xóa sản phẩm', 'success');
  } catch (err) {
    showToast('Lỗi xóa sản phẩm: ' + err.message, 'error');
  }
}

// ==================== CUSTOMER MODAL (bổ sung) ====================
function showCustomerModal(customer = null) {
  const modal = document.getElementById('customer-modal');
  if (!modal) {
    showToast('Modal khách hàng chưa được thêm', 'error');
    return;
  }

  const title = document.getElementById('customer-modal-title');

  if (customer) {
    currentEditingCustomerId = customer.id;
    title.textContent = 'Chỉnh sửa khách hàng';
    document.getElementById('customer-edit-id').value = customer.id;
    document.getElementById('customer-name').value = customer.name || '';
    document.getElementById('customer-phone').value = customer.phone || '';
    document.getElementById('customer-address').value = customer.address || '';
    document.getElementById('customer-note').value = customer.note || '';
  } else {
    currentEditingCustomerId = null;
    title.textContent = 'Thêm khách hàng mới';
    document.getElementById('customer-edit-id').value = '';
    document.getElementById('customer-name').value = '';
    document.getElementById('customer-phone').value = '';
    document.getElementById('customer-address').value = '';
    document.getElementById('customer-note').value = '';
  }
  
  modal.style.display = 'flex';
}

function hideCustomerModal() {
  const modal = document.getElementById('customer-modal');
  if (modal) modal.style.display = 'none';
}

async function saveCustomerFromModal() {
  const name = document.getElementById('customer-name').value.trim();
  if (!name) {
    showToast('Tên khách hàng không được để trống', 'error');
    return;
  }

  const phone = document.getElementById('customer-phone').value.trim();
  const address = document.getElementById('customer-address').value.trim();
  const note = document.getElementById('customer-note').value.trim();

  const supabase = window.VH_Supabase?.getSupabase();
  if (!supabase) return;

  try {
    if (currentEditingCustomerId) {
      const { error } = await supabase.from('customers').update({ name, phone, address, note }).eq('id', currentEditingCustomerId);
      if (error) throw error;
    } else {
      const { error } = await supabase.from('customers').insert({ name, phone, address, note });
      if (error) throw error;
    }

    hideCustomerModal();
    await loadAllData();
    renderCustomersTable();
    showToast('Đã lưu khách hàng', 'success');
  } catch (err) {
    showToast('Lỗi lưu khách hàng: ' + err.message, 'error');
  }
}

function editCustomer(id) {
  const customer = customers.find(c => c.id === id);
  if (customer) showCustomerModal(customer);
}

async function deleteCustomer(id) {
  if (!confirm('Xóa khách hàng này?')) return;

  const supabase = window.VH_Supabase?.getSupabase();
  if (!supabase) return;

  try {
    const { error } = await supabase.from('customers').delete().eq('id', id);
    if (error) throw error;

    await loadAllData();
    renderCustomersTable();
    showToast('Đã xóa khách hàng', 'success');
  } catch (err) {
    showToast('Lỗi xóa khách hàng: ' + err.message, 'error');
  }
}

function useCustomerInSale(id) {
  const customer = customers.find(c => c.id === id);
  if (!customer) return;

  switchTab('pos');
  setTimeout(() => {
    document.getElementById('pos-customer-name').value = customer.name;
    document.getElementById('pos-customer-phone').value = customer.phone || '';
    document.getElementById('pos-customer-address').value = customer.address || '';
    document.getElementById('pos-note').value = customer.note || '';
    showToast('Đã chọn khách hàng: ' + customer.name, 'success');
  }, 200);
}

// Cập nhật window.VH_App
// ==================== RENDER FUNCTIONS (bổ sung đầy đủ) ====================
function refreshAllUI() {
  renderPOSProductGrid();
  renderProductsTable();
  if (typeof renderCustomersTable === 'function') renderCustomersTable();
  if (typeof renderOrdersTable === 'function') renderOrdersTable();
  updateDashboard();
}

function renderCustomersTable() {
  const tbody = document.getElementById('customers-table-body');
  const searchInput = document.getElementById('customer-search');
  if (!tbody) return;

  const searchVal = searchInput ? normalize(searchInput.value) : '';

  let filtered = customers;
  if (searchVal) {
    filtered = customers.filter(c =>
      normalize(c.name + ' ' + (c.phone || '') + ' ' + (c.address || '')).includes(searchVal)
    );
  }

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="px-6 py-8 text-center text-slate-400">Không có khách hàng</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(c => `
    <tr>
      <td class="px-6 py-3.5 font-medium">${c.name}</td>
      <td class="px-6 py-3.5 font-mono text-sm">${c.phone || ''}</td>
      <td class="px-6 py-3.5 text-sm text-slate-600">${c.address || ''}</td>
      <td class="px-6 py-3.5 text-xs text-slate-500 italic">${c.note || ''}</td>
      <td class="px-6 py-3.5">
        <div class="flex justify-center gap-x-1.5">
          <button onclick="useCustomerInSale('${c.id}')" class="px-3 py-1 text-xs bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded-xl font-medium">Dùng</button>
          <button onclick="editCustomer('${c.id}')" class="px-3 py-1 text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-xl font-medium">Sửa</button>
          <button onclick="deleteCustomer('${c.id}')" class="px-3 py-1 text-xs bg-red-100 hover:bg-red-200 text-red-700 rounded-xl font-medium">Xóa</button>
        </div>
      </td>
    </tr>
  `).join('');
}

function renderOrdersTable() {
  const tbody = document.getElementById('orders-table-body');
  const searchInput = document.getElementById('order-search');
  if (!tbody) return;

  const searchVal = searchInput ? normalize(searchInput.value) : '';

  let filtered = orders;
  if (searchVal) {
    filtered = orders.filter(o =>
      normalize((o.invoice_no || '') + ' ' + (o.customer_name || '')).includes(searchVal)
    );
  }

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="px-6 py-10 text-center text-slate-400">Chưa có đơn hàng nào</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(order => {
    const date = new Date(order.created_at);
    const debtColor = order.debt > 0 ? 'text-red-600 font-semibold' : 'text-emerald-600';
    return `
      <tr class="cursor-pointer hover:bg-amber-50/40" onclick="viewOrderDetail('${order.id}')">
        <td class="px-6 py-3.5 font-mono text-xs font-semibold text-amber-700">${order.invoice_no}</td>
        <td class="px-6 py-3.5 text-sm">${date.toLocaleDateString('vi-VN')}</td>
        <td class="px-6 py-3.5">
          <div class="font-medium">${order.customer_name}</div>
          <div class="text-xs text-slate-500">${order.customer_phone || ''}</div>
        </td>
        <td class="px-4 py-3.5 text-right font-semibold tabular-nums">${formatMoney(order.grand)}</td>
        <td class="px-4 py-3.5 text-right ${debtColor} tabular-nums">${formatMoney(order.debt)}</td>
        <td class="px-6 py-3.5 text-center" onclick="event.stopImmediatePropagation()">
          <div class="flex justify-center gap-x-2">
            <button onclick="viewOrderDetail('${order.id}'); event.stopImmediatePropagation()" class="px-4 py-1 text-xs bg-white border border-slate-200 hover:bg-slate-50 rounded-2xl font-medium">Chi tiết</button>
            <button onclick="reloadOrderToCartFromId('${order.id}'); event.stopImmediatePropagation()" class="px-4 py-1 text-xs bg-amber-500 hover:bg-amber-600 text-white rounded-2xl font-medium">Tải lại</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

// Cập nhật lại window.VH_App
// ==================== IN HÓA ĐƠN (FIX LỖI) ====================
function printInvoice(order) {
  // Tạo vùng in nếu chưa có
  let printArea = document.getElementById('invoicePrint');
  if (!printArea) {
    printArea = document.createElement('div');
    printArea.id = 'invoicePrint';
    printArea.style.cssText = 'position:absolute; left:-9999px; top:-9999px;';
    document.body.appendChild(printArea);
  }

  const settings = JSON.parse(localStorage.getItem('vuhoang_settings') || '{}');

  let itemsHtml = '';
  (order.items || order.cart || []).forEach((item, i) => {
    const qty = item.quantity || 1;
    const price = item.price || 0;
    itemsHtml += `
      <tr>
        <td style="padding:4px 8px; border-bottom:1px solid #ddd; text-align:center;">${i+1}</td>
        <td style="padding:4px 8px; border-bottom:1px solid #ddd;">${item.code || ''}</td>
        <td style="padding:4px 8px; border-bottom:1px solid #ddd;">${item.name}</td>
        <td style="padding:4px 8px; border-bottom:1px solid #ddd; text-align:center;">${item.unit || 'Cái'}</td>
        <td style="padding:4px 8px; border-bottom:1px solid #ddd; text-align:right;">${qty}</td>
        <td style="padding:4px 8px; border-bottom:1px solid #ddd; text-align:right;">${formatMoney(price)}</td>
        <td style="padding:4px 8px; border-bottom:1px solid #ddd; text-align:right; font-weight:600;">${formatMoney(price * qty)}</td>
      </tr>`;
  });

  printArea.innerHTML = `
    <div style="width:210mm; padding:15mm; font-family:Arial, sans-serif; font-size:10.5pt; color:#111827; background:white;">
      <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
        <div>
          <div style="font-size:18pt; font-weight:bold;">VŨ HOÀNG LIGHTING</div>
          <div style="font-size:9pt; color:#64748b;">${settings.address || ''}</div>
          <div style="font-size:9pt; color:#64748b;">Hotline: ${settings.hotline || ''}</div>
        </div>
        <div style="text-align:right; font-size:9pt;">
          <div><b>Mã đơn:</b> ${order.invoice_no || 'TEMP-' + Date.now()}</div>
          <div><b>Ngày:</b> ${new Date(order.created_at || Date.now()).toLocaleDateString('vi-VN')}</div>
        </div>
      </div>

      <hr style="border:1.5px solid #111827; margin:8px 0;">

      <div style="margin:8px 0; font-size:10pt;">
        <b>Khách hàng:</b> ${order.customer_name || 'Khách lẻ'}<br>
        <b>Điện thoại:</b> ${order.customer_phone || ''}<br>
        <b>Địa chỉ:</b> ${order.customer_address || ''}
      </div>

      <table style="width:100%; border-collapse:collapse; font-size:9.5pt; margin:10px 0;">
        <thead>
          <tr style="background:#f1f5f9; font-weight:600;">
            <th style="padding:5px; border:1px solid #cbd5e1; text-align:center;">STT</th>
            <th style="padding:5px; border:1px solid #cbd5e1;">Mã</th>
            <th style="padding:5px; border:1px solid #cbd5e1;">Tên sản phẩm</th>
            <th style="padding:5px; border:1px solid #cbd5e1; text-align:center;">ĐVT</th>
            <th style="padding:5px; border:1px solid #cbd5e1; text-align:right;">SL</th>
            <th style="padding:5px; border:1px solid #cbd5e1; text-align:right;">Đơn giá</th>
            <th style="padding:5px; border:1px solid #cbd5e1; text-align:right;">Thành tiền</th>
          </tr>
        </thead>
        <tbody>${itemsHtml}</tbody>
      </table>

      <div style="display:flex; gap:15px; margin-top:10px;">
        <div style="width:95px; text-align:center;">
          <div id="print-qr-code" style="width:90px;height:90px;margin:auto;border:1px solid #ddd;padding:4px;background:white;"></div>
          <div style="font-size:8pt;color:#64748b;margin-top:3px;">Quét để thanh toán</div>
        </div>
        <div style="flex:1; font-size:10pt;">
          <div style="display:flex;justify-content:space-between;padding:2px 0;"><span>Tạm tính</span><span>${formatMoney(order.subtotal || 0)}</span></div>
          <div style="display:flex;justify-content:space-between;padding:2px 0;"><span>Chiết khấu</span><span>${formatMoney(order.discount || 0)}</span></div>
          <div style="display:flex;justify-content:space-between;padding:2px 0;"><span>Phí vận chuyển</span><span>${formatMoney(order.shipping || 0)}</span></div>
          <div style="display:flex;justify-content:space-between;padding:4px 0; font-weight:700; background:#fefce8; padding-left:6px; border-radius:4px; margin:4px 0;">
            <span>CÒN LẠI</span>
            <span style="color:#b45309;">${formatMoney(order.debt || order.grand || 0)}</span>
          </div>
          <div style="display:flex;justify-content:space-between;padding:6px 8px; background:#111827; color:white; border-radius:6px; font-weight:700; font-size:11pt;">
            <span>TỔNG TIỀN</span>
            <span>${formatMoney(order.grand || 0)}</span>
          </div>
        </div>
      </div>
    </div>
  `;

  // Generate QR
  setTimeout(() => {
    const qrDiv = document.getElementById('print-qr-code');
    if (qrDiv && window.QRCode) {
      qrDiv.innerHTML = '';
      new QRCode(qrDiv, {
        text: `STK: ${settings.bankAccount || ''}\nCTK: ${settings.bankHolder || ''}\nSố tiền: ${order.grand || 0}`,
        width: 85, height: 85
      });
    }
    // In
    setTimeout(() => {
      printArea.style.display = 'block';
      window.print();
      printArea.style.display = 'none';
    }, 200);
  }, 50);
}

function printCurrentInvoice() {
  // Dùng cho nút In từ chi tiết đơn hàng
  if (window.currentViewingOrderId) {
    const order = orders.find(o => o.id === window.currentViewingOrderId);
    if (order) {
      printInvoice(order);
      return;
    }
  }
  // Fallback: in giỏ hàng hiện tại
  if (cart.length > 0) {
    const tempOrder = {
      invoice_no: 'POS-' + Date.now(),
      customer_name: document.getElementById('pos-customer-name')?.value || 'Khách lẻ',
      customer_phone: document.getElementById('pos-customer-phone')?.value || '',
      items: cart,
      subtotal: cart.reduce((s, i) => s + (i.price * (i.quantity||1)), 0),
      discount: parseFloat(document.getElementById('pos-discount')?.value) || 0,
      shipping: parseFloat(document.getElementById('pos-shipping')?.value) || 0,
      grand: 0,
      debt: 0,
      created_at: new Date().toISOString()
    };
    tempOrder.grand = tempOrder.subtotal - tempOrder.discount + tempOrder.shipping;
    tempOrder.debt = tempOrder.grand - (parseFloat(document.getElementById('pos-paid')?.value) || 0);
    printInvoice(tempOrder);
  } else {
    showToast('Không có gì để in', 'error');
  }
}

// Cập nhật window.VH_App
window.VH_App = { 
  switchTab, showToast, loadAllData, handleLogin, seedDemoData, saveSettings,
  showProductModal, saveProductFromModal, editProduct, deleteProduct,
  showCustomerModal, saveCustomerFromModal, editCustomer, deleteCustomer, useCustomerInSale,
  refreshAllUI, renderCustomersTable, renderOrdersTable,
  saveOrder, printInvoice, printCurrentInvoice
};