import React, { useState, useEffect } from 'react';
import { Play, Folder, Film, Search, Grid, List, Download } from 'lucide-react';

const MediaLibrary = () => {
  const [mediaItems, setMediaItems] = useState([]);
  const [currentPath, setCurrentPath] = useState('/');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [serverUrl, setServerUrl] = useState(''); // Empty for same-origin requests

  useEffect(() => {
    loadMediaItems();
  }, [currentPath, serverUrl]);

  const loadMediaItems = async () => {
    setLoading(true);
    setError('');

    try {
      const apiUrl = `/api/browse${currentPath}`;
      const response = await fetch(apiUrl);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setMediaItems(data.items || []);
      setLoading(false);

    } catch (err) {
      setError(`Failed to load media items: ${err.message}`);
      setLoading(false);
    }
  };

  const handleItemClick = (item) => {
    if (item.type === 'folder') {
      setCurrentPath(item.path);
    } else if (item.type === 'video') {
      setSelectedVideo(item);
    }
  };

  const goBack = () => {
    const pathParts = currentPath.split('/').filter(p => p);
    pathParts.pop();
    setCurrentPath(pathParts.length > 0 ? '/' + pathParts.join('/') : '/');
  };

  const filteredItems = mediaItems.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatFileSize = (size) => {
    if (!size) return '';
    return size;
  };

  const getFileIcon = (item) => {
    if (item.type === 'folder') {
      return <Folder className="w-6 h-6 text-blue-500" />;
    } else {
      return <Film className="w-6 h-6 text-purple-500" />;
    }
  };

  const playVideo = (item) => {
    const videoUrl = `/api/stream${item.path}`;
    setSelectedVideo({ ...item, streamUrl: videoUrl });
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 p-4 border-b border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-white">Video Library</h1>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-md ${viewMode === 'grid' ? 'bg-blue-600' : 'bg-gray-700'}`}
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-md ${viewMode === 'list' ? 'bg-blue-600' : 'bg-gray-700'}`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Search and Navigation */}
        <div className="flex items-center space-x-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search videos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-700 rounded-md text-white placeholder-gray-400"
            />
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-400">Path:</span>
            <span className="text-sm font-mono bg-gray-700 px-2 py-1 rounded">
              {currentPath}
            </span>
            {currentPath !== '/' && (
              <button
                onClick={goBack}
                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded-md text-sm"
              >
                Back
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {loading && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-4 text-gray-400">Loading...</p>
          </div>
        )}

        {error && (
          <div className="text-center py-8">
            <p className="text-red-400">{error}</p>
            <button
              onClick={loadMediaItems}
              className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md"
            >
              Retry
            </button>
          </div>
        )}

        {!loading && !error && (
          <>
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredItems.map((item, index) => (
                  <div
                    key={index}
                    onClick={() => handleItemClick(item)}
                    className="bg-gray-800 rounded-lg p-4 cursor-pointer hover:bg-gray-700 transition-colors"
                  >
                    <div className="flex items-center space-x-3 mb-3">
                      {getFileIcon(item)}
                      <span className="font-medium truncate">{item.name}</span>
                    </div>

                    <div className="text-sm text-gray-400 space-y-1">
                      {item.size && <p>Size: {formatFileSize(item.size)}</p>}
                      <p>Modified: {item.modified}</p>
                    </div>

                    {item.type === 'video' && (
                      <div className="flex space-x-2 mt-3">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            playVideo(item);
                          }}
                          className="flex items-center space-x-1 px-3 py-1 bg-green-600 hover:bg-green-700 rounded-md text-sm"
                        >
                          <Play className="w-3 h-3" />
                          <span>Play</span>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const link = document.createElement('a');
                            link.href = `/api/download${item.path}`;
                            link.download = item.name;
                            link.click();
                          }}
                          className="flex items-center space-x-1 px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded-md text-sm"
                        >
                          <Download className="w-3 h-3" />
                          <span>Download</span>
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-gray-800 rounded-lg overflow-hidden">
                <div className="grid grid-cols-4 gap-4 p-4 border-b border-gray-700 font-medium text-gray-300">
                  <div>Name</div>
                  <div>Type</div>
                  <div>Size</div>
                  <div>Actions</div>
                </div>
                {filteredItems.map((item, index) => (
                  <div
                    key={index}
                    className="grid grid-cols-4 gap-4 p-4 hover:bg-gray-700 cursor-pointer border-b border-gray-700 last:border-b-0"
                    onClick={() => handleItemClick(item)}
                  >
                    <div className="flex items-center space-x-3">
                      {getFileIcon(item)}
                      <span className="truncate">{item.name}</span>
                    </div>
                    <div className="text-gray-400 capitalize">{item.type}</div>
                    <div className="text-gray-400">{formatFileSize(item.size)}</div>
                    <div className="flex space-x-2">
                      {item.type === 'video' && (
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              playVideo(item);
                            }}
                            className="flex items-center space-x-1 px-2 py-1 bg-green-600 hover:bg-green-700 rounded text-sm"
                          >
                            <Play className="w-3 h-3" />
                            <span>Play</span>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const link = document.createElement('a');
                              link.href = `/api/download${item.path}`;
                              link.download = item.name;
                              link.click();
                            }}
                            className="flex items-center space-x-1 px-2 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm"
                          >
                            <Download className="w-3 h-3" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {filteredItems.length === 0 && !loading && !error && (
          <div className="text-center py-8">
            <p className="text-gray-400">No items found</p>
          </div>
        )}
      </div>

      {/* Video Player Modal */}
      {selectedVideo && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded-lg max-w-4xl w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">{selectedVideo.name}</h3>
              <button
                onClick={() => setSelectedVideo(null)}
                className="text-gray-400 hover:text-white text-2xl"
              >
                ×
              </button>
            </div>
            <video
              controls
              className="w-full rounded-lg"
              src={selectedVideo.streamUrl}
              onError={(e) => {
                console.error('Video playback error:', e);
                setError('Failed to play video');
              }}
            >
              Your browser does not support the video tag.
            </video>
          </div>
        </div>
      )}
    </div>
  );
};

export default MediaLibrary;