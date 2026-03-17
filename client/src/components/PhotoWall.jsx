import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

export default function PhotoWall({ username }) {
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [caption, setCaption] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [preview, setPreview] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const fileRef = useRef(null);

  const fetchPhotos = async (pg = 1) => {
    try {
      const res = await axios.get(`/api/photos?page=${pg}&limit=20`, { withCredentials: true });
      setPhotos(pg === 1 ? res.data.photos : prev => [...prev, ...res.data.photos]);
      setTotalPages(res.data.totalPages); setPage(pg);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  useEffect(() => { fetchPhotos(1); }, []);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setPreview(reader.result);
    reader.readAsDataURL(file);
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!selectedFile) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('photo', selectedFile); fd.append('caption', caption);
      const res = await axios.post('/api/photos', fd, { withCredentials: true, headers: { 'Content-Type': 'multipart/form-data' } });
      setPhotos(prev => [res.data, ...prev]);
      setCaption(''); setPreview(null); setSelectedFile(null);
      if (fileRef.current) fileRef.current.value = '';
    } catch (err) {
      alert(err.response?.data?.error || 'Upload failed. Max 5MB, images only.');
    } finally { setUploading(false); }
  };

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-4 py-5 animate-fadeIn">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-xl font-bold text-white">📸 Photo Wall</h2>
        <span className="text-xs text-white/40">Share your dining experience</span>
      </div>

      {/* Upload card */}
      <div className="glass-card p-4 sm:p-5 mb-8 relative overflow-hidden group/upload">
        <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-selu-gold/0 via-selu-gold/50 to-selu-gold/0 opacity-50" />
        <h3 className="text-base font-bold text-transparent bg-clip-text bg-gradient-to-r from-selu-gold to-white mb-4 drop-shadow-sm">Share a Photo</h3>
        <form onSubmit={handleUpload}>
          <div className="flex flex-col sm:flex-row gap-5">
            <label htmlFor="photo-upload" className="flex-1 flex flex-col items-center justify-center h-36 rounded-2xl cursor-pointer transition-all duration-300 border-2 border-dashed border-white/20 hover:border-selu-gold/60 hover:bg-white/5 overflow-hidden group/dropzone shadow-inner relative">
              <div className="absolute inset-0 bg-gradient-to-br from-selu-gold/5 to-transparent opacity-0 group-hover/dropzone:opacity-100 transition-opacity duration-300" />
              {preview ? (
                <img src={preview} alt="Preview" className="h-full w-full object-cover" />
              ) : (
                <div className="text-center relative z-10 transition-transform duration-300 group-hover/dropzone:-translate-y-1">
                  <div className="text-4xl mb-2 filter drop-shadow-md">📷</div>
                  <p className="text-sm font-semibold text-white/70">Tap to select image</p>
                  <p className="text-[10px] text-white/40 mt-1 uppercase tracking-wider">JPG, PNG up to 5MB</p>
                </div>
              )}
            </label>
            <input id="photo-upload" ref={fileRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
            <div className="flex-1 flex flex-col gap-3 justify-between">
              <textarea value={caption} onChange={e => setCaption(e.target.value)} placeholder="Add a caption... (optional)" maxLength={200} rows={3} className="input-glass resize-none flex-1 text-sm bg-black/20 focus:bg-white/10" />
              <div className="flex items-center justify-between">
                <span className="text-xs text-white/40">as <span className="text-selu-gold font-bold tracking-wide">{username}</span></span>
                <button type="submit" disabled={!selectedFile || uploading} className="btn-gold disabled:opacity-50 px-5">
                  {uploading ? '⏳ Uploading...' : '📤 Share'}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="text-center text-white/40">
            <div className="text-3xl mb-2 animate-bounce">📸</div>
            <p className="text-sm">Loading photos...</p>
          </div>
        </div>
      ) : photos.length === 0 ? (
        <div className="text-center py-20 text-white/40">
          <div className="text-6xl mb-4">🖼️</div>
          <p className="text-lg font-medium">No photos yet</p>
          <p className="text-sm mt-1 text-white/30">Be the first to share!</p>
        </div>
      ) : (
        <>
          <div className="masonry">
            {photos.map(photo => (
              <div key={photo.id} className="masonry-item glass-card overflow-hidden group">
                <div className="relative overflow-hidden">
                  <img src={photo.url} alt={photo.caption || 'Dining photo'} className="w-full object-cover transition-transform duration-700 group-hover:scale-105" loading="lazy" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </div>
                <div className="p-3">
                  {photo.caption && <p className="text-sm text-white/90 mb-2 leading-snug font-medium line-clamp-3">{photo.caption}</p>}
                  <div className="flex items-center justify-between mt-auto">
                    <span className="text-[11px] font-bold text-selu-gold tracking-wide">{photo.username}</span>
                    <span className="text-[10px] font-medium text-white/40">{new Date(photo.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {page < totalPages && (
            <div className="text-center mt-6">
              <button onClick={() => fetchPhotos(page + 1)} className="btn-green">Load More</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
