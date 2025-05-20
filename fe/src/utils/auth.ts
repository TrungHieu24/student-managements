const TOKEN_EXPIRE_TIME = 30 * 60 * 1000;

export const saveAuth = (token: string, role: string, is_first_login: boolean): void => {
  const now = new Date().getTime();
  localStorage.setItem('token', token);
  localStorage.setItem('role', role);
  localStorage.setItem('token_timestamp', now.toString());
  localStorage.setItem('is_first_login', is_first_login.toString()); 

  const event = new Event('loginSuccess');
  window.dispatchEvent(event);

  console.log('Auth saved:', { token: token.substring(0, 10) + '...', role, is_first_login });
};

export const clearAuth = (): void => {
  localStorage.removeItem('token');
  localStorage.removeItem('role');
  localStorage.removeItem('token_timestamp');
  localStorage.removeItem('is_first_login'); 

  const event = new Event('logoutSuccess');
  window.dispatchEvent(event);

  console.log('Auth cleared');
};

export const isTokenValid = (): boolean => {
  const token = localStorage.getItem('token');
  const timestamp = localStorage.getItem('token_timestamp');

  if (!token || !timestamp) {
    console.log('Token or timestamp missing. Token is invalid.');
    return false;
  }

  const now = new Date().getTime();
  const loginTime = parseInt(timestamp, 10);

  const isValidByTime = (now - loginTime) < TOKEN_EXPIRE_TIME;

  if (!isValidByTime) {
    console.log('Token expired based on timestamp.');
  } else {
    console.log('Token is valid.');
  }

  try {
    return isValidByTime;
  } catch (error) {
    console.error('Error validating token (e.g., malformed token or decoding error):', error);
    return false;
  }
};

export const getUserRole = (): string => {
  return localStorage.getItem('role') || '';
};

export const getIsFirstLogin = (): boolean => {
  const isFirstLogin = localStorage.getItem('is_first_login');
  return isFirstLogin === 'true'; 
};