import React, { useEffect, useRef } from 'react';
import { PlannerMessage } from '../../types/planner';
import { PlannerMessageBubble } from './PlannerMessageBubble';
import { useSettings } from '../../contexts/SettingsContext';

interface PlannerAreaProps {
  messages: PlannerMessage[];
  loading?: boolean;
}

export const PlannerArea: React.FC<PlannerAreaProps> = ({ messages, loading }) => {
  const { t } = useSettings();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  console.log('📋 PlannerArea render - messages:', messages.length, 'loading:', loading);

  return (
    <div className="flex-1 overflow-y-auto bg-white dark:bg-gray-900">
      <div className="max-w-4xl mx-auto p-4 space-y-6">
        {messages.length === 0 && !loading ? (
          <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center">
            <div className="w-16 h-16 rounded-2xl overflow-hidden bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mx-auto mb-8 shadow-lg">
              <span className="text-2xl">📋</span>
            </div>
            <h2 className="text-xl font-medium text-gray-900 dark:text-white mb-3">
              Media Planner
            </h2>
            <p className="text-gray-600 dark:text-gray-400 max-w-md leading-relaxed">
              Planificador de Medios Multiplataforma especializado en Google Ads, DV360, Meta, SA360 y otros DSP. Diseña campañas optimizadas con DeepSeek Reasoner para maximizar tu KPI dentro del presupuesto.
            </p>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <PlannerMessageBubble key={message.id} message={message} />
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 p-4 rounded-2xl rounded-bl-md border border-blue-100 dark:border-blue-800">
                  <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
                    <div className="animate-spin w-4 h-4 border-2 border-blue-300 border-t-blue-600 dark:border-blue-600 dark:border-t-blue-300 rounded-full" />
                    <span className="text-sm">
                      DeepSeek creando plan de medios optimizado...
                    </span>
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