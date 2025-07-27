import React from 'react';
import { motion } from 'framer-motion';
import { User, Bot, FileText, Image, File, CheckCircle } from 'lucide-react';
import { PlannerMessage } from '../../types/planner';

interface PlannerMessageBubbleProps {
  message: PlannerMessage;
}

export const PlannerMessageBubble: React.FC<PlannerMessageBubbleProps> = ({ message }) => {
  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) {
      return <Image size={14} className="text-blue-500" />;
    } else if (type.includes('pdf') || type.includes('document')) {
      return <FileText size={14} className="text-red-500" />;
    }
    return <File size={14} className="text-gray-500" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Format content with better structure
  const formatContent = (content: string) => {
    // Split content into sections and format
    const sections = content.split('\n\n');
    return sections.map((section, index) => {
      if (section.trim().startsWith('#')) {
        return (
          <h3 key={index} className="text-lg font-semibold text-gray-900 dark:text-white mb-2 mt-4">
            {section.replace(/^#+\s*/, '')}
          </h3>
        );
      } else if (section.includes('•') || section.includes('-')) {
        const items = section.split('\n').filter(line => line.trim());
        return (
          <ul key={index} className="list-disc list-inside space-y-1 mb-4">
            {items.map((item, itemIndex) => (
              <li key={itemIndex} className="text-gray-700 dark:text-gray-300">
                {item.replace(/^[•\-]\s*/, '')}
              </li>
            ))}
          </ul>
        );
      } else {
        return (
          <p key={index} className="text-gray-700 dark:text-gray-300 mb-3 leading-relaxed">
            {section}
          </p>
        );
      }
    });
  };

  if (message.role === 'user') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-end"
      >
        <div className="max-w-3xl bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 rounded-2xl rounded-br-md shadow-lg">
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <p className="whitespace-pre-wrap">{message.content}</p>
              
              {/* Enhanced Attachments Display for Planner */}
              {message.attachments && message.attachments.length > 0 && (
                <div className="mt-4 space-y-2">
                  <div className="text-sm text-blue-100 font-medium flex items-center gap-2">
                    <FileText size={16} />
                    📋 Documentos para Planificación ({message.attachments.length}):
                  </div>
                  {message.attachments.map((attachment) => (
                    <div
                      key={attachment.id}
                      className="flex items-center gap-3 p-3 bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 shadow-sm"
                    >
                      <div className="flex-shrink-0">
                        {getFileIcon(attachment.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">
                          {attachment.name}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-blue-100">
                          <span>{attachment.type}</span>
                          <span>•</span>
                          <span>{formatFileSize(attachment.size)}</span>
                        </div>
                      </div>
                      <div className="flex-shrink-0">
                        <div className="w-2 h-2 bg-green-300 rounded-full animate-pulse" title="Archivo procesado" />
                      </div>
                    </div>
                  ))}
                  <div className="text-xs text-blue-100 italic bg-white/5 p-2 rounded border border-white/10">
                    ✅ Documentos analizados por DeepSeek Reasoner
                  </div>
                </div>
              )}
            </div>
            <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
              <User size={16} />
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex justify-start"
    >
      <div className="max-w-5xl w-full">
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border border-blue-100 dark:border-blue-800 rounded-2xl rounded-bl-md overflow-hidden shadow-lg">
          {/* Assistant Header */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-3 flex items-center gap-3">
            <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center text-white">
              <span className="text-lg">🧠</span>
            </div>
            <div className="flex-1">
              <h3 className="font-medium text-white text-sm">
                Asistente de Planificación (DeepSeek Reasoner)
              </h3>
              <p className="text-white/80 text-xs">
                Especialista en planificación estratégica con razonamiento avanzado
              </p>
            </div>
            <div className="flex items-center gap-1">
              <CheckCircle size={14} className="text-green-300" />
              <span className="text-xs text-white/80">DeepSeek</span>
            </div>
          </div>

          {/* Assistant Response */}
          <div className="p-6">
            <div className="prose prose-sm max-w-none dark:prose-invert">
              {formatContent(message.content)}
            </div>
            
            {/* File Analysis Indicator */}
            {message.attachments && message.attachments.length > 0 && (
              <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
                  <FileText size={16} />
                  <span className="text-sm font-medium">
                    Análisis de Documentos Completado
                  </span>
                </div>
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                  Esta respuesta incluye análisis detallado de {message.attachments.length} documento{message.attachments.length > 1 ? 's' : ''} procesado{message.attachments.length > 1 ? 's' : ''} por DeepSeek Reasoner
                </p>
              </div>
            )}

          </div>
        </div>
      </div>
    </motion.div>
  );
};