import React from 'react';
import { motion } from 'framer-motion';
import { User, Bot, Clock, AlertCircle, CheckCircle, FileText, Image, File } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { Message } from '../../types';

interface MessageBubbleProps {
  message: Message;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const getIcon = (iconName: string) => {
    const IconComponent = (LucideIcons as any)[iconName];
    return IconComponent ? <IconComponent size={16} /> : <Bot size={16} />;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock size={14} className="text-amber-500" />;
      case 'error':
        return <AlertCircle size={14} className="text-red-500" />;
      case 'complete':
        return <CheckCircle size={14} className="text-green-500" />;
      default:
        return null;
    }
  };

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

  // Función para limpiar y formatear el contenido de los agentes
  const formatAgentContent = (content: string) => {
    // Limpiar markdown innecesario
    let cleanContent = content
      .replace(/###\s*/g, '') // Eliminar ###
      .replace(/\*\*(.*?)\*\*/g, '$1') // Eliminar ** pero mantener el texto
      .replace(/\*([^*]+)\*/g, '$1') // Eliminar * simples
      .replace(/^\s*[-•]\s*/gm, '• ') // Normalizar bullets
      .trim();

    return cleanContent;
  };

  // Función para renderizar contenido con soporte para tablas
  const renderFormattedContent = (content: string) => {
    const cleanContent = formatAgentContent(content);
    
    // Detectar y renderizar tablas
    const tableRegex = /\|(.+)\|\n\|[-\s|:]+\|\n((?:\|.+\|\n?)+)/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = tableRegex.exec(cleanContent)) !== null) {
      // Agregar texto antes de la tabla
      if (match.index > lastIndex) {
        parts.push(
          <div key={`text-${lastIndex}`} className="whitespace-pre-wrap mb-4">
            {cleanContent.slice(lastIndex, match.index)}
          </div>
        );
      }

      // Procesar la tabla
      const headerRow = match[1];
      const dataRows = match[2];
      
      const headers = headerRow.split('|').map(h => h.trim()).filter(h => h);
      const rows = dataRows.split('\n').filter(row => row.includes('|')).map(row => 
        row.split('|').map(cell => cell.trim()).filter(cell => cell)
      );

      parts.push(
        <div key={`table-${match.index}`} className="mb-4 overflow-x-auto">
          <table className="min-w-full border border-gray-200 dark:border-gray-700 rounded-lg">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                {headers.map((header, index) => (
                  <th key={index} className="px-4 py-2 text-left text-sm font-medium text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900">
              {rows.map((row, rowIndex) => (
                <tr key={rowIndex} className={rowIndex % 2 === 0 ? 'bg-gray-50 dark:bg-gray-800' : 'bg-white dark:bg-gray-900'}>
                  {row.map((cell, cellIndex) => (
                    <td key={cellIndex} className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );

      lastIndex = match.index + match[0].length;
    }

    // Agregar texto restante después de la última tabla
    if (lastIndex < cleanContent.length) {
      parts.push(
        <div key={`text-${lastIndex}`} className="whitespace-pre-wrap">
          {cleanContent.slice(lastIndex)}
        </div>
      );
    }

    // Si no hay tablas, renderizar todo como texto
    if (parts.length === 0) {
      return (
        <div className="whitespace-pre-wrap">
          {cleanContent}
        </div>
      );
    }

    return <div>{parts}</div>;
  };

  if (message.role === 'user') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-end"
      >
        <div className="max-w-3xl bg-gray-900 dark:bg-gray-700 text-white p-4 rounded-2xl rounded-br-md">
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <p className="whitespace-pre-wrap">{message.content}</p>
              
              {/* Enhanced Attachments Display */}
              {message.attachments && message.attachments.length > 0 && (
                <div className="mt-4 space-y-2">
                  <div className="text-sm text-gray-300 font-medium flex items-center gap-2">
                    <FileText size={16} />
                    📎 Archivos Adjuntos ({message.attachments.length}):
                  </div>
                  {message.attachments.map((attachment) => (
                    <div
                      key={attachment.id}
                      className="flex items-center gap-3 p-3 bg-gray-800/95 dark:bg-gray-600/95 rounded-lg border border-gray-700/60 dark:border-gray-500/60 backdrop-blur-sm shadow-sm"
                    >
                      <div className="flex-shrink-0">
                        {getFileIcon(attachment.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-200 dark:text-gray-200 truncate">
                          {attachment.name}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-400">
                          <span>{attachment.type}</span>
                          <span>•</span>
                          <span>{formatFileSize(attachment.size)}</span>
                        </div>
                      </div>
                      <div className="flex-shrink-0">
                        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" title="Archivo procesado" />
                      </div>
                    </div>
                  ))}
                  <div className="text-xs text-gray-400 dark:text-gray-400 italic bg-gray-800/40 dark:bg-gray-700/40 p-2 rounded border border-gray-700/40 dark:border-gray-600/40">
                    ✅ Todos los archivos han sido analizados por los agentes seleccionados
                  </div>
                </div>
              )}
            </div>
            <div className="w-8 h-8 bg-gray-800 dark:bg-gray-600 rounded-full flex items-center justify-center flex-shrink-0">
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
        {message.agent_responses && message.agent_responses.length > 0 ? (
          <div className="space-y-4">
            {message.agent_responses.map((response, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl rounded-bl-md overflow-hidden"
              >
                {/* Agent Header */}
                <div className={`${response.agent.color} p-3 flex items-center gap-3`}>
                  <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center text-white">
                    {getIcon(response.agent.icon)}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-white text-sm">
                      {response.agent.displayName}
                    </h3>
                    <p className="text-white/80 text-xs">
                      {response.agent.description}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    {getStatusIcon(response.status)}
                  </div>
                </div>

                {/* Agent Response */}
                <div className="p-4">
                  {response.status === 'pending' ? (
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                      <div className="animate-spin w-4 h-4 border-2 border-gray-300 border-t-gray-600 dark:border-gray-600 dark:border-t-gray-300 rounded-full" />
                      <span className="text-sm">Analyzing documents and generating response...</span>
                    </div>
                  ) : response.status === 'error' ? (
                    <div className="text-red-600 dark:text-red-400 text-sm p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                      <div className="flex items-center gap-2">
                        <AlertCircle size={16} />
                        <p className="font-medium">
                          {response.content.includes('stopped by user') ? 
                            '🛑 Analysis Stopped' : 
                            '❌ Analysis Error'
                          }
                        </p>
                      </div>
                      {!response.content.includes('stopped by user') && (
                        <p className="text-xs mt-1 opacity-75">{response.content}</p>
                      )}
                    </div>
                  ) : (
                    <div className="text-gray-800 dark:text-gray-200">
                      {/* Enhanced response formatting with table support */}
                      <div className="prose prose-sm max-w-none dark:prose-invert">
                        {renderFormattedContent(response.content)}
                      </div>
                      
                      {/* File Analysis Indicator */}
                      {message.attachments && message.attachments.length > 0 && (
                        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                          <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
                            <FileText size={16} />
                            <span className="text-sm font-medium">
                              Document Analysis Complete
                            </span>
                          </div>
                          <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                            This response includes analysis of {message.attachments.length} attached file{message.attachments.length > 1 ? 's' : ''}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-200 p-4 rounded-2xl rounded-bl-md border border-gray-100 dark:border-gray-700">
            <div className="whitespace-pre-wrap">{formatAgentContent(message.content)}</div>
          </div>
        )}
      </div>
    </motion.div>
  );
};