import {
  Stack,
  AppBar,
  Toolbar,
  TextField,
  IconButton,
  InputAdornment,
} from '@mui/material';
import IconifyIcon from '../../../components/base/IconifyIcon';
import { ReactElement, useState } from 'react';
import { drawerCloseWidth, drawerOpenWidth } from '..';
import { useBreakpoints } from '../../../providers/BreakpointsProvider';
import { useTranslation } from 'react-i18next';

interface TopbarProps {
  open: boolean;
  handleDrawerToggle: () => void;
  onSearchChange: (keyword: string) => void;
}

const Topbar = ({
  open,
  handleDrawerToggle,
  onSearchChange,
}: TopbarProps): ReactElement => {
  const { down } = useBreakpoints();
  const isMobileScreen = down('sm');
  const { t } = useTranslation();

  const [search, setSearch] = useState('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearch(value);
    onSearchChange(value);
  };

  return (
    <AppBar
      position="fixed"
      sx={{
        left: 0,
        ml: isMobileScreen ? 0 : open ? 60 : 27.5,
        width: isMobileScreen
          ? 1
          : open
          ? `calc(100% - ${drawerOpenWidth}px)`
          : `calc(100% - ${drawerCloseWidth}px)`,
        paddingRight: '0 !important',
      }}
    >
      <Toolbar
        component={Stack}
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ bgcolor: 'background.default', height: 116 }}
      >
        <Stack direction="row" gap={2} alignItems="center" ml={2.5} flex="1 1 52.5%">
          <IconButton color="inherit" onClick={handleDrawerToggle} edge="start">
            <IconifyIcon
              icon={open ? 'ri:menu-unfold-4-line' : 'ri:menu-unfold-3-line'}
              color="common.white"
            />
          </IconButton>
          <IconButton color="inherit" sx={{ display: { xs: 'flex', sm: 'none' } }}>
            <IconifyIcon icon="mdi:search" />
          </IconButton>
          <TextField
            variant="filled"
            fullWidth
            placeholder={t('searchPlaceholder')}
            value={search}
            onChange={handleInputChange}
            sx={{ display: { xs: 'none', sm: 'flex' } }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="end">
                  <IconifyIcon icon="akar-icons:search" width={13} height={13} />
                </InputAdornment>
              ),
            }}
          />
        </Stack>
      </Toolbar>
    </AppBar>
  );
};

export default Topbar;
