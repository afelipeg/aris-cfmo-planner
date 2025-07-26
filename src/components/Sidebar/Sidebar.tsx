import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, MessageSquare, User, Settings, LogOut, Edit3, Trash2, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Chat } from '../../types';
import { SettingsModal } from '../Settings/SettingsModal';

interface SidebarProps {
  chats: Chat[];
  activeChat: Chat | null;
  onNewChat: () => void;
  onSelectChat: (chat: Chat) => void;
  onDeleteChat: (chatId: string) => void;
  onRenameChat: (chatId: string, newTitle: string) => void;
  isOpen: boolean;
  onToggle: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  chats,
  activeChat,
  onNewChat,
  onSelectChat,
  onDeleteChat,
  onRenameChat,
  isOpen,
  onToggle
}) => {
  const { user, signOut } = useAuth();
  const [editingChat, setEditingChat] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const handleRename = (chat: Chat) => {
    setEditingChat(chat.id);
    setEditTitle(chat.title);
  };

  const handleSaveRename = () => {
    if (editingChat && editTitle.trim()) {
      onRenameChat(editingChat, editTitle.trim());
    }
    setEditingChat(null);
    setEditTitle('');
  };

  const handleCancelRename = () => {
    setEditingChat(null);
    setEditTitle('');
  };

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
    } catch (error) {
      console.error('Sign out error:', error);
    } finally {
      // Don't reset signingOut state as the component will unmount
    }
  };

  const formatChatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 168) { // 7 days
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  console.log('🔍 Sidebar render - chats:', chats.length, 'activeChat:', activeChat?.id);

  return (
    <>
      {/* Mobile Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden"
            onClick={onToggle}
          />
        )}
      </AnimatePresence>

      {/* Sidebar Container */}
      <motion.div
        initial={false}
        animate={{
          x: isOpen ? 0 : -320,
          width: isOpen ? 320 : 0
        }}
        transition={{
          type: "spring",
          stiffness: 300,
          damping: 30,
          duration: 0.3
        }}
        className="fixed lg:relative inset-y-0 left-0 z-50 lg:z-auto bg-gray-50 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col h-full overflow-hidden"
        style={{ width: isOpen ? '320px' : '0px' }}
      >
        <div className="w-80 flex flex-col h-full">
          {/* Header with Logo */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl overflow-hidden bg-white dark:bg-gray-700 flex items-center justify-center">
                  <img 
                    src="/ms-icon-310x310.png" 
                    alt="Aris Logo" 
                    className="w-8 h-8 object-contain"
                  />
                </div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">Aris</h1>
              </div>
              <button
                onClick={onToggle}
                className="lg:hidden p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <button
              onClick={onNewChat}
              className="w-full flex items-center gap-3 px-4 py-3 bg-gray-900 hover:bg-gray-800 dark:bg-white dark:hover:bg-gray-100 text-white dark:text-gray-900 rounded-lg transition-colors"
            >
              <Plus size={18} />
              New Chat
            </button>
          </div>

          {/* Chat History */}
          <div className="flex-1 overflow-y-auto py-4">
            <div className="px-4 mb-3">
              <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Chat History ({chats.length})
              </h3>
            </div>
            
            <div className="space-y-1 px-2">
              {chats.length === 0 ? (
                <div className="px-3 py-8 text-center">
                  <MessageSquare size={32} className="mx-auto text-gray-400 dark:text-gray-500 mb-3" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    No chats yet
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    Start a new conversation
                  </p>
                </div>
              ) : (
                chats.map((chat) => {
                  console.log('📝 Rendering chat:', chat.id, chat.title);
                  return (
                    <div
                      key={chat.id}
                      className={`group relative flex items-center gap-3 px-3 py-3 rounded-lg cursor-pointer transition-colors ${
                        activeChat?.id === chat.id
                          ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
                      }`}
                    >
                      {editingChat === chat.id ? (
                        <div className="flex-1 flex items-center gap-2">
                          <input
                            type="text"
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveRename();
                              if (e.key === 'Escape') handleCancelRename();
                            }}
                            onBlur={handleSaveRename}
                            className="flex-1 bg-white dark:bg-gray-600 text-gray-900 dark:text-white text-sm px-2 py-1 rounded border border-gray-300 dark:border-gray-500 outline-none focus:ring-1 focus:ring-gray-400 dark:focus:ring-gray-400"
                            autoFocus
                          />
                        </div>
                      ) : (
                        <>
                          <MessageSquare size={16} className="flex-shrink-0" />
                          <div
                            className="flex-1 min-w-0"
                            onClick={() => {
                              console.log('🖱️ Chat clicked:', chat.id);
                              onSelectChat(chat);
                            }}
                          >
                            <p className="text-sm font-medium truncate">
                              {chat.title}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {formatChatDate(chat.updated_at)}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRename(chat);
                              }}
                              className="p-1 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 rounded"
                              title="Rename chat"
                            >
                              <Edit3 size={12} />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirm('Are you sure you want to delete this chat?')) {
                                  onDeleteChat(chat.id);
                                }
                              }}
                              className="p-1 text-gray-500 hover:text-red-500 dark:hover:text-red-400 rounded"
                              title="Delete chat"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* User Profile */}
          <div className="border-t border-gray-200 dark:border-gray-700 p-4 flex-shrink-0">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 bg-gray-900 dark:bg-white rounded-full flex items-center justify-center">
                <User size={16} className="text-white dark:text-gray-900" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {user?.user_metadata?.full_name || user?.email}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                  {user?.email}
                </p>
              </div>
            </div>
            
            <div className="space-y-1">
              <button 
                onClick={() => setShowSettings(true)}
                className="w-full flex items-center gap-3 px-3 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white rounded-lg transition-colors text-sm"
              >
                <Settings size={16} />
                Settings
              </button>
              <button
                onClick={handleSignOut}
                disabled={signingOut}
                className="w-full flex items-center gap-3 px-3 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-red-600 dark:hover:text-red-400 rounded-lg transition-colors text-sm"
              >
                <LogOut size={16} />
                {signingOut ? (
                  <>
                    <div className="animate-spin w-4 h-4 border-2 border-red-300 border-t-red-600 rounded-full" />
                    Signing out...
                  </>
                ) : (
                  'Sign Out'
                )}
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Settings Modal */}
      <SettingsModal 
        isOpen={showSettings} 
        onClose={() => setShowSettings(false)} 
      />
    </>
  );
};