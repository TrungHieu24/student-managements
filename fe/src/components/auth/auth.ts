export function isTokenValid(): boolean {
  const token = localStorage.getItem('token');
  if (!token) return false;
  
  try {

    return true;
  } catch (error) {
    console.error('Error validating token:', error);
    return false;
  }
}

export function saveAuth(token: string, role: string): void {
  localStorage.setItem('token', token);
  localStorage.setItem('role', role);
  
  const event = new Event('loginSuccess');
  window.dispatchEvent(event);
  
  console.log('Auth saved:', { token: token.substring(0, 10) + '...', role });
}

export function clearAuth(): void {
  localStorage.removeItem('token');
  localStorage.removeItem('role');
  
  const event = new Event('logoutSuccess');
  window.dispatchEvent(event);
  
  console.log('Auth cleared');
}

export function getUserRole(): string {
  return localStorage.getItem('role') || '';
}