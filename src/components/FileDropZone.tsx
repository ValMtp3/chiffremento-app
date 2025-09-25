import React, { useState, useRef } from 'react';
import { Upload, File, X } from 'lucide-react';

interface FileDropZoneProps {
  onFileSelect: (file: File) => void;
  selectedFile?: File;
  onClearFile?: () => void;
}

export const FileDropZone: React.FC<FileDropZoneProps> = ({
  onFileSelect,
  selectedFile,
  onClearFile
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      onFileSelect(files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      onFileSelect(files[0]);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="w-full">
      {selectedFile ? (
        <div className="bg-gray-800 border border-gray-600 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <File className="w-6 h-6 text-blue-500" />
              <div>
                <p className="text-white font-medium">{selectedFile.name}</p>
                <p className="text-gray-400 text-sm">{formatFileSize(selectedFile.size)}</p>
              </div>
            </div>
            {onClearFile && (
              <button
                onClick={onClearFile}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      ) : (
        <>
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={handleClick}
            className={`
              border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all duration-200
              ${isDragging 
                ? 'border-blue-500 bg-blue-500/10' 
                : 'border-gray-600 hover:border-gray-500 hover:bg-gray-800/50'
              }
            `}
          >
            <Upload className={`w-12 h-12 mx-auto mb-4 ${isDragging ? 'text-blue-500' : 'text-gray-400'}`} />
            <p className="text-lg font-semibold text-white mb-2">
              {isDragging ? 'Relâchez pour sélectionner' : 'Glissez-déposez votre fichier ici'}
            </p>
            <p className="text-gray-400">
              ou cliquez pour parcourir vos fichiers
            </p>
            <p className="text-gray-500 text-sm mt-2">
              Tous formats supportés
            </p>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileInputChange}
            className="hidden"
          />
        </>
      )}
    </div>
  );
};