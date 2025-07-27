import React, { useState, useEffect } from 'react';
import { Menu, TestTube, AlertTriangle, Activity, Brain } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Chat, Message, Agent, AGENTS } from '../types';
import { PlannerChat, PlannerMessage } from '../types/planner';
import { ChatArea } from './Chat/ChatArea';
import { ChatInput } from './Chat/ChatInput';
import { DocumentUploader } from './DocumentAnalysis/DocumentUploader';
import { PlannerArea } from './Planner/PlannerArea';
import { PlannerInput } from './Planner/PlannerInput';
import { AppSidebar } from './AppSidebar';
import { SidebarProvider, SidebarInset, SidebarTrigger } from './ui/sidebar';
import { llmService } from '../lib/api';
import { FileProcessor } from '../lib/fileProcessor';
import { deepseekService } from '../lib/deepseekService';
import { supabase } from '../lib/supabase';

type DashboardView = 'chat' | 'documents' | 'planner';

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  
  // Navigation state
  const [activeView, setActiveView] = useState<DashboardView>('chat');
  
  // Chat (CFMO) states
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChat, setActiveChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  
  // Planner states
  const [plannerChats, setPlannerChats] = useState<PlannerChat[]>([]);
  const [activePlannerChat, setActivePlannerChat] = useState<PlannerChat | null>(null);
  const [plannerMessages, setPlannerMessages] = useState<PlannerMessage[]>([]);
  const [plannerLoading, setPlannerLoading] = useState(false);
  const [plannerAbortController, setPlannerAbortController] = useState<AbortController | null>(null);
  
  // API testing states
  const [testingApi, setTestingApi] = useState(false);
  const [apiTestResult, setApiTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Load data on mount and when user changes
  useEffect(() => {
    if (user) {
      console.log('👤 User logged in, loading data for:', user.id);
      loadChats();
      loadPlannerChats();
      checkApiConnection();
    }
  }, [user]);

  // Load messages when active chat changes
  useEffect(() => {
    if (activeChat) {
      console.log('💬 Loading messages for chat:', activeChat.id);
      loadMessages(activeChat.id);
    } else {
      setMessages([]);
    }
  }, [activeChat]);

  // Load planner messages when active planner chat changes
  useEffect(() => {
    if (activePlannerChat) {
      console.log('📋 Loading planner messages for chat:', activePlannerChat.id);
      loadPlannerMessages(activePlannerChat.id);
    } else {
      setPlannerMessages([]);
    }
  }, [activePlannerChat]);

  const checkApiConnection = async () => {
    try {
      console.log('🔍 Checking API connections...');
      
      if (activeView === 'chat') {
        const status = await llmService.testDeepSeekMessage();
        setApiTestResult(status);
        console.log('🧠 DeepSeek API Status:', status);
      } else if (activeView === 'planner') {
        const status = await deepseekService.testConnection();
        setApiTestResult(status);
        console.log('🧠 DeepSeek Planner API Status:', status);
      } else {
        setApiTestResult({ success: true, message: 'Document analysis ready' });
      }
    } catch (error) {
      console.error('❌ Error checking API connection:', error);
      setApiTestResult({ 
        success: false, 
        message: `Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
      });
    }
  };

  const testAPI = async () => {
    setTestingApi(true);
    
    try {
      console.log('🧪 Starting API test...');
      let result;
      
      if (activeView === 'chat') {
        result = await llmService.testDeepSeekMessage();
      } else if (activeView === 'planner') {
        result = await deepseekService.testConnection();
      } else {
        result = { success: true, message: 'Document analysis ready' };
      }
      
      setApiTestResult(result);
      
      if (result.success) {
        console.log('✅ API test successful');
      } else {
        console.error('❌ API test failed:', result.message);
      }
    } catch (error) {
      console.error('❌ API test failed:', error);
      setApiTestResult({
        success: false,
        message: error instanceof Error ? error.message : 'Test failed'
      });
    } finally {
      setTestingApi(false);
    }
  };

  // CFMO (Chat) functions
  const loadChats = async () => {
    if (!user) {
      console.log('❌ No user, cannot load chats');
      return;
    }

    try {
      console.log('📂 Loading chats for user:', user.id);
      const { data, error } = await supabase
        .from('chats')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('❌ Error loading chats:', error);
        throw error;
      }
      
      console.log('✅ Chats loaded successfully:', data?.length || 0);
      setChats(data || []);
      
    } catch (error) {
      console.error('❌ Failed to load chats:', error);
      setChats([]);
    }
  };

  const loadMessages = async (chatId: string) => {
    try {
      console.log('📨 Loading messages for chat:', chatId);
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('chat_id', chatId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('❌ Error loading messages:', error);
        throw error;
      }
      
      console.log('✅ Messages loaded:', data?.length || 0);
      setMessages(data || []);
    } catch (error) {
      console.error('❌ Failed to load messages:', error);
      setMessages([]);
    }
  };

  const createNewChat = async () => {
    if (!user) {
      console.log('❌ No user, cannot create chat');
      return null;
    }

    try {
      console.log('🆕 Creating new chat for user:', user.id);
      const { data, error } = await supabase
        .from('chats')
        .insert([
          {
            title: 'New Chat',
            user_id: user.id,
          }
        ])
        .select()
        .maybeSingle();

      if (error) {
        console.error('❌ Error creating chat:', error);
        throw error;
      }

      if (!data) {
        throw new Error('Failed to create chat - no data returned');
      }

      const newChat = data;
      console.log('✅ New chat created:', newChat.id);
      
      setChats(prev => [newChat, ...prev]);
      setActiveChat(newChat);
      setMessages([]);
      
      return newChat;
    } catch (error) {
      console.error('❌ Failed to create chat:', error);
      return null;
    }
  };

  const deleteChat = async (chatId: string) => {
    try {
      console.log('🗑️ Deleting chat:', chatId);
      const { error } = await supabase
        .from('chats')
        .delete()
        .eq('id', chatId);

      if (error) {
        console.error('❌ Error deleting chat:', error);
        throw error;
      }

      setChats(prev => prev.filter(chat => chat.id !== chatId));
      
      if (activeChat?.id === chatId) {
        setActiveChat(null);
        setMessages([]);
      }
      
      console.log('✅ Chat deleted successfully');
    } catch (error) {
      console.error('❌ Failed to delete chat:', error);
    }
  };

  const renameChat = async (chatId: string, newTitle: string) => {
    try {
      console.log('✏️ Renaming chat:', chatId, 'to:', newTitle);
      const { error } = await supabase
        .from('chats')
        .update({ title: newTitle, updated_at: new Date().toISOString() })
        .eq('id', chatId);

      if (error) {
        console.error('❌ Error renaming chat:', error);
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
      
      console.log('✅ Chat renamed successfully');
    } catch (error) {
      console.error('❌ Failed to rename chat:', error);
    }
  };

  const handleSendMessage = async (message: string, agents: Agent[], files: File[]) => {
    console.log('🚀 Sending message:', {
      message: message.substring(0, 50) + '...',
      agentCount: agents.length,
      fileCount: files.length
    });

    // Create AbortController for cancellation
    const controller = new AbortController();
    setAbortController(controller);
    setLoading(true);

    try {
      // Create chat if none exists
      let currentChat = activeChat;
      if (!currentChat) {
        console.log('📝 No active chat, creating new chat...');
        currentChat = await createNewChat();
        if (!currentChat) {
          throw new Error('Failed to create new chat');
        }
      }

      // Process files
      let processedFiles: any[] = [];
      if (files.length > 0) {
        console.log('📁 Processing files...');
        processedFiles = await FileProcessor.processFiles(files);
        console.log('✅ Files processed:', processedFiles.length);
      }

      // Save user message to database
      const userMessageData = {
        chat_id: currentChat.id,
        content: message,
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
        .from('messages')
        .insert([userMessageData])
        .select()
        .maybeSingle();

      if (userMessageError) {
        console.error('❌ Error saving user message:', userMessageError);
        throw userMessageError;
      }

      if (!savedUserMessage) {
        throw new Error('Failed to save user message - no data returned');
      }

      console.log('✅ User message saved:', savedUserMessage.id);

      // Add user message to UI immediately
      setMessages(prev => [...prev, savedUserMessage]);

      // Generate agent responses
      console.log('🤖 Generating agent responses...');
      const agentResponses = await llmService.generateResponsesWithContext(
        message,
        agents,
        { processedFiles },
        controller.signal
      );

      // Check if aborted
      if (controller.signal.aborted) {
        console.log('🛑 Request was aborted, not saving results');
        return;
      }

      console.log('✅ Agent responses generated:', agentResponses.length);

      // Save assistant message with agent responses
      const assistantMessageData = {
        chat_id: currentChat.id,
        content: 'Agent responses generated',
        role: 'assistant' as const,
        agent_responses: agentResponses
      };

      const { data: savedAssistantMessage, error: assistantMessageError } = await supabase
        .from('messages')
        .insert([assistantMessageData])
        .select()
        .maybeSingle();

      if (assistantMessageError) {
        console.error('❌ Error saving assistant message:', assistantMessageError);
        throw assistantMessageError;
      }

      if (!savedAssistantMessage) {
        throw new Error('Failed to save assistant message - no data returned');
      }

      console.log('✅ Assistant message saved:', savedAssistantMessage.id);

      // Add assistant message to UI
      setMessages(prev => [...prev, savedAssistantMessage]);

      // Update chat title if it's the first message
      if (messages.length === 0) {
        const title = message.length > 50 ? message.substring(0, 50) + '...' : message;
        await renameChat(currentChat.id, title);
      }

      // Update chat timestamp
      await supabase
        .from('chats')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', currentChat.id);

      // Refresh chats to update the sidebar
      console.log('🔄 Refreshing chats list...');
      await loadChats();

      console.log('🎉 Message process completed successfully');
      
    } catch (error) {
      console.error('❌ Error in handleSendMessage:', error);
      
      // Add error message to chat
      const errorMessage: Message = {
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
      console.log('🛑 User requested to stop analysis');
      abortController.abort();
      setLoading(false);
      setAbortController(null);

      // Add stopped message to chat
      const stoppedMessage: Message = {
        id: `stopped-${Date.now()}`,
        chat_id: activeChat?.id || 'temp',
        content: '🛑 Analysis stopped by user',
        role: 'assistant',
        created_at: new Date().toISOString()
      };
      setMessages(prev => [...prev, stoppedMessage]);
      
      console.log('✅ Analysis stopped successfully, UI updated');
    }
  };

  // Planner functions
  const loadPlannerChats = async () => {
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
      setPlannerChats(data || []);
      
    } catch (error) {
      console.error('❌ Failed to load planner chats:', error);
      setPlannerChats([]);
    }
  };

  const loadPlannerMessages = async (chatId: string) => {
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
      setPlannerMessages(data || []);
    } catch (error) {
      console.error('❌ Failed to load planner messages:', error);
      setPlannerMessages([]);
    }
  };

  const createNewPlannerChat = async () => {
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
        .maybeSingle();

      if (error) {
        console.error('❌ Error creating planner chat:', error);
        throw error;
      }

      if (!data) {
        throw new Error('Failed to create planner chat - no data returned');
      }

      const newChat = data;
      console.log('✅ New planner chat created:', newChat.id);
      
      setPlannerChats(prev => [newChat, ...prev]);
      setActivePlannerChat(newChat);
      setPlannerMessages([]);
      
      return newChat;
    } catch (error) {
      console.error('❌ Failed to create planner chat:', error);
      return null;
    }
  };

  const deletePlannerChat = async (chatId: string) => {
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

      setPlannerChats(prev => prev.filter(chat => chat.id !== chatId));
      
      if (activePlannerChat?.id === chatId) {
        setActivePlannerChat(null);
        setPlannerMessages([]);
      }
      
      console.log('✅ Planner chat deleted successfully');
    } catch (error) {
      console.error('❌ Failed to delete planner chat:', error);
    }
  };

  const renamePlannerChat = async (chatId: string, newTitle: string) => {
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

      setPlannerChats(prev => prev.map(chat => 
        chat.id === chatId 
          ? { ...chat, title: newTitle, updated_at: new Date().toISOString() }
          : chat
      ));
      
      if (activePlannerChat?.id === chatId) {
        setActivePlannerChat(prev => prev ? { ...prev, title: newTitle } : null);
      }
      
      console.log('✅ Planner chat renamed successfully');
    } catch (error) {
      console.error('❌ Failed to rename planner chat:', error);
    }
  };

  const handleSendPlannerMessage = async (content: string, files: File[]) => {
    console.log('🚀 Sending planner message to DeepSeek:', {
      content: content.substring(0, 50) + '...',
      fileCount: files.length,
    });

    // Create AbortController for cancellation
    const controller = new AbortController();
    setPlannerAbortController(controller);
    setPlannerLoading(true);

    try {
      // Create chat if none exists
      let currentChat = activePlannerChat;
      if (!currentChat) {
        console.log('📝 No active planner chat, creating new planner chat...');
        currentChat = await createNewPlannerChat();
        if (!currentChat) {
          throw new Error('Failed to create new planner chat');
        }
      }

      // Save user message to database
      const userMessageData = {
        chat_id: currentChat.id,
        content: content,
        role: 'user' as const,
        attachments: files.length > 0 ? files.map((file, index) => ({
          id: `attachment-${Date.now()}-${index}`,
          name: file.name,
          type: file.type,
          size: file.size,
          url: URL.createObjectURL(file)
        })) : []
      };

      const { data: savedUserMessage, error: userMessageError } = await supabase
        .from('planner_messages')
        .insert([userMessageData])
        .select()
        .maybeSingle();

      if (userMessageError) {
        console.error('❌ Error saving user message:', userMessageError);
        throw userMessageError;
      }

      if (!savedUserMessage) {
        throw new Error('Failed to save planner user message - no data returned');
      }

      console.log('✅ User message saved:', savedUserMessage.id);

      // Add user message to UI immediately
      setPlannerMessages(prev => [...prev, savedUserMessage]);

      // Prepare conversation history for DeepSeek
      const conversationHistory = plannerMessages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      // Send to DeepSeek
      let assistantResponse = '';
      try {
        const response = await deepseekService.sendPlannerMessage({
          message: content,
          files,
          conversationHistory
        }, controller.signal);

        if (controller.signal.aborted) {
          console.log('🛑 Request was aborted, not saving results');
          return;
        }

        if (!response.success) {
          throw new Error(response.error || 'DeepSeek failed');
        }

        assistantResponse = response.content;
        console.log('✅ Assistant response received from DeepSeek');
      } catch (error) {
        console.error('❌ DeepSeek API error:', error);
        throw new Error(`DeepSeek API failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }

      // Save assistant message to database
      const assistantMessageData = {
        chat_id: currentChat.id,
        content: assistantResponse || 'No response content',
        role: 'assistant' as const
      };

      const { data: savedAssistantMessage, error: assistantMessageError } = await supabase
        .from('planner_messages')
        .insert([assistantMessageData])
        .select()
        .maybeSingle();

      if (assistantMessageError) {
        console.error('❌ Error saving assistant message:', assistantMessageError);
        throw assistantMessageError;
      }

      if (!savedAssistantMessage) {
        throw new Error('Failed to save planner assistant message - no data returned');
      }

      console.log('✅ Assistant message saved:', savedAssistantMessage.id);

      // Add assistant message to UI
      setPlannerMessages(prev => [...prev, savedAssistantMessage]);

      // Update chat title if it's the first message
      if (plannerMessages.length === 0) {
        const title = content.length > 50 ? content.substring(0, 50) + '...' : content;
        await renamePlannerChat(currentChat.id, title);
      }

      // Update chat timestamp
      await supabase
        .from('planner_chats')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', currentChat.id);

      // Refresh chats to update the sidebar
      console.log('🔄 Refreshing planner chats list...');
      await loadPlannerChats();

      console.log('🎉 Planner message process completed successfully with DeepSeek');
      
    } catch (error) {
      console.error('❌ Error in planner handleSendMessage:', error);
      
      // Add error message to chat
      const errorMessage: PlannerMessage = {
        id: `error-${Date.now()}`,
        chat_id: activePlannerChat?.id || 'temp',
        content: `❌ Error en Planner: ${error instanceof Error ? error.message : 'Error desconocido'}. Verifica tu configuración de DeepSeek API.`,
        role: 'assistant',
        created_at: new Date().toISOString()
      };
      setPlannerMessages(prev => [...prev, errorMessage]);
    } finally {
      setPlannerLoading(false);
      setPlannerAbortController(null);
    }
  };

  const handleStopPlanner = async () => {
    if (plannerAbortController) {
      console.log('🛑 User requested to stop planner analysis');
      plannerAbortController.abort();
      setPlannerLoading(false);
      setPlannerAbortController(null);

      // Add stopped message to chat
      const stoppedMessage: PlannerMessage = {
        id: `stopped-${Date.now()}`,
        chat_id: activePlannerChat?.id || 'temp',
        content: '🛑 Análisis detenido por el usuario. DeepSeek ha sido interrumpido. Puedes enviar un nuevo mensaje o intentar de nuevo.',
        role: 'assistant',
        created_at: new Date().toISOString()
      };
      setPlannerMessages(prev => [...prev, stoppedMessage]);
      
      console.log('✅ Planner analysis stopped successfully, UI updated');
    }
  };

  // Navigation handlers
  const handleViewChange = (view: DashboardView) => {
    console.log('🔄 Changing view to:', view);
    setActiveView(view);
    
    // Check API when switching views
    setTimeout(() => {
      checkApiConnection();
    }, 100);
  };

  const handleSelectChat = (chat: Chat) => {
    console.log('📝 Selecting chat:', chat.id);
    setActiveView('chat');
    setActiveChat(chat);
  };

  const handleSelectPlannerChat = (chat: PlannerChat) => {
    console.log('📋 Selecting planner chat:', chat.id);
    setActiveView('planner');
    setActivePlannerChat(chat);
  };

  const handleNewChat = async () => {
    console.log('🆕 Creating new chat from sidebar');
    setActiveView('chat');
    await createNewChat();
  };

  const handleNewPlannerChat = async () => {
    console.log('🆕 Creating new planner chat from sidebar');
    setActiveView('planner');
    await createNewPlannerChat();
  };

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full">
        {/* Single Unified Sidebar */}
        <AppSidebar
          // CFMO (Chat) props
          chats={chats}
          activeChat={activeChat}
          onNewChat={handleNewChat}
          onSelectChat={handleSelectChat}
          onDeleteChat={deleteChat}
          onRenameChat={renameChat}
          
          // Planner props
          plannerChats={plannerChats}
          activePlannerChat={activePlannerChat}
          onNewPlannerChat={handleNewPlannerChat}
          onSelectPlannerChat={handleSelectPlannerChat}
          onDeletePlannerChat={deletePlannerChat}
          onRenamePlannerChat={renamePlannerChat}
          
          // Navigation props
          activeView={activeView}
          onViewChange={handleViewChange}
        />

        {/* Main Content Area */}
        <SidebarInset>
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center gap-3 p-4 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
              <SidebarTrigger />
              
              <div className="flex-1">
                {activeView === 'chat' && activeChat && (
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-medium text-gray-900 dark:text-white truncate">
                      {activeChat.title}
                    </h2>
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                      🧠 Multi-Agent
                    </span>
                  </div>
                )}
                
                {activeView === 'planner' && activePlannerChat && (
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-medium text-gray-900 dark:text-white truncate">
                      {activePlannerChat.title}
                    </h2>
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-blue-100 to-purple-100 text-blue-800 dark:from-blue-900 dark:to-purple-900 dark:text-blue-300">
                      📋 DeepSeek
                    </span>
                  </div>
                )}
                
                {activeView === 'documents' && (
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-medium text-gray-900 dark:text-white">
                      Análisis de Documentos
                    </h2>
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                      📊 AI Analysis
                    </span>
                  </div>
                )}
              </div>

              {/* Test API Button */}
              {(activeView === 'chat' || activeView === 'planner') && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={testAPI}
                    disabled={testingApi}
                    className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-medium rounded-lg transition-colors disabled:cursor-not-allowed"
                    title={`Test ${activeView === 'chat' ? 'DeepSeek' : 'DeepSeek Reasoner'} API`}
                  >
                    <Brain size={16} className={testingApi ? 'animate-spin' : ''} />
                    {testingApi ? 'Testing...' : (activeView === 'chat' ? 'Test DeepSeek' : 'Test Reasoner')}
                  </button>
                </div>
              )}
            </div>

            {/* API Status Indicators */}
            {apiTestResult && !apiTestResult.success && (
              <div className="bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800 px-4 py-2">
                <div className="flex items-start gap-2">
                  <AlertTriangle size={16} className="text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-amber-800 dark:text-amber-400">
                      ⚠️ DeepSeek API no configurado correctamente
                    </p>
                    <p className="text-xs text-amber-700 dark:text-amber-400">
                      {apiTestResult.message}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* API Test Result */}
            {apiTestResult && (
              <div className={`border-b px-4 py-2 ${
                apiTestResult.success 
                  ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' 
                  : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
              }`}>
                <p className={`text-sm ${
                  apiTestResult.success 
                    ? 'text-green-800 dark:text-green-400' 
                    : 'text-red-800 dark:text-red-400'
                }`}>
                  {apiTestResult.success ? '✅' : '❌'} {apiTestResult.message}
                </p>
              </div>
            )}
            
            {/* Content Area - NO DUPLICATE SIDEBARS */}
            <div className="flex-1 flex flex-col min-h-0">
              {activeView === 'chat' && (
                <>
                  <ChatArea messages={messages} loading={loading} />
                  <ChatInput onSendMessage={handleSendMessage} onStop={handleStop} disabled={loading} />
                </>
              )}
              
              {activeView === 'planner' && (
                <>
                  <PlannerArea 
                    messages={plannerMessages} 
                    loading={plannerLoading}
                  />
                  <PlannerInput 
                    onSendMessage={handleSendPlannerMessage} 
                    onStop={handleStopPlanner} 
                    disabled={plannerLoading} 
                  />
                </>
              )}
              
              {activeView === 'documents' && (
                <div className="flex-1 overflow-y-auto">
                  <DocumentUploader />
                </div>
              )}
            </div>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};