import React, { useState } from 'react';
import { Upload, FileText, Video, BookOpen, X } from 'lucide-react';

interface FileUploadProps {
  onUploadComplete: (url: string) => void;
  fileType: 'book' | 'video' | 'note' | 'image';
  label?: string;
}

const FileUploadButton: React.FC<FileUploadProps> = ({ onUploadComplete, fileType, label }) => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string>('');
  const [uploadedFile, setUploadedFile] = useState<string>('');

  const getAcceptedTypes = () => {
    switch (fileType) {
      case 'book':
        return '.pdf,.epub';
      case 'video':
        return '.mp4,.webm,.ogg';
      case 'note':
        return '.pdf,.doc,.docx,.txt,.md';
      case 'image':
        return '.jpg,.jpeg,.png,.gif,.webp';
      default:
        return '*';
    }
  };

  const getIcon = () => {
    switch (fileType) {
      case 'book':
        return <BookOpen className="w-5 h-5" />;
      case 'video':
        return <Video className="w-5 h-5" />;
      case 'note':
        return <FileText className="w-5 h-5" />;
      case 'image':
        return <FileText className="w-5 h-5" />;
      default:
        return <Upload className="w-5 h-5" />;
    }
  };

  const getLabel = () => {
    if (label) return label;
    switch (fileType) {
      case 'book':
        return 'Upload Book (PDF/EPUB)';
      case 'video':
        return 'Upload Video (MP4/WebM)';
      case 'note':
        return 'Upload Notes (PDF/DOC)';
      case 'image':
        return 'Upload Image';
      default:
        return 'Upload File';
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (500MB max)
    if (file.size > 500 * 1024 * 1024) {
      setError('File size must be less than 500MB');
      return;
    }

    setUploading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`http://localhost:3001/api/learning-units/upload?type=${fileType}`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Upload failed');
      }

      const data = await response.json();
      const uploadedUrl = `http://localhost:3001${data.url}`;
      
      setUploadedFile(file.name);
      onUploadComplete(uploadedUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  const clearUpload = () => {
    setUploadedFile('');
    setError('');
    onUploadComplete('');
  };

  return (
    <div className="file-upload-button-container mb-4">
      {uploadedFile ? (
        <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center space-x-2">
            {getIcon()}
            <span className="text-sm font-medium text-green-800">
              ✅ Uploaded: {uploadedFile}
            </span>
          </div>
          <button
            type="button"
            onClick={clearUpload}
            className="text-red-600 hover:text-red-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div>
          <label className="flex items-center justify-center px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors">
            <input
              type="file"
              accept={getAcceptedTypes()}
              onChange={handleFileSelect}
              disabled={uploading}
              className="hidden"
            />
            <div className="flex items-center space-x-2">
              {getIcon()}
              <span className="text-sm font-medium text-gray-700">
                {uploading ? 'Uploading...' : getLabel()}
              </span>
            </div>
          </label>
          <p className="mt-1 text-xs text-gray-500">
            Max size: 500MB • Accepted: {getAcceptedTypes().replace(/\./g, '').toUpperCase()}
          </p>
        </div>
      )}

      {error && (
        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-800">
          {error}
        </div>
      )}
    </div>
  );
};

export default FileUploadButton;
