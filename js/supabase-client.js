// ==================== SUPABASE CLIENT ====================
// Thay thế 2 giá trị bên dưới bằng thông tin từ Supabase project của bạn

const SUPABASE_URL = 'https://tvjzapgymsjijcbhnudl.supabase.co/rest/v1/';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR2anphcGd5bXNqaWpjYmhudWRsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM1ODIyMTUsImV4cCI6MjA5OTE1ODIxNX0.CYsSyAjWsIhDHVS5Bu_zOnqwzs3SzawlLDuy6IMAjl8';

let supabase = null;
let currentUser = null;

// Khởi tạo Supabase (gọi 1 lần khi app start)
function initSupabase() {
  if (typeof window.supabase === 'undefined') {
    console.error('Supabase UMD script chưa được load!');
    return false;
  }

  if (SUPABASE_URL.includes('YOUR_PROJECT_ID') || SUPABASE_ANON_KEY.includes('YOUR_ANON_KEY')) {
    console.warn('%c[Supabase] Bạn chưa cấu hình SUPABASE_URL và SUPABASE_ANON_KEY', 'color: #f59e0b');
    return false;
  }

  try {
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log('%c[Supabase] Client initialized thành công', 'color:#16a34a');
    return true;
  } catch (err) {
    console.error('Lỗi khởi tạo Supabase:', err);
    return false;
  }
}

// Đăng nhập
async function loginWithSupabase(email, password) {
  if (!supabase) {
    throw new Error('Supabase chưa được khởi tạo hoặc cấu hình sai');
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;

  currentUser = data.user;
  return currentUser;
}

// Đăng xuất
async function logoutFromSupabase() {
  if (supabase) {
    await supabase.auth.signOut();
  }
  currentUser = null;
}

// Kiểm tra session hiện tại
async function checkSupabaseSession() {
  if (!supabase) return null;

  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    currentUser = session.user;
    return currentUser;
  }
  return null;
}

// Lấy Supabase client (dùng ở các file khác)
function getSupabase() {
  return supabase;
}

function getCurrentUser() {
  return currentUser;
}

// Export cho ES module (nếu dùng type="module")
window.VH_Supabase = {
  initSupabase,
  loginWithSupabase,
  logoutFromSupabase,
  checkSupabaseSession,
  getSupabase,
  getCurrentUser
};