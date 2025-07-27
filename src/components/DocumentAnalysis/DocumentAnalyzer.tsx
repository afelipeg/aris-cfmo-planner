import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileText, Download, AlertCircle, CheckCircle, Loader, Eye, BarChart3 } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { DocumentService, DocumentAnalysisResult } from '../../lib/documentService';
import { useAuth } from '../../contexts/AuthContext';

interface DocumentAnalyzerProps {
  onAnalysisComplete?: (result: DocumentAnalysisResult) => void;
}

export const DocumentAnalyzer: React.FC<DocumentAnalyzerProps> = ({ onAnalysisComplete }) => {
  const { user } = useAuth();
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<DocumentAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [analysisType, setAnalysisType] = useState<'summary' | 'detailed' | 'key_insights' | 'data_analysis'>('summary');
  const [targetAudience, setTargetAudience] = useState<'executive' | 'technical' | 'marketing' | 'financial'>('executive');

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    const file = acceptedFiles[0];
    setError(null);
    setResult(null);
    setAnalyzing(true);

    try {
      console.log('📄 Iniciando análisis de documento:', file.name);
      
      // Validar tamaño del archivo
      if (!DocumentService.validateFileSize(file, 25)) {
        throw new Error(`File too large: ${DocumentService.formatFileSize(file.size)}. Maximum allowed: 25MB`);
      }

      // ✅ GROK FIX 1: Mostrar progreso para archivos grandes
      if (file.size > 5 * 1024 * 1024) {
        console.log('📁 Large file detected, this may take longer...');
      }

      const response = await DocumentService.analyzeFile(
        file,
        analysisType,
        targetAudience,
        user?.id
      );

      if (!response.success) {
        // ✅ GROK FIX 1: Usar error categorizado
        throw new Error(response.error || 'Error analyzing document');
      }

      setResult(response.data!);
      onAnalysisComplete?.(response.data!);
      console.log('✅ Análisis completado exitosamente');

    } catch (err) {
      console.error('❌ Error en análisis:', err);
      // ✅ GROK FIX 1: Mostrar error categorizado al usuario
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      
      // ✅ GROK FIX 1: Log técnico para debugging
      console.error('📊 Error details:', {
        fileName: file.name,
        fileSize: file.size,
        analysisType,
        targetAudience,
        error: err
      });
    } finally {
      setAnalyzing(false);
    }
  }, [analysisType, targetAudience, user?.id, onAnalysisComplete]);

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
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
    maxFiles: 1,
    maxSize: 25 * 1024 * 1024, // 25MB
    disabled: analyzing
  });

  const downloadResult = () => {
    if (!result) return;

    const dataStr = JSON.stringify(result, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `analysis-${result.file_info.name}-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Analizador de Documentos
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Sube un documento para obtener análisis inteligente con IA
        </p>
      </div>

      {/* Configuration */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Tipo de Análisis
          </label>
          <select
            value={analysisType}
            onChange={(e) => setAnalysisType(e.target.value as any)}
            disabled={analyzing}
            className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="summary">Resumen Ejecutivo</option>
            <option value="detailed">Análisis Detallado</option>
            <option value="key_insights">Insights Clave</option>
            <option value="data_analysis">Análisis de Datos</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Audiencia Objetivo
          </label>
          <select
            value={targetAudience}
            onChange={(e) => setTargetAudience(e.target.value as any)}
            disabled={analyzing}
            className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="executive">Ejecutivos</option>
            <option value="technical">Técnico</option>
            <option value="marketing">Marketing</option>
            <option value="financial">Financiero</option>
          </select>
        </div>
      </div>

      {/* Upload Area */}
      <div
        {...getRootProps()}
        className={`relative border-2 border-dashed rounded-lg p-8 transition-all cursor-pointer ${
          isDragActive && !isDragReject
            ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20'
            : isDragReject
            ? 'border-red-400 bg-red-50 dark:bg-red-900/20'
            : analyzing
            ? 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 cursor-not-allowed'
            : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700'
        }`}
      >
        <input {...getInputProps()} />
        <div className="text-center">
          <div className="flex items-center justify-center mb-4">
            {analyzing ? (
              <Loader size={48} className="text-blue-500 animate-spin" />
            ) : (
              <Upload size={48} className={`${
                isDragActive && !isDragReject ? 'text-blue-500' : 
                isDragReject ? 'text-red-500' : 'text-gray-400'
              }`} />
            )}
          </div>
          
          <div className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            {analyzing ? (
              'Analizando documento...'
            ) : isDragActive && !isDragReject ? (
              'Suelta el archivo aquí'
            ) : isDragReject ? (
              'Tipo de archivo no soportado'
            ) : (
              'Arrastra un archivo o haz clic para seleccionar'
            )}
          </div>
          
          {!analyzing && (
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Soporta: PDF, Word, Excel, CSV, TXT, JSON • Máximo 25MB
            </div>
          )}
        </div>
      </div>

      {/* Error Display */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"
          >
            <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
              <AlertCircle size={20} />
              <span className="font-medium">Error en el análisis</span>
            </div>
            <p className="text-red-600 dark:text-red-400 mt-1 text-sm">{error}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results Display */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="space-y-6"
          >
            {/* Success Header */}
            <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                  <CheckCircle size={20} />
                  <span className="font-medium">Análisis completado exitosamente</span>
                </div>
                <button
                  onClick={downloadResult}
                  className="flex items-center gap-2 px-3 py-1 bg-green-100 dark:bg-green-800 text-green-700 dark:text-green-300 rounded-lg hover:bg-green-200 dark:hover:bg-green-700 transition-colors text-sm"
                >
                  <Download size={14} />
                  Descargar
                </button>
              </div>
            </div>

            {/* File Info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <FileText size={16} className="text-blue-500" />
                  <span className="font-medium text-gray-900 dark:text-white">Archivo</span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">{result.file_info.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-500">
                  {result.file_info.type.toUpperCase()} • {result.file_info.size_kb} KB
                </p>
              </div>

              <div className="p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <BarChart3 size={16} className="text-green-500" />
                  <span className="font-medium text-gray-900 dark:text-white">Confianza</span>
                </div>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {Math.round(result.metadata.confidence_score * 100)}%
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500">
                  {result.metadata.processing_time_ms}ms
                </p>
              </div>

              <div className="p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Eye size={16} className="text-purple-500" />
                  <span className="font-medium text-gray-900 dark:text-white">Método</span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {result.metadata.extraction_method.replace(/_/g, ' ').toUpperCase()}
                </p>
                {result.file_info.pages && (
                  <p className="text-xs text-gray-500 dark:text-gray-500">
                    {result.file_info.pages} página{result.file_info.pages > 1 ? 's' : ''}
                  </p>
                )}
              </div>
            </div>

            {/* Analysis Results */}
            <div className="space-y-4">
              {/* Summary */}
              <div className="p-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                  Resumen Ejecutivo
                </h3>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                  {result.analysis.summary}
                </p>
              </div>

              {/* Key Insights */}
              {result.analysis.key_insights.length > 0 && (
                <div className="p-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                    Insights Clave
                  </h3>
                  <ul className="space-y-2">
                    {result.analysis.key_insights.map((insight, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                        <span className="text-gray-700 dark:text-gray-300">{insight}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Recommendations */}
              {result.analysis.recommendations.length > 0 && (
                <div className="p-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                    Recomendaciones
                  </h3>
                  <ul className="space-y-2">
                    {result.analysis.recommendations.map((recommendation, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0" />
                        <span className="text-gray-700 dark:text-gray-300">{recommendation}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Data Points */}
              {result.analysis.data_points && result.analysis.data_points.length > 0 && (
                <div className="p-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                    Puntos de Datos
                  </h3>
                  <div className="space-y-2">
                    {result.analysis.data_points.map((point, index) => (
                      <div key={index} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <pre className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                          {typeof point === 'string' ? point : JSON.stringify(point, null, 2)}
                        </pre>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
