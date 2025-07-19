import React, { useState, useEffect, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { toast } from 'react-toastify';
import { supabase } from '../../supabaseClient';
import API_BASE_URL from '../../apiConfig';
import './ProjectFiles.css';

const ProjectFiles = ({ projectId, userId, currentUser, viewMode }) => {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchFiles();
  }, [projectId, userId, filter]);

  const fetchFiles = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const params = new URLSearchParams();
      if (userId) params.append('userId', userId);
      if (filter !== 'all') params.append('tags', filter);

      const response = await fetch(`${API_BASE_URL}/api/project-files/${projectId}?${params}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setFiles(data);
      }
    } catch (error) {
      console.error('Error fetching files:', error);
      toast.error('Failed to load files');
    } finally {
      setLoading(false);
    }
  };

  const uploadFiles = async (acceptedFiles) => {
    if (acceptedFiles.length === 0) return;

    setUploading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    try {
      for (const file of acceptedFiles) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('project_id', projectId);
        formData.append('description', '');
        formData.append('tags', '');
        formData.append('is_public', 'true');

        const response = await fetch(`${API_BASE_URL}/api/project-files/upload`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          },
          body: formData
        });

        if (response.ok) {
          const newFile = await response.json();
          setFiles(prev => [newFile, ...prev]);
        } else {
          throw new Error(`Failed to upload ${file.name}`);
        }
      }
      
      toast.success(`${acceptedFiles.length} file(s) uploaded successfully!`);
    } catch (error) {
      console.error('Error uploading files:', error);
      toast.error('Failed to upload some files');
    } finally {
      setUploading(false);
    }
  };

  const deleteFile = async (fileId) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(`${API_BASE_URL}/api/project-files/${fileId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (response.ok) {
        setFiles(prev => prev.filter(file => file.id !== fileId));
        toast.success('File deleted successfully!');
      }
    } catch (error) {
      console.error('Error deleting file:', error);
      toast.error('Failed to delete file');
    }
  };

  const downloadFile = (file) => {
    window.open(file.file_url, '_blank');
  };

  const onDrop = useCallback((acceptedFiles) => {
    uploadFiles(acceptedFiles);
  }, [projectId]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    disabled: uploading || (viewMode !== 'me' && viewMode !== 'all')
  });

  const getFileIcon = (mimeType) => {
    if (mimeType.startsWith('image/')) return '🖼️';
    if (mimeType.startsWith('video/')) return '🎥';
    if (mimeType.startsWith('audio/')) return '🎵';
    if (mimeType.includes('pdf')) return '📄';
    if (mimeType.includes('word')) return '📝';
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return '📊';
    if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return '📽️';
    if (mimeType.includes('zip') || mimeType.includes('rar')) return '🗜️';
    return '📁';
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getUniqueFileTypes = () => {
    const types = new Set();
    files.forEach(file => {
      if (file.mime_type.startsWith('image/')) types.add('images');
      else if (file.mime_type.startsWith('video/')) types.add('videos');
      else if (file.mime_type.includes('pdf')) types.add('documents');
      else types.add('others');
    });
    return Array.from(types);
  };

  const filterOptions = [
    { value: 'all', label: 'All Files' },
    { value: 'images', label: 'Images' },
    { value: 'documents', label: 'Documents' },
    { value: 'videos', label: 'Videos' },
    { value: 'others', label: 'Others' }
  ];

  const filteredFiles = files.filter(file => {
    if (filter === 'all') return true;
    if (filter === 'images') return file.mime_type.startsWith('image/');
    if (filter === 'videos') return file.mime_type.startsWith('video/');
    if (filter === 'documents') return file.mime_type.includes('pdf') || file.mime_type.includes('word');
    if (filter === 'others') return !file.mime_type.startsWith('image/') && 
                                    !file.mime_type.startsWith('video/') && 
                                    !file.mime_type.includes('pdf') && 
                                    !file.mime_type.includes('word');
    return true;
  });

  const canUpload = viewMode === 'me' || viewMode === 'all';
  const canDelete = (file) => file.user_id === currentUser?.id || viewMode === 'all';

  if (loading) {
    return <div className="loading-spinner">Loading files...</div>;
  }

  return (
    <div className="project-files">
      <div className="files-header">
        <div className="header-info">
          <h2>
            {viewMode === 'me' ? 'My Files' : 
             viewMode === 'all' ? 'Team Files' : 
             `Project Files`}
          </h2>
          <span className="files-count">{filteredFiles.length} file(s)</span>
        </div>
        
        <div className="files-filters">
          <select 
            value={filter} 
            onChange={(e) => setFilter(e.target.value)}
            className="filter-select"
          >
            {filterOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* File Upload Area */}
      {canUpload && (
        <div 
          {...getRootProps()} 
          className={`upload-area ${isDragActive ? 'drag-active' : ''} ${uploading ? 'uploading' : ''}`}
        >
          <input {...getInputProps()} />
          <div className="upload-content">
            <div className="upload-icon">📁</div>
            {uploading ? (
              <div className="upload-text">
                <p>Uploading files...</p>
                <div className="upload-spinner"></div>
              </div>
            ) : isDragActive ? (
              <div className="upload-text">
                <p>Drop files here to upload</p>
              </div>
            ) : (
              <div className="upload-text">
                <p>Drag & drop files here, or <span className="upload-link">click to browse</span></p>
                <p className="upload-hint">Supports images, documents, videos, and more</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Files Grid */}
      {filteredFiles.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📂</div>
          <h3>No files yet</h3>
          <p>
            {canUpload ? 
              'Upload your first file to get started.' : 
              'No files have been shared in this project yet.'
            }
          </p>
        </div>
      ) : (
        <div className="files-grid">
          {filteredFiles.map(file => (
            <div key={file.id} className="file-card">
              <div className="file-preview">
                {file.mime_type.startsWith('image/') ? (
                  <img 
                    src={file.file_url} 
                    alt={file.original_filename}
                    className="file-image"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                ) : null}
                <div className="file-icon" style={{ display: file.mime_type.startsWith('image/') ? 'none' : 'flex' }}>
                  {getFileIcon(file.mime_type)}
                </div>
              </div>
              
              <div className="file-info">
                <h3 className="file-name" title={file.original_filename}>
                  {file.original_filename}
                </h3>
                
                <div className="file-meta">
                  <span className="file-size">{formatFileSize(file.file_size)}</span>
                  <span className="file-date">
                    {new Date(file.created_at).toLocaleDateString()}
                  </span>
                </div>
                
                <div className="file-user">
                  <span>👤 {file.user?.name || file.user?.email}</span>
                </div>
                
                {file.description && (
                  <p className="file-description">{file.description}</p>
                )}
                
                {file.tags && file.tags.length > 0 && (
                  <div className="file-tags">
                    {file.tags.map((tag, idx) => (
                      <span key={idx} className="file-tag">{tag}</span>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="file-actions">
                <button 
                  className="btn-icon"
                  onClick={() => downloadFile(file)}
                  title="Download"
                >
                  ⬇️
                </button>
                {canDelete(file) && (
                  <button 
                    className="btn-icon btn-danger"
                    onClick={() => deleteFile(file.id)}
                    title="Delete"
                  >
                    🗑️
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProjectFiles;
