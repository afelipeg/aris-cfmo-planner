import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, FileText, User, Settings, LogOut, Edit3, Trash2, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { PlannerChat } from '../../types/planner';
import { SettingsModal } from '../Settings/SettingsModal';

interface PlannerSidebarProps {
  chats: PlannerChat[];
  activeChat: PlannerChat | null;
  onNewChat: () => void;
  onSelectChat: (chat: PlannerChat) => void;
  onDeleteChat: (chatId: string) => void;
  onRenameChat: (chatId: string, newTitle: string) => void;
  isOpen: boolean;
  onToggle: () => void;
}

export const PlannerSidebar: React.FC<PlannerSidebarProps> = ({
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

  const handleRename = (chat: PlannerChat) => {
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

  console.log('🔍 PlannerSidebar render - chats:', chats.length, 'activeChat:', activeChat?.id);

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
        className="fixed lg:relative inset-y-0 left-0 z-50 lg:z-auto bg-gradient-to-b from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border-r border-blue-200 dark:border-blue-800 flex flex-col h-full overflow-hidden"
        style={{ width: isOpen ? '320px' : '0px' }}
      >
        <div className="w-80 flex flex-col h-full">
          {/* Header with Logo */}
          <div className="p-4 border-b border-blue-200 dark:border-blue-800 flex-shrink-0">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl overflow-hidden bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                  <span className="text-white text-lg">📋</span>
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900 dark:text-white">Planner</h1>
                  <p className="text-xs text-blue-600 dark:text-blue-400">OpenAI gpt-4o-mini</p>
                </div>
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
              className="w-full flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg transition-colors shadow-lg"
            >
              <Plus size={18} />
              Nuevo Plan
            </button>
          </div>

          {/* Chat History */}
          <div className="flex-1 overflow-y-auto py-4">
            <div className="px-4 mb-3">
              <h3 className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                Historial de Planes ({chats.length})
              </h3>
            </div>
            
            <div className="space-y-1 px-2">
              {chats.length === 0 ? (
                <div className="px-3 py-8 text-center">
                  <FileText size={32} className="mx-auto text-blue-400 dark:text-blue-500 mb-3" />
                  <p className="text-sm text-blue-600 dark:text-blue-400">
                    No hay planes aún
                  </p>
                  <p className="text-xs text-blue-500 dark:text-blue-500 mt-1">
                    Crea tu primer plan estratégico
                  </p>
                </div>
              ) : (
                chats.map((chat) => {
                  console.log('📝 Rendering planner chat:', chat.id, chat.title);
                  return (
                    <div
                      key={chat.id}
                      className={`group relative flex items-center gap-3 px-3 py-3 rounded-lg cursor-pointer transition-colors ${
                        activeChat?.id === chat.id
                          ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-900 dark:text-blue-100'
                          : 'text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-900 dark:hover:text-blue-100'
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
                            className="flex-1 bg-white dark:bg-blue-800 text-blue-900 dark:text-blue-100 text-sm px-2 py-1 rounded border border-blue-300 dark:border-blue-600 outline-none focus:ring-1 focus:ring-blue-400 dark:focus:ring-blue-400"
                            autoFocus
                          />
                        </div>
                      ) : (
                        <>
                          <FileText size={16} className="flex-shrink-0" />
                          <div
                            className="flex-1 min-w-0"
                            onClick={() => {
                              console.log('🖱️ Planner chat clicked:', chat.id);
                              onSelectChat(chat);
                            }}
                          >
                            <p className="text-sm font-medium truncate">
                              {chat.title}
                            </p>
                            <p className="text-xs text-blue-500 dark:text-blue-400">
                              {formatChatDate(chat.updated_at)}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRename(chat);
                              }}
                              className="p-1 text-blue-500 hover:text-blue-700 dark:hover:text-blue-300 rounded"
                              title="Renombrar plan"
                            >
                              <Edit3 size={12} />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirm('¿Estás seguro de que quieres eliminar este plan?')) {
                                  onDeleteChat(chat.id);
                                }
                              }}
                              className="p-1 text-blue-500 hover:text-red-500 dark:hover:text-red-400 rounded"
                              title="Eliminar plan"
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
          <div className="border-t border-blue-200 dark:border-blue-800 p-4 flex-shrink-0">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center">
                <User size={16} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {user?.user_metadata?.full_name || user?.email}
                </p>
                <p className="text-xs text-blue-600 dark:text-blue-400 truncate">
                  {user?.email}
                </p>
                <p className="text-xs text-blue-500 dark:text-blue-500">gpt-4o-mini</p>
              </div>
            </div>
            
            <div className="space-y-1">
              <button 
                onClick={() => setShowSettings(true)}
                className="w-full flex items-center gap-3 px-3 py-2 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/30 hover:text-blue-900 dark:hover:text-blue-100 rounded-lg transition-colors text-sm"
              >
                <Settings size={16} />
                Configuración
              </button>
              <button
                onClick={handleSignOut}
                disabled={signingOut}
                className="w-full flex items-center gap-3 px-3 py-2 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/30 hover:text-red-600 dark:hover:text-red-400 rounded-lg transition-colors text-sm"
              >
                <LogOut size={16} />
                {signingOut ? (
                  <>
                    <div className="animate-spin w-4 h-4 border-2 border-red-300 border-t-red-600 rounded-full" />
                    Cerrando sesión...
                  </>
                ) : (
                  'Cerrar Sesión'
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