import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Upload, 
  FileText, 
  Download, 
  Trash2, 
  AlertCircle, 
  CheckCircle, 
  Clock,
  Target,
  Users,
  BarChart3,
  Eye,
  Loader
} from 'lucide-react';
import { DocumentService, DocumentAnalysisRequest, DocumentAnalysisResult } from '../../lib/documentService';
import { useAuth } from '../../contexts/AuthContext';

interface UploadedFile {
  id: string;
  originalFile: File;
  status: 'pending' | 'analyzing' | 'completed' | 'error';
  result?: DocumentAnalysisResult;
  error?: string;
}

export const DocumentUploader: React.FC = () => {
  const { user } = useAuth();
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [analysisType, setAnalysisType] = useState<'summary' | 'detailed' | 'key_insights' | 'data_analysis'>('summary');
  const [targetAudience, setTargetAudience] = useState<'executive' | 'technical' | 'marketing' | 'financial'>('executive');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles: UploadedFile[] = acceptedFiles.map(file => ({
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      originalFile: file,
      status: 'pending'
    }));
    
    setFiles(prev => [...prev, ...newFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'text/csv': ['.csv'],
      'text/plain': ['.txt'],
      'application/json': ['.json']
    },
    maxSize: 25 * 1024 * 1024, // 25MB
    maxFiles: 5
  });

  // OPTIMIZED: Faster file analysis
  const analyzeFile = async (file: UploadedFile) => {
    try {
      console.log(`📄 Starting analysis for: ${file.originalFile.name}`);
      
      // Update status to analyzing
      setFiles(prev => prev.map(f => 
        f.id === file.id ? { ...f, status: 'analyzing' } : f
      ));

      // Convert file to base64 (optimized)
      const base64Data = await DocumentService.fileToBase64(file.originalFile);

      // Prepare request
      const request: DocumentAnalysisRequest = {
        file_data: base64Data,
        file_name: file.originalFile.name || 'unknown',
        analysis_type: analysisType,
        target_audience: targetAudience,
        user_id: user?.id
      };

      // Analyze document with timeout
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Analysis timeout after 30 seconds')), 30000)
      );

      const analysisPromise = DocumentService.analyzeDocument(request);
      const response = await Promise.race([analysisPromise, timeoutPromise]) as any;

      if (response.success && response.data) {
        // Update with successful result
        setFiles(prev => prev.map(f => 
          f.id === file.id ? { 
            ...f, 
            status: 'completed', 
            result: response.data 
          } : f
        ));
        console.log(`✅ Analysis completed for: ${file.originalFile.name}`);
      } else {
        // Update with error
        setFiles(prev => prev.map(f => 
          f.id === file.id ? { 
            ...f, 
            status: 'error', 
            error: response.error || 'Error desconocido' 
          } : f
        ));
      }
    } catch (error) {
      console.error('Error analyzing file:', error);
      setFiles(prev => prev.map(f => 
        f.id === file.id ? { 
          ...f, 
          status: 'error', 
          error: error instanceof Error ? error.message : 'Error desconocido' 
        } : f
      ));
    }
  };

  // OPTIMIZED: Faster batch analysis
  const analyzeAllFiles = async () => {
    setIsAnalyzing(true);
    const pendingFiles = files.filter(f => f.status === 'pending');
    
    console.log(`🚀 Starting batch analysis for ${pendingFiles.length} files`);
    
    // Process files in smaller batches for better performance
    const batchSize = 2;
    for (let i = 0; i < pendingFiles.length; i += batchSize) {
      const batch = pendingFiles.slice(i, i + batchSize);
      console.log(`⏳ Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(pendingFiles.length/batchSize)}`);
      
      await Promise.all(batch.map(file => analyzeFile(file)));
      
      // Small delay between batches
      if (i + batchSize < pendingFiles.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    setIsAnalyzing(false);
    console.log('✅ Batch analysis completed');
  };

  const removeFile = (fileId: string) => {
    setFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const downloadResult = (file: UploadedFile) => {
    if (!file.result) return;
    
    const dataStr = JSON.stringify(file.result, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `analysis-${file.originalFile.name || 'unknown'}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock size={16} className="text-yellow-500" />;
      case 'analyzing': return <Loader size={16} className="text-blue-500 animate-spin" />;
      case 'completed': return <CheckCircle size={16} className="text-green-500" />;
      case 'error': return <AlertCircle size={16} className="text-red-500" />;
      default: return null;
    }
  };

  const analysisTypeOptions = [
    { value: 'summary', label: 'Resumen Ejecutivo', icon: Eye, description: 'Resumen conciso y puntos clave' },
    { value: 'detailed', label: 'Análisis Detallado', icon: FileText, description: 'Análisis profundo y completo' },
    { value: 'key_insights', label: 'Insights Clave', icon: Target, description: 'Insights más importantes y accionables' },
    { value: 'data_analysis', label: 'Análisis de Datos', icon: BarChart3, description: 'Patrones, tendencias y anomalías' }
  ];

  const audienceOptions = [
    { value: 'executive', label: 'Ejecutivo', icon: Users, description: 'C-level, enfoque en ROI y decisiones estratégicas' },
    { value: 'technical', label: 'Técnico', icon: FileText, description: 'Detalles metodológicos e implementación' },
    { value: 'marketing', label: 'Marketing', icon: Target, description: 'Insights de consumidor y oportunidades' },
    { value: 'financial', label: 'Financiero', icon: BarChart3, description: 'Métricas, proyecciones y P&L' }
  ];

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Análisis de Documentos
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Sube documentos empresariales y obtén insights inteligentes con IA
        </p>
      </div>

      {/* Configuration */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Analysis Type */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Tipo de Análisis
          </h3>
          <div className="space-y-3">
            {analysisTypeOptions.map((option) => (
              <label
                key={option.value}
                className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                  analysisType === option.value
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <input
                  type="radio"
                  name="analysisType"
                  value={option.value}
                  checked={analysisType === option.value}
                  onChange={(e) => setAnalysisType(e.target.value as any)}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <option.icon size={16} />
                    <span className="font-medium text-gray-900 dark:text-white">
                      {option.label}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {option.description}
                  </p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Target Audience */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Audiencia Objetivo
          </h3>
          <div className="space-y-3">
            {audienceOptions.map((option) => (
              <label
                key={option.value}
                className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                  targetAudience === option.value
                    ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <input
                  type="radio"
                  name="targetAudience"
                  value={option.value}
                  checked={targetAudience === option.value}
                  onChange={(e) => setTargetAudience(e.target.value as any)}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <option.icon size={16} />
                    <span className="font-medium text-gray-900 dark:text-white">
                      {option.label}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {option.description}
                  </p>
                </div>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* File Upload Area */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
          isDragActive
            ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20'
            : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
        }`}
      >
        <input {...getInputProps()} />
        <Upload size={48} className="mx-auto text-gray-400 mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          {isDragActive ? 'Suelta los archivos aquí' : 'Arrastra archivos o haz clic para seleccionar'}
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          Soporta: PDF, Word, Excel, CSV, TXT, JSON • Máximo 25MB por archivo
        </p>
        <div className="flex flex-wrap justify-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">PDF</span>
          <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">DOCX</span>
          <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">XLSX</span>
          <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">CSV</span>
          <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">TXT</span>
          <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">JSON</span>
        </div>
      </div>

      {/* Files List */}
      <AnimatePresence>
        {files.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700"
          >
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Archivos ({files.length})
                </h3>
                {files.some(f => f.status === 'pending') && (
                  <button
                    onClick={analyzeAllFiles}
                    disabled={isAnalyzing}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors flex items-center gap-2"
                  >
                    {isAnalyzing ? (
                      <Loader size={16} className="animate-spin" />
                    ) : (
                      <BarChart3 size={16} />
                    )}
                    {isAnalyzing ? 'Analizando...' : 'Analizar Todos'}
                  </button>
                )}
              </div>
            </div>

            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {files.map((file) => (
                <motion.div
                  key={file.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="p-6"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                        <span className="text-lg">
                          {DocumentService.getFileTypeIcon((file.originalFile.name || '').split('.').pop() || '')}
                        </span>
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {file.originalFile.name || 'Archivo sin nombre'}
                        </h4>
                        {getStatusIcon(file.status)}
                      </div>
                      
                      <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 mb-2">
                        <span>{DocumentService.formatFileSize(file.originalFile.size)}</span>
                        <span className={`px-2 py-1 rounded ${DocumentService.getAnalysisTypeColor(analysisType)}`}>
                          {analysisTypeOptions.find(opt => opt.value === analysisType)?.label}
                        </span>
                        <span className={`px-2 py-1 rounded ${DocumentService.getAudienceColor(targetAudience)}`}>
                          {audienceOptions.find(opt => opt.value === targetAudience)?.label}
                        </span>
                      </div>

                      {file.status === 'completed' && file.result && (
                        <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                              Análisis Completado
                            </span>
                            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                              <span>Confianza: {Math.round(file.result.metadata.confidence_score * 100)}%</span>
                              <span>•</span>
                              <span>{file.result.metadata.processing_time_ms}ms</span>
                            </div>
                          </div>
                          
                          <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
                            {file.result.analysis.summary.substring(0, 200)}...
                          </p>
                          
                          {file.result.analysis.key_insights.length > 0 && (
                            <div className="mb-3">
                              <h5 className="text-xs font-medium text-gray-900 dark:text-white mb-1">
                                Insights Clave:
                              </h5>
                              <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                                {file.result.analysis.key_insights.slice(0, 3).map((insight, index) => (
                                  <li key={index} className="flex items-start gap-1">
                                    <span className="text-blue-500 mt-1">•</span>
                                    <span>{insight}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}

                      {file.status === 'error' && (
                        <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                          <p className="text-sm text-red-600 dark:text-red-400">
                            Error: {file.error}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {file.status === 'pending' && (
                        <button
                          onClick={() => analyzeFile(file)}
                          className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                          title="Analizar archivo"
                        >
                          <BarChart3 size={16} />
                        </button>
                      )}
                      
                      {file.status === 'completed' && file.result && (
                        <button
                          onClick={() => downloadResult(file)}
                          className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                          title="Descargar resultado"
                        >
                          <Download size={16} />
                        </button>
                      )}
                      
                      <button
                        onClick={() => removeFile(file.id)}
                        className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        title="Eliminar archivo"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Performance Info */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
            <BarChart3 size={20} className="text-white" />
          </div>
          <h3 className="font-semibold text-blue-900 dark:text-blue-300">
            Análisis Optimizado
          </h3>
        </div>
        <p className="text-sm text-blue-700 dark:text-blue-400">
          Sistema optimizado para máxima velocidad: procesamiento en lotes, timeouts configurados, 
          y análisis contextual empresarial para resultados rápidos y precisos.
        </p>
      </div>
    </div>
  );
};