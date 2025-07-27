import React, { useState, useRef } from 'react';
import { Send, StopCircle } from 'lucide-react';
import { Agent } from '../../types';
import { AgentSelector } from './AgentSelector';
import { FileUpload } from './FileUpload';
import { useSettings } from '../../contexts/SettingsContext';

interface ChatInputProps {
  onSendMessage: (message: string, agents: Agent[], files: File[]) => void;
  onStop?: () => void;
  disabled?: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({ onSendMessage, onStop, disabled }) => {
  const { t } = useSettings();
  const [message, setMessage] = useState('');
  const [selectedAgents, setSelectedAgents] = useState<Agent[]>([]);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [agentSelectorOpen, setAgentSelectorOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const trimmedMessage = message.trim();
    
    if (!trimmedMessage || selectedAgents.length === 0 || disabled) {
      console.log('❌ QA: Cannot send message:', {
        hasMessage: !!trimmedMessage,
        hasAgents: selectedAgents.length > 0,
        isDisabled: disabled
      });
      return;
    }
    
    console.log('📤 QA: Sending message from ChatInput:', {
      message: trimmedMessage,
      agents: selectedAgents.map(a => a.displayName),
      files: attachedFiles.map(f => f.name),
      disabled
    });
    
    // Call the parent handler
    onSendMessage(trimmedMessage, selectedAgents, attachedFiles);
    
    // Clear the form immediately after sending
    setMessage('');
    setAttachedFiles([]);
    
    // Keep selected agents for next message (like ChatGPT)
    console.log('✅ QA: Form cleared, keeping agents selected for next message');
  };

  const handleAgentToggle = (agent: Agent) => {
    setSelectedAgents(prev => {
      const isSelected = prev.some(a => a.id === agent.id);
      if (isSelected) {
        return prev.filter(a => a.id !== agent.id);
      } else {
        return [...prev, agent];
      }
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as any);
    }
  };

  // Auto-resize textarea
  React.useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [message]);

  const canSend = !disabled && message.trim() && selectedAgents.length > 0;

  return (
    <div className="border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
      <div className="max-w-4xl mx-auto p-4">
        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Agent Selector and File Upload */}
          <div className="flex flex-wrap items-center gap-3">
            <AgentSelector
              selectedAgents={selectedAgents}
              onAgentToggle={handleAgentToggle}
              isOpen={agentSelectorOpen}
              onToggle={() => setAgentSelectorOpen(!agentSelectorOpen)}
            />
            <div className="flex-1 min-w-0">
              <FileUpload
                files={attachedFiles}
                onFilesChange={setAttachedFiles}
              />
            </div>
          </div>

          {/* Message Input */}
          <div className="flex gap-3 items-end">
            <div className="flex-1 relative">
              <textarea
                ref={textareaRef}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  selectedAgents.length === 0
                    ? t('chat.firstSelectAgents')
                    : disabled
                    ? 'Processing your request...'
                    : t('chat.typeMessage')
                }
                disabled={disabled}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:border-gray-400 dark:focus:border-gray-500 focus:ring-1 focus:ring-gray-400 dark:focus:ring-gray-500 transition-colors resize-none min-h-[48px] max-h-32 disabled:opacity-50 disabled:cursor-not-allowed"
                rows={1}
              />
            </div>
            
            {/* Send Button - Only show when NOT disabled */}
            {!disabled && (
              <button
                type="submit"
                disabled={!canSend}
                title={!canSend ? (selectedAgents.length === 0 ? "Select agents first" : "Enter a message") : "Send message"}
                className={`flex-shrink-0 p-3 rounded-xl transition-colors disabled:cursor-not-allowed ${
                  canSend
                    ? 'bg-gray-900 hover:bg-gray-800 dark:bg-white dark:hover:bg-gray-100 text-white dark:text-gray-900'
                    : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400'
                }`}
              >
                <Send size={18} />
              </button>
            )}
            
            {/* Stop Button - Only show when disabled AND onStop is available */}
            {disabled && onStop && (
              <button
                type="button"
                onClick={onStop}
                title="Stop analysis"
                className="flex-shrink-0 p-3 rounded-xl transition-colors bg-red-600 hover:bg-red-700 text-white animate-pulse"
              >
                <StopCircle size={18} />
              </button>
            )}
          </div>

          {/* Status Messages */}
          {selectedAgents.length === 0 && !disabled && (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              ⚠️ {t('chat.selectAtLeastOne')}
            </p>
          )}
          
          {disabled && (
            <p className="text-xs text-blue-600 dark:text-blue-400 flex items-center gap-2 animate-pulse">
              <div className="animate-spin w-3 h-3 border-2 border-blue-300 border-t-blue-600 dark:border-blue-600 dark:border-t-blue-300 rounded-full" />
              🤖 Agents are working... Click the red stop button to cancel
            </p>
          )}
        </form>
      </div>
    </div>
  );
};
