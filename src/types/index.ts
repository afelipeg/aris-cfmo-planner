export interface User {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  created_at: string;
}

export interface Chat {
  id: string;
  title: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export interface PlannerChat {
  id: string;
  title: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  chat_id: string;
  content: string;
  role: 'user' | 'assistant';
  agent_responses?: AgentResponse[];
  attachments?: Attachment[];
  created_at: string;
}

export interface AgentResponse {
  agent: Agent;
  content: string;
  status: 'pending' | 'complete' | 'error';
  created_at: string;
}

export interface Agent {
  id: string;
  name: string;
  displayName: string;
  description: string;
  color: string;
  icon: string;
}

export interface Attachment {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
  lastModified?: number;
  webkitRelativePath?: string;
  browserType?: 'chrome' | 'safari' | 'other';
}

export interface ToolResponse {
  snippets: string[];
  query: string;
  timestamp: string;
}

export const AGENTS: Agent[] = [
  {
    id: 'strategic-planning',
    name: 'strategic-planning',
    displayName: 'Strategic Planning',
    description: 'Expert strategy consultant specializing in competitive analysis, growth loops, pricing, and unit economics-driven product strategy',
    color: 'bg-blue-600',
    icon: 'Target'
  },
  {
    id: 'zbg',
    name: 'zbg',
    displayName: 'ZBG x Multiplier Effect',
    description: 'Senior Zero-Based Growth consultant specializing in business transformation, pricing strategy, brand power measurement, and portfolio optimization',
    color: 'bg-emerald-600',
    icon: 'TrendingUp'
  },
  {
    id: 'crm',
    name: 'crm',
    displayName: 'CRM & Growth Loops',
    description: 'Senior CRM specialist in Growth Loops, RFM segmentation, viral coefficient optimization, automated journey orchestration, and RevOps alignment',
    color: 'bg-purple-600',
    icon: 'Users'
  },
  {
    id: 'research',
    name: 'research',
    displayName: 'Research & Intelligence',
    description: 'Chief Insights Officer specializing in multi-source research, executive analysis, competitive intelligence, and C-suite decision support insights',
    color: 'bg-orange-600',
    icon: 'Search'
  },
  {
    id: 'brand-power',
    name: 'brand-power',
    displayName: 'Brand Power',
    description: 'Senior Brand Equity consultant specializing in Kantar D×M×S methodology, Price Power optimization, and price premium maximization',
    color: 'bg-red-600',
    icon: 'Sparkles'
  }
];