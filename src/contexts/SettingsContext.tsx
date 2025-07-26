import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';

export type Language = 'en' | 'es';
export type Theme = 'light' | 'dark' | 'system';

interface SettingsContextType {
  // Language
  language: Language;
  setLanguage: (language: Language) => void;
  
  // Theme
  theme: Theme;
  setTheme: (theme: Theme) => void;
  actualTheme: 'light' | 'dark'; // Resolved theme (system -> light/dark)
  
  // Model improvement
  improveModel: boolean;
  setImproveModel: (improve: boolean) => void;
  
  // Translations
  t: (key: string) => string;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};

// Translation dictionaries
const translations = {
  en: {
    // App
    'app.title': 'Aris',
    'app.subtitle': '+1M Elite Senior Consultants, 1 Token',
    'app.description': 'Five agentic consultants—Strategy, Growth x Multiplier Effect, Research, Brand Power, and CRM—deliver 80% of the impact with just 20% of the effort.',
    'app.getStarted': 'Get Started',
    
    // Authentication
    'auth.signIn': 'Sign In',
    'auth.createAccount': 'Create Account',
    'auth.continueWithGoogle': 'Continue with Google',
    'auth.continueWithGithub': 'Continue with GitHub',
    'auth.continueWithApple': 'Continue with Apple',
    'auth.orContinueWith': 'or continue with email',
    'auth.fullName': 'Full Name',
    'auth.yourFullName': 'Your full name',
    'auth.email': 'Email',
    'auth.yourEmail': 'your@email.com',
    'auth.password': 'Password',
    'auth.noAccount': "Don't have an account? Sign up",
    'auth.haveAccount': 'Already have an account? Sign in',
    'auth.securityNotice': 'Your data is encrypted and secure. We never share your information.',
    'auth.forgotPassword': 'Forgot your password?',
    'auth.resetPassword': 'Reset Password',
    'auth.backToSignIn': 'Back to Sign In',
    'auth.checkEmail': 'Check your email for a password reset link',
    
    // Navigation
    'nav.newChat': 'New Chat',
    'nav.chatHistory': 'Chat History',
    'nav.settings': 'Settings',
    'nav.signOut': 'Sign Out',
    
    // Chat
    'chat.howCanIHelp': 'How can I help you today?',
    'chat.selectAgents': 'Select one or multiple specialized agents and start chatting. You can also attach documents for detailed analysis.',
    'chat.selectAgentsButton': 'Select Agents',
    'chat.typeMessage': 'Type your message...',
    'chat.firstSelectAgents': 'First select one or more agents...',
    'chat.selectAtLeastOne': 'Select at least one agent to send your message',
    'chat.agentsWorking': 'Agents are working...',
    
    // File Upload
    'files.dropHere': 'Drop files here or click to browse',
    'files.supports': 'Supports: Text, CSV, JSON, PDF, Images, Documents, Spreadsheets',
    'files.maxSize': 'Max 10MB per file',
    'files.attachedFiles': 'Attached Files',
    'files.analysisNote': 'All agents will automatically analyze your attached files and reference specific data points in their responses.',
    
    // Settings
    'settings.title': 'Settings',
    'settings.general': 'General',
    'settings.profile': 'Profile',
    'settings.language': 'Language',
    'settings.theme': 'Theme',
    'settings.name': 'Name',
    'settings.email': 'Email address',
    'settings.phone': 'Phone number',
    'settings.improveModel': 'Improve the model for everyone',
    'settings.improveModelDesc': 'Allow your content to be used to train our models and improve our services. We secure your data privacy.',
    'settings.exportData': 'Export data',
    'settings.exportDataDesc': 'This data includes your account information and all chat history. Exporting may take some time. The download link will be valid for 7 days.',
    'settings.logOutAllDevices': 'Log out of all devices',
    'settings.deleteAllChats': 'Delete all chats',
    'settings.deleteAccount': 'Delete account',
    'settings.export': 'Export',
    'settings.logOut': 'Log out',
    'settings.deleteAll': 'Delete all',
    'settings.delete': 'Delete',
    
    // Theme options
    'theme.light': 'Light',
    'theme.dark': 'Dark',
    'theme.system': 'System',
    
    // Language options
    'language.english': 'English',
    'language.spanish': 'Español',
    
    // Actions
    'action.loading': 'Loading...',
    'action.processing': 'Processing...',
    'action.cancel': 'Cancel',
    'action.save': 'Save',
    'action.close': 'Close',
    
    // Notifications
    'notification.settingsSaved': 'Settings saved successfully',
    'notification.dataExported': 'Data export initiated. You will receive a download link via email.',
    'notification.chatsDeleted': 'All chats have been deleted',
    'notification.accountDeleted': 'Account deletion initiated',
    'notification.loggedOut': 'Logged out from all devices',
  },
  es: {
    // App
    'app.title': 'Aris',
    'app.subtitle': '+1M Consultores Senior Elite, 1 Token',
    'app.description': 'Cinco consultores agénticos—Estrategia, Crecimiento x Efecto Multiplicador, Investigación, Poder de Marca y CRM—entregan el 80% del impacto con solo el 20% del esfuerzo.',
    'app.getStarted': 'Comenzar',
    
    // Authentication
    'auth.signIn': 'Iniciar Sesión',
    'auth.createAccount': 'Crear Cuenta',
    'auth.continueWithGoogle': 'Continuar con Google',
    'auth.continueWithGithub': 'Continuar con GitHub',
    'auth.continueWithApple': 'Continuar con Apple',
    'auth.orContinueWith': 'o continuar con email',
    'auth.fullName': 'Nombre Completo',
    'auth.yourFullName': 'Tu nombre completo',
    'auth.email': 'Correo Electrónico',
    'auth.yourEmail': 'tu@correo.com',
    'auth.password': 'Contraseña',
    'auth.noAccount': '¿No tienes cuenta? Regístrate',
    'auth.haveAccount': '¿Ya tienes cuenta? Inicia sesión',
    'auth.securityNotice': 'Tus datos están encriptados y seguros. Nunca compartimos tu información.',
    'auth.forgotPassword': '¿Olvidaste tu contraseña?',
    'auth.resetPassword': 'Restablecer Contraseña',
    'auth.backToSignIn': 'Volver a Iniciar Sesión',
    'auth.checkEmail': 'Revisa tu correo para el enlace de restablecimiento',
    
    // Navigation
    'nav.newChat': 'Nuevo Chat',
    'nav.chatHistory': 'Historial de Chats',
    'nav.settings': 'Configuración',
    'nav.signOut': 'Cerrar Sesión',
    
    // Chat
    'chat.howCanIHelp': '¿Cómo puedo ayudarte hoy?',
    'chat.selectAgents': 'Selecciona uno o múltiples agentes especializados y comienza a chatear. También puedes adjuntar documentos para análisis detallado.',
    'chat.selectAgentsButton': 'Seleccionar Agentes',
    'chat.typeMessage': 'Escribe tu mensaje...',
    'chat.firstSelectAgents': 'Primero selecciona uno o más agentes...',
    'chat.selectAtLeastOne': 'Selecciona al menos un agente para enviar tu mensaje',
    'chat.agentsWorking': 'Los agentes están trabajando...',
    
    // File Upload
    'files.dropHere': 'Suelta archivos aquí o haz clic para explorar',
    'files.supports': 'Soporta: Texto, CSV, JSON, PDF, Imágenes, Documentos, Hojas de cálculo',
    'files.maxSize': 'Máx 10MB por archivo',
    'files.attachedFiles': 'Archivos Adjuntos',
    'files.analysisNote': 'Todos los agentes analizarán automáticamente tus archivos adjuntos y referenciarán puntos de datos específicos en sus respuestas.',
    
    // Settings
    'settings.title': 'Configuración',
    'settings.general': 'General',
    'settings.profile': 'Perfil',
    'settings.language': 'Idioma',
    'settings.theme': 'Tema',
    'settings.name': 'Nombre',
    'settings.email': 'Dirección de correo',
    'settings.phone': 'Número de teléfono',
    'settings.improveModel': 'Mejorar el modelo para todos',
    'settings.improveModelDesc': 'Permite que tu contenido sea usado para entrenar nuestros modelos y mejorar nuestros servicios. Aseguramos la privacidad de tus datos.',
    'settings.exportData': 'Exportar datos',
    'settings.exportDataDesc': 'Estos datos incluyen la información de tu cuenta y todo el historial de chats. La exportación puede tomar tiempo. El enlace de descarga será válido por 7 días.',
    'settings.logOutAllDevices': 'Cerrar sesión en todos los dispositivos',
    'settings.deleteAllChats': 'Eliminar todos los chats',
    'settings.deleteAccount': 'Eliminar cuenta',
    'settings.export': 'Exportar',
    'settings.logOut': 'Cerrar sesión',
    'settings.deleteAll': 'Eliminar todo',
    'settings.delete': 'Eliminar',
    
    // Theme options
    'theme.light': 'Claro',
    'theme.dark': 'Oscuro',
    'theme.system': 'Sistema',
    
    // Language options
    'language.english': 'English',
    'language.spanish': 'Español',
    
    // Actions
    'action.loading': 'Cargando...',
    'action.processing': 'Procesando...',
    'action.cancel': 'Cancelar',
    'action.save': 'Guardar',
    'action.close': 'Cerrar',
    
    // Notifications
    'notification.settingsSaved': 'Configuración guardada exitosamente',
    'notification.dataExported': 'Exportación de datos iniciada. Recibirás un enlace de descarga por correo.',
    'notification.chatsDeleted': 'Todos los chats han sido eliminados',
    'notification.accountDeleted': 'Eliminación de cuenta iniciada',
    'notification.loggedOut': 'Sesión cerrada en todos los dispositivos',
  }
};

interface SettingsProviderProps {
  children: ReactNode;
}

export const SettingsProvider: React.FC<SettingsProviderProps> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>('en');
  const [theme, setThemeState] = useState<Theme>('system');
  const [actualTheme, setActualTheme] = useState<'light' | 'dark'>('light');
  const [improveModel, setImproveModelState] = useState(true);

  // Load settings from localStorage on mount
  useEffect(() => {
    const savedLanguage = localStorage.getItem('aris-language') as Language;
    const savedTheme = localStorage.getItem('aris-theme') as Theme;
    const savedImproveModel = localStorage.getItem('aris-improve-model');

    if (savedLanguage && ['en', 'es'].includes(savedLanguage)) {
      setLanguageState(savedLanguage);
    }

    if (savedTheme && ['light', 'dark', 'system'].includes(savedTheme)) {
      setThemeState(savedTheme);
    }

    if (savedImproveModel !== null) {
      setImproveModelState(savedImproveModel === 'true');
    }
  }, []);

  // Handle theme changes and system theme detection
  useEffect(() => {
    const updateActualTheme = () => {
      if (theme === 'system') {
        const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        setActualTheme(systemTheme);
      } else {
        setActualTheme(theme as 'light' | 'dark');
      }
    };

    updateActualTheme();

    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      mediaQuery.addEventListener('change', updateActualTheme);
      return () => mediaQuery.removeEventListener('change', updateActualTheme);
    }
  }, [theme]);

  // Apply theme to document
  useEffect(() => {
    const root = document.documentElement;
    
    if (actualTheme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [actualTheme]);

  const setLanguage = (newLanguage: Language) => {
    setLanguageState(newLanguage);
    localStorage.setItem('aris-language', newLanguage);
  };

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem('aris-theme', newTheme);
  };

  const setImproveModel = (improve: boolean) => {
    setImproveModelState(improve);
    localStorage.setItem('aris-improve-model', improve.toString());
  };

  const t = (key: string): string => {
    return translations[language][key as keyof typeof translations[typeof language]] || key;
  };

  const value = {
    language,
    setLanguage,
    theme,
    setTheme,
    actualTheme,
    improveModel,
    setImproveModel,
    t,
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};