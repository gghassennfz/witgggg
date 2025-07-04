import React from 'react';
import { useDropzone } from 'react-dropzone';
import './FilesPage.css';

export default function FilesPage({ files = [], onUpload, onDelete }) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: onUpload,
    multiple: true,
  });

  return (
    <div className="files-page">
      <h2>Files</h2>
      <div {...getRootProps()} className={`dropzone${isDragActive ? ' active' : ''}`}>
        <input {...getInputProps()} />
        {isDragActive ? (
          <p>Drop files here...</p>
        ) : (
          <p>Drag & drop files here, or <span className="file-upload-btn">browse</span></p>
        )}
      </div>
      <div className="files-list">
        {files.length === 0 ? (
          <p className="no-files">No files uploaded yet.</p>
        ) : (
          <ul>
            {files.map(file => (
              <li key={file.id} className="file-item">
                <div className="file-preview">
                  {file.type.startsWith('image/') && (
                    <img src={file.url} alt={file.name} />
                  )}
                  {file.type.startsWith('video/') && (
                    <video src={file.url} controls width={60} height={40} />
                  )}
                  {!file.type.startsWith('image/') && !file.type.startsWith('video/') && (
                    <span className="file-icon">📄</span>
                  )}
                </div>
                <div className="file-info">
                  <div className="file-name">{file.name}</div>
                  <div className="file-meta">{file.type || 'Unknown type'} | Uploaded: {file.uploadedAt}</div>
                </div>
                <button className="file-delete" title="Delete" onClick={() => onDelete(file.id)}>
                  🗑️
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
