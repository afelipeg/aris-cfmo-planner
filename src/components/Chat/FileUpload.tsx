import React, { useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import { Paperclip, X, File, Image, FileText, Database, Code, AlertCircle, CheckCircle } from 'lucide-react';

interface FileUploadProps {
  files: File[];
  onFilesChange: (files: File[]) => void;
  maxFiles?: number;
  acceptedTypes?: string[];
}

export const FileUpload: React.FC<FileUploadProps> = ({
  files,
  onFilesChange,
  maxFiles = 5,
  acceptedTypes = [
    'text/plain',
    'text/csv', 
    'application/json',
    'text/html',
    'text/markdown',
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp'
  ]
}) => {
  // Log file count changes for debugging
  useEffect(() => {
    console.log('📎 FileUpload - files count changed:', files.length);
  }, [files]);

  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: any[]) => {
    console.log('📁 Files dropped:', {
      accepted: acceptedFiles.length,
      rejected: rejectedFiles.length,
      current: files.length
    });
    
    // ✅ QA CYCLE 2: Handle rejected files with Chrome compatibility
    if (rejectedFiles.length > 0) {
      console.warn('⚠️ QA CYCLE 2: Some files were rejected:', rejectedFiles.map(f => ({
        name: f.file?.name,
        type: f.file?.type,
        size: f.file?.size,
        errors: f.errors?.map((e: any) => e.message)
      })));
    }
    
    // ✅ QA CYCLE 2: Validar archivos para Chrome
    const validFiles = acceptedFiles.filter(file => {
      // Validación específica para Chrome
      if (!file.name || file.name.trim() === '') {
        console.warn('⚠️ QA CYCLE 2: File without name rejected');
        return false;
      }
      
      if (file.size === 0) {
        console.warn('⚠️ QA CYCLE 2: Empty file rejected:', file.name);
        return false;
      }
      
      if (file.size > 10 * 1024 * 1024) { // 10MB
        console.warn('⚠️ QA CYCLE 2: File too large rejected:', file.name, file.size);
        return false;
      }
      
      return true;
    });
    
    console.log('✅ QA CYCLE 2: Valid files after Chrome validation:', validFiles.length);
    
    const newFiles = [...files, ...validFiles].slice(0, maxFiles);
    console.log('📎 Setting new files:', newFiles.length);
    onFilesChange(newFiles);
  }, [files, onFilesChange, maxFiles]);

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    // ✅ GROK FIX 4: Enfoque flexible mejorado con validación robusta
    accept: {
      'text/plain': ['.txt'],
      'text/csv': ['.csv'],
      'application/json': ['.json'],
      'text/html': ['.html', '.htm'],
      'text/markdown': ['.md', '.markdown'],
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/msword': ['.doc'], // ✅ GROK FIX: Agregado .doc
      'application/vnd.ms-excel': ['.xls'], // ✅ GROK FIX: Agregado .xls
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/gif': ['.gif'],
      'image/webp': ['.webp'],
      // ✅ GROK FIX 4: Tipos adicionales para mayor compatibilidad
      'application/vnd.ms-powerpoint': ['.ppt'],
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
      'text/xml': ['.xml'],
      'application/xml': ['.xml']
    },
    maxFiles: maxFiles - files.length,
    disabled: files.length >= maxFiles,
    maxSize: 25 * 1024 * 1024, // ✅ GROK FIX: Aumentado a 25MB
    // ✅ QA CYCLE 2: Configuración específica para Chrome
    multiple: true,
    preventDropOnDocument: true,
    noClick: false,
    noKeyboard: false,
    // ✅ PRODUCTION: Configuración específica para Safari
    useFsAccessApi: false, // Disable for Safari compatibility
    // ✅ GROK FIX 4: Validación robusta mejorada
    validator: (file) => {
      console.log('🔍 BROWSER: Validating file:', file.name, file.type, file.size, 'Browser:', navigator.userAgent.includes('Chrome') ? 'Chrome' : 'Safari');
      
      // ✅ PRODUCTION: Validación específica para Safari
      if (navigator.userAgent.includes('Safari') && !navigator.userAgent.includes('Chrome')) {
        // Safari-specific validations
        if (file.size === 0) {
          return {
            code: 'file-empty-safari',
            message: 'Safari detected empty file. Please try again.'
          };
        }
      }
      
      // ✅ CHROME FIX: Validación específica para Chrome
      if (navigator.userAgent.includes('Chrome')) {
        // Chrome-specific validations
        if (!file.lastModified || file.lastModified === 0) {
          console.warn('❌ CHROME: File without lastModified detected');
          // Don't reject, just warn
        }
      }
      
      // ✅ GROK FIX: Validación de nombre de archivo
      if (!file.name || file.name.trim() === '') {
        console.warn('❌ GROK: Invalid file name');
        return {
          code: 'name-invalid',
          message: 'Nombre de archivo requerido'
        };
      }
      
      // ✅ GROK FIX: Validación de tamaño
      if (file.size === 0) {
        console.warn('❌ GROK: Empty file');
        return {
          code: 'file-empty',
          message: 'El archivo está vacío'
        };
      }
      
      if (file.size > 25 * 1024 * 1024) {
        console.warn('❌ GROK: File too large:', file.size);
        return {
          code: 'file-too-large',
          message: `Archivo demasiado grande: ${Math.round(file.size / 1024 / 1024)}MB. Máximo: 25MB`
        };
      }
      
      // ✅ GROK FIX: Validación de extensión mejorada
      const extension = file.name.split('.').pop()?.toLowerCase();
      const allowedExtensions = [
        'txt', 'csv', 'json', 'html', 'htm', 'md', 'markdown', 
        'pdf', 'docx', 'xlsx', 'doc', 'xls', 'ppt', 'pptx',
        'jpg', 'jpeg', 'png', 'gif', 'webp', 'xml'
      ];
      
      if (!extension || !allowedExtensions.includes(extension)) {
        console.warn('❌ GROK: Invalid file type:', extension);
        return {
          code: 'file-invalid-type',
          message: `Tipo de archivo .${extension || 'desconocido'} no soportado`
        };
      }
      
      console.log('✅ GROK: File validation passed');
      return null; // File is valid
    }
  });

  const removeFile = (index: number) => {
    console.log('🗑️ Removing file at index:', index);
    const newFiles = files.filter((_, i) => i !== index);
    console.log('📎 Files after removal:', newFiles.length);
    onFilesChange(newFiles);
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) {
      return <Image size={14} className="text-blue-500" />;
    } else if (file.type.includes('pdf')) {
      return <FileText size={14} className="text-red-500" />;
    } else if (file.type.includes('document') || file.type.includes('word')) {
      return <FileText size={14} className="text-blue-600" />;
    } else if (file.type.includes('spreadsheet') || file.type.includes('excel')) {
      return <Database size={14} className="text-green-600" />;
    } else if (file.type === 'application/json' || file.type === 'text/csv') {
      return <Code size={14} className="text-purple-500" />;
    }
    return <File size={14} className="text-gray-500" />;
  };

  const getFileTypeLabel = (file: File) => {
    if (file.type.startsWith('image/')) return 'Image';
    if (file.type.includes('pdf')) return 'PDF';
    if (file.type.includes('document')) return 'Document';
    if (file.type.includes('spreadsheet')) return 'Spreadsheet';
    if (file.type === 'application/json') return 'JSON';
    if (file.type === 'text/csv') return 'CSV';
    if (file.type.startsWith('text/')) return 'Text';
    return 'File';
  };

  const getProcessingCapability = (file: File) => {
    if (file.type.startsWith('text/') || file.type === 'application/json' || file.type === 'text/csv') {
      return { level: 'full', description: 'Full content extraction' };
    } else if (file.type === 'application/pdf' || file.type.includes('document') || file.type.includes('spreadsheet')) {
      return { level: 'contextual', description: 'Contextual business analysis' };
    } else if (file.type.startsWith('image/')) {
      return { level: 'metadata', description: 'Metadata and context analysis' };
    }
    return { level: 'basic', description: 'Basic file information' };
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-3">
      {/* Compact Upload Area */}
      <div
        {...getRootProps()}
        className={`relative border-2 border-dashed rounded-lg p-2 transition-all cursor-pointer ${
          isDragActive && !isDragReject
            ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20'
            : isDragReject
            ? 'border-red-400 bg-red-50 dark:bg-red-900/20'
            : files.length >= maxFiles
            ? 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 cursor-not-allowed'
            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700'
        }`}
      >
        <input {...getInputProps()} />
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <Paperclip size={14} className={`${
              isDragActive && !isDragReject ? 'text-blue-500' : 
              isDragReject ? 'text-red-500' : 'text-gray-500 dark:text-gray-400'
            }`} />
            {isDragReject && <AlertCircle size={12} className="text-red-500" />}
          </div>
          
          <div className="text-xs">
            {isDragActive && !isDragReject ? (
              <span className="text-blue-700 dark:text-blue-400 font-medium">Drop files here...</span>
            ) : isDragReject ? (
              <span className="text-red-700 dark:text-red-400 font-medium">Some files are not supported</span>
            ) : files.length >= maxFiles ? (
              <span className="text-gray-500 dark:text-gray-400">Maximum {maxFiles} files reached</span>
            ) : (
              <>
                <span className="text-gray-700 dark:text-gray-300 font-medium">
                  Drop files or click to browse
                </span>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  PDF, Images, Documents • Max 10MB
                </div>
              </>
            )}
          </div>
          
          {/* Compact file count */}
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {files.length}/{maxFiles} files
          </div>
        </div>
      </div>

      {/* File List */}
      <AnimatePresence>
        {files.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-2"
          >
            <div className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
              <FileText size={14} />
              Attached Files ({files.length})
            </div>
            
            {files.map((file, index) => {
              const capability = getProcessingCapability(file);
              
              return (
                <motion.div
                  key={`${file.name}-${index}-${file.size}`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="flex items-center gap-3 p-2 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm"
                >
                  <div className="flex-shrink-0">
                    {getFileIcon(file)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {file.name}
                      </p>
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                        {getFileTypeLabel(file)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                      <span>{formatFileSize(file.size)}</span>
                      <span>•</span>
                      <span className={`flex items-center gap-1 ${
                        capability.level === 'full' ? 'text-green-600 dark:text-green-400' :
                        capability.level === 'contextual' ? 'text-blue-600 dark:text-blue-400' :
                        'text-orange-600 dark:text-orange-400'
                      }`}>
                        <CheckCircle size={10} />
                        {capability.description}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${
                      capability.level === 'full' ? 'bg-green-400' :
                      capability.level === 'contextual' ? 'bg-blue-400' :
                      'bg-orange-400'
                    }`} title="Processing capability" />
                    <button
                      onClick={() => removeFile(index)}
                      className="text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors p-1 rounded"
                      title="Remove file"
                    >
                      <X size={12} />
                    </button>
                  </div>
                </motion.div>
              );
            })}
            
            <div className="text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 p-2 rounded border border-blue-200 dark:border-blue-800">
              <div className="flex items-start gap-2">
                <CheckCircle size={12} className="mt-0.5 flex-shrink-0" />
                <div>
                  <strong>Enhanced Analysis:</strong> All agents will analyze your files using advanced contextual understanding and business intelligence frameworks.
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};