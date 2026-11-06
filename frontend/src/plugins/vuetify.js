import '@mdi/font/css/materialdesignicons.css';
import 'vuetify/styles';
import { createVuetify } from 'vuetify';
import { themes } from '@/styles/themes';
import { readAppearance } from '@/store/appConfiguration';

export default createVuetify({
  theme: { defaultTheme: readAppearance().theme, themes },
});
