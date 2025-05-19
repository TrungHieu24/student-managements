export interface NavItem {
 id: number;
 path: string; 
 title: string;
 icon: string;
 active: boolean; 
}

const navItems: NavItem[] = [
  {
   id: 1,
   path: '/',
   title: 'Trang Cá Nhân', 
   icon: 'mingcute:home-1-fill', 
   active: true, 
  },
  {
   id: 2,
   path: '/homeroom', 
   title: 'Lớp Chủ Nhiệm',
   icon: 'mdi:account-tie', 
   active: true,
  },
  {
   id: 3,
   path: '/teaching', 
   title: 'Phân công giảng dạy',
   icon: 'mdi:clipboard-text-outline', 
   active: true,
  },
  {
   id: 4,
   path: '/authentication/login',
   title: 'login',
   icon: 'tabler:login',
   active: true,
  },
];

export default navItems;
