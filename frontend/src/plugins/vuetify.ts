import '@mdi/font/css/materialdesignicons.css';
import 'vuetify/styles';
import { watch } from 'vue';
import { createVuetify } from 'vuetify';
import { en, es, pt } from 'vuetify/locale';
import { themes } from '@/styles/themes';
import { readAppearance } from '@/store/appConfiguration';
import { useLanguage } from '@/composables/useLanguage';

const { language } = useLanguage();
const vuetify = createVuetify({
  theme: { defaultTheme: readAppearance().theme, themes },
  locale: { locale: 'en', fallback: 'en', messages: { en, es, pt } },
});

watch(language, value => {
  vuetify.locale.current.value = value === 'pt-BR' ? 'pt' : value;
  if (typeof document !== 'undefined') document.documentElement.lang = value;
}, { immediate: true });

export default vuetify;
