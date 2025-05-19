import { useTranslation } from 'react-i18next';
import { Button, Stack } from '@mui/material';

const LanguageSwitcher = () => {
  const { i18n } = useTranslation();

  const handleLanguageChange = (language: string) => {
    i18n.changeLanguage(language);
    localStorage.setItem('language', language); // Lưu ngôn ngữ vào localStorage
  };

  return (
    <Stack direction="row" spacing={2}>
      <Button onClick={() => handleLanguageChange('vi')}>Tiếng Việt</Button>
      <Button onClick={() => handleLanguageChange('en')}>English</Button>
    </Stack>
  );
};

export default LanguageSwitcher;
