import { ReactElement, useEffect, useState } from 'react';
import { Link as MuiLink, List, Toolbar } from '@mui/material';
import navItemsData from 'data/nav-items';
import SimpleBar from 'simplebar-react';
import NavItem from './NavItem';
import { drawerCloseWidth, drawerOpenWidth } from '..';
import Image from 'components/base/Image';
import logoWithText from '/Logo-with-text.png';
import logo from '/LOGO.png';
import { rootPaths } from 'routes/paths';
import { useNavigate } from 'react-router-dom';
import { isTokenValid, clearAuth } from 'utils/auth';

const Sidebar = ({ open }: { open: boolean }): ReactElement => {
  const navigate = useNavigate();
  const [navItems, setNavItems] = useState(navItemsData);

  useEffect(() => {
    if (isTokenValid()) {
      const updatedNavItems = navItemsData.map((item) =>
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
      setNavItems(navItemsData);
    }
  }, []);

  const handleItemClick = (itemTitle: string) => {
    if (itemTitle === 'logout') {
      clearAuth();
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
            height: 590,
            justifyContent: 'space-between',
          }}
        >
          {navItems.map((navItem) => (
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
