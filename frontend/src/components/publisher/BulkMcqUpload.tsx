import React, { useState } from 'react';
import { Upload, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

interface BulkUploadResult {
  success: number;
  failed: number;
  errors: string[];
}

const BulkMcqUpload: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<BulkUploadResult | null>(null);
  const [error, setError] = useState<string>('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type !== 'text/csv' && !selectedFile.name.endsWith('.csv')) {
        setError('Please select a CSV file');
        return;
      }
      setFile(selectedFile);
      setError('');
      setResult(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file first');
      return;
    }

    setUploading(true);
    setError('');
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('http://localhost:3001/api/publisher-admin/mcqs/bulk-upload', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();
      setResult(data);
      setFile(null);
      
      // Reset file input
      const fileInput = document.getElementById('csvFile') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload CSV');
    } finally {
      setUploading(false);
    }
  };

  const downloadTemplate = () => {
    const csvContent = `question,optionA,optionB,optionC,optionD,optionE,correctAnswer,subject,topic,difficultyLevel,bloomsLevel,competencyIds,tags,year,source
"What is the normal heart rate?","60-100 bpm","40-60 bpm","100-120 bpm","120-140 bpm","","A","Physiology","Cardiovascular System","Easy","Remember","comp123,comp456","cardiology,vitals","2024","NEET PG"`;
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mcq_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Bulk MCQ Upload</h2>
        <p className="text-gray-600">Upload multiple MCQs at once using a CSV file</p>
      </div>

      {/* CSV Format Instructions */}
      <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <div className="flex items-start">
          <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 mr-2 flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-blue-900 mb-2">CSV Format Requirements</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• <strong>Required columns:</strong> question, optionA, optionB, optionC, optionD, correctAnswer</li>
              <li>• <strong>Optional columns:</strong> optionE, subject, topic, difficultyLevel, bloomsLevel, competencyIds, tags, year, source</li>
              <li>• <strong>correctAnswer:</strong> Must be A, B, C, D, or E</li>
              <li>• <strong>competencyIds:</strong> Comma-separated list (e.g., "comp123,comp456")</li>
              <li>• <strong>tags:</strong> Comma-separated keywords</li>
            </ul>
            <button
              onClick={downloadTemplate}
              className="mt-3 text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              Download CSV Template
            </button>
          </div>
        </div>
      </div>

      {/* File Upload Area */}
      <div className="mb-6">
        <label htmlFor="csvFile" className="block text-sm font-medium text-gray-700 mb-2">
          Select CSV File
        </label>
        <div className="flex items-center space-x-4">
          <input
            type="file"
            id="csvFile"
            accept=".csv"
            onChange={handleFileChange}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
          <button
            onClick={handleUpload}
            disabled={!file || uploading}
            className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            <Upload className="w-4 h-4" />
            <span>{uploading ? 'Uploading...' : 'Upload'}</span>
          </button>
        </div>
        {file && (
          <p className="mt-2 text-sm text-gray-600">
            Selected: <span className="font-medium">{file.name}</span> ({(file.size / 1024).toFixed(2)} KB)
          </p>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 rounded-lg border border-red-200 flex items-start">
          <XCircle className="w-5 h-5 text-red-600 mt-0.5 mr-2 flex-shrink-0" />
          <div className="text-red-800">{error}</div>
        </div>
      )}

      {/* Result Display */}
      {result && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-green-600 font-medium">Successful</div>
                  <div className="text-2xl font-bold text-green-800">{result.success}</div>
                </div>
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
            </div>
            <div className="p-4 bg-red-50 rounded-lg border border-red-200">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-red-600 font-medium">Failed</div>
                  <div className="text-2xl font-bold text-red-800">{result.failed}</div>
                </div>
                <XCircle className="w-8 h-8 text-red-600" />
              </div>
            </div>
          </div>

          {result.errors.length > 0 && (
            <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <h4 className="font-semibold text-yellow-900 mb-2">Errors (showing first {result.errors.length}):</h4>
              <ul className="text-sm text-yellow-800 space-y-1">
                {result.errors.map((err, idx) => (
                  <li key={idx}>• {err}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BulkMcqUpload;
