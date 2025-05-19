import { ReactElement, useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
} from '@mui/material';
import { SelectChangeEvent } from '@mui/material/Select';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import i18n from '../../i18n'; // Đảm bảo đường dẫn đúng với file cấu hình i18n của bạn

// Flag image URLs
const flagUrls: Record<string, string> = {
  en: 'https://flagcdn.com/w40/us.png',
  vi: 'https://flagcdn.com/w40/vn.png',
};

const SystemSettings = (): ReactElement => {
  const [colorTone, setColorTone] = useState<'dark' | 'light'>('dark');
  const [language, setLanguage] = useState<'vi' | 'en'>('vi');

  // Lấy ngôn ngữ từ localStorage khi component mount
  useEffect(() => {
    const storedLanguage = localStorage.getItem('language') as 'vi' | 'en' | null;
    if (storedLanguage) {
      setLanguage(storedLanguage);
      i18n.changeLanguage(storedLanguage); // Cập nhật ngôn ngữ cho i18next
    }
  }, []);

  const handleColorToneChange = (event: SelectChangeEvent<string>) => {
    const value = event.target.value as 'light' | 'dark';
    setColorTone(value);
    localStorage.setItem('theme', value);
  };

  const handleLanguageChange = (event: SelectChangeEvent<string>) => {
    const value = event.target.value as 'vi' | 'en';
    setLanguage(value);
    localStorage.setItem('language', value);
    i18n.changeLanguage(value); // Thay đổi ngôn ngữ trong i18n
  };

  return (
    <Paper sx={{ p: 4 }}>
      <Typography variant="h4" gutterBottom>
        {i18n.t('system_settings')} {/* Dùng i18n.t() để lấy bản dịch */}
      </Typography>

      {/* Hai lựa chọn trên cùng 1 hàng */}
      <Grid container spacing={2} mt={4}>
        {/* Chọn tone màu */}
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth size="small">
            <InputLabel id="color-tone-label">{i18n.t('color_tone')}</InputLabel>
            <Select
              labelId="color-tone-label"
              value={colorTone}
              onChange={handleColorToneChange}
              label={i18n.t('color_tone')}
              sx={{ height: 50, top: 5 }}
            >
              <MenuItem value="dark">
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <DarkModeIcon fontSize="small" sx={{ mr: 1 }} />
                  <span>{i18n.t('dark')}</span>
                </Box>
              </MenuItem>
              <MenuItem value="light">
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <LightModeIcon fontSize="small" sx={{ mr: 1 }} />
                  <span>{i18n.t('light')}</span>
                </Box>
              </MenuItem>
            </Select>
          </FormControl>
        </Grid>

        {/* Chọn ngôn ngữ */}
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth size="small">
            <InputLabel id="language-label">{i18n.t('language')}</InputLabel>
            <Select
              labelId="language-label"
              value={language}
              onChange={handleLanguageChange}
              label={i18n.t('language')}
              sx={{ height: 50, top: 5 }}
            >
              <MenuItem value="vi">
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <img
                    src={flagUrls.vi}
                    alt="Vietnam Flag"
                    width={20}
                    style={{ marginRight: 8 }}
                  />
                  <span>{i18n.t('vietnamese')}</span>
                </Box>
              </MenuItem>
              <MenuItem value="en">
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <img
                    src={flagUrls.en}
                    alt="US Flag"
                    width={20}
                    style={{ marginRight: 8 }}
                  />
                  <span>{i18n.t('english')}</span>
                </Box>
              </MenuItem>
            </Select>
          </FormControl>
        </Grid>
      </Grid>
    </Paper>
  );
};

export default SystemSettings;
