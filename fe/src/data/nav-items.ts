import userConfig from '../../userconfig.json';

export interface NavItem {
  id: number;
  path: string;
  title: string;
  icon: string;
  active: boolean;
}

interface UserConfig {
  admin: NavItem[];
  teacher: NavItem[];
  user: NavItem[];
}

const config = userConfig as UserConfig;

export function getNavItemsByRole(role: 'admin' | 'teacher' | 'user'): NavItem[] {
  // Kiểm tra role có nằm trong danh sách hợp lệ không
  if (!['admin', 'teacher', 'user'].includes(role)) {
    console.warn(`Invalid role: ${role}, defaulting to 'user'`);
    return config.user || [];
  }
  
  // Lấy danh sách menu theo role
  const items = config[role];
  if (!Array.isArray(items)) {
    console.warn(`No items found for role: ${role}, defaulting to empty array`);
    return [];
  }
  
  console.log(`Getting nav items for role: ${role}, found ${items.length} items`);
  return items;
}

// Export for convenience
export const adminNavItems = getNavItemsByRole('admin');
export const teacherNavItems = getNavItemsByRole('teacher');
export const userNavItems = getNavItemsByRole('user');