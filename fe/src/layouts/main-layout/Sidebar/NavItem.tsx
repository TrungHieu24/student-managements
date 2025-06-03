import { ReactElement, useState } from 'react';
import {
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Collapse,
  List,
} from '@mui/material';
import IconifyIcon from '../../../components/base/IconifyIcon';
import { NavItem as NavItemProps } from '../../../data/nav-items';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const NavItem = ({ navItem, open }: { navItem: NavItemProps; open: boolean }): ReactElement => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const initialOpenDropdown = navItem.children?.some(child => pathname === child.path) || false;
  const [openDropdown, setOpenDropdown] = useState(initialOpenDropdown);

  const hasChildren = navItem.children && navItem.children.length > 0;

  const handleMainItemClick = () => {
    if (hasChildren) {
      setOpenDropdown((prev) => !prev);
    } else if (navItem.path && navItem.path !== '#!') {
      navigate(navItem.path);
    }
  };

  const handleChildItemClick = (path: string) => {
    navigate(path);
  };

  const mainItemIsActive = !hasChildren && pathname === navItem.path;
  const anyChildIsActive = hasChildren && navItem.children?.some(child => pathname === child.path);

  const activeClassForMainItem = pathname === navItem.path && !hasChildren;

  return (
    <>
      <ListItem
        disablePadding
        sx={(theme) => ({
          display: 'block',
          px: 5,
          borderRight: !open
            ? (mainItemIsActive || anyChildIsActive)
              ? `3px solid ${theme.palette.primary.main}`
              : `3px solid transparent`
            : '',
        })}
      >
        <ListItemButton
          onClick={handleMainItemClick}
          sx={(theme) => ({
            opacity: navItem.active ? 1 : 0.5,
            bgcolor: (pathname === navItem.path && !hasChildren)
                     ? (open ? theme.palette.primary.main : '')
                     : 'background.default',
            '&:hover': {
              bgcolor: (pathname === navItem.path && !hasChildren)
                ? (open ? theme.palette.primary.dark : theme.palette.background.paper)
                : theme.palette.background.paper,
            },
            '& .MuiTouchRipple-root': {
              color: (pathname === navItem.path && !hasChildren) ? theme.palette.primary.main : theme.palette.text.disabled,
            },
          })}
        >
          <ListItemIcon
            sx={(theme) => ({
              width: 20,
              height: 20,
              mr: open ? 'auto' : 0,
              color: (pathname === navItem.path && !hasChildren)
                ? (open ? theme.palette.background.default : theme.palette.primary.main)
                : theme.palette.text.primary,
            })}
          >
            <IconifyIcon icon={navItem.icon} width={1} height={1} />
          </ListItemIcon>
          <ListItemText
            primary={t(navItem.title)}
            sx={(theme) => ({
              display: open ? 'inline-block' : 'none',
              opacity: open ? 1 : 0,
              color: (pathname === navItem.path && !hasChildren) ? theme.palette.background.default : '',
            })}
          />
          {hasChildren && open && (
            <IconifyIcon
              icon={openDropdown ? 'mdi:chevron-up' : 'mdi:chevron-down'}
              width={20}
              height={20}
              sx={(theme) => ({
                ml: 'auto',
                color: (pathname === navItem.path && !hasChildren) ? theme.palette.background.default : theme.palette.text.secondary,
              })}
            />
          )}
        </ListItemButton>
      </ListItem>

      {hasChildren && (
        <Collapse in={openDropdown} timeout="auto" unmountOnExit>
          <List component="div" disablePadding>
            {navItem.children?.map((childItem) => (
              <ListItem
                key={childItem.id}
                disablePadding
                sx={(theme) => ({
                  display: 'block',
                  px: 5,
                  borderRight: !open
                    ? pathname === childItem.path
                      ? `3px solid ${theme.palette.primary.main}`
                      : `3px solid transparent`
                    : '',
                })}
              >
                <ListItemButton
                  onClick={() => handleChildItemClick(childItem.path)}
                  sx={(theme) => ({
                    opacity: childItem.active ? 1 : 0.5,
                    bgcolor: pathname === childItem.path
                      ? (open ? theme.palette.primary.main : theme.palette.action.selected)
                      : 'background.default',
                    pl: open ? 7 : 2.5,
                    '&:hover': {
                      bgcolor:
                        pathname === childItem.path
                          ? open
                            ? theme.palette.primary.dark
                            : theme.palette.action.hover
                          : theme.palette.action.hover,
                    },
                    '& .MuiTouchRipple-root': {
                      color: pathname === childItem.path ? theme.palette.primary.main : theme.palette.text.disabled,
                    },
                  })}
                >
                  <ListItemIcon
                    sx={(theme) => ({
                      width: 18,
                      height: 18,
                      mr: open ? 'auto' : 0,
                      color: pathname === childItem.path
                        ? open
                          ? theme.palette.background.default
                          : theme.palette.primary.main
                        : theme.palette.text.primary,
                    })}
                  >
                    <IconifyIcon icon={childItem.icon} width={1} height={1} />
                  </ListItemIcon>
                  <ListItemText
                    primary={t(childItem.title)}
                    sx={(theme) => ({
                      display: open ? 'inline-block' : 'none',
                      opacity: open ? 1 : 0,
                      color: pathname === childItem.path ? theme.palette.background.default : '',
                    })}
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Collapse>
      )}
    </>
  );
};

export default NavItem;