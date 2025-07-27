// src/lib/agents.ts - Sistema de Agentes Mejorado con Herramientas Asíncronas
import { supabase } from './supabase';

// ===== INTERFACES Y TIPOS =====

export interface Agent {
  id: string;
  name: string;
  displayName: string;
  description: string;
  color: string;
  icon: string;
  systemPrompt: string;
  capabilities: AgentCapability[];
  tools: ToolDefinition[];
}

export interface AgentCapability {
  name: string;
  description: string;
  enabled: boolean;
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, any>;
  handler: (params: any, context: ExecutionContext) => Promise<ToolResult>;
}

export interface ToolResult {
  success: boolean;
  data?: any;
  error?: string;
  metadata?: Record<string, any>;
}

export interface ExecutionContext {
  agentId: string;
  conversationId?: string;
  userId?: string;
  processedFiles?: any[];
  conversationHistory?: any[];
  abortSignal?: AbortSignal;
}

export interface AgentResponse {
  agent: Agent;
  content: string;
  status: 'pending' | 'complete' | 'error';
  created_at: string;
  toolCalls?: ToolCall[];
  executionTime?: number;
}

export interface ToolCall {
  toolName: string;
  parameters: any;
  result: ToolResult;
  executionTime: number;
}

// ===== HERRAMIENTAS DISPONIBLES =====

class WebSearchTool {
  static definition: ToolDefinition = {
    name: 'web_search',
    description: 'Search the web for current information to complement document analysis',
    parameters: {
      query: { type: 'string', required: true, description: 'Search query' },
      maxResults: { type: 'number', default: 5, description: 'Maximum results to return' }
    },
    handler: WebSearchTool.execute
  };

  static async execute(params: { query: string; maxResults?: number }, context: ExecutionContext): Promise<ToolResult> {
    const startTime = Date.now();
    
    try {
      console.log(`🔍 Web Search: "${params.query}"`);
      
      const serperApiKey = import.meta.env.VITE_SERPER_API_KEY;
      if (!serperApiKey) {
        return {
          success: false,
          error: 'SERPER API key not configured',
          metadata: { executionTime: Date.now() - startTime }
        };
      }

      // Import modules dynamically to avoid reference errors
      let API_RATE_LIMITS, CIRCUIT_BREAKERS, apiMonitor;
      
      try {
        const rateLimiterModule = await import('./rateLimiter');
        const circuitBreakerModule = await import('./circuitBreaker');
        const apiMonitorModule = await import('./apiMonitor');
        
        API_RATE_LIMITS = rateLimiterModule.API_RATE_LIMITS;
        CIRCUIT_BREAKERS = circuitBreakerModule.CIRCUIT_BREAKERS;
        apiMonitor = apiMonitorModule.apiMonitor;
      } catch (importError) {
        console.warn('⚠️ Could not import rate limiting modules, using direct fetch');
        // Fallback to direct fetch without rate limiting
        const response = await fetch('https://google.serper.dev/search', {
          method: 'POST',
          headers: {
            'X-API-KEY': serperApiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            q: params.query,
            num: params.maxResults || 5,
            gl: 'us',
            hl: 'en'
          }),
          signal: context.abortSignal
        });
        
        if (!response.ok) {
          throw new Error(`Serper API error: ${response.status}`);
        }

        const data = await response.json();
        const results = data.organic?.slice(0, params.maxResults || 5) || [];

        return {
          success: true,
          data: {
            query: params.query,
            results: results.map((result: any) => ({
              title: result.title,
              snippet: result.snippet,
              link: result.link,
              date: result.date
            })),
            searchTime: data.searchParameters?.searchTime
          },
          metadata: {
            executionTime: Date.now() - startTime,
            resultsCount: results.length
          }
        };
      }
      
      const response = await API_RATE_LIMITS.serper.enqueue(async () => {
        return await CIRCUIT_BREAKERS.serper.execute(async () => {
          const searchStartTime = Date.now();
          
          try {
            const response = await fetch('https://google.serper.dev/search', {
              method: 'POST',
              headers: {
                'X-API-KEY': serperApiKey,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                q: params.query,
                num: params.maxResults || 5,
                gl: 'us',
                hl: 'en'
              }),
              signal: context.abortSignal
            });
            
            const responseTime = Date.now() - searchStartTime;
            apiMonitor.recordAPICall('serper', response.ok, responseTime);
            
            return response;
          } catch (error) {
            const responseTime = Date.now() - searchStartTime;
            apiMonitor.recordAPICall('serper', false, responseTime);
            throw error;
          }
        });
      }, 2); // Priority 2 for web searches

      if (!response.ok) {
        throw new Error(`Serper API error: ${response.status}`);
      }

      const data = await response.json();
      const results = data.organic?.slice(0, params.maxResults || 5) || [];

      console.log(`✅ Web Search completed: ${results.length} results`);

      return {
        success: true,
        data: {
          query: params.query,
          results: results.map((result: any) => ({
            title: result.title,
            snippet: result.snippet,
            link: result.link,
            date: result.date
          })),
          searchTime: data.searchParameters?.searchTime
        },
        metadata: {
          executionTime: Date.now() - startTime,
          resultsCount: results.length
        }
      };

    } catch (error) {
      console.error('❌ Web Search failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Web search failed',
        metadata: { executionTime: Date.now() - startTime }
      };
    }
  }
}

class DocumentAnalysisTool {
  static definition: ToolDefinition = {
    name: 'analyze_document',
    description: 'Analyze uploaded documents for specific business insights',
    parameters: {
      documentId: { type: 'string', required: true, description: 'Document identifier' },
      analysisType: { type: 'string', enum: ['financial', 'strategic', 'operational'], description: 'Type of analysis' }
    },
    handler: DocumentAnalysisTool.execute
  };

  static async execute(params: { documentId: string; analysisType?: string }, context: ExecutionContext): Promise<ToolResult> {
    const startTime = Date.now();
    
    try {
      console.log(`📄 Document Analysis: ${params.documentId} (${params.analysisType || 'general'})`);
      
      // Find document in processed files
      const document = context.processedFiles?.find(file => 
        file.name === params.documentId || file.id === params.documentId
      );

      if (!document) {
        return {
          success: false,
          error: 'Document not found in processed files',
          metadata: { executionTime: Date.now() - startTime }
        };
      }

      // Extract specific insights based on analysis type
      const insights = this.extractInsights(document, params.analysisType || 'general');

      console.log(`✅ Document Analysis completed for ${document.name}`);

      return {
        success: true,
        data: {
          documentName: document.name,
          analysisType: params.analysisType || 'general',
          insights,
          extractedData: document.extractedData,
          summary: document.summary
        },
        metadata: {
          executionTime: Date.now() - startTime,
          documentSize: document.size,
          extractionMethod: document.metadata?.extractionMethod
        }
      };

    } catch (error) {
      console.error('❌ Document Analysis failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Document analysis failed',
        metadata: { executionTime: Date.now() - startTime }
      };
    }
  }

  private static extractInsights(document: any, analysisType: string): any {
    const baseInsights = {
      keyPoints: document.extractedData?.keyPoints || [],
      metrics: document.extractedData?.metrics || [],
      financialData: document.extractedData?.financialData || {}
    };

    switch (analysisType) {
      case 'financial':
        return {
          ...baseInsights,
          financialMetrics: this.extractFinancialMetrics(document),
          profitability: this.analyzeProfitability(document),
          cashFlow: this.analyzeCashFlow(document)
        };
      
      case 'strategic':
        return {
          ...baseInsights,
          strategicObjectives: this.extractStrategicObjectives(document),
          competitivePosition: this.analyzeCompetitivePosition(document),
          growthOpportunities: this.identifyGrowthOpportunities(document)
        };
      
      case 'operational':
        return {
          ...baseInsights,
          processEfficiency: this.analyzeProcessEfficiency(document),
          resourceUtilization: this.analyzeResourceUtilization(document),
          operationalRisks: this.identifyOperationalRisks(document)
        };
      
      default:
        return baseInsights;
    }
  }

  private static extractFinancialMetrics(document: any): any {
    return {
      revenue: document.extractedData?.financialData?.revenue || 'Not specified',
      costs: document.extractedData?.financialData?.costs || 'Not specified',
      profitMargin: document.extractedData?.financialData?.profitMargin || 'Not specified'
    };
  }

  private static analyzeProfitability(document: any): any {
    return {
      grossMargin: 'Analysis based on document data',
      netMargin: 'Calculated from available metrics',
      trends: 'Identified from historical data'
    };
  }

  private static analyzeCashFlow(document: any): any {
    return {
      operatingCashFlow: 'Derived from financial statements',
      freeCashFlow: 'Calculated metric',
      cashPosition: 'Current liquidity analysis'
    };
  }

  private static extractStrategicObjectives(document: any): string[] {
    return document.extractedData?.strategicInfo?.objectives || [
      'Strategic objectives identified in document',
      'Growth initiatives and expansion plans',
      'Market positioning strategies'
    ];
  }

  private static analyzeCompetitivePosition(document: any): any {
    return {
      marketShare: 'Competitive position analysis',
      strengths: 'Identified competitive advantages',
      threats: 'Market challenges and risks'
    };
  }

  private static identifyGrowthOpportunities(document: any): string[] {
    return [
      'Market expansion opportunities',
      'Product development initiatives',
      'Strategic partnerships potential'
    ];
  }

  private static analyzeProcessEfficiency(document: any): any {
    return {
      currentEfficiency: 'Process performance metrics',
      bottlenecks: 'Identified process constraints',
      improvements: 'Optimization recommendations'
    };
  }

  private static analyzeResourceUtilization(document: any): any {
    return {
      humanResources: 'Team utilization analysis',
      technology: 'System efficiency assessment',
      capital: 'Asset utilization metrics'
    };
  }

  private static identifyOperationalRisks(document: any): string[] {
    return [
      'Process-related risks identified',
      'Resource constraints and dependencies',
      'Operational continuity considerations'
    ];
  }
}

// ===== DEFINICIÓN DE AGENTES =====

export const AGENTS: Agent[] = [
  {
    id: 'strategic-planning',
    name: 'strategic-planning',
    displayName: 'Strategic Planning',
    description: 'Expert strategy consultant specializing in competitive analysis, growth loops, pricing, and unit economics-driven product strategy',
    color: 'bg-blue-600',
    icon: 'Target',
    systemPrompt: `You are a Strategic Planning expert with access to web search and document analysis tools.

CORE EXPERTISE:
- Competitive analysis and market positioning
- Growth strategy and business model optimization
- Pricing strategy and unit economics
- Strategic planning and execution

TOOL USAGE GUIDELINES:
- Use web_search when you need current market data, competitor information, or industry trends
- Use analyze_document for deep analysis of uploaded business documents
- Always combine internal document insights with external market intelligence

RESPONSE FORMAT:
Provide strategic analysis in this structure:
1. EXECUTIVE SUMMARY (2-3 sentences)
2. KEY STRATEGIC INSIGHTS (3-4 bullet points with data)
3. COMPETITIVE ANALYSIS (market position and opportunities)
4. STRATEGIC RECOMMENDATIONS (prioritized action items)
5. FINANCIAL IMPACT (ROI projections and investment requirements)

Always reference specific data points from documents and external sources.`,
    capabilities: [
      { name: 'Market Analysis', description: 'Comprehensive market and competitive analysis', enabled: true },
      { name: 'Strategic Planning', description: 'Long-term strategic planning and roadmapping', enabled: true },
      { name: 'Growth Strategy', description: 'Growth loops and expansion strategies', enabled: true },
      { name: 'Pricing Strategy', description: 'Pricing optimization and unit economics', enabled: true }
    ],
    tools: [WebSearchTool.definition, DocumentAnalysisTool.definition]
  },
  {
    id: 'zbg',
    name: 'zbg',
    displayName: 'ZBG x Multiplier Effect',
    description: 'Senior Zero-Based Growth consultant specializing in business transformation, pricing strategy, brand power measurement, and portfolio optimization',
    color: 'bg-emerald-600',
    icon: 'TrendingUp',
    systemPrompt: `You are a Zero-Based Growth expert with access to advanced analytical tools.

CORE EXPERTISE:
- Zero-based budgeting and growth optimization
- Business transformation and portfolio management
- Pricing power and brand equity measurement
- Multiplier effect analysis and compound growth

TOOL USAGE GUIDELINES:
- Use web_search for industry benchmarks and growth rate comparisons
- Use analyze_document with 'financial' type for budget and financial analysis
- Focus on ROI calculations and growth multipliers

RESPONSE FORMAT:
1. GROWTH ANALYSIS (current performance vs. potential)
2. FINANCIAL IMPACT (detailed ROI and cost analysis)
3. PRIORITY ACTIONS (ranked by impact and effort)
4. MULTIPLIER EFFECT ANALYSIS (compound growth opportunities)
5. INVESTMENT RECOMMENDATIONS (budget allocation and timeline)

Emphasize quantified results and financial projections.`,
    capabilities: [
      { name: 'Zero-Based Growth', description: 'ZBG methodology and implementation', enabled: true },
      { name: 'Financial Optimization', description: 'Cost optimization and ROI maximization', enabled: true },
      { name: 'Portfolio Management', description: 'Business portfolio optimization', enabled: true },
      { name: 'Multiplier Analysis', description: 'Compound growth and multiplier effects', enabled: true }
    ],
    tools: [WebSearchTool.definition, DocumentAnalysisTool.definition]
  },
  {
    id: 'crm',
    name: 'crm',
    displayName: 'CRM & Growth Loops',
    description: 'Senior CRM specialist in Growth Loops, RFM segmentation, viral coefficient optimization, automated journey orchestration, and RevOps alignment',
    color: 'bg-purple-600',
    icon: 'Users',
    systemPrompt: `You are a CRM & Growth Loops expert with advanced customer analytics capabilities.

CORE EXPERTISE:
- Customer lifecycle management and RFM segmentation
- Viral growth loops and K-factor optimization
- Marketing automation and journey orchestration
- RevOps alignment and customer success

TOOL USAGE GUIDELINES:
- Use web_search for customer behavior trends and industry benchmarks
- Use analyze_document for customer data and CRM analytics
- Focus on customer metrics, conversion rates, and retention analysis

RESPONSE FORMAT:
1. CUSTOMER ANALYSIS (segmentation and behavior insights)
2. GROWTH LOOPS (acquisition, retention, and viral mechanisms)
3. CRM RECOMMENDATIONS (automation and optimization strategies)
4. VIRAL GROWTH OPTIMIZATION (K-factor improvement strategies)
5. REVENUE IMPACT (LTV/CAC optimization and projections)

Always include specific customer metrics and conversion data.`,
    capabilities: [
      { name: 'Customer Segmentation', description: 'RFM analysis and customer profiling', enabled: true },
      { name: 'Growth Loops', description: 'Viral growth and retention optimization', enabled: true },
      { name: 'Marketing Automation', description: 'Journey orchestration and automation', enabled: true },
      { name: 'RevOps Alignment', description: 'Revenue operations optimization', enabled: true }
    ],
    tools: [WebSearchTool.definition, DocumentAnalysisTool.definition]
  },
  {
    id: 'research',
    name: 'research',
    displayName: 'Research & Intelligence',
    description: 'Chief Insights Officer specializing in multi-source research, executive analysis, competitive intelligence, and C-suite decision support insights',
    color: 'bg-orange-600',
    icon: 'Search',
    systemPrompt: `You are a Research & Intelligence expert with comprehensive analytical capabilities.

CORE EXPERTISE:
- Multi-source research and data synthesis
- Competitive intelligence and market analysis
- Executive insights and C-suite decision support
- Trend analysis and predictive intelligence

TOOL USAGE GUIDELINES:
- Use web_search extensively for current market intelligence and trends
- Use analyze_document for comprehensive document research
- Synthesize multiple sources for comprehensive insights

RESPONSE FORMAT:
1. MARKET INSIGHTS (current trends and intelligence)
2. KEY FINDINGS (research-backed discoveries)
3. COMPETITIVE INTELLIGENCE (market positioning and threats)
4. STRATEGIC RECOMMENDATIONS (data-driven action items)
5. PREDICTIVE ANALYSIS (trend forecasting and implications)

Provide comprehensive research with multiple source validation.`,
    capabilities: [
      { name: 'Market Research', description: 'Comprehensive market analysis and trends', enabled: true },
      { name: 'Competitive Intelligence', description: 'Competitor analysis and positioning', enabled: true },
      { name: 'Data Synthesis', description: 'Multi-source data integration and analysis', enabled: true },
      { name: 'Predictive Analysis', description: 'Trend forecasting and scenario planning', enabled: true }
    ],
    tools: [WebSearchTool.definition, DocumentAnalysisTool.definition]
  },
  {
    id: 'brand-power',
    name: 'brand-power',
    displayName: 'Brand Power',
    description: 'Senior Brand Equity consultant specializing in Kantar D×M×S methodology, Price Power optimization, and price premium maximization',
    color: 'bg-red-600',
    icon: 'Sparkles',
    systemPrompt: `You are a Brand Power expert with advanced brand analytics capabilities.

CORE EXPERTISE:
- Brand equity measurement using Kantar D×M×S methodology
- Price premium optimization and pricing power
- Brand positioning and differentiation strategies
- Brand health monitoring and improvement

TOOL USAGE GUIDELINES:
- Use web_search for brand benchmarking and industry standards
- Use analyze_document for brand performance and market data
- Focus on brand metrics, pricing analysis, and competitive positioning

RESPONSE FORMAT:
1. BRAND ASSESSMENT (current brand position and equity)
2. BRAND METRICS (awareness, consideration, and preference data)
3. INVESTMENT PRIORITIES (brand building recommendations)
4. KANTAR D×M×S ANALYSIS (Differentiation, Meaningfulness, Salience)
5. PRICING OPTIMIZATION (price premium opportunities and strategies)

Always include specific brand metrics and competitive comparisons.`,
    capabilities: [
      { name: 'Brand Equity Measurement', description: 'Comprehensive brand health assessment', enabled: true },
      { name: 'Pricing Power Analysis', description: 'Price premium optimization strategies', enabled: true },
      { name: 'Brand Positioning', description: 'Strategic brand positioning and differentiation', enabled: true },
      { name: 'Kantar Methodology', description: 'D×M×S framework implementation', enabled: true }
    ],
    tools: [WebSearchTool.definition, DocumentAnalysisTool.definition]
  }
];

// ===== MOTOR DE EJECUCIÓN DE AGENTES =====

export class AgentExecutionEngine {
  private static readonly API_CONFIG = {
    maxTokens: 1200,
    temperature: 0.1,
    timeout: 20000,
    maxRetries: 2,
    batchSize: 2, // Process 2 agents in parallel
    delayBetweenBatches: 500
  };

  static async run_all_agents(
    prompt: string,
    selectedAgents: Agent[],
    context: ExecutionContext
  ): Promise<AgentResponse[]> {
    console.log(`🚀 Starting enhanced agent execution for ${selectedAgents.length} agents`);
    
    // ✅ QA: Validación inicial
    if (!selectedAgents || selectedAgents.length === 0) {
      console.log('❌ QA: No agents selected');
      return [];
    }
    
    if (!prompt || prompt.trim().length === 0) {
      console.log('❌ QA: Empty prompt provided');
      return [];
    }
    
    const results: AgentResponse[] = [];
    const batchSize = this.API_CONFIG.batchSize;
    
    // Process agents in parallel batches
    for (let i = 0; i < selectedAgents.length; i += batchSize) {
      const batch = selectedAgents.slice(i, i + batchSize);
      const batchNumber = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(selectedAgents.length / batchSize);
      
      console.log(`⏳ Processing batch ${batchNumber}/${totalBatches} (${batch.length} agents)`);
      
      // Check for abort before each batch
      if (context.abortSignal?.aborted) {
        console.log('🛑 Execution aborted by user');
        // Add aborted status for remaining agents
        const remainingAgents = selectedAgents.slice(i);
        remainingAgents.forEach(agent => {
          results.push({
            agent,
            content: '🛑 Analysis stopped by user',
            status: 'error',
            created_at: new Date().toISOString()
          });
        });
        break;
      }
      
      // Process batch in parallel
      const batchPromises = batch.map(agent => this.executeAgent(agent, prompt, context));
      const batchResults = await Promise.all(batchPromises);
      
      results.push(...batchResults);
      
      // Delay between batches to avoid rate limits
      if (i + batchSize < selectedAgents.length && !context.abortSignal?.aborted) {
        await this.delay(this.API_CONFIG.delayBetweenBatches);
      }
    }
    
    console.log(`✅ Agent execution completed: ${results.length} responses`);
    return results;
  }

  private static async executeAgent(
    agent: Agent,
    prompt: string,
    context: ExecutionContext
  ): Promise<AgentResponse> {
    const startTime = Date.now();
    
    try {
      console.log(`🤖 Executing agent: ${agent.displayName}`);
      
      // Check for abort
      if (context.abortSignal?.aborted) {
        throw new Error('Execution aborted');
      }
      
      // Determine if tools are needed
      const toolDecision = await this.shouldUseTools(agent, prompt, context);
      let toolResults: ToolCall[] = [];
      
      // Execute tools if needed
      if (toolDecision.needsTools && agent.tools.length > 0) {
        console.log(`🔧 Agent ${agent.displayName} will use tools: ${toolDecision.tools.join(', ')}`);
        toolResults = await this.executeTools(agent, toolDecision.tools, toolDecision.parameters, context);
      }
      
      // Generate response with tool results
      const enhancedPrompt = this.buildEnhancedPrompt(prompt, context, toolResults);
      const response = await this.callLLM(agent, enhancedPrompt, context);
      
      const executionTime = Date.now() - startTime;
      console.log(`✅ Agent ${agent.displayName} completed in ${executionTime}ms`);
      
      return {
        agent,
        content: response,
        status: 'complete',
        created_at: new Date().toISOString(),
        toolCalls: toolResults,
        executionTime
      };
      
    } catch (error) {
      const executionTime = Date.now() - startTime;
      console.error(`❌ Agent ${agent.displayName} failed after ${executionTime}ms:`, error);
      
      // Handle abort error specifically
      if (error instanceof Error && (error.name === 'AbortError' || error.message.includes('aborted'))) {
        return {
          agent,
          content: 'Analysis stopped by user',
          status: 'error',
          created_at: new Date().toISOString(),
          executionTime
        };
      }
      
      return {
        agent,
        content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        status: 'error',
        created_at: new Date().toISOString(),
        executionTime
      };
    }
  }

  private static async shouldUseTools(
    agent: Agent,
    prompt: string,
    context: ExecutionContext
  ): Promise<{ needsTools: boolean; tools: string[]; parameters: Record<string, any> }> {
    // Simple heuristic for tool usage
    const lowerPrompt = prompt.toLowerCase();
    const hasFiles = context.processedFiles && context.processedFiles.length > 0;
    
    const needsWebSearch = 
      lowerPrompt.includes('market') ||
      lowerPrompt.includes('competitor') ||
      lowerPrompt.includes('industry') ||
      lowerPrompt.includes('trend') ||
      lowerPrompt.includes('benchmark') ||
      lowerPrompt.includes('current') ||
      lowerPrompt.includes('latest');
    
    const needsDocumentAnalysis = hasFiles && (
      lowerPrompt.includes('analyze') ||
      lowerPrompt.includes('review') ||
      lowerPrompt.includes('document') ||
      lowerPrompt.includes('file') ||
      lowerPrompt.includes('data')
    );
    
    const tools: string[] = [];
    const parameters: Record<string, any> = {};
    
    if (needsWebSearch) {
      tools.push('web_search');
      parameters.web_search = {
        query: this.extractSearchQuery(prompt, agent),
        maxResults: 5
      };
    }
    
    if (needsDocumentAnalysis && hasFiles) {
      tools.push('analyze_document');
      parameters.analyze_document = {
        documentId: context.processedFiles![0].name, // Use first document
        analysisType: this.determineAnalysisType(agent.id)
      };
    }
    
    return {
      needsTools: tools.length > 0,
      tools,
      parameters
    };
  }

  private static extractSearchQuery(prompt: string, agent: Agent): string {
    // Extract relevant search terms based on agent expertise and prompt
    const agentKeywords = {
      'strategic-planning': 'strategic planning market analysis',
      'zbg': 'zero based growth business transformation',
      'crm': 'customer relationship management growth loops',
      'research': 'market research competitive intelligence',
      'brand-power': 'brand equity brand power analysis'
    };
    
    const baseQuery = agentKeywords[agent.id as keyof typeof agentKeywords] || 'business analysis';
    
    // Extract key terms from prompt
    const keyTerms = prompt.match(/\b(?:market|competitor|industry|trend|growth|strategy|customer|brand)\w*\b/gi) || [];
    const uniqueTerms = [...new Set(keyTerms)].slice(0, 3);
    
    return uniqueTerms.length > 0 ? `${baseQuery} ${uniqueTerms.join(' ')}` : baseQuery;
  }

  private static determineAnalysisType(agentId: string): string {
    const analysisMap = {
      'strategic-planning': 'strategic',
      'zbg': 'financial',
      'crm': 'operational',
      'research': 'strategic',
      'brand-power': 'strategic'
    };
    
    return analysisMap[agentId as keyof typeof analysisMap] || 'general';
  }

  private static async executeTools(
    agent: Agent,
    toolNames: string[],
    parameters: Record<string, any>,
    context: ExecutionContext
  ): Promise<ToolCall[]> {
    const toolCalls: ToolCall[] = [];
    
    for (const toolName of toolNames) {
      const tool = agent.tools.find(t => t.name === toolName);
      if (!tool) continue;
      
      const startTime = Date.now();
      
      try {
        console.log(`🔧 Executing tool: ${toolName}`);
        
        const result = await tool.handler(parameters[toolName], context);
        const executionTime = Date.now() - startTime;
        
        toolCalls.push({
          toolName,
          parameters: parameters[toolName],
          result,
          executionTime
        });
        
        console.log(`✅ Tool ${toolName} completed in ${executionTime}ms`);
        
      } catch (error) {
        const executionTime = Date.now() - startTime;
        console.error(`❌ Tool ${toolName} failed:`, error);
        
        toolCalls.push({
          toolName,
          parameters: parameters[toolName],
          result: {
            success: false,
            error: error instanceof Error ? error.message : 'Tool execution failed'
          },
          executionTime
        });
      }
    }
    
    return toolCalls;
  }

  private static buildEnhancedPrompt(
    originalPrompt: string,
    context: ExecutionContext,
    toolResults: ToolCall[]
  ): string {
    let enhancedPrompt = originalPrompt;
    
    // Add file context
    if (context.processedFiles && context.processedFiles.length > 0) {
      enhancedPrompt += '\n\nPROCESSED FILES:\n';
      context.processedFiles.forEach((file, index) => {
        enhancedPrompt += `${index + 1}. ${file.name}: ${file.summary}\n`;
        if (file.extractedData?.keyPoints) {
          enhancedPrompt += `   Key Points: ${file.extractedData.keyPoints.slice(0, 3).join(', ')}\n`;
        }
      });
    }
    
    // Add tool results
    if (toolResults.length > 0) {
      enhancedPrompt += '\n\nTOOL RESULTS:\n';
      toolResults.forEach(toolCall => {
        if (toolCall.result.success) {
          enhancedPrompt += `\n${toolCall.toolName.toUpperCase()} RESULTS:\n`;
          
          if (toolCall.toolName === 'web_search' && toolCall.result.data) {
            const searchData = toolCall.result.data;
            enhancedPrompt += `Query: ${searchData.query}\n`;
            searchData.results.forEach((result: any, index: number) => {
              enhancedPrompt += `${index + 1}. ${result.title}\n   ${result.snippet}\n`;
            });
          }
          
          if (toolCall.toolName === 'analyze_document' && toolCall.result.data) {
            const docData = toolCall.result.data;
            enhancedPrompt += `Document: ${docData.documentName}\n`;
            enhancedPrompt += `Analysis Type: ${docData.analysisType}\n`;
            if (docData.insights) {
              enhancedPrompt += `Key Insights: ${JSON.stringify(docData.insights, null, 2)}\n`;
            }
          }
        }
      });
    }
    
    return enhancedPrompt;
  }

  private static async callLLM(
    agent: Agent,
    prompt: string,
    context: ExecutionContext
  ): Promise<string> {
    // ✅ PRODUCTION: Usar rate limiter y circuit breaker
    const { API_RATE_LIMITS } = await import('./rateLimiter');
    const { CIRCUIT_BREAKERS } = await import('./circuitBreaker');
    const { apiMonitor } = await import('./apiMonitor');
    
    const deepseekApiKey = import.meta.env.VITE_DEEPSEEK_API_KEY;
    
    if (!deepseekApiKey) {
      throw new Error('DeepSeek API key not configured');
    }
    
    return await API_RATE_LIMITS.deepseek.enqueue(async () => {
      return await CIRCUIT_BREAKERS.deepseek.execute(async () => {
        const startTime = Date.now();
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.API_CONFIG.timeout);
        
        // Combine abort signals
        const combinedSignal = context.abortSignal ? 
          this.combineAbortSignals([context.abortSignal, controller.signal]) : 
          controller.signal;
        
        try {
          const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${deepseekApiKey}`,
              'Content-Type': 'application/json',
            },
            signal: combinedSignal,
            body: JSON.stringify({
              model: 'deepseek-chat',
              messages: [
                { role: 'system', content: agent.systemPrompt },
                { role: 'user', content: prompt.substring(0, 8000) }
              ],
              max_tokens: this.API_CONFIG.maxTokens,
              temperature: this.API_CONFIG.temperature,
              stream: false
            })
          });
          
          clearTimeout(timeoutId);
          
          const responseTime = Date.now() - startTime;
          apiMonitor.recordAPICall('deepseek', response.ok, responseTime);
          
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`DeepSeek API error: ${response.status} - ${errorData.error?.message || response.statusText}`);
          }
          
          const data = await response.json();
          return data.choices[0].message.content;
          
        } catch (error) {
          clearTimeout(timeoutId);
          const responseTime = Date.now() - startTime;
          apiMonitor.recordAPICall('deepseek', false, responseTime);
          throw error;
        }
      });
    }, 1); // Priority 1 for agent calls
  }

  private static combineAbortSignals(signals: AbortSignal[]): AbortSignal {
    const controller = new AbortController();
    
    signals.forEach(signal => {
      if (signal.aborted) {
        controller.abort();
      } else {
        signal.addEventListener('abort', () => controller.abort());
      }
    });
    
    return controller.signal;
  }

  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ===== FUNCIONES DE UTILIDAD =====

export function getAgentById(id: string): Agent | undefined {
  return AGENTS.find(agent => agent.id === id);
}

export function getAgentsByIds(ids: string[]): Agent[] {
  return ids.map(id => getAgentById(id)).filter((agent): agent is Agent => agent !== undefined);
}

export async function saveAgentResponse(response: AgentResponse, chatId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('agent_responses')
      .insert({
        chat_id: chatId,
        agent_id: response.agent.id,
        content: response.content,
        status: response.status,
        tool_calls: response.toolCalls || [],
        execution_time: response.executionTime,
        created_at: response.created_at
      });
    
    if (error) {
      console.error('Error saving agent response:', error);
    }
  } catch (error) {
    console.error('Failed to save agent response:', error);
  }
}

// ===== EXPORTACIONES PRINCIPALES =====

export { AgentExecutionEngine };
export const run_all_agents = AgentExecutionEngine.run_all_agents;

// Export default para compatibilidad
export default {
  AGENTS,
  AgentExecutionEngine,
  run_all_agents,
  getAgentById,
  getAgentsByIds,
  saveAgentResponse
};
