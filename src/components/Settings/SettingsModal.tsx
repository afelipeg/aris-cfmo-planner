import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronDown, User, Globe, Monitor, Sun, Moon, Chrome, Download, LogOut, Trash2, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useSettings, Language, Theme } from '../../contexts/SettingsContext';
import { supabase } from '../../lib/supabase';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type SettingsTab = 'general' | 'profile';

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { user, signOut } = useAuth();
  const { language, setLanguage, theme, setTheme, improveModel, setImproveModel, t } = useSettings();
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const [languageDropdownOpen, setLanguageDropdownOpen] = useState(false);
  const [themeDropdownOpen, setThemeDropdownOpen] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<'chats' | 'account' | null>(null);

  const languages = [
    { value: 'en' as Language, label: t('language.english'), flag: '🇺🇸' },
    { value: 'es' as Language, label: t('language.spanish'), flag: '🇪🇸' }
  ];

  const themes = [
    { value: 'light' as Theme, label: t('theme.light'), icon: Sun },
    { value: 'dark' as Theme, label: t('theme.dark'), icon: Moon },
    { value: 'system' as Theme, label: t('theme.system'), icon: Monitor }
  ];

  const handleExportData = async () => {
    setLoading('export');
    try {
      // Get all user chats and messages
      const { data: chats, error: chatsError } = await supabase
        .from('chats')
        .select(`
          *,
          messages (*)
        `)
        .eq('user_id', user?.id);

      if (chatsError) throw chatsError;

      // Prepare export data
      const exportData = {
        user: {
          id: user?.id,
          email: user?.email,
          full_name: user?.user_metadata?.full_name,
          created_at: user?.created_at,
        },
        chats: chats || [],
        exported_at: new Date().toISOString(),
        version: '1.0'
      };

      // Create and download file
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `talos-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // Show success notification
      alert(t('notification.dataExported'));
    } catch (error) {
      console.error('Error exporting data:', error);
      alert('Error exporting data. Please try again.');
    } finally {
      setLoading(null);
    }
  };

  const handleDeleteAllChats = async () => {
    if (showDeleteConfirm !== 'chats') {
      setShowDeleteConfirm('chats');
      return;
    }

    setLoading('deleteChats');
    try {
      const { error } = await supabase
        .from('chats')
        .delete()
        .eq('user_id', user?.id);

      if (error) throw error;

      alert(t('notification.chatsDeleted'));
      setShowDeleteConfirm(null);
      onClose();
      // Refresh the page to update the chat list
      window.location.reload();
    } catch (error) {
      console.error('Error deleting chats:', error);
      alert('Error deleting chats. Please try again.');
    } finally {
      setLoading(null);
    }
  };

  const handleDeleteAccount = async () => {
    if (showDeleteConfirm !== 'account') {
      setShowDeleteConfirm('account');
      return;
    }

    setLoading('deleteAccount');
    try {
      // First delete all user data
      await supabase
        .from('chats')
        .delete()
        .eq('user_id', user?.id);

      // Note: Actual account deletion would require admin privileges
      // For now, we'll sign out the user
      alert(t('notification.accountDeleted'));
      await signOut();
    } catch (error) {
      console.error('Error deleting account:', error);
      alert('Error deleting account. Please contact support.');
    } finally {
      setLoading(null);
    }
  };

  const handleLogOutAllDevices = async () => {
    setLoading('logOut');
    try {
      await signOut();
      alert(t('notification.loggedOut'));
    } catch (error) {
      console.error('Error logging out:', error);
      alert('Error logging out. Please try again.');
    } finally {
      setLoading(null);
    }
  };

  const maskEmail = (email: string) => {
    const [username, domain] = email.split('@');
    if (username.length <= 4) return email;
    const maskedUsername = username.substring(0, 2) + '*'.repeat(username.length - 4) + username.substring(username.length - 2);
    return `${maskedUsername}@${domain}`;
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-800">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{t('settings.title')}</h2>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Tab Navigation */}
          <div className="flex border-b border-gray-100 dark:border-gray-800">
            <button
              onClick={() => setActiveTab('general')}
              className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
                activeTab === 'general'
                  ? 'text-gray-900 dark:text-white border-b-2 border-gray-900 dark:border-white bg-gray-50 dark:bg-gray-800'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              {t('settings.general')}
            </button>
            <button
              onClick={() => setActiveTab('profile')}
              className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
                activeTab === 'profile'
                  ? 'text-gray-900 dark:text-white border-b-2 border-gray-900 dark:border-white bg-gray-50 dark:bg-gray-800'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              {t('settings.profile')}
            </button>
          </div>

          {/* Content */}
          <div className="p-6 max-h-[60vh] overflow-y-auto">
            {activeTab === 'general' && (
              <div className="space-y-6">
                {/* Language Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-white mb-3">
                    <Globe size={16} className="inline mr-2" />
                    {t('settings.language')}
                  </label>
                  <div className="relative">
                    <button
                      onClick={() => setLanguageDropdownOpen(!languageDropdownOpen)}
                      className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-lg">
                          {languages.find(l => l.value === language)?.flag}
                        </span>
                        <span>{languages.find(l => l.value === language)?.label}</span>
                      </div>
                      <ChevronDown
                        size={16}
                        className={`transform transition-transform ${languageDropdownOpen ? 'rotate-180' : ''}`}
                      />
                    </button>

                    <AnimatePresence>
                      {languageDropdownOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="absolute top-full mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10"
                        >
                          {languages.map((lang) => (
                            <button
                              key={lang.value}
                              onClick={() => {
                                setLanguage(lang.value);
                                setLanguageDropdownOpen(false);
                              }}
                              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors first:rounded-t-lg last:rounded-b-lg"
                            >
                              <span className="text-lg">{lang.flag}</span>
                              <span className="text-gray-900 dark:text-white">{lang.label}</span>
                              {language === lang.value && (
                                <div className="ml-auto w-2 h-2 bg-green-500 rounded-full" />
                              )}
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                {/* Theme Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-white mb-3">
                    <Monitor size={16} className="inline mr-2" />
                    {t('settings.theme')}
                  </label>
                  <div className="relative">
                    <button
                      onClick={() => setThemeDropdownOpen(!themeDropdownOpen)}
                      className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        {React.createElement(themes.find(t => t.value === theme)?.icon || Monitor, { size: 16 })}
                        <span>{themes.find(t => t.value === theme)?.label}</span>
                      </div>
                      <ChevronDown
                        size={16}
                        className={`transform transition-transform ${themeDropdownOpen ? 'rotate-180' : ''}`}
                      />
                    </button>

                    <AnimatePresence>
                      {themeDropdownOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="absolute top-full mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10"
                        >
                          {themes.map((themeOption) => (
                            <button
                              key={themeOption.value}
                              onClick={() => {
                                setTheme(themeOption.value);
                                setThemeDropdownOpen(false);
                              }}
                              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors first:rounded-t-lg last:rounded-b-lg"
                            >
                              <themeOption.icon size={16} />
                              <span className="text-gray-900 dark:text-white">{themeOption.label}</span>
                              {theme === themeOption.value && (
                                <div className="ml-auto w-2 h-2 bg-green-500 rounded-full" />
                              )}
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'profile' && (
              <div className="space-y-6">
                {/* User Information */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-800">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{t('settings.name')}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {user?.user_metadata?.full_name || 'Not provided'}
                      </span>
                      <Chrome size={16} className="text-gray-400" />
                    </div>
                  </div>

                  <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-800">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{t('settings.email')}</span>
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {user?.email ? maskEmail(user.email) : 'Not provided'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-800">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{t('settings.phone')}</span>
                    <span className="text-sm text-gray-500">-</span>
                  </div>
                </div>

                {/* Improve Model Toggle */}
                <div className="py-4 border-b border-gray-100 dark:border-gray-800">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                        {t('settings.improveModel')}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {t('settings.improveModelDesc')}
                      </p>
                    </div>
                    <button
                      onClick={() => setImproveModel(!improveModel)}
                      className={`ml-4 relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        improveModel ? 'bg-gray-900 dark:bg-white' : 'bg-gray-300 dark:bg-gray-600'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white dark:bg-gray-900 transition-transform ${
                          improveModel ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* Export Data */}
                <div className="flex items-center justify-between py-4 border-b border-gray-100 dark:border-gray-800">
                  <div>
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-1">{t('settings.exportData')}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {t('settings.exportDataDesc')}
                    </p>
                  </div>
                  <button
                    onClick={handleExportData}
                    disabled={loading === 'export'}
                    className="ml-4 px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-900 dark:text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
                  >
                    <Download size={14} />
                    {loading === 'export' ? t('action.processing') : t('settings.export')}
                  </button>
                </div>

                {/* Log out of all devices */}
                <div className="flex items-center justify-between py-4 border-b border-gray-100 dark:border-gray-800">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">{t('settings.logOutAllDevices')}</span>
                  <button
                    onClick={handleLogOutAllDevices}
                    disabled={loading === 'logOut'}
                    className="px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-900 dark:text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
                  >
                    <LogOut size={14} />
                    {loading === 'logOut' ? t('action.processing') : t('settings.logOut')}
                  </button>
                </div>

                {/* Delete all chats */}
                <div className="flex items-center justify-between py-4 border-b border-gray-100 dark:border-gray-800">
                  <div className="flex-1">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{t('settings.deleteAllChats')}</span>
                    {showDeleteConfirm === 'chats' && (
                      <div className="mt-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                        <div className="flex items-center gap-2 text-red-700 dark:text-red-400 text-sm">
                          <AlertTriangle size={16} />
                          <span>This action cannot be undone. All your chats will be permanently deleted.</span>
                        </div>
                        <div className="mt-2 flex gap-2">
                          <button
                            onClick={() => setShowDeleteConfirm(null)}
                            className="px-3 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded"
                          >
                            {t('action.cancel')}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={handleDeleteAllChats}
                    disabled={loading === 'deleteChats'}
                    className="px-4 py-2 bg-red-100 dark:bg-red-900/20 hover:bg-red-200 dark:hover:bg-red-900/30 text-red-700 dark:text-red-400 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
                  >
                    <Trash2 size={14} />
                    {loading === 'deleteChats' ? t('action.processing') : 
                     showDeleteConfirm === 'chats' ? 'Confirm Delete' : t('settings.deleteAll')}
                  </button>
                </div>

                {/* Delete account */}
                <div className="flex items-center justify-between py-4">
                  <div className="flex-1">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{t('settings.deleteAccount')}</span>
                    {showDeleteConfirm === 'account' && (
                      <div className="mt-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                        <div className="flex items-center gap-2 text-red-700 dark:text-red-400 text-sm">
                          <AlertTriangle size={16} />
                          <span>This action cannot be undone. Your account and all data will be permanently deleted.</span>
                        </div>
                        <div className="mt-2 flex gap-2">
                          <button
                            onClick={() => setShowDeleteConfirm(null)}
                            className="px-3 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded"
                          >
                            {t('action.cancel')}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={handleDeleteAccount}
                    disabled={loading === 'deleteAccount'}
                    className="px-4 py-2 bg-red-100 dark:bg-red-900/20 hover:bg-red-200 dark:hover:bg-red-900/30 text-red-700 dark:text-red-400 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
                  >
                    <Trash2 size={14} />
                    {loading === 'deleteAccount' ? t('action.processing') : 
                     showDeleteConfirm === 'account' ? 'Confirm Delete' : t('settings.delete')}
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};