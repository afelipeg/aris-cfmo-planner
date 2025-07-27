import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageSquare, 
  FileText, 
  User, 
  Settings, 
  LogOut, 
  Edit3, 
  Trash2, 
  Plus,
  ChevronDown,
  ChevronRight,
  Brain,
  Calendar,
  BarChart3
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Chat, PlannerChat } from '../types';
import { SettingsModal } from './Settings/SettingsModal';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarSeparator,
} from './ui/sidebar';

type DashboardView = 'chat' | 'documents' | 'planner';

interface AppSidebarProps {
  // CFMO (Chat) data
  chats: Chat[];
  activeChat: Chat | null;
  onNewChat: () => void;
  onSelectChat: (chat: Chat) => void;
  onDeleteChat: (chatId: string) => void;
  onRenameChat: (chatId: string, newTitle: string) => void;
  
  // Planner data
  plannerChats: PlannerChat[];
  activePlannerChat: PlannerChat | null;
  onNewPlannerChat: () => void;
  onSelectPlannerChat: (chat: PlannerChat) => void;
  onDeletePlannerChat: (chatId: string) => void;
  onRenamePlannerChat: (chatId: string, newTitle: string) => void;
  
  // Navigation
  activeView: DashboardView;
  onViewChange: (view: DashboardView) => void;
}

export const AppSidebar: React.FC<AppSidebarProps> = ({
  chats,
  activeChat,
  onNewChat,
  onSelectChat,
  onDeleteChat,
  onRenameChat,
  plannerChats,
  activePlannerChat,
  onNewPlannerChat,
  onSelectPlannerChat,
  onDeletePlannerChat,
  onRenamePlannerChat,
  activeView,
  onViewChange
}) => {
  const { user, signOut } = useAuth();
  const [editingChat, setEditingChat] = useState<string | null>(null);
  const [editingPlannerChat, setEditingPlannerChat] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({
    cfmo: true,
    planner: true
  });

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const toggleMenu = (menuKey: string) => {
    setExpandedMenus(prev => ({
      ...prev,
      [menuKey]: !prev[menuKey]
    }));
  };

  const handleRename = (chatId: string, isPlanner: boolean = false) => {
    if (isPlanner) {
      const chat = plannerChats.find(c => c.id === chatId);
      setEditingPlannerChat(chatId);
      setEditTitle(chat?.title || '');
    } else {
      const chat = chats.find(c => c.id === chatId);
      setEditingChat(chatId);
      setEditTitle(chat?.title || '');
    }
  };

  const handleSaveRename = (isPlanner: boolean = false) => {
    if (isPlanner && editingPlannerChat && editTitle.trim()) {
      onRenamePlannerChat(editingPlannerChat, editTitle.trim());
      setEditingPlannerChat(null);
    } else if (editingChat && editTitle.trim()) {
      onRenameChat(editingChat, editTitle.trim());
      setEditingChat(null);
    }
    setEditTitle('');
  };

  const handleCancelRename = () => {
    setEditingChat(null);
    setEditingPlannerChat(null);
    setEditTitle('');
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

  return (
    <>
      <Sidebar variant="inset">
        <SidebarHeader>
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="w-10 h-10 rounded-xl overflow-hidden bg-white dark:bg-gray-700 flex items-center justify-center">
              <img 
                src="/ms-icon-310x310.png" 
                alt="Aris Logo" 
                className="w-8 h-8 object-contain"
              />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">Aris</h1>
              <p className="text-xs text-gray-600 dark:text-gray-400">Multi-Agent BI Platform</p>
            </div>
          </div>
        </SidebarHeader>

        <SidebarContent>
          {/* CFMO Section */}
          <SidebarGroup>
            <SidebarGroupLabel>
              <SidebarMenuButton
                onClick={() => toggleMenu('cfmo')}
                className="w-full justify-between"
              >
                <div className="flex items-center gap-2">
                  <Brain className="h-4 w-4" />
                  <span>CFMO</span>
                </div>
                {expandedMenus.cfmo ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </SidebarMenuButton>
            </SidebarGroupLabel>
            
            <AnimatePresence>
              {expandedMenus.cfmo && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <SidebarGroupContent>
                    {/* New Chat Button */}
                    <SidebarMenu>
                      <SidebarMenuItem>
                        <SidebarMenuButton
                          onClick={() => {
                            onViewChange('chat');
                            onNewChat();
                          }}
                          className="w-full bg-gray-900 hover:bg-gray-800 dark:bg-white dark:hover:bg-gray-100 text-white dark:text-gray-900"
                        >
                          <Plus className="h-4 w-4" />
                          <span>New Chat</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    </SidebarMenu>

                    {/* Chat History Submenu */}
                    <SidebarMenuSub>
                      <div className="px-2 py-1">
                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Chat History ({chats.length})
                        </span>
                      </div>
                      
                      {chats.length === 0 ? (
                        <div className="px-2 py-4 text-center">
                          <MessageSquare size={24} className="mx-auto text-gray-400 dark:text-gray-500 mb-2" />
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            No chats yet
                          </p>
                        </div>
                      ) : (
                        chats.map((chat) => (
                          <SidebarMenuSubItem key={chat.id}>
                            {editingChat === chat.id ? (
                              <div className="px-2 py-1">
                                <input
                                  type="text"
                                  value={editTitle}
                                  onChange={(e) => setEditTitle(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleSaveRename();
                                    if (e.key === 'Escape') handleCancelRename();
                                  }}
                                  onBlur={() => handleSaveRename()}
                                  className="w-full bg-white dark:bg-gray-600 text-gray-900 dark:text-white text-sm px-2 py-1 rounded border border-gray-300 dark:border-gray-500 outline-none focus:ring-1 focus:ring-gray-400 dark:focus:ring-gray-400"
                                  autoFocus
                                />
                              </div>
                            ) : (
                              <SidebarMenuSubButton
                                onClick={() => {
                                  onViewChange('chat');
                                  onSelectChat(chat);
                                }}
                                isActive={activeView === 'chat' && activeChat?.id === chat.id}
                                className="group relative"
                              >
                                <MessageSquare className="h-4 w-4" />
                                <div className="flex-1 min-w-0">
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
                                      handleRename(chat.id);
                                    }}
                                    className="p-1 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 rounded"
                                    title="Rename chat"
                                  >
                                    <Edit3 size={10} />
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
                                    <Trash2 size={10} />
                                  </button>
                                </div>
                              </SidebarMenuSubButton>
                            )}
                          </SidebarMenuSubItem>
                        ))
                      )}
                    </SidebarMenuSub>
                  </SidebarGroupContent>
                </motion.div>
              )}
            </AnimatePresence>
          </SidebarGroup>

          <SidebarSeparator />

          {/* Planner Section */}
          <SidebarGroup>
            <SidebarGroupLabel>
              <SidebarMenuButton
                onClick={() => toggleMenu('planner')}
                className="w-full justify-between"
              >
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>Planner</span>
                </div>
                {expandedMenus.planner ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </SidebarMenuButton>
            </SidebarGroupLabel>
            
            <AnimatePresence>
              {expandedMenus.planner && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <SidebarGroupContent>
                    {/* New Plan Button */}
                    <SidebarMenu>
                      <SidebarMenuItem>
                        <SidebarMenuButton
                          onClick={() => {
                            onViewChange('planner');
                            onNewPlannerChat();
                          }}
                          className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                        >
                          <Plus className="h-4 w-4" />
                          <span>Nuevo Plan</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    </SidebarMenu>

                    {/* Planner History Submenu */}
                    <SidebarMenuSub>
                      <div className="px-2 py-1">
                        <span className="text-xs font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                          Historial de Planes ({plannerChats.length})
                        </span>
                      </div>
                      
                      {plannerChats.length === 0 ? (
                        <div className="px-2 py-4 text-center">
                          <Calendar size={24} className="mx-auto text-blue-400 dark:text-blue-500 mb-2" />
                          <p className="text-xs text-blue-600 dark:text-blue-400">
                            No hay planes aún
                          </p>
                        </div>
                      ) : (
                        plannerChats.map((chat) => (
                          <SidebarMenuSubItem key={chat.id}>
                            {editingPlannerChat === chat.id ? (
                              <div className="px-2 py-1">
                                <input
                                  type="text"
                                  value={editTitle}
                                  onChange={(e) => setEditTitle(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleSaveRename(true);
                                    if (e.key === 'Escape') handleCancelRename();
                                  }}
                                  onBlur={() => handleSaveRename(true)}
                                  className="w-full bg-white dark:bg-blue-800 text-blue-900 dark:text-blue-100 text-sm px-2 py-1 rounded border border-blue-300 dark:border-blue-600 outline-none focus:ring-1 focus:ring-blue-400 dark:focus:ring-blue-400"
                                  autoFocus
                                />
                              </div>
                            ) : (
                              <SidebarMenuSubButton
                                onClick={() => {
                                  onViewChange('planner');
                                  onSelectPlannerChat(chat);
                                }}
                                isActive={activeView === 'planner' && activePlannerChat?.id === chat.id}
                                className="group relative"
                              >
                                <Calendar className="h-4 w-4" />
                                <div className="flex-1 min-w-0">
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
                                      handleRename(chat.id, true);
                                    }}
                                    className="p-1 text-blue-500 hover:text-blue-700 dark:hover:text-blue-300 rounded"
                                    title="Renombrar plan"
                                  >
                                    <Edit3 size={10} />
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (confirm('¿Estás seguro de que quieres eliminar este plan?')) {
                                        onDeletePlannerChat(chat.id);
                                      }
                                    }}
                                    className="p-1 text-blue-500 hover:text-red-500 dark:hover:text-red-400 rounded"
                                    title="Eliminar plan"
                                  >
                                    <Trash2 size={10} />
                                  </button>
                                </div>
                              </SidebarMenuSubButton>
                            )}
                          </SidebarMenuSubItem>
                        ))
                      )}
                    </SidebarMenuSub>
                  </SidebarGroupContent>
                </motion.div>
              )}
            </AnimatePresence>
          </SidebarGroup>

          <SidebarSeparator />

          {/* Documentos Section */}
          <SidebarGroup>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => onViewChange('documents')}
                  isActive={activeView === 'documents'}
                >
                  <BarChart3 className="h-4 w-4" />
                  <span>Documentos</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <div className="flex items-center gap-3 px-2 py-2">
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
                  <span>Media Planner</span>
                </div>
              </div>
            </SidebarMenuItem>
            
            <SidebarMenuItem>
              <SidebarMenuButton onClick={() => setShowSettings(true)}>
                <Settings className="h-4 w-4" />
                <span>Settings</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={handleSignOut}
                disabled={signingOut}
              >
                <LogOut className="h-4 w-4" />
                <span>
                  {signingOut ? 'Signing out...' : 'Sign Out'}
                </span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>

      {/* Settings Modal */}
      <SettingsModal 
        isOpen={showSettings} 
        onClose={() => setShowSettings(false)} 
      />
    </>
  );
};