import React, { useState, useEffect } from 'react';
import { Menu, TestTube, AlertTriangle, Brain } from 'lucide-react';
import { PlannerSidebar } from './PlannerSidebar';
import { PlannerArea } from './PlannerArea';
import { PlannerInput } from './PlannerInput';
import { useAuth } from '../../contexts/AuthContext';
import { PlannerChat, PlannerMessage } from '../../types/planner';
import { deepseekService } from '../../lib/deepseekService';
import { supabase } from '../../lib/supabase';

export const PlannerDashboard: React.FC = () => {
  const { user } = useAuth();
  const [chats, setChats] = useState<PlannerChat[]>([]);
  const [activeChat, setActiveChat] = useState<PlannerChat | null>(null);
  const [messages, setMessages] = useState<PlannerMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [apiStatus, setApiStatus] = useState<{ success: boolean; message: string } | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [testingApi, setTestingApi] = useState(false);
  const [abortController, setAbortController] = useState<AbortController | null>(null);

  // Load chats on mount and when user changes
  useEffect(() => {
    if (user) {
      console.log('👤 User logged in, loading planner chats for:', user.id);
      loadChats();
      checkApiConnection();
    }
  }, [user]);

  // Load messages when active chat changes
  useEffect(() => {
    if (activeChat) {
      console.log('💬 Loading planner messages for chat:', activeChat.id);
      loadMessages(activeChat.id);
    } else {
      setMessages([]);
    }
  }, [activeChat]);

  const checkApiConnection = async () => {
    try {
      console.log('🔍 Checking DeepSeek API connection for Media Planner...');
      const status = await deepseekService.testConnection();
      setApiStatus(status);
      console.log('🔌 DeepSeek Media Planner API Status:', status);
      
      if (!status.success) {
        console.error('❌ DeepSeek API failed with message:', status.message);
      }
    } catch (error) {
      console.error('❌ Error checking DeepSeek API connection:', error);
      setApiStatus({ 
        success: false, 
        message: `Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
      });
    }
  };

  const testDeepSeekAPI = async () => {
    setTestingApi(true);
    
    try {
      console.log('🧪 Starting DeepSeek Media Planner API test...');
      const result = await deepseekService.testConnection();
      setApiStatus(result);
      
      if (result.success) {
        console.log('✅ DeepSeek test successful');
      } else {
        console.error('❌ DeepSeek test failed:', result.message);
      }
    } catch (error) {
      console.error('❌ API test failed:', error);
      setApiStatus({
        success: false,
        message: error instanceof Error ? error.message : 'Test failed'
      });
    } finally {
      setTestingApi(false);
    }
  };

  const loadChats = async () => {
    if (!user) {
      console.log('❌ No user, cannot load planner chats');
      return;
    }

    try {
      console.log('📂 Loading planner chats for user:', user.id);
      const { data, error } = await supabase
        .from('planner_chats')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('❌ Error loading planner chats:', error);
        throw error;
      }
      
      console.log('✅ Planner chats loaded successfully:', data?.length || 0);
      setChats(data || []);
      
    } catch (error) {
      console.error('❌ Failed to load planner chats:', error);
      setChats([]);
    }
  };

  const loadMessages = async (chatId: string) => {
    try {
      console.log('📨 Loading planner messages for chat:', chatId);
      const { data, error } = await supabase
        .from('planner_messages')
        .select('*')
        .eq('chat_id', chatId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('❌ Error loading planner messages:', error);
        throw error;
      }
      
      console.log('✅ Planner messages loaded:', data?.length || 0);
      setMessages(data || []);
    } catch (error) {
      console.error('❌ Failed to load planner messages:', error);
      setMessages([]);
    }
  };

  const createNewChat = async () => {
    if (!user) {
      console.log('❌ No user, cannot create planner chat');
      return null;
    }

    try {
      console.log('🆕 Creating new planner chat for user:', user.id);
      const { data, error } = await supabase
        .from('planner_chats')
        .insert([
          {
            title: 'Nuevo Plan de Medios',
            user_id: user.id,
          }
        ])
        .select()
        .single();

      if (error) {
        console.error('❌ Error creating planner chat:', error);
        throw error;
      }

      const newChat = data;
      console.log('✅ New planner chat created:', newChat.id);
      
      setChats(prev => [newChat, ...prev]);
      setActiveChat(newChat);
      setMessages([]);
      
      return newChat;
    } catch (error) {
      console.error('❌ Failed to create planner chat:', error);
      return null;
    }
  };

  const deleteChat = async (chatId: string) => {
    try {
      console.log('🗑️ Deleting planner chat:', chatId);
      const { error } = await supabase
        .from('planner_chats')
        .delete()
        .eq('id', chatId);

      if (error) {
        console.error('❌ Error deleting planner chat:', error);
        throw error;
      }

      setChats(prev => prev.filter(chat => chat.id !== chatId));
      
      if (activeChat?.id === chatId) {
        setActiveChat(null);
        setMessages([]);
      }
      
      console.log('✅ Planner chat deleted successfully');
    } catch (error) {
      console.error('❌ Failed to delete planner chat:', error);
    }
  };

  const renameChat = async (chatId: string, newTitle: string) => {
    try {
      console.log('✏️ Renaming planner chat:', chatId, 'to:', newTitle);
      const { error } = await supabase
        .from('planner_chats')
        .update({ title: newTitle, updated_at: new Date().toISOString() })
        .eq('id', chatId);

      if (error) {
        console.error('❌ Error renaming planner chat:', error);
        throw error;
      }

      setChats(prev => prev.map(chat => 
        chat.id === chatId 
          ? { ...chat, title: newTitle, updated_at: new Date().toISOString() }
          : chat
      ));
      
      if (activeChat?.id === chatId) {
        setActiveChat(prev => prev ? { ...prev, title: newTitle } : null);
      }
      
      console.log('✅ Planner chat renamed successfully');
    } catch (error) {
      console.error('❌ Failed to rename planner chat:', error);
    }
  };

  const handleSendMessage = async (content: string, files: File[]) => {
    console.log('🚀 Sending planner message to DeepSeek:', {
      content: content.substring(0, 50) + '...',
      fileCount: files.length,
    });

    // Create AbortController for cancellation
    const controller = new AbortController();
    setAbortController(controller);
    setLoading(true);

    try {
      // Create chat if none exists
      let currentChat = activeChat;
      if (!currentChat) {
        console.log('📝 No active chat, creating new planner chat...');
        currentChat = await createNewChat();
        if (!currentChat) {
          throw new Error('Failed to create new planner chat');
        }
      }

      // Get conversation history for context
      const conversationHistory = messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      // Save user message to database
      const userMessageData = {
        chat_id: currentChat.id,
        content,
        role: 'user' as const,
        attachments: files.map((file, index) => ({
          id: `attachment-${Date.now()}-${index}`,
          name: file.name,
          type: file.type,
          size: file.size,
          url: URL.createObjectURL(file)
        }))
      };

      const { data: savedUserMessage, error: userMessageError } = await supabase
        .from('planner_messages')
        .insert([userMessageData])
        .select()
        .single();

      if (userMessageError) {
        console.error('❌ Error saving user message:', userMessageError);
        throw userMessageError;
      }

      console.log('✅ User message saved:', savedUserMessage.id);

      // Add user message to UI immediately
      setMessages(prev => [...prev, savedUserMessage]);

      // Send message to DeepSeek
      console.log('🧠 Sending message to DeepSeek Media Planner...');
      const response = await deepseekService.sendPlannerMessage({
        message: content,
        files,
        conversationHistory
      }, controller.signal);

      // Check if aborted
      if (controller.signal.aborted) {
        console.log('🛑 Request was aborted, not saving results');
        return;
      }

      if (!response.success) {
        throw new Error(response.error || 'DeepSeek Media Planner failed');
      }

      console.log('✅ DeepSeek response received');

      // Save assistant message to database
      const assistantMessageData = {
        chat_id: currentChat.id,
        content: response.content || 'No response content',
        role: 'assistant' as const
      };

      const { data: savedAssistantMessage, error: assistantMessageError } = await supabase
        .from('planner_messages')
        .insert([assistantMessageData])
        .select()
        .single();

      if (assistantMessageError) {
        console.error('❌ Error saving assistant message:', assistantMessageError);
        throw assistantMessageError;
      }

      console.log('✅ Assistant message saved:', savedAssistantMessage.id);

      // Add assistant message to UI
      setMessages(prev => [...prev, savedAssistantMessage]);

      // Update chat title if it's the first message
      if (messages.length === 0) {
        const title = content.length > 50 ? content.substring(0, 50) + '...' : content;
        await renameChat(currentChat.id, title);
      }

      // Update chat timestamp
      await supabase
        .from('planner_chats')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', currentChat.id);

      // Refresh chats to update the sidebar
      console.log('🔄 Refreshing planner chats list...');
      await loadChats();

      console.log('🎉 Planner message process completed successfully with DeepSeek');
      
    } catch (error) {
      console.error('❌ Error in planner handleSendMessage:', error);
      
      // Add error message to chat
      const errorMessage: PlannerMessage = {
        id: `error-${Date.now()}`,
        chat_id: activeChat?.id || 'temp',
        content: `❌ Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`,
        role: 'assistant',
        created_at: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
      setAbortController(null);
    }
  };

  const handleStop = async () => {
    if (abortController) {
      console.log('🛑 User requested to stop planner analysis');
      abortController.abort();
      setLoading(false);
      setAbortController(null);

      // Add stopped message to chat
      const stoppedMessage: PlannerMessage = {
        id: `stopped-${Date.now()}`,
        chat_id: activeChat?.id || 'temp',
        content: '🛑 Análisis detenido por el usuario. DeepSeek ha sido interrumpido. Puedes enviar un nuevo mensaje o intentar de nuevo.',
        role: 'assistant',
        created_at: new Date().toISOString()
      };
      setMessages(prev => [...prev, stoppedMessage]);
      
      console.log('✅ Planner analysis stopped successfully, UI updated');
    }
  };

  return (
    <div className="flex h-screen bg-white dark:bg-gray-900 overflow-hidden">
      {/* Planner Sidebar */}
      <PlannerSidebar
        chats={chats}
        activeChat={activeChat}
        onNewChat={createNewChat}
        onSelectChat={setActiveChat}
        onDeleteChat={deleteChat}
        onRenameChat={renameChat}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
      />
      
      {/* Main Content Area */}
      <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ease-in-out ${
        sidebarOpen ? 'lg:ml-0' : 'lg:ml-0'
      }`}>
        {/* Header */}
        <div className="flex items-center gap-3 p-4 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            title={sidebarOpen ? 'Cerrar sidebar' : 'Abrir sidebar'}
          >
            <Menu size={20} />
          </button>
          
          <div className="flex-1">
            {activeChat && (
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-medium text-gray-900 dark:text-white truncate">
                  {activeChat.title}
                </h2>
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-blue-100 to-purple-100 text-blue-800 dark:from-blue-900 dark:to-purple-900 dark:text-blue-300">
                  🧠 DeepSeek Media Planner
                </span>
              </div>
            )}
          </div>

          {/* Test API Button */}
          <div className="flex items-center gap-2">
            <button
              onClick={testDeepSeekAPI}
              disabled={testingApi}
              className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-medium rounded-lg transition-colors disabled:cursor-not-allowed"
              title="Test DeepSeek Media Planner API"
            >
              <Brain size={16} className={testingApi ? 'animate-spin' : ''} />
              {testingApi ? 'Probando...' : 'Test DeepSeek'}
            </button>
          </div>
        </div>

        {/* API Status Indicators */}
        {apiStatus && !apiStatus.success && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800 px-4 py-2">
            <div className="flex items-start gap-2">
              <AlertTriangle size={16} className="text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-amber-800 dark:text-amber-400">
                  ⚠️ DeepSeek API no configurado correctamente
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  {apiStatus.message}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* API Test Result */}
        {apiStatus && (
          <div className={`border-b px-4 py-2 ${
            apiStatus.success 
              ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' 
              : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
          }`}>
            <p className={`text-sm ${
              apiStatus.success 
                ? 'text-green-800 dark:text-green-400' 
                : 'text-red-800 dark:text-red-400'
            }`}>
              {apiStatus.success ? '✅' : '❌'} {apiStatus.message}
            </p>
          </div>
        )}
        
        {/* Content Area */}
        <PlannerArea messages={messages} loading={loading} />
        <PlannerInput onSendMessage={handleSendMessage} onStop={handleStop} disabled={loading} />
      </div>
    </div>
  );
};
