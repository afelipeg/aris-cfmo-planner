# Talos - Multi-Agent Business Intelligence Platform

A sophisticated business intelligence platform powered by specialized AI agents for strategic analysis, growth optimization, and data-driven insights.

## Features

### 🔐 Authentication
- **Multiple OAuth Providers**: Google, GitHub, and Apple Sign-In
- **Email/Password Authentication**: Traditional email-based authentication
- **Secure Session Management**: JWT-based authentication with Supabase
- **Password Reset**: Email-based password recovery

### 🤖 AI Agents
- **CFMO Multi-Agent System**: 5 specialized business consultants powered by DeepSeek Reasoner
  - Strategic Planning, Zero-Based Growth, CRM & Growth Loops, Research & Intelligence, Brand Power
- **Strategic Planner**: Advanced planning assistant using DeepSeek Reasoner for deep analysis
- **Document Analysis**: AI-powered document processing and business intelligence

### 📁 File Analysis
- **Document Upload**: Support for PDF, Word, Excel, CSV, JSON, images
- **Intelligent Processing**: Automatic content extraction and analysis
- **Business Intelligence**: Financial data, metrics, and strategy extraction
- **Multi-Agent Analysis**: Each agent analyzes files from their expertise

### 🌐 Internationalization
- **Multi-Language Support**: English and Spanish
- **Dynamic Translation**: Real-time language switching
- **Localized Content**: All UI elements and messages translated

### 🎨 Theming
- **Light/Dark Mode**: Full dark mode support
- **System Theme**: Automatic theme detection
- **Persistent Settings**: Theme preferences saved locally

### ⚙️ Settings & Data Management
- **Profile Management**: User information and preferences
- **Data Export**: Complete chat history and account data export
- **Privacy Controls**: Model training opt-in/out
- **Account Management**: Delete chats, log out all devices, delete account

## Technology Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS
- **Authentication**: Supabase Auth with OAuth2
- **Database**: PostgreSQL with Supabase
- **AI Integration**: DeepSeek Reasoner for all AI functionality
- **Web Search**: Serper.dev for real-time market intelligence
- **File Processing**: Advanced browser-based document analysis
- **Animations**: Framer Motion
- **Icons**: Lucide React

## Setup Instructions

### 1. Environment Variables

Create a `.env` file with the following variables:

\`\`\`env
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# DeepSeek API Configuration
VITE_DEEPSEEK_API_KEY=your_deepseek_api_key
VITE_DEEPSEEK_API_URL=https://api.deepseek.com/v1

# Serper API Configuration (for web search)
VITE_SERPER_API_KEY=your_serper_api_key

# App Configuration
VITE_APP_NAME=Talos
VITE_MAX_FILE_SIZE=10485760
\`\`\`

### 2. Supabase Setup

1. Create a new Supabase project
2. Run the database migrations in `supabase/migrations/`
3. Configure OAuth providers in Supabase Dashboard:

#### Google OAuth Setup:
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URIs:
   - `https://your-project.supabase.co/auth/v1/callback`
   - `http://localhost:3000/auth/callback` (for development)
6. Add Client ID and Secret to Supabase Auth settings

#### GitHub OAuth Setup:
1. Go to GitHub Settings > Developer settings > OAuth Apps
2. Create a new OAuth App
3. Set Authorization callback URL: `https://your-project.supabase.co/auth/v1/callback`
4. Add Client ID and Secret to Supabase Auth settings

#### Apple OAuth Setup:
1. Go to [Apple Developer Console](https://developer.apple.com/)
2. Create a new App ID and Service ID
3. Configure Sign in with Apple
4. Add redirect URI: `https://your-project.supabase.co/auth/v1/callback`
5. Add Service ID and Key to Supabase Auth settings

### 3. Database Schema

The application uses the following main tables:

- **users**: User profiles and metadata
- **chats**: Chat conversations
- **messages**: Individual messages with agent responses

Row Level Security (RLS) is enabled for all tables to ensure data privacy.

### 4. Development

\`\`\`bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
\`\`\`

### 5. Deployment

The application is configured for deployment on Netlify with proper redirects for SPA routing and OAuth callbacks.

## Security Features

- **Row Level Security**: Database-level access control
- **OAuth2 Authentication**: Industry-standard authentication
- **Data Encryption**: All data encrypted in transit and at rest
- **Privacy Controls**: User control over data usage
- **Secure File Handling**: Client-side file processing

## Usage

1. **Sign Up/Sign In**: Use OAuth providers or email/password
2. **Select Agents**: Choose one or more specialized business agents
3. **Upload Documents**: Attach relevant business documents for analysis
4. **Chat**: Ask questions and receive expert analysis from multiple agents
5. **Export Data**: Download your complete chat history and data

## Agent Capabilities

Each agent is specialized for specific business domains:

- **Strategic Planning**: Market analysis, competitive intelligence, growth strategies
- **ZBG Consultant**: Zero-based budgeting, portfolio optimization, pricing
- **CRM Specialist**: Customer lifecycle, retention, viral growth loops
- **Research Analyst**: Multi-source intelligence, executive insights
- **Brand Expert**: Brand equity measurement, price premium optimization

## File Analysis

The platform supports comprehensive file analysis:

- **Text Files**: Content extraction and business intelligence
- **Spreadsheets**: Data analysis and metric extraction
- **PDFs**: Document parsing and insight generation
- **Images**: Visual content analysis (with appropriate models)
- **JSON/CSV**: Structured data analysis

All agents automatically analyze uploaded files and reference specific data points in their responses.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.
