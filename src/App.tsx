import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SettingsProvider, useSettings } from './contexts/SettingsContext';
import { AuthModal } from './components/Auth/AuthModal';
import { Dashboard } from './components/Dashboard';

const AppContent: React.FC = () => {
  const { user, loading } = useAuth();
  const { t } = useSettings();
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Handle OAuth callback and session recovery
  useEffect(() => {
    const handleAuthCallback = async () => {
      const hash = window.location.hash;
      const search = window.location.search;
      
      console.log('🔍 Checking for OAuth callback:', { hash: !!hash, search: !!search });
      
      // Check if this is an OAuth callback
      if (hash.includes('access_token') || search.includes('code=') || hash.includes('error=')) {
        console.log('🔄 OAuth callback detected, processing...');
        
        // Let Supabase handle the callback
        // The AuthContext will automatically detect the session change
        
        // Clean up the URL after a short delay to allow processing
        setTimeout(() => {
          console.log('🧹 Cleaning up OAuth callback URL');
          window.history.replaceState({}, document.title, window.location.pathname);
        }, 1000);
      }
    };

    handleAuthCallback();
  }, []);

  // Show loading state during authentication
  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl overflow-hidden bg-white dark:bg-gray-700 flex items-center justify-center mx-auto mb-4 shadow-lg">
            <img 
              src="/ms-icon-310x310.png" 
              alt="Aris Logo" 
              className="w-12 h-12 object-contain"
            />
          </div>
          <div className="animate-spin w-8 h-8 border-2 border-gray-300 border-t-gray-600 dark:border-gray-600 dark:border-t-gray-300 rounded-full mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">{t('action.loading')}</p>
        </div>
      </div>
    );
  }

  // Show dashboard if user is authenticated
  if (user) {
    console.log('✅ User authenticated, showing dashboard');
    return <Dashboard />;
  }

  // Show landing page if not authenticated
  console.log('🔐 No user, showing landing page');
  return (
    <>
      <div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center">
        <div className="max-w-md w-full mx-4 text-center">
          <div className="w-20 h-20 rounded-2xl overflow-hidden bg-white dark:bg-gray-700 flex items-center justify-center mx-auto mb-8 shadow-lg">
            <img 
              src="/ms-icon-310x310.png" 
              alt="Aris Logo" 
              className="w-16 h-16 object-contain"
            />
          </div>
          
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            Aris
          </h1>
          
          <p className="text-lg text-gray-700 dark:text-gray-300 mb-4">
            {t('app.subtitle')}
          </p>
          
          <p className="text-gray-600 dark:text-gray-400 mb-8 text-base leading-relaxed">
            {t('app.description')}
          </p>
          
          <button
            onClick={() => setShowAuthModal(true)}
            className="w-full py-3 bg-gray-900 hover:bg-gray-800 dark:bg-white dark:hover:bg-gray-100 text-white dark:text-gray-900 font-medium rounded-lg transition-colors"
          >
            {t('app.getStarted')}
          </button>
        </div>
      </div>
      
      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </>
  );
};

function App() {
  return (
    <AuthProvider>
      <SettingsProvider>
        <AppContent />
      </SettingsProvider>
    </AuthProvider>
  );
}

export default App;
