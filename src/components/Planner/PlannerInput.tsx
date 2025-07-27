import React, { useState, useRef } from 'react';
import { Send, StopCircle } from 'lucide-react';
import { FileUpload } from '../Chat/FileUpload';
import { useSettings } from '../../contexts/SettingsContext';

interface PlannerInputProps {
  onSendMessage: (message: string, files: File[]) => void;
  onStop?: () => void;
  disabled?: boolean;
}

export const PlannerInput: React.FC<PlannerInputProps> = ({ onSendMessage, onStop, disabled }) => {
  const { t } = useSettings();
  const [message, setMessage] = useState('');
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const trimmedMessage = message.trim();
    
    if (!trimmedMessage || disabled) {
      console.log('❌ Cannot send planner message:', {
        hasMessage: !!trimmedMessage,
        isDisabled: disabled
      });
      return;
    }
    
    console.log('📤 Sending planner message:', {
      message: trimmedMessage,
      files: attachedFiles.map(f => f.name),
      disabled
    });
    
    // Call the parent handler
    onSendMessage(trimmedMessage, attachedFiles);
    
    // Clear the form immediately after sending
    setMessage('');
    setAttachedFiles([]);
    
    console.log('✅ Planner form cleared');
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

  const canSend = !disabled && message.trim();

  return (
    <div className="border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
      <div className="max-w-4xl mx-auto p-4">
        <form onSubmit={handleSubmit} className="space-y-3">
          {/* File Upload */}
          <div className="flex-1 min-w-0">
            <FileUpload
              files={attachedFiles}
              onFilesChange={setAttachedFiles}
            />
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
                  disabled
                    ? 'DeepSeek está trabajando...'
                    : 'Brief: Marca/Cliente, País(es), Fechas (YYYY-MM-DD), Presupuesto total (USD), Objetivo primario (Awareness/Consideration/Leads/Sales/ROAS/App), Audiencias disponibles, Canales requeridos/prohibidos, Restricciones...'
                }
                disabled={disabled}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:border-blue-400 dark:focus:border-blue-500 focus:ring-1 focus:ring-blue-400 dark:focus:ring-blue-500 transition-colors resize-none min-h-[48px] max-h-32 disabled:opacity-50 disabled:cursor-not-allowed"
                rows={1}
              />
            </div>
            
            {/* Send Button - Only show when NOT disabled */}
            {!disabled && (
              <button
                type="submit"
                disabled={!canSend}
                title={!canSend ? "Escribe un mensaje" : "Enviar mensaje"}
                className={`flex-shrink-0 p-3 rounded-xl transition-colors disabled:cursor-not-allowed ${
                  canSend
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white'
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
                title="Detener análisis"
                className="flex-shrink-0 p-3 rounded-xl transition-colors bg-red-600 hover:bg-red-700 text-white animate-pulse"
              >
                <StopCircle size={18} />
              </button>
            )}
          </div>

          {/* Status Messages */}
          {disabled && (
            <p className="text-xs text-blue-600 dark:text-blue-400 flex items-center gap-2 animate-pulse">
              <div className="animate-spin w-3 h-3 border-2 border-blue-300 border-t-blue-600 dark:border-blue-600 dark:border-t-blue-300 rounded-full" />
              📋 El asistente de planificación está trabajando... Haz clic en el botón rojo para cancelar
            </p>
          )}
        </form>
      </div>
    </div>
  );
};
