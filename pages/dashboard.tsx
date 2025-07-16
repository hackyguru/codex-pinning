import { useRouter } from 'next/router';
import { usePrivy } from '@privy-io/react-auth';
import { useEffect, useState } from 'react';
import { UserStats } from '../lib/userService';
import { FileWithFormatted } from '../lib/fileService';

interface UploadedFile {
  id: string;
  name: string;
  size: string;
  type: string;
  uploadedAt: string;
  cid: string;
  status: 'uploading' | 'uploaded' | 'error';
  error?: string;
  originalId?: string; // For database files
}

interface PinningSecret {
  id: string;
  name: string;
  prefix: string;
  scopes: string[];
  rateLimitPerMinute: number;
  monthlyQuotaGb: number | null;
  usageThisMonth: number;
  isActive: boolean;
  lastUsed: string;
  createdAt: string;
}

export default function Dashboard() {
  const router = useRouter();
  const { ready, authenticated, user, logout, getAccessToken } = usePrivy();
  const [isLoading, setIsLoading] = useState(true);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [databaseFiles, setDatabaseFiles] = useState<FileWithFormatted[]>([]);
  const [pinningSecrets, setPinningSecrets] = useState<PinningSecret[]>([]);
  const [showCreateSecret, setShowCreateSecret] = useState(false);
  const [newSecretName, setNewSecretName] = useState('');
  const [createdSecret, setCreatedSecret] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'files' | 'secrets'>('files');

  // Utility functions
  const getFileIcon = (contentType: string) => {
    if (contentType.startsWith('image/')) return '🖼️';
    if (contentType.startsWith('video/')) return '🎬';
    if (contentType.startsWith('audio/')) return '🎵';
    if (contentType.includes('pdf')) return '📄';
    if (contentType.includes('text')) return '📝';
    return '📁';
  };

  const formatContentType = (contentType: string) => {
    const typeMap: { [key: string]: string } = {
      'image/jpeg': 'JPEG Image',
      'image/png': 'PNG Image',
      'image/gif': 'GIF Image',
      'image/svg+xml': 'SVG Image',
      'video/mp4': 'MP4 Video',
      'video/webm': 'WebM Video',
      'audio/mpeg': 'MP3 Audio',
      'audio/wav': 'WAV Audio',
      'application/pdf': 'PDF Document',
      'text/plain': 'Text File',
      'application/json': 'JSON File',
    };
    
    return typeMap[contentType] || contentType;
  };

  // Load user stats and files from database
  const loadUserData = async () => {
    if (!user?.id) return;
    
    try {
      // Get access token from Privy
      const accessToken = await getAccessToken();
      
      // Load user stats
      const statsResponse = await fetch('/api/user/stats', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setUserStats(statsData.stats);
      }
      
      // Load user files
      const filesResponse = await fetch('/api/user/files', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (filesResponse.ok) {
        const filesData = await filesResponse.json();
        setDatabaseFiles(filesData.files);
      }

      // Load pinning secrets
      const secretsResponse = await fetch('/api/pinning-secrets/list', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (secretsResponse.ok) {
        const secretsData = await secretsResponse.json();
        setPinningSecrets(secretsData.secrets || []);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  // Create a new pinning secret
  const createPinningSecret = async () => {
    if (!newSecretName.trim()) {
      alert('Please enter a name for the pinning secret');
      return;
    }

    try {
      const accessToken = await getAccessToken();
      
      const response = await fetch('/api/pinning-secrets/create', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newSecretName.trim(),
          scopes: ['upload', 'download'],
          rateLimitPerMinute: 100
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setCreatedSecret(data.pinningSecret);
        setNewSecretName('');
        setShowCreateSecret(false);
        await loadUserData(); // Refresh the list
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to create pinning secret');
      }
    } catch (error) {
      console.error('Error creating pinning secret:', error);
      alert('Failed to create pinning secret');
    }
  };

  // Revoke a pinning secret
  const revokePinningSecret = async (secretId: string) => {
    if (!confirm('Are you sure you want to revoke this pinning secret? This action cannot be undone.')) {
      return;
    }

    try {
      const accessToken = await getAccessToken();
      
      const response = await fetch('/api/pinning-secrets/revoke', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ secretId }),
      });

      if (response.ok) {
        await loadUserData(); // Refresh the list
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to revoke pinning secret');
      }
    } catch (error) {
      console.error('Error revoking pinning secret:', error);
      alert('Failed to revoke pinning secret');
    }
  };

  // Extract email from various Privy account types
  const getUserEmail = () => {
    if (!user) return '';
    
    // Try direct email first
    if (user.email?.address) return user.email.address;
    if (typeof user.email === 'string') return user.email;
    
    // Try to find email in linkedAccounts
    const accounts = user.linkedAccounts || [];
    
    // Check for email account
    const emailAccount = accounts.find(account => account.type === 'email');
    if (emailAccount && emailAccount.type === 'email') {
      return (emailAccount as { address?: string }).address || '';
    }
    
    // Check for Google account
    const googleAccount = accounts.find(account => account.type === 'google_oauth');
    if (googleAccount && googleAccount.type === 'google_oauth') {
      return (googleAccount as { email?: string }).email || '';
    }
    
    // Check for other OAuth providers that might have email
    const oauthAccount = accounts.find(account => 
      account.type === 'twitter_oauth' || 
      account.type === 'discord_oauth' ||
      account.type === 'github_oauth'
    );
    if (oauthAccount && (oauthAccount as { email?: string }).email) {
      return (oauthAccount as { email?: string }).email;
    }
    
    // For wallet accounts, generate a placeholder email
    const walletAccount = accounts.find(account => account.type === 'wallet');
    if (walletAccount && walletAccount.type === 'wallet') {
      const address = (walletAccount as { address?: string }).address || '';
      if (address) {
        return `${address.substring(0, 10)}...${address.substring(address.length - 4)}@wallet.local`;
      }
    }
    
    // Fallback: use user ID as email (remove 'did:privy:' prefix)
    if (user.id) {
      const cleanId = user.id.replace('did:privy:', '');
      return `${cleanId.substring(0, 10)}@privy.local`;
    }
    
    // Ultimate fallback
    return 'unknown@privy.local';
  };

  useEffect(() => {
    if (ready) {
      setIsLoading(false);
      if (!authenticated) {
        router.push('/');
      } else if (user) {
        loadUserData();
      }
    }
  }, [ready, authenticated, router, user]);

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileUpload(files);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      handleFileUpload(files);
    }
    // Reset the input
    e.target.value = '';
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleFileUpload = async (files: File[]) => {
    setIsUploading(true);
    
    // Check if user is authenticated
    if (!user?.id) {
      alert('Please make sure you are logged in before uploading files.');
      setIsUploading(false);
      return;
    }

    try {
      // Get access token from Privy
      const accessToken = await getAccessToken();
      
      // Add files to upload state
      const newUploads: UploadedFile[] = files.map(file => ({
        id: `${Date.now()}-${Math.random()}`,
        name: file.name,
        size: formatFileSize(file.size),
        type: file.type || 'unknown',
        uploadedAt: new Date().toISOString(),
        cid: '',
        status: 'uploading' as const,
      }));

      setUploadedFiles(prev => [...newUploads, ...prev]);

      // Upload files one by one
      for (const [index, file] of files.entries()) {
        const uploadId = newUploads[index].id;
        
        try {
          const formData = new FormData();
          formData.append('file', file);
          
          console.log('Uploading file with JWT token authentication');

          const response = await fetch('/api/upload', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
            },
            body: formData,
          });

          if (response.ok) {
            const result = await response.json();
            
            setUploadedFiles(prev => prev.map(f => 
              f.id === uploadId 
                ? { ...f, status: 'uploaded' as const, cid: result.cid }
                : f
            ));
            
            // Reload user data to update stats and file list
            await loadUserData();
          } else {
            const error = await response.json();
            
            // Handle storage limit exceeded
            if (response.status === 413) {
              alert(error.message || 'Storage limit exceeded');
            }
            
            setUploadedFiles(prev => prev.map(f => 
              f.id === uploadId 
                ? { ...f, status: 'error' as const, error: error.error || 'Upload failed' }
                : f
            ));
          }
        } catch (error) {
          setUploadedFiles(prev => prev.map(f => 
            f.id === uploadId 
              ? { ...f, status: 'error' as const, error: 'Network error' }
              : f
          ));
        }
      }
    } catch (error) {
      console.error('Error getting access token:', error);
      alert('Authentication error. Please try logging in again.');
    }

    setIsUploading(false);
  };

  const handleDeleteFile = async (fileId: string) => {
    if (!user?.id) return;
    
    if (confirm('Are you sure you want to delete this file?')) {
      try {
        // Get access token from Privy
        const accessToken = await getAccessToken();
        
        const response = await fetch('/api/user/delete-file', {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ fileId }),
        });

        if (response.ok) {
          // Remove from local state
          setDatabaseFiles(prev => prev.filter(f => f.id !== fileId));
          // Reload user data to update stats
          await loadUserData();
          alert('File deleted successfully');
        } else {
          const error = await response.json();
          alert(`Error deleting file: ${error.error}`);
        }
      } catch (error) {
        console.error('Error deleting file:', error);
        alert('Error deleting file. Please try again.');
      }
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!authenticated) {
    return null; // Will redirect in useEffect
  }

  // Combine database files with currently uploading files
  const getAllFiles = () => {
    // Convert database files to the same format as upload files
    const dbFiles = databaseFiles.map(file => ({
      id: `db-${file.id}`, // Prefix to ensure unique keys
      name: file.filename,
      size: file.formattedSize,
      type: file.content_type,
      uploadedAt: file.upload_date,
      cid: file.cid,
      status: 'uploaded' as const,
      originalId: file.id, // Keep original ID for delete operations
    }));
    
    // Add currently uploading files (but only those not already in database)
    const currentlyUploading = uploadedFiles.filter(f => f.status === 'uploading' || f.status === 'error');
    
    return [...currentlyUploading, ...dbFiles];
  };

  const allFiles = getAllFiles();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">ThirdStorage</h1>
              <p className="text-sm text-gray-500">Web3 Pinning Service</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-600">
                <span className="font-medium">{getUserEmail()}</span>
              </div>
              <button
                onClick={handleLogout}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Storage Usage */}
        {userStats && (
          <div className="bg-white rounded-lg shadow-sm mb-8 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium text-gray-900">Storage Usage</h2>
              <div className="flex items-center space-x-2">
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                  userStats.planType === 'pro' 
                    ? 'bg-purple-100 text-purple-800' 
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {userStats.planType.toUpperCase()}
                </span>
                {userStats.planType === 'free' && (
                  <button className="px-3 py-1 text-xs font-medium text-white bg-blue-600 rounded-full hover:bg-blue-700">
                    Upgrade to Pro
                  </button>
                )}
              </div>
            </div>
            
            <div className="mb-2">
              <div className="flex justify-between text-sm text-gray-600 mb-1">
                <span>{formatFileSize(userStats.storageUsed)} used</span>
                <span>{formatFileSize(userStats.storageLimit)} total</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full ${
                    userStats.usagePercentage >= 90 ? 'bg-red-500' :
                    userStats.usagePercentage >= 75 ? 'bg-yellow-500' :
                    'bg-green-500'
                  }`}
                  style={{ width: `${userStats.usagePercentage}%` }}
                ></div>
              </div>
            </div>
            
            <div className="text-sm text-gray-600">
              {userStats.filesCount} files • {userStats.usagePercentage.toFixed(1)}% used
              {userStats.usagePercentage >= 90 && (
                <span className="ml-2 text-red-600 font-medium">
                  ⚠️ Storage almost full
                </span>
              )}
            </div>
          </div>
        )}

        {/* Gateway Info */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Codex Gateway</h2>
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">Gateway URL Format</h3>
                <div className="mt-2 text-sm text-blue-700">
                  <p>Access any Codex content through our gateway:</p>
                  <code className="bg-blue-100 px-2 py-1 rounded text-xs font-mono mt-2 inline-block">
                    {typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'}/api/gateway/[CID]
                  </code>
                                     <p className="mt-2">Replace [CID] with the actual Codex content identifier.</p>
                 </div>
               </div>
             </div>
           </div>
           <div className="mt-4">
             <button
               onClick={() => router.push('/gateway')}
               className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
             >
               <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
               </svg>
               Test Gateway
             </button>
           </div>
         </div>

        {/* Upload Area */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Upload Files</h2>
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragOver
                ? 'border-blue-400 bg-blue-50'
                : isUploading
                ? 'border-yellow-400 bg-yellow-50'
                : 'border-gray-300 hover:border-gray-400'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="space-y-4">
              <div className="flex justify-center">
                {isUploading ? (
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                ) : (
                  <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                )}
              </div>
              <div>
                <p className="text-xl font-medium text-gray-900">
                  {isUploading ? 'Uploading files...' : 'Drop files here or click to upload'}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  Support for any file type up to 100MB
                </p>
              </div>
              <div>
                <input
                  type="file"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                  id="file-upload"
                  disabled={isUploading}
                />
                <label
                  htmlFor="file-upload"
                  className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 cursor-pointer ${
                    isUploading
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  {isUploading ? 'Uploading...' : 'Choose Files'}
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6" aria-label="Tabs">
              <button
                onClick={() => setActiveTab('files')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'files'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Your Files
              </button>
              <button
                onClick={() => setActiveTab('secrets')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'secrets'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Pinning Secrets
              </button>
            </nav>
          </div>

                    {/* Tab Content */}
          {activeTab === 'files' && (
            <div className="divide-y divide-gray-200">
            {allFiles.map((file) => (
              <div key={file.id} className="px-6 py-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                        {file.status === 'uploading' ? (
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                        ) : (
                                                  <span className="text-2xl">
                          {getFileIcon(file.type)}
                        </span>
                        )}
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{file.name}</p>
                      <p className="text-sm text-gray-500">{file.size} • {formatContentType(file.type)}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <p className="text-sm text-gray-900">
                        {new Date(file.uploadedAt).toLocaleDateString()}
                      </p>
                      <div className="flex items-center space-x-2">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          file.status === 'uploaded' 
                            ? 'bg-green-100 text-green-800' 
                            : file.status === 'uploading'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {file.status === 'uploaded' ? '✅ Uploaded' : 
                           file.status === 'uploading' ? '⏳ Uploading' : 
                           `❌ ${file.error || 'Error'}`}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        className="text-gray-400 hover:text-gray-600"
                        title="Copy CID"
                        onClick={() => navigator.clipboard.writeText(file.cid)}
                        disabled={file.status !== 'uploaded'}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </button>
                      <button
                        className="text-gray-400 hover:text-gray-600"
                        title="View Content"
                        onClick={() => window.open(`/api/gateway/${file.cid}`, '_blank')}
                        disabled={file.status !== 'uploaded'}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </button>
                      {file.status === 'uploaded' ? (
                        <button
                          className="text-red-400 hover:text-red-600"
                          title="Delete"
                          onClick={() => handleDeleteFile(file.originalId || file.id)}
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      ) : file.status === 'uploading' ? (
                        <button
                          className="text-gray-400 hover:text-red-600"
                          title="Cancel upload"
                          onClick={() => setUploadedFiles(prev => prev.filter(f => f.id !== file.id))}
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      ) : (
                        <button
                          className="text-red-400 hover:text-red-600"
                          title="Remove from list"
                          onClick={() => setUploadedFiles(prev => prev.filter(f => f.id !== file.id))}
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                <div className="mt-2">
                  <p className="text-xs text-gray-500 font-mono break-all">
                    CID: {file.cid || 'Generating...'}
                  </p>
                </div>
              </div>
            ))}
            </div>
          )}

          {/* Pinning Secrets Tab */}
          {activeTab === 'secrets' && (
            <div className="p-6">
              <div className="mb-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900">Pinning Secrets</h3>
                  <button
                    onClick={() => setShowCreateSecret(true)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700"
                  >
                    Generate New Secret
                  </button>
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  Use pinning secrets to upload files programmatically via API
                </p>
              </div>

              {/* Create Secret Form */}
              {showCreateSecret && (
                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                  <h4 className="font-medium text-gray-900 mb-3">Create New Pinning Secret</h4>
                  <div className="flex space-x-3">
                    <input
                      type="text"
                      placeholder="Enter secret name (e.g., 'My App API')"
                      value={newSecretName}
                      onChange={(e) => setNewSecretName(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      onClick={createPinningSecret}
                      className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700"
                    >
                      Create
                    </button>
                    <button
                      onClick={() => {
                        setShowCreateSecret(false);
                        setNewSecretName('');
                      }}
                      className="bg-gray-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-700"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Created Secret Display */}
              {createdSecret && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                  <h4 className="font-medium text-green-900 mb-2">Pinning Secret Created!</h4>
                  <p className="text-sm text-green-700 mb-3">
                    Please copy and save this secret. It will not be shown again.
                  </p>
                  <div className="bg-white border border-green-300 rounded-md p-3 font-mono text-sm">
                    {createdSecret}
                  </div>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(createdSecret);
                      alert('Copied to clipboard!');
                    }}
                    className="mt-3 bg-green-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-green-700"
                  >
                    Copy to Clipboard
                  </button>
                  <button
                    onClick={() => setCreatedSecret(null)}
                    className="mt-3 ml-3 bg-gray-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-700"
                  >
                    Close
                  </button>
                </div>
              )}

              {/* Pinning Secrets List */}
              <div className="space-y-4">
                {pinningSecrets.length === 0 ? (
                  <p className="text-gray-500 text-sm">No pinning secrets created yet.</p>
                ) : (
                  pinningSecrets.map((secret) => (
                    <div key={secret.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-gray-900">{secret.name}</h4>
                          <p className="text-sm text-gray-500">
                            {secret.prefix}••••••••••••••••••••
                          </p>
                          <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                            <span>Created: {secret.createdAt}</span>
                            <span>Last used: {secret.lastUsed}</span>
                            <span>Usage: {secret.usageThisMonth} MB this month</span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            secret.isActive 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {secret.isActive ? 'Active' : 'Revoked'}
                          </span>
                          {secret.isActive && (
                            <button
                              onClick={() => revokePinningSecret(secret.id)}
                              className="bg-red-600 text-white px-3 py-1 rounded-md text-sm font-medium hover:bg-red-700"
                            >
                              Revoke
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 