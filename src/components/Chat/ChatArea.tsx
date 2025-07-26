import React, { useEffect, useRef } from 'react';
import { Message } from '../../types';
import { MessageBubble } from './MessageBubble';
import { useSettings } from '../../contexts/SettingsContext';

interface ChatAreaProps {
  messages: Message[];
  loading?: boolean;
}

export const ChatArea: React.FC<ChatAreaProps> = ({ messages, loading }) => {
  const { t } = useSettings();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  console.log('💬 ChatArea render - messages:', messages.length, 'loading:', loading);

  return (
    <div className="flex-1 overflow-y-auto bg-white dark:bg-gray-900">
      <div className="max-w-4xl mx-auto p-4 space-y-6">
        {messages.length === 0 && !loading ? (
          <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center">
            <div className="w-16 h-16 rounded-2xl overflow-hidden bg-white dark:bg-gray-700 flex items-center justify-center mx-auto mb-8 shadow-lg">
              <img 
                src="/ms-icon-310x310.png" 
                alt="Aris Logo" 
                className="w-12 h-12 object-contain"
              />
            </div>
            <h2 className="text-xl font-medium text-gray-900 dark:text-white mb-3">
              {t('chat.howCanIHelp')}
            </h2>
            <p className="text-gray-600 dark:text-gray-400 max-w-md leading-relaxed">
              {t('chat.selectAgents')}
            </p>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-2xl rounded-bl-md border border-gray-100 dark:border-gray-700">
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <div className="animate-spin w-4 h-4 border-2 border-gray-300 border-t-gray-600 dark:border-gray-600 dark:border-t-gray-300 rounded-full" />
                    <span className="text-sm">Agentes trabajando...</span>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
};