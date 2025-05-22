import { ReactElement, useEffect, useState } from 'react';
import { Link as MuiLink, List, Toolbar } from '@mui/material';
import { getNavItemsByRole, NavItem as NavItemType } from '../../../data/nav-items';
import SimpleBar from 'simplebar-react';
import NavItem from './NavItem';
import { drawerCloseWidth, drawerOpenWidth } from '..';
import Image from '../../../components/base/Image';
import logoWithText from '/Logo-with-text.png';
import logo from '/LOGO.png';
import { rootPaths } from '../../../routes/paths';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../components/auth/useAuth'; 

const Sidebar = ({ open }: { open: boolean }): ReactElement => {
  const navigate = useNavigate();
  const { isAuthenticated, role, logout } = useAuth(); 

  const [navItems, setNavItems] = useState<NavItemType[]>([]);

  useEffect(() => {
    let navRole = 'user';
    if (role === 'ADMIN') {
      navRole = 'admin';
    } else if (role === 'TEACHER') {
      navRole = 'teacher';
    } else if (role === 'USER'){
      navRole = 'user';
    }
    
    console.log('Sidebar - Auth status:', isAuthenticated, 'Role:', role, 'Nav role:', navRole);
    
    const rawItems = getNavItemsByRole(navRole as 'admin' | 'teacher' | 'user');
    const safeItems: NavItemType[] = Array.isArray(rawItems) ? rawItems : [];

    if (isAuthenticated) {
      const updatedNavItems = safeItems.map((item): NavItemType =>
        item.title === 'login'
          ? {
              ...item,
              title: 'logout',
              icon: 'tabler:logout',
              path: '#!',
            }
          : item
      );
      setNavItems(updatedNavItems);
    } else {
      const filteredItems = safeItems
        .filter(item => item.title !== 'logout')
        .map((item): NavItemType =>
          item.title === 'login'
            ? {
                ...item,
                title: 'login',
                icon: 'tabler:login',
                path: '/authentication/login',
              }
            : item
        );
      setNavItems(filteredItems);
    }
  }, [role, isAuthenticated]); 

  const handleItemClick = (itemTitle: string) => {
    if (itemTitle === 'logout') {
      logout();
      navigate('/authentication/login');
    }
  };

  return (
    <>
      <Toolbar
        sx={{
          position: 'fixed',
          height: 98,
          zIndex: 1,
          bgcolor: 'background.default',
          p: 0,
          justifyContent: 'center',
          width: open ? drawerOpenWidth - 1 : drawerCloseWidth - 1,
        }}
      >
        <MuiLink
          href={rootPaths.homeRoot}
          sx={{
            mt: 3,
          }}
        >
          <Image
            src={open ? logoWithText : logo}
            alt={open ? 'logo with text' : 'logo'}
            height={40}
          />
        </MuiLink>
      </Toolbar>

      <SimpleBar style={{ maxHeight: '100vh' }}>
        <List
          component="nav"
          sx={{
            mt: 24.5,
            py: 2.5,
          }}
        >
          {Array.isArray(navItems) &&
            navItems.map((navItem) => (
              <div
                key={navItem.id}
                onClick={() => handleItemClick(navItem.title)}
                style={{ cursor: 'pointer' }}
              >
                <NavItem navItem={navItem} open={open} />
              </div>
            ))}
        </List>
      </SimpleBar>
    </>
  );
};

export default Sidebar;