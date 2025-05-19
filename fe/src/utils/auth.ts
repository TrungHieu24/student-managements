// Thời gian hết hạn token (ví dụ: 10 phút)
const TOKEN_EXPIRE_TIME = 30 * 60 * 1000; // 30 phút (tính bằng mili giây)

/**
 * Lưu token, role và thời gian đăng nhập vào localStorage
 * @param token - chuỗi token
 * @param role - vai trò người dùng (ADMIN, USER, ...)
 */
export const saveAuth = (token: string, role: string): void => {
  const now = new Date().getTime();
  localStorage.setItem('token', token);
  localStorage.setItem('role', role);
  localStorage.setItem('token_timestamp', now.toString());
};

/**
 * Xóa toàn bộ thông tin xác thực khỏi localStorage
 */
export const clearAuth = (): void => {
  localStorage.removeItem('token');
  localStorage.removeItem('role');
  localStorage.removeItem('token_timestamp');
};

/**
 * Kiểm tra xem token còn hiệu lực hay không
 * @returns true nếu token còn hiệu lực, ngược lại là false
 */
export const isTokenValid = (): boolean => {
  const token = localStorage.getItem('token');
  const timestamp = localStorage.getItem('token_timestamp');

  // Nếu không có token hoặc thời gian thì coi như không hợp lệ
  if (!token || !timestamp) return false;

  const now = new Date().getTime();
  const loginTime = parseInt(timestamp, 10);

  // So sánh thời gian hiện tại với thời gian đã lưu
  return now - loginTime < TOKEN_EXPIRE_TIME;
};

/**
 * Lấy role của người dùng hiện tại
 */
export const getUserRole = (): string | null => {
  return localStorage.getItem('role');
};
