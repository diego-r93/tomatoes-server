import { readonly, ref } from 'vue';

export const languageOptions = [
  { title: 'English', value: 'en' },
  { title: 'Português (Brasil)', value: 'pt-BR' },
  { title: 'Español', value: 'es' },
];

const messages = {
  "en": {
    "home": "Home",
    "dashboards": "Dashboards",
    "device": "Devices",
    "database": "Database",
    "alerting": "Alerting",
    "mdd": "Boards MDD",
    "comingSoon": "Coming soon",
    "users": "Users",
    "configuration": "Configuration",
    "help": "Help",
    "helpResources": "Help resources",
    "documentation": "Documentation",
    "firmware": "ESP32 & firmware",
    "hydroponics": "Hydroponics guide",
    "newTab": "opens in a new tab",
    "logout": "Logout",
    "welcome": "Make yourself at home.",
    "intro": "Personalize your workspace. Changes apply instantly.",
    "appearance": "Appearance",
    "palette": "Choose a palette for the entire application.",
    "chooseTheme": "Choose a theme",
    "dark": "Charcoal & indigo",
    "light": "Clean & familiar",
    "studioLight": "Soft slate & blue",
    "midnight": "Deep navy & teal",
    "followSystem": "Follow system appearance",
    "followSystemHelp": "Automatically switch between Classic Light and Classic Dark.",
    "display": "Display",
    "density": "Interface density",
    "densityHelp": "Adjust spacing in lists and tables.",
    "comfortable": "Comfortable",
    "compact": "Compact",
    "sidebarLabels": "Show sidebar labels",
    "sidebarHelp": "Expand navigation labels on desktop.",
    "reduceMotion": "Reduce motion",
    "motionHelp": "Keep decorative animations still. Your system preference is also respected.",
    "language": "Language",
    "languageHelp": "Choose the language for Configuration and the sidebar.",
    "applied": "applied",
    "storageUnavailable": "Browser storage is unavailable; changes last for this session.",
    "saved": "Saved in this browser",
    "reset": "Reset appearance",
    "resetTitle": "Reset appearance?",
    "resetHelp": "Restore Classic Dark and default display preferences? Your boards, schedules and saved dashboards will not be changed.",
    "cancel": "Cancel"
  },
  "pt-BR": {
    "home": "Início",
    "dashboards": "Painéis",
    "device": "Dispositivos",
    "database": "Banco de dados",
    "alerting": "Alertas",
    "mdd": "Placas MDD",
    "comingSoon": "Em breve",
    "users": "Usuários",
    "configuration": "Configuração",
    "help": "Ajuda",
    "helpResources": "Recursos de ajuda",
    "documentation": "Documentação",
    "firmware": "ESP32 e firmware",
    "hydroponics": "Guia de hidroponia",
    "newTab": "abre em uma nova aba",
    "logout": "Sair",
    "welcome": "Sinta-se em casa.",
    "intro": "Personalize seu espaço de trabalho. As alterações são aplicadas na hora.",
    "appearance": "Aparência",
    "palette": "Escolha uma paleta para toda a aplicação.",
    "chooseTheme": "Escolher um tema",
    "dark": "Carvão e índigo",
    "light": "Limpo e familiar",
    "studioLight": "Cinza suave e azul",
    "midnight": "Azul-marinho e verde-petróleo",
    "followSystem": "Seguir aparência do sistema",
    "followSystemHelp": "Alterna automaticamente entre Classic Light e Classic Dark.",
    "display": "Exibição",
    "density": "Densidade da interface",
    "densityHelp": "Ajuste o espaçamento de listas e tabelas.",
    "comfortable": "Confortável",
    "compact": "Compacta",
    "sidebarLabels": "Mostrar rótulos do menu lateral",
    "sidebarHelp": "Expanda os rótulos de navegação no computador.",
    "reduceMotion": "Reduzir movimento",
    "motionHelp": "Desative as animações decorativas. A preferência do sistema também é respeitada.",
    "language": "Idioma",
    "languageHelp": "Escolha o idioma da tela de configuração e do menu lateral.",
    "applied": "aplicado",
    "storageUnavailable": "O armazenamento do navegador está indisponível. As alterações valem para esta sessão.",
    "saved": "Salvo neste navegador",
    "reset": "Redefinir aparência",
    "resetTitle": "Redefinir aparência?",
    "resetHelp": "Restaurar Classic Dark e as preferências de exibição padrão? Suas placas, agendas e painéis salvos serão preservados.",
    "cancel": "Cancelar"
  },
  "es": {
    "home": "Inicio",
    "dashboards": "Paneles",
    "device": "Dispositivos",
    "database": "Base de datos",
    "alerting": "Alertas",
    "mdd": "Placas MDD",
    "comingSoon": "Próximamente",
    "users": "Usuarios",
    "configuration": "Configuración",
    "help": "Ayuda",
    "helpResources": "Recursos de ayuda",
    "documentation": "Documentación",
    "firmware": "ESP32 y firmware",
    "hydroponics": "Guía de hidroponía",
    "newTab": "se abre en una pestaña nueva",
    "logout": "Cerrar sesión",
    "welcome": "Siéntete como en casa.",
    "intro": "Personaliza tu espacio de trabajo. Los cambios se aplican al instante.",
    "appearance": "Apariencia",
    "palette": "Elige una paleta para toda la aplicación.",
    "chooseTheme": "Elegir un tema",
    "dark": "Carbón e índigo",
    "light": "Limpio y familiar",
    "studioLight": "Gris suave y azul",
    "midnight": "Azul marino y verde azulado",
    "followSystem": "Seguir la apariencia del sistema",
    "followSystemHelp": "Alterna automáticamente entre Classic Light y Classic Dark.",
    "display": "Visualización",
    "density": "Densidad de la interfaz",
    "densityHelp": "Ajusta el espaciado de listas y tablas.",
    "comfortable": "Cómoda",
    "compact": "Compacta",
    "sidebarLabels": "Mostrar etiquetas del menú lateral",
    "sidebarHelp": "Expande las etiquetas de navegación en el escritorio.",
    "reduceMotion": "Reducir movimiento",
    "motionHelp": "Desactiva las animaciones decorativas. También se respeta la preferencia del sistema.",
    "language": "Idioma",
    "languageHelp": "Elige el idioma de la pantalla de configuración y del menú lateral.",
    "applied": "aplicado",
    "storageUnavailable": "El almacenamiento del navegador no está disponible. Los cambios duran esta sesión.",
    "saved": "Guardado en este navegador",
    "reset": "Restablecer apariencia",
    "resetTitle": "¿Restablecer apariencia?",
    "resetHelp": "¿Restaurar Classic Dark y las preferencias de visualización predeterminadas? Se conservarán tus placas, horarios y paneles guardados.",
    "cancel": "Cancelar"
  }
};
const storageKey = 'TomatoesLanguage';
const isSupported = value => languageOptions.some(option => option.value === value);

function readLanguage() {
  try {
    const saved = localStorage.getItem(storageKey);
    if (isSupported(saved)) return saved;
  } catch { /* Use English when browser storage is unavailable. */ }
  return 'en';
}

const language = ref(readLanguage());
const languageStorageUnavailable = ref(false);
function setLanguage(value) {
  if (!isSupported(value)) return;
  language.value = value;
  try {
    localStorage.setItem(storageKey, value);
    languageStorageUnavailable.value = false;
  } catch { languageStorageUnavailable.value = true; }
}

function t(key) {
  return messages[language.value][key] ?? messages.en[key];
}

export function useLanguage() {
  return { language: readonly(language), languageStorageUnavailable: readonly(languageStorageUnavailable), setLanguage, t };
}
