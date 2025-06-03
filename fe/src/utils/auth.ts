const TOKEN_IDLE_TIME = 30 * 60 * 1000; // 30 phút không hoạt động
const WARNING_TIME = 2 * 60 * 1000; // Cảnh báo trước 2 phút

let idleTimer: NodeJS.Timeout | null = null;
let warningTimer: NodeJS.Timeout | null = null;
let isListening = false;

// Các sự kiện cho thấy user đang hoạt động
const ACTIVITY_EVENTS = [
  'mousedown',
  'mousemove', 
  'keypress',
  'scroll',
  'touchstart',
  'click',
  'focus'
];

export const saveAuth = (token: string, role: string, is_first_login: boolean): void => {
  const now = new Date().getTime();
  localStorage.setItem('token', token);
  localStorage.setItem('role', role);
  localStorage.setItem('last_activity', now.toString());
  localStorage.setItem('is_first_login', is_first_login.toString()); 

  // Bắt đầu theo dõi hoạt động của user
  startActivityTracking();

  const event = new Event('loginSuccess');
  window.dispatchEvent(event);

  console.log('Auth saved:', { token: token.substring(0, 10) + '...', role, is_first_login });
};

export const clearAuth = (): void => {
  localStorage.removeItem('token');
  localStorage.removeItem('role');
  localStorage.removeItem('last_activity');
  localStorage.removeItem('is_first_login'); 

  // Dừng theo dõi hoạt động
  stopActivityTracking();

  const event = new Event('logoutSuccess');
  window.dispatchEvent(event);

  // Redirect về trang login
  redirectToLogin();

  console.log('Auth cleared');
};

// Redirect về trang login
const redirectToLogin = (): void => {
  // Kiểm tra nếu đang ở trang login thì không redirect
  if (window.location.pathname === '/authentication/login' || window.location.pathname === '/') {
    return;
  }

  // Lưu current path để có thể redirect lại sau khi login
  const currentPath = window.location.pathname + window.location.search;
  if (currentPath !== '/authentication/login') {
    localStorage.setItem('redirect_after_login', currentPath);
  }

  // Redirect về login
  window.location.href = '/authentication/login';
};

// Cập nhật thời gian hoạt động cuối cùng
const updateLastActivity = (): void => {
  const now = new Date().getTime();
  localStorage.setItem('last_activity', now.toString());
  
  // Reset idle timer
  resetIdleTimer();
  
  console.log('User activity detected, updated last activity time');
};

// Reset idle timer
const resetIdleTimer = (): void => {
  // Clear existing timers
  if (idleTimer) {
    clearTimeout(idleTimer);
  }
  if (warningTimer) {
    clearTimeout(warningTimer);
  }
  
  // Đặt timer để hiển thị warning trước khi logout
  warningTimer = setTimeout(() => {
    console.log('Showing idle warning...');
    
    // Dispatch event để show warning modal
    const warningEvent = new CustomEvent('idleWarning', {
      detail: { timeLeft: WARNING_TIME }
    });
    window.dispatchEvent(warningEvent);
  }, TOKEN_IDLE_TIME - WARNING_TIME);
  
  // Đặt timer để auto logout sau khi idle
  idleTimer = setTimeout(() => {
    console.log('User idle timeout, logging out...');
    
    // Dispatch event trước khi logout
    const event = new Event('idleTimeout');
    window.dispatchEvent(event);
    
    // Clear auth và redirect
    clearAuth();
  }, TOKEN_IDLE_TIME);
};

// Bắt đầu theo dõi hoạt động của user
const startActivityTracking = (): void => {
  if (isListening) return;
  
  ACTIVITY_EVENTS.forEach(event => {
    document.addEventListener(event, updateLastActivity, true);
  });
  
  isListening = true;
  resetIdleTimer(); 
  
  console.log('Started activity tracking');
};

// Dừng theo dõi hoạt động
const stopActivityTracking = (): void => {
  if (!isListening) return;
  
  ACTIVITY_EVENTS.forEach(event => {
    document.removeEventListener(event, updateLastActivity, true);
  });
  
  if (idleTimer) {
    clearTimeout(idleTimer);
    idleTimer = null;
  }
  
  if (warningTimer) {
    clearTimeout(warningTimer);
    warningTimer = null;
  }
  
  isListening = false;
  
  console.log('Stopped activity tracking');
};

export const isTokenValid = (): boolean => {
  const token = localStorage.getItem('token');
  const lastActivity = localStorage.getItem('last_activity');

  if (!token || !lastActivity) {
    console.log('Token or last activity missing. Token is invalid.');
    return false;
  }

  const now = new Date().getTime();
  const lastActivityTime = parseInt(lastActivity, 10);

  // Kiểm tra xem đã idle quá lâu chưa
  const timeSinceLastActivity = now - lastActivityTime;
  const isValidByActivity = timeSinceLastActivity < TOKEN_IDLE_TIME;

  if (!isValidByActivity) {
    console.log(`Token expired due to inactivity. Idle time: ${Math.floor(timeSinceLastActivity / 1000 / 60)} minutes`);
    clearAuth();
    return false;
  } else {
    console.log(`Token is valid. Time since last activity: ${Math.floor(timeSinceLastActivity / 1000 / 60)} minutes`);
    
    // Nếu token vẫn valid và chưa start tracking thì start lại
    if (!isListening) {
      startActivityTracking();
    }
    
    return true;
  }
};

export const getUserRole = (): string => {
  return localStorage.getItem('role') || '';
};

export const getIsFirstLogin = (): boolean => {
  const isFirstLogin = localStorage.getItem('is_first_login');
  return isFirstLogin === 'true'; 
};

// Khởi tạo activity tracking nếu user đã đăng nhập
export const initializeAuth = (): void => {
  if (isTokenValid()) {
    startActivityTracking();
    console.log('Auth initialized with activity tracking');
  }
};

// Utility function để lấy thời gian còn lại trước khi idle timeout
export const getTimeUntilIdleTimeout = (): number => {
  const lastActivity = localStorage.getItem('last_activity');
  if (!lastActivity) return 0;
  
  const now = new Date().getTime();
  const lastActivityTime = parseInt(lastActivity, 10);
  const timeSinceLastActivity = now - lastActivityTime;
  
  return Math.max(0, TOKEN_IDLE_TIME - timeSinceLastActivity);
};

// Utility function để extend session (manual refresh)
export const extendSession = (): void => {
  if (isTokenValid()) {
    updateLastActivity();
    console.log('Session extended manually');
  }
};

// Function để get redirect path sau khi login
export const getRedirectAfterLogin = (): string => {
  return localStorage.getItem('redirect_after_login') || '/dashboard';
};

// Function để clear redirect path sau khi đã redirect
export const clearRedirectAfterLogin = (): void => {
  localStorage.removeItem('redirect_after_login');
};

// Force logout function (có thể gọi từ UI)
export const forceLogout = (): void => {
  console.log('Force logout triggered');
  clearAuth();
};