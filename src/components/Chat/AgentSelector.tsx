import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Check } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { Agent, AGENTS } from '../../types';

interface AgentSelectorProps {
  selectedAgents: Agent[];
  onAgentToggle: (agent: Agent) => void;
  isOpen: boolean;
  onToggle: () => void;
}

export const AgentSelector: React.FC<AgentSelectorProps> = ({
  selectedAgents,
  onAgentToggle,
  isOpen,
  onToggle
}) => {
  const getIcon = (iconName: string) => {
    const IconComponent = (LucideIcons as any)[iconName];
    return IconComponent ? <IconComponent size={16} /> : null;
  };

  return (
    <div className="relative">
      <button
        onClick={onToggle}
        className="flex items-center gap-2 px-3 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-lg border border-gray-200 transition-colors"
      >
        <span className="text-sm">
          {selectedAgents.length === 0
            ? 'Select Agents'
            : selectedAgents.length === 1
            ? selectedAgents[0].displayName
            : `${selectedAgents.length} agents selected`
          }
        </span>
        <ChevronDown
          size={16}
          className={`transform transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="absolute bottom-full mb-2 left-0 w-80 bg-white border border-gray-200 rounded-lg shadow-xl z-50"
          >
            <div className="p-3 border-b border-gray-100">
              <h3 className="text-sm font-medium text-gray-900">Select Agents</h3>
              <p className="text-xs text-gray-600 mt-1">
                Choose one or multiple agents to generate specialized responses
              </p>
            </div>
            
            <div className="max-h-64 overflow-y-auto">
              {AGENTS.map((agent) => {
                const isSelected = selectedAgents.some(a => a.id === agent.id);
                
                return (
                  <button
                    key={agent.id}
                    onClick={() => onAgentToggle(agent)}
                    className={`w-full flex items-start gap-3 p-3 hover:bg-gray-50 transition-colors ${
                      isSelected ? 'bg-gray-50' : ''
                    }`}
                  >
                    <div className={`flex-shrink-0 w-8 h-8 rounded-lg ${agent.color} flex items-center justify-center text-white`}>
                      {getIcon(agent.icon)}
                    </div>
                    
                    <div className="flex-1 text-left">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-medium text-gray-900">
                          {agent.displayName}
                        </h4>
                        {isSelected && (
                          <Check size={14} className="text-green-600" />
                        )}
                      </div>
                      <p className="text-xs text-gray-600 mt-1">
                        {agent.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
            
            <div className="p-3 border-t border-gray-100 flex justify-between items-center">
              <span className="text-xs text-gray-600">
                {selectedAgents.length} of {AGENTS.length} selected
              </span>
              {selectedAgents.length > 0 && (
                <button
                  onClick={() => selectedAgents.forEach(agent => onAgentToggle(agent))}
                  className="text-xs text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Clear selection
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
