import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mail, Lock, User, Chrome, Github, AlertCircle, CheckCircle, Loader } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useSettings } from '../../contexts/SettingsContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { t } = useSettings();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const { signIn, signUp, signInWithGoogle, signInWithGithub } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      if (isLogin) {
        await signIn(email, password);
        setSuccess('Successfully signed in!');
        setTimeout(() => onClose(), 1500);
      } else {
        await signUp(email, password, fullName);
        setSuccess('Account created successfully! Please check your email for verification.');
        setTimeout(() => {
          setIsLogin(true);
          setSuccess('');
        }, 3000);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication error');
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthSignIn = async (provider: 'google' | 'github') => {
    setOauthLoading(provider);
    setError('');
    setSuccess('');
    
    try {
      setSuccess(`Redirecting to ${provider.charAt(0).toUpperCase() + provider.slice(1)}...`);
      
      switch (provider) {
        case 'google':
          await signInWithGoogle();
          break;
        case 'github':
          await signInWithGithub();
          break;
      }
    } catch (err) {
      console.error(`${provider} OAuth error:`, err);
      setError(err instanceof Error ? err.message : `${provider} authentication error`);
      setOauthLoading(null);
    }
    // Note: Don't set loading to false here as the user will be redirected
  };

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setFullName('');
    setError('');
    setSuccess('');
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    resetForm();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-md border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg overflow-hidden bg-white dark:bg-gray-700 flex items-center justify-center">
                    <img 
                      src="/ms-icon-310x310.png" 
                      alt="Aris Logo" 
                      className="w-6 h-6 object-contain"
                    />
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    {isLogin ? t('auth.signIn') : t('auth.createAccount')}
                  </h2>
                </div>
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-6">
                {/* Status Messages */}
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm flex items-center gap-2"
                  >
                    <AlertCircle size={16} />
                    {error}
                  </motion.div>
                )}

                {success && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-4 p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-600 dark:text-green-400 text-sm flex items-center gap-2"
                  >
                    <CheckCircle size={16} />
                    {success}
                  </motion.div>
                )}

                {/* Enhanced OAuth Buttons with Unified Dark Hover Effect */}
                <div className="space-y-3 mb-6">
                  {/* Google OAuth Button */}
                  <motion.button
                    onClick={() => handleOAuthSignIn('google')}
                    disabled={loading || oauthLoading !== null}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="group w-full py-3.5 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-600 hover:border-gray-800 dark:hover:border-gray-400 text-gray-700 dark:text-gray-300 hover:text-white dark:hover:text-white font-medium rounded-xl transition-all duration-300 disabled:cursor-not-allowed flex items-center justify-center gap-3 shadow-sm hover:shadow-md disabled:opacity-50 disabled:hover:scale-100 relative overflow-hidden hover:bg-gray-900 dark:hover:bg-gray-700"
                  >
                    {/* Content */}
                    <div className="relative flex items-center gap-3">
                      {oauthLoading === 'google' ? (
                        <Loader size={20} className="animate-spin text-blue-500 group-hover:text-white" />
                      ) : (
                        <Chrome size={20} className="text-blue-500 group-hover:text-white group-hover:scale-110 transition-all duration-300" />
                      )}
                      <span className="font-medium">
                        {t('auth.continueWithGoogle')}
                      </span>
                    </div>
                  </motion.button>

                  {/* GitHub OAuth Button */}
                  <motion.button
                    onClick={() => handleOAuthSignIn('github')}
                    disabled={loading || oauthLoading !== null}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="group w-full py-3.5 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-600 hover:border-gray-800 dark:hover:border-gray-400 text-gray-700 dark:text-gray-300 hover:text-white dark:hover:text-white font-medium rounded-xl transition-all duration-300 disabled:cursor-not-allowed flex items-center justify-center gap-3 shadow-sm hover:shadow-md disabled:opacity-50 disabled:hover:scale-100 relative overflow-hidden hover:bg-gray-900 dark:hover:bg-gray-700"
                  >
                    {/* Content */}
                    <div className="relative flex items-center gap-3">
                      {oauthLoading === 'github' ? (
                        <Loader size={20} className="animate-spin text-gray-600 group-hover:text-white" />
                      ) : (
                        <Github size={20} className="text-gray-600 group-hover:text-white group-hover:scale-110 transition-all duration-300" />
                      )}
                      <span className="font-medium">
                        {t('auth.continueWithGithub')}
                      </span>
                    </div>
                  </motion.button>
                </div>

                {/* Divider */}
                <div className="relative mb-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200 dark:border-gray-700" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400">
                      {t('auth.orContinueWith')}
                    </span>
                  </div>
                </div>

                {/* Email/Password Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                  {!isLogin && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        {t('auth.fullName')}
                      </label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                        <input
                          type="text"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:border-gray-400 dark:focus:border-gray-500 focus:ring-1 focus:ring-gray-400 dark:focus:ring-gray-500 transition-colors"
                          placeholder={t('auth.yourFullName')}
                          required={!isLogin}
                          disabled={loading || oauthLoading !== null}
                        />
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {t('auth.email')}
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:border-gray-400 dark:focus:border-gray-500 focus:ring-1 focus:ring-gray-400 dark:focus:ring-gray-500 transition-colors"
                        placeholder={t('auth.yourEmail')}
                        required
                        disabled={loading || oauthLoading !== null}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {t('auth.password')}
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:border-gray-400 dark:focus:border-gray-500 focus:ring-1 focus:ring-gray-400 dark:focus:ring-gray-500 transition-colors"
                        placeholder="••••••••"
                        required
                        minLength={6}
                        disabled={loading || oauthLoading !== null}
                      />
                    </div>
                  </div>

                  <motion.button
                    type="submit"
                    disabled={loading || oauthLoading !== null}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full py-3 bg-gray-900 hover:bg-gray-800 disabled:bg-gray-400 dark:bg-white dark:hover:bg-gray-100 dark:disabled:bg-gray-600 text-white dark:text-gray-900 font-medium rounded-lg transition-all duration-300 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm hover:shadow-md"
                  >
                    {loading && <Loader size={16} className="animate-spin" />}
                    {loading ? t('action.processing') : (isLogin ? t('auth.signIn') : t('auth.createAccount'))}
                  </motion.button>
                </form>

                {/* Toggle Mode */}
                <div className="mt-6 text-center">
                  <button
                    onClick={toggleMode}
                    disabled={loading || oauthLoading !== null}
                    className="text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 text-sm transition-colors disabled:opacity-50 hover:underline"
                  >
                    {isLogin ? t('auth.noAccount') : t('auth.haveAccount')}
                  </button>
                </div>

                {/* Security Notice */}
                <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <p className="text-xs text-blue-700 dark:text-blue-400 text-center">
                    🔒 {t('auth.securityNotice')}
                  </p>
                </div>

                {/* OAuth Debug Info (Development Only) */}
                {process.env.NODE_ENV === 'development' && (
                  <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
                    <p className="text-xs text-gray-600 dark:text-gray-400 text-center">
                      🔧 Development Mode: OAuth redirects configured for localhost
                    </p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};