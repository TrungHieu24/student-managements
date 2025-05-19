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
    title: 'dashboard',
    icon: 'mingcute:home-1-fill',
    active: true,
  },
  {
    id: 2,
    path: '/listclass',
    title: 'listClass',
    icon: 'mdi:book-open-variant',
    active: true,
  },
  {
    id: 3,
    path: '/class',
    title: 'class',
    icon: 'mdi:google-classroom',
    active: true,
  },
  {
    id: 4,
    path: '/teacher',
    title: 'teacher',
    icon: 'material-symbols:person-outline',
    active: true,
  },
  {
    id: 5,
    path: '/subject',
    title: 'subject',
    icon: 'mdi:book-education-outline',
    active: true,
  },

  {
    id: 6,
    path: '/profile',
    title: 'profile',
    icon: 'clarity:user-line',
    active: true,
  },
  {
    id: 7,
    path: '/setting',
    title: 'settings',
    icon: 'mingcute:settings-3-line',
    active: true,
  },
  {
    id: 8,
    path: '/authentication/login',
    title: 'login',
    icon: 'tabler:login',
    active: true,
  },
];

export default navItems;
