import { useRouter } from 'next/router';
import { usePrivy } from '@privy-io/react-auth';
import { useEffect, useState, useRef, useCallback } from 'react';
import { UserStats } from '../lib/userService';
import { FileWithFormatted } from '../lib/fileService';
import Image from 'next/image';
import { getPlan, type PlanType } from '../lib/plans';
import { IoKeyOutline } from "react-icons/io5";
import { LuFiles } from "react-icons/lu";
import { useToast } from '../components/Toast';
import Link from 'next/link';
import SEO from '../components/SEO';


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

interface CouponDiscount {
  formattedOriginalPrice: string;
  formattedDiscountAmount: string;
  formattedFinalPrice: string;
  duration?: string;
  durationInMonths?: number;
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

// Add BillingHistoryItem type
interface BillingHistoryItem {
  id: string;
  plan: string;
  period: string;
  date: string;
  amount: string;
  status: string;
  invoice_url?: string;
  invoice_pdf?: string;
}

export default function Dashboard() {
  const router = useRouter();
  const { ready, authenticated, user, logout, getAccessToken } = usePrivy();
  const { showToast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [databaseFiles, setDatabaseFiles] = useState<FileWithFormatted[]>([]);
  const [pinningSecrets, setPinningSecrets] = useState<PinningSecret[]>([]);
  const [showCreateSecretModal, setShowCreateSecretModal] = useState(false);
  const [newSecretName, setNewSecretName] = useState('');
  const [createdSecret, setCreatedSecret] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<'overview' | 'files' | 'replication' | 'secrets' | 'gateway' | 'migrations' | 'payments' | 'settings'>('overview');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [uploadMode, setUploadMode] = useState<'drag-drop' | 'api'>('drag-drop');
  const [selectedCodeExample, setSelectedCodeExample] = useState<'curl' | 'javascript' | 'python' | 'node'>('curl');

  // Gateway state
  const [gatewayCid, setGatewayCid] = useState('');
  const [gatewayTestResult, setGatewayTestResult] = useState<{
    status: number;
    success: boolean;
    message: string;
    contentType?: string;
    contentLength?: string;
  } | null>(null);
  const [isGatewayLoading, setIsGatewayLoading] = useState(false);

  // Migrations state
  const [selectedNetwork, setSelectedNetwork] = useState<'ipfs' | 'arweave' | 'storj'>('ipfs');
  const [migrationCid, setMigrationCid] = useState('');
  const [isMigrating, setIsMigrating] = useState(false);

  // Downgrade confirmation state
  const [showDowngradeConfirm, setShowDowngradeConfirm] = useState(false);
  const [downgradeStep, setDowngradeStep] = useState(1);
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);
  const [deleteAccountStep, setDeleteAccountStep] = useState(1);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');
  const [allowedDomains, setAllowedDomains] = useState<string[]>([]);
  const [newDomain, setNewDomain] = useState('');
  const [isExportingData, setIsExportingData] = useState(false);

  // Testnet modal state
  const [showTestnetModal, setShowTestnetModal] = useState(false);

  // Refresh state
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Coupon code state
  const [couponCode, setCouponCode] = useState('');
  const [couponValidation, setCouponValidation] = useState<{
    isValidating: boolean;
    isValid: boolean;
    discount: CouponDiscount | null;
    error: string | null;
  }>({
    isValidating: false,
    isValid: false,
    discount: null,
    error: null,
  });

  // Coming soon modal state
  const [showComingSoonModal, setShowComingSoonModal] = useState(false);

  // Upgrade to Pro function - TEMPORARILY DISABLED (show coming soon popup)
  const handleUpgradeToPro = async () => {
    // Show coming soon popup instead of going to Stripe
    setShowComingSoonModal(true);

    // ORIGINAL CODE COMMENTED OUT - UNCOMMENT WHEN WEBHOOKS ARE READY
    /*
    const userEmail = getUserEmail();
    
    console.log('Upgrade attempt:', { 
      userId: user?.id, 
      userEmail,
      linkedAccounts: user?.linkedAccounts,
      authType: user?.linkedAccounts?.[0]?.type,
      couponCode: couponValidation.isValid ? couponCode : null
    });
    
    if (!user?.id || !userEmail) {
      alert('Please ensure you are logged in');
      return;
    }

    try {
      // Get auth token from Privy
      const authToken = await getAccessToken();
      
      const requestBody: any = {};
      
      // Include coupon code if validated
      if (couponValidation.isValid && couponCode) {
        requestBody.couponCode = couponCode;
      }
      
      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify(requestBody),
      });

      const { sessionUrl, error, couponApplied } = await response.json();

      if (error) {
        showToast({
          type: 'error',
          title: 'Upgrade Failed',
          message: error
        });
        return;
      }

      // Show confirmation if coupon was applied
      if (couponApplied) {
        const confirmMessage = `Coupon "${couponCode}" will be applied! Final price: ${couponValidation.discount?.formattedFinalPrice || 'Discounted'}. Continue to checkout?`;
        if (!confirm(confirmMessage)) {
          return;
        }
      }

      // Redirect to Stripe checkout
      window.location.href = sessionUrl;
    } catch (error) {
      console.error('Error creating checkout session:', error);
              showToast({
          type: 'error',
          title: 'Upgrade Failed',
          message: 'Failed to start upgrade process. Please try again.'
        });
    }
    */
  };

  // Validate coupon code
  const validateCouponCode = async () => {
    if (!couponCode.trim()) {
      setCouponValidation({
        isValidating: false,
        isValid: false,
        discount: null,
        error: 'Please enter a coupon code',
      });
      return;
    }

    setCouponValidation(prev => ({ ...prev, isValidating: true, error: null }));

    try {
      const authToken = await getAccessToken();

      const response = await fetch('/api/stripe/validate-coupon', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({ couponCode: couponCode.trim() }),
      });

      const data = await response.json();

      if (data.valid) {
        setCouponValidation({
          isValidating: false,
          isValid: true,
          discount: data,
          error: null,
        });
      } else {
        setCouponValidation({
          isValidating: false,
          isValid: false,
          discount: null,
          error: data.error || 'Invalid coupon code',
        });
      }
    } catch (error) {
      console.error('Error validating coupon:', error);
      setCouponValidation({
        isValidating: false,
        isValid: false,
        discount: null,
        error: 'Failed to validate coupon code',
      });
    }
  };

  // Clear coupon code
  const clearCouponCode = () => {
    setCouponCode('');
    setCouponValidation({
      isValidating: false,
      isValid: false,
      discount: null,
      error: null,
    });
  };

  // Downgrade to Free function
  const handleDowngradeToFree = async () => {
          if (!user?.id) {
        showToast({
          type: 'error',
          title: 'Authentication Required',
          message: 'Please ensure you are logged in'
        });
        return;
      }

    try {
      // Get auth token from Privy
      const authToken = await getAccessToken();

      const response = await fetch('/api/stripe/cancel-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
      });

      const responseData = await response.json();
      const { success, error } = responseData;

      if (error) {
        showToast({
          type: 'error',
          title: 'Downgrade Failed',
          message: error
        });
        return;
      }

      if (success) {
        // Reload user data to reflect changes
        loadUserData();
        setShowDowngradeConfirm(false);
        setDowngradeStep(1);
        showToast({
          type: 'success',
          title: 'Downgrade Successful',
          message: 'Successfully downgraded to Free plan'
        });
      }
    } catch (error) {
      console.error('Error downgrading subscription:', error);
              showToast({
          type: 'error',
          title: 'Downgrade Failed',
          message: 'Failed to downgrade. Please try again.'
        });
    }
  };

  // Start downgrade process
  const initiateDowngrade = () => {
    setShowDowngradeConfirm(true);
    setDowngradeStep(1);
  };

  // Cancel downgrade
  const cancelDowngrade = () => {
    setShowDowngradeConfirm(false);
    setDowngradeStep(1);
  };

  // Dynamic billing history data
  const [billingHistory, setBillingHistory] = useState<BillingHistoryItem[]>([]);
  const [billingLoading, setBillingLoading] = useState(false);
  const [billingError, setBillingError] = useState<string | null>(null);

  // Load billing history from API
  const loadBillingHistory = useCallback(async () => {
    setBillingLoading(true);
    setBillingError(null);

    try {
      // Use user?.id, userStats?.planType, getAccessToken as dependencies
      if (!user?.id || userStats?.planType === 'free') {
        setBillingHistory([]);
        setBillingLoading(false);
        return;
      }
      const authToken = await getAccessToken();
      const response = await fetch('/api/billing/history', {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });
      if (!response.ok) {
        throw new Error('Failed to fetch billing history');
      }
      const data = await response.json();
      setBillingHistory(data.billingHistory || []);
    } catch {
      setBillingError('Failed to load billing history');
      setBillingHistory([]);
    } finally {
      setBillingLoading(false);
    }
  }, [user?.id, userStats?.planType, getAccessToken]);

  // Load billing history when user or plan changes
  useEffect(() => {
    loadBillingHistory();
  }, [loadBillingHistory]);

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
  const loadUserData = useCallback(async () => {
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

      // Load allowed domains
      const domainsResponse = await fetch('/api/user/allowed-domains', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (domainsResponse.ok) {
        const domainsData = await domainsResponse.json();
        setAllowedDomains(domainsData.domains || []);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  }, [user?.id, getAccessToken]);

  // Add allowed domain
  const handleAddDomain = async () => {
    if (!newDomain.trim()) return;

    try {
      const accessToken = await getAccessToken();
      const response = await fetch('/api/user/allowed-domains', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ domain: newDomain.trim() }),
      });

      if (response.ok) {
        const data = await response.json();
        setAllowedDomains(data.domains);
        setNewDomain('');
      } else {
        const errorData = await response.json();
                  showToast({
            type: 'error',
            title: 'Failed to Add Domain',
            message: errorData.error
          });
      }
    } catch (error) {
      console.error('Error adding domain:', error);
              showToast({
          type: 'error',
          title: 'Failed to Add Domain',
          message: 'An unexpected error occurred'
        });
    }
  };

  // Remove allowed domain
  const handleRemoveDomain = async (domain: string) => {
    try {
      const accessToken = await getAccessToken();
      const response = await fetch('/api/user/allowed-domains', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ domain }),
      });

      if (response.ok) {
        const data = await response.json();
        setAllowedDomains(data.domains);
      } else {
        const errorData = await response.json();
                  showToast({
            type: 'error',
            title: 'Failed to Remove Domain',
            message: errorData.error
          });
      }
    } catch (error) {
      console.error('Error removing domain:', error);
              showToast({
          type: 'error',
          title: 'Failed to Remove Domain',
          message: 'An unexpected error occurred'
        });
    }
  };

  // Export user data
  const handleExportData = async () => {
    setIsExportingData(true);
    try {
      const accessToken = await getAccessToken();
      const response = await fetch('/api/user/export-data', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `thirdstorage-data-export-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        const errorData = await response.json();
                  showToast({
            type: 'error',
            title: 'Export Failed',
            message: errorData.error
          });
      }
    } catch (error) {
      console.error('Error exporting data:', error);
              showToast({
          type: 'error',
          title: 'Export Failed',
          message: 'An unexpected error occurred'
        });
    } finally {
      setIsExportingData(false);
    }
  };

  // Create a new pinning secret
  const createPinningSecret = async () => {
    if (!newSecretName.trim()) {
      showToast({
        type: 'warning',
        title: 'Name Required',
        message: 'Please enter a name for the pinning secret'
      });
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
        setShowCreateSecretModal(false);
        await loadUserData(); // Refresh the list
      } else {
        const error = await response.json();
        showToast({
          type: 'error',
          title: 'Failed to Create Secret',
          message: error.error || 'Failed to create pinning secret'
        });
      }
    } catch (error) {
      console.error('Error creating pinning secret:', error);
              showToast({
          type: 'error',
          title: 'Failed to Create Secret',
          message: 'An unexpected error occurred'
        });
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
        showToast({
          type: 'error',
          title: 'Failed to Revoke Secret',
          message: error.error || 'Failed to revoke pinning secret'
        });
      }
    } catch (error) {
      console.error('Error revoking pinning secret:', error);
              showToast({
          type: 'error',
          title: 'Failed to Revoke Secret',
          message: 'An unexpected error occurred'
        });
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
  }, [ready, authenticated, router, user, loadUserData]);

  // Keyboard shortcut for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      // ESC key for modal
      if (e.key === 'Escape' && showCreateSecretModal) {
        setShowCreateSecretModal(false);
        setNewSecretName('');
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showCreateSecretModal]);

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
              showToast({
          type: 'warning',
          title: 'Login Required',
          message: 'Please make sure you are logged in before uploading files.'
        });
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
            const errorData = await response.json();

            // Handle storage limit exceeded
            if (response.status === 413) {
              showToast({
              type: 'error',
              title: 'Storage Limit Exceeded',
              message: errorData.message || 'Storage limit exceeded'
            });
            }

            setUploadedFiles(prev => prev.map(f =>
              f.id === uploadId
                ? { ...f, status: 'error' as const, error: errorData.error || 'Upload failed' }
                : f
            ));
          }
        } catch {
          setUploadedFiles(prev => prev.map(f =>
            f.id === uploadId
              ? { ...f, status: 'error' as const, error: 'Network error' }
              : f
          ));
        }
      }
    } catch (error) {
      console.error('Error getting access token:', error);
                  showToast({
              type: 'error',
              title: 'Authentication Error',
              message: 'Please try logging in again.'
            });
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
          showToast({
            type: 'success',
            title: 'File Deleted',
            message: 'File deleted successfully'
          });
        } else {
          const error = await response.json();
          showToast({
            type: 'error',
            title: 'Delete Failed',
            message: error.error
          });
        }
      } catch (error) {
        console.error('Error deleting file:', error);
        showToast({
          type: 'error',
          title: 'Delete Failed',
          message: 'Error deleting file. Please try again.'
        });
      }
    }
  };

  // Handle viewing file content through public gateway
  const handleViewContent = (cid: string) => {
    // Since gateway is now public, just open the URL directly
    const gatewayUrl = `/api/gateway/${cid}`;
    window.open(gatewayUrl, '_blank');
  };

  // Handle copying CID to clipboard
  const handleCopyCID = async (cid: string) => {
    try {
      await navigator.clipboard.writeText(cid);
      // Could add a toast notification here
      showToast({
        type: 'success',
        title: 'Copied!',
        message: 'CID copied to clipboard'
      });
    } catch (error) {
      console.error('Failed to copy CID:', error);
      showToast({
        type: 'error',
        title: 'Copy Failed',
        message: 'Failed to copy CID to clipboard'
      });
    }
  };

  // Handle search submission
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchQuery.trim();

    if (!query) return;

    // Check if the query looks like a CID (basic validation)
    // CIDs typically start with 'Qm' (CIDv0) or 'ba' (CIDv1) and are long alphanumeric strings
    const cidPattern = /^(Qm[1-9A-HJ-NP-Za-km-z]{44}|ba[a-z2-7]{57}|b[a-z2-7]+)$/;

    if (cidPattern.test(query) || query.length > 40) {
      // Treat as CID and open in gateway
      handleViewContent(query);
      setSearchQuery(''); // Clear search after opening
    } else {
      // For now, just alert that we're searching for files
      // In the future, this could search through file names
      showToast({
      type: 'info',
      title: `Searching for: "${query}"`,
      message: 'Tip: Enter a CID to view content directly in the gateway.',
      duration: 7000
    });
    }
  };

  // Gateway functions
  const handleTestGateway = async () => {
    if (!gatewayCid.trim()) {
      setGatewayTestResult({
        status: 400,
        success: false,
        message: 'Please enter a CID to test'
      });
      return;
    }

    setIsGatewayLoading(true);
    setGatewayTestResult(null);

    try {
      // Get auth token for secured gateway
      const authToken = await getAccessToken();

      const response = await fetch(`/api/gateway/${gatewayCid.trim()}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });

      const contentType = response.headers.get('content-type') || 'unknown';
      const contentLength = response.headers.get('content-length') || 'unknown';

      if (response.ok) {
        setGatewayTestResult({
          status: response.status,
          success: true,
          message: 'Content successfully retrieved from Codex network',
          contentType,
          contentLength
        });
      } else {
        let errorMessage = 'Unknown error';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          errorMessage = response.statusText || 'Unknown error';
        }

        setGatewayTestResult({
          status: response.status,
          success: false,
          message: errorMessage,
          contentType,
          contentLength
        });
      }
    } catch (error) {
      setGatewayTestResult({
        status: 0,
        success: false,
        message: error instanceof Error ? error.message : 'Network error'
      });
    } finally {
      setIsGatewayLoading(false);
    }
  };

  const handleGatewayKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleTestGateway();
    }
  };

  const getGatewayUrl = () => {
    if (typeof window !== 'undefined' && gatewayCid.trim()) {
      return `https://thirdstorage.cloud/api/gateway/${gatewayCid.trim()}`;
    }
    return '';
  };

  // Handle dashboard refresh
  const handleRefresh = async () => {
    if (isRefreshing) return; // Prevent multiple simultaneous refreshes
    
    setIsRefreshing(true);
    try {
      // Reload all dashboard data
      await Promise.all([
        loadUserData(),
        loadBillingHistory()
      ]);
      
      showToast({
        type: 'success',
        title: 'Dashboard Refreshed',
        message: 'All data has been updated'
      });
    } catch (error) {
      console.error('Error refreshing dashboard:', error);
      showToast({
        type: 'error',
        title: 'Refresh Failed',
        message: 'Unable to refresh dashboard data'
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-center">
          <div className="relative">
            <Image src="/black.svg" alt="Loading" width={48} height={48} className="animate-pulse" />
          </div>
          <p className="mt-4 text-zinc-400">Loading...</p>
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

  // Navigation items with Vercel-inspired design
  const navigationItems = [
    {
      id: 'overview',
      label: 'Overview',
      isActive: activeSection === 'overview',
    },
    {
      id: 'files',
      label: 'Storage',
      isActive: activeSection === 'files',
    },
    {
      id: 'replication',
      label: 'Replication',
      isActive: activeSection === 'replication',
    },
    {
      id: 'gateway',
      label: 'Gateway',
      isActive: activeSection === 'gateway',
    },
    {
      id: 'migrations',
      label: 'Migrations',
      isActive: activeSection === 'migrations',
    },
    {
      id: 'secrets',
      label: 'Pinning Secrets',
      isActive: activeSection === 'secrets',
    },
    {
      id: 'payments',
      label: 'Payments',
      isActive: activeSection === 'payments',
    },
    {
      id: 'settings',
      label: 'Settings',
      isActive: activeSection === 'settings',
    },
  ];

  return (
    <div className="min-h-screen bg-black text-white">
      <SEO 
        title="Dashboard"
        description="Manage your decentralized storage on ThirdStorage. Upload files, create API keys, monitor usage, and control your storage settings."
        keywords="file management, storage dashboard, API keys, usage monitoring, file upload"
        noindex={true}
      />
      {/* Vercel-inspired Header */}
      <header className="">
        <div className="flex items-center justify-between h-16 px-4 sm:px-6">
          {/* Left section - Logo and Project Info */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3">
              <Link href="/">
              <div className="w-8 h-8 flex items-center justify-center">
                <Image src="/white.svg" alt="ThirdStorage" width={20} height={20} className="filter invert" />
              </div>
              </Link>
              <div className="flex items-center space-x-2">
                <span className="text-zinc-400">/</span>
                <span className="text-zinc-400">{getUserEmail()?.split('@')[0] || 'user'}</span>
                <span className="px-2 py-1 text-xs bg-zinc-800 text-zinc-300 rounded-md border border-zinc-700">
                  {userStats?.planType || 'free'}
                </span>
              </div>
            </div>
          </div>

          {/* Right section - Search, Actions, User */}
          <div className="flex items-center space-x-4">
                        {/* Testnet Indicator */}
            <div className="hidden md:flex items-center space-x-2">
              <div className="relative group">
                <span className="px-2 py-1 text-xs bg-orange-500/10 text-orange-400 border border-orange-500/30 rounded-md font-medium cursor-help">
                  Codex Testnet
                </span>
                
                {/* Tooltip */}
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-3 py-2 bg-black border border-zinc-700 rounded-md text-xs text-zinc-300 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50">
                  Limitations apply,{' '}
                  <button 
                    onClick={() => setShowTestnetModal(true)}
                    className="text-orange-400 hover:text-orange-300 underline"
                  >
                    Know more
                  </button>
                </div>
              </div>

              {/* Refresh Button */}
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="p-1.5 text-zinc-400 hover:text-white transition-colors rounded-md hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Refresh dashboard data"
              >
                <svg 
                  className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
                  />
                </svg>
              </button>
            </div>

            {/* Search */}
            <div className="hidden lg:flex items-center">
              <form onSubmit={handleSearch} className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-4 w-4 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search a CID"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="block w-48 xl:w-64 pl-10 pr-16 py-2 border border-zinc-700 rounded-md bg-zinc-900 text-zinc-300 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-600 focus:border-zinc-600 text-sm"
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center space-x-1">
                  <kbd className="inline-flex items-center px-1.5 py-0.5 rounded border border-zinc-600 bg-zinc-800 text-zinc-400 text-xs">
                    ⌘K
                  </kbd>
                </div>
              </form>
            </div>

            {/* Actions */}
            <div className="hidden sm:flex items-center space-x-2">
              <a
                href='https://docs.thirdstorage.cloud'
                target='_blank'
                className="px-3 py-2 text-sm bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-md transition-colors"
              >
                Docs
              </a>
            </div>

            {/* User Menu */}
            <div className="flex items-center space-x-3">
              <button
                onClick={handleLogout}
                className="p-2 text-zinc-400 hover:text-white transition-colors rounded-md hover:bg-zinc-800"
                title="Sign out"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Vercel-inspired Navigation */}
      <nav className="border-b border-zinc-800">
        <div className="flex space-x-4 sm:space-x-6 lg:space-x-8 px-4 sm:px-6 overflow-x-auto">
          {navigationItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id as 'overview' | 'files' | 'replication' | 'secrets' | 'gateway' | 'migrations' | 'payments' | 'settings')}
              className={`relative py-3 sm:py-4 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${item.isActive
                  ? 'text-white'
                  : 'text-zinc-400 hover:text-zinc-300'
                }`}
            >
              {item.label}
              {item.isActive && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white"></div>
              )}
            </button>
          ))}
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">

        {/* Overview Section */}
        {activeSection === 'overview' && (
          <div className="space-y-8">
            {/* Stats Cards */}
            {userStats ? (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Storage Usage */}
                <div className="lg:col-span-2 bg-zinc-900/50 backdrop-blur-sm border border-zinc-800/50 rounded-lg p-6 flex flex-col">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-lg font-semibold text-white">Storage Usage</h2>
                      <p className="text-zinc-400 text-sm">Track your storage consumption</p>
                    </div>
                    <span className="px-3 py-1 text-xs font-medium rounded-full bg-zinc-800/80 backdrop-blur-sm text-zinc-300 border border-zinc-700/50">
                      {userStats.planType.toUpperCase()}
                    </span>
                  </div>

                  <div className="flex-1 flex flex-col justify-center space-y-6">
                    <div className="flex justify-between text-sm">
                      <span className="text-zinc-400">{formatFileSize(userStats.storageUsed)} used</span>
                      <span className="text-zinc-400">{formatFileSize(userStats.storageLimit)} total</span>
                    </div>
                    <div className="w-full bg-zinc-800/50 rounded-full h-3">
                      <div
                        className={`h-3 rounded-full transition-all duration-500 ${userStats.usagePercentage >= 90 ? 'bg-white/90' :
                            userStats.usagePercentage >= 75 ? 'bg-white/70' :
                              'bg-white/50'
                          }`}
                        style={{ width: `${userStats.usagePercentage}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between text-sm text-zinc-400">
                      <span>{userStats.filesCount} files</span>
                      <span>{userStats.usagePercentage.toFixed(1)}% used</span>
                    </div>
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="flex flex-col space-y-4 h-full">
                  <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800/50 rounded-lg p-6 flex-1 flex flex-col justify-center">
                    <div className="flex items-center">
                      <div className="w-12 h-12 bg-zinc-800/80 backdrop-blur-sm rounded-lg flex items-center justify-center mr-4">
                      <LuFiles className="text-zinc-400" />
                      </div>
                      <div>
                        <p className="text-sm text-zinc-400 mb-1">Total Files</p>
                        <p className="text-2xl font-semibold text-white">{allFiles.length}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800/50 rounded-lg p-6 flex-1 flex flex-col justify-center">
                    <div className="flex items-center">
                      <div className="w-12 h-12 bg-zinc-800/80 backdrop-blur-sm rounded-lg flex items-center justify-center mr-4">
                      <IoKeyOutline className="text-zinc-400" />
                      </div>
                      <div>
                        <p className="text-sm text-zinc-400 mb-1">Pinning Secrets</p>
                        <p className="text-2xl font-semibold text-white">{pinningSecrets.length}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Storage Usage Skeleton */}
                <div className="lg:col-span-2 bg-zinc-900/50 backdrop-blur-sm border border-zinc-800/50 rounded-lg p-6 flex flex-col">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-lg font-semibold text-white">Storage Usage</h2>
                      <p className="text-zinc-400 text-sm">Track your storage consumption</p>
                    </div>
                    <div className="h-6 w-12 bg-zinc-700/50 rounded-full animate-pulse"></div>
                  </div>

                  <div className="flex-1 flex flex-col justify-center space-y-6">
                    <div className="flex justify-between text-sm">
                      <div className="h-4 w-20 bg-zinc-700/50 rounded animate-pulse"></div>
                      <div className="h-4 w-20 bg-zinc-700/50 rounded animate-pulse"></div>
                    </div>
                    <div className="w-full bg-zinc-800/50 rounded-full h-3">
                      <div className="h-3 bg-zinc-700/50 rounded-full w-0 animate-pulse"></div>
                    </div>

                    <div className="flex justify-between text-sm">
                      <div className="h-4 w-16 bg-zinc-700/50 rounded animate-pulse"></div>
                      <div className="h-4 w-16 bg-zinc-700/50 rounded animate-pulse"></div>
                    </div>
                  </div>
                </div>

                {/* Quick Stats Skeleton */}
                <div className="flex flex-col space-y-4 h-full">
                  <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800/50 rounded-lg p-6 flex-1 flex flex-col justify-center">
                    <div className="flex items-center">
                      <div className="w-12 h-12 bg-zinc-700/50 rounded-lg animate-pulse mr-4"></div>
                      <div>
                        <div className="h-4 w-20 bg-zinc-700/50 rounded animate-pulse mb-1"></div>
                        <div className="h-6 w-8 bg-zinc-700/50 rounded animate-pulse"></div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800/50 rounded-lg p-6 flex-1 flex flex-col justify-center">
                    <div className="flex items-center">
                      <div className="w-12 h-12 bg-zinc-700/50 rounded-lg animate-pulse mr-4"></div>
                      <div>
                        <div className="h-4 w-28 bg-zinc-700/50 rounded animate-pulse mb-1"></div>
                        <div className="h-6 w-8 bg-zinc-700/50 rounded animate-pulse"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Upload and Recent Files Section - Horizontal Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Upload Section */}
              <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800/50 rounded-lg p-6 h-[480px] flex flex-col">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold text-white">Upload Files</h2>

                  {/* Mode Toggle */}
                  <div className="flex items-center space-x-3">
                    <span className={`text-sm ${uploadMode === 'drag-drop' ? 'text-white' : 'text-zinc-400'}`}>
                      Drag & Drop
                    </span>
                    <button
                      onClick={() => setUploadMode(uploadMode === 'drag-drop' ? 'api' : 'drag-drop')}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${uploadMode === 'api' ? 'bg-white' : 'bg-zinc-700'
                        }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-black transition-transform ${uploadMode === 'api' ? 'translate-x-6' : 'translate-x-1'
                          }`}
                      />
                    </button>
                    <span className={`text-sm ${uploadMode === 'api' ? 'text-white' : 'text-zinc-400'}`}>
                      Using API
                    </span>
                  </div>
                </div>

                {uploadMode === 'drag-drop' ? (
                  <div
                    className={`flex-1 border-2 border-dashed rounded-lg p-6 text-center transition-colors backdrop-blur-sm flex flex-col justify-center ${isDragOver
                        ? 'border-white/50 bg-zinc-800/50'
                        : isUploading
                          ? 'border-zinc-500 bg-zinc-800/30'
                          : 'border-zinc-700 hover:border-zinc-600 bg-zinc-900/30'
                      }`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                  >
                    <div className="space-y-4">
                      <div className="mx-auto w-12 h-12 bg-zinc-800 rounded-lg flex items-center justify-center">
                        {isUploading ? (
                          <div className="animate-spin rounded-full h-6 w-6 border-2 border-zinc-600 border-t-white"></div>
                        ) : (
                          <svg className="w-6 h-6 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                          </svg>
                        )}
                      </div>
                      <div>
                        <p className="text-lg font-medium text-white">
                          {isUploading ? 'Uploading...' : 'Drop files here or click to upload'}
                        </p>
                        <p className="text-zinc-400">Support for any file type up to 100MB</p>
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
                          className={`inline-flex items-center px-4 py-2 rounded-md font-medium text-sm transition-colors cursor-pointer ${isUploading
                              ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                              : 'bg-white text-black hover:bg-zinc-100'
                            }`}
                        >
                          {isUploading ? 'Uploading...' : 'Choose Files'}
                        </label>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col">
                    {/* Language Tabs */}
                    <div className="flex space-x-1 mb-3 bg-zinc-800/30 backdrop-blur-sm rounded-lg p-1">
                      {[
                        { id: 'curl', label: 'cURL' },
                        { id: 'javascript', label: 'JavaScript' },
                        { id: 'python', label: 'Python' },
                        { id: 'node', label: 'Node.js' }
                      ].map((tab) => (
                        <button
                          key={tab.id}
                          onClick={() => setSelectedCodeExample(tab.id as 'curl' | 'javascript' | 'python' | 'node')}
                          className={`flex-1 px-3 py-2 text-xs font-medium rounded-md transition-colors ${selectedCodeExample === tab.id
                              ? 'bg-white text-black'
                              : 'text-zinc-400 hover:text-white'
                            }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>

                    {/* Code Example */}
                    <div className="flex-1 bg-zinc-800/50 backdrop-blur-sm border border-zinc-700/50 rounded-lg flex flex-col min-h-0">
                      <div className="flex items-center justify-between p-3 border-b border-zinc-700/50">
                        <h3 className="text-sm font-semibold text-white">
                          {selectedCodeExample === 'curl' && 'Upload with cURL'}
                          {selectedCodeExample === 'javascript' && 'Upload with JavaScript'}
                          {selectedCodeExample === 'python' && 'Upload with Python'}
                          {selectedCodeExample === 'node' && 'Upload with Node.js'}
                        </h3>
                        <button
                          onClick={() => {
                            const codeSnippets = {
                              curl: `curl -X POST "https://thirdstorage.cloud/api/upload" \\
  -H "Authorization: Bearer YOUR_PINNING_SECRET" \\
  -F "file=@/path/to/your/file.jpg"`,
                              javascript: `const formData = new FormData();
formData.append('file', fileInput.files[0]);

fetch('https://thirdstorage.cloud/api/upload', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_PINNING_SECRET'
  },
  body: formData
})
.then(response => response.json())
.then(data => console.log(data));`,
                              python: `import requests

url = "https://thirdstorage.cloud/api/upload"
headers = {"Authorization": "Bearer YOUR_PINNING_SECRET"}
files = {"file": open("/path/to/your/file.jpg", "rb")}

response = requests.post(url, headers=headers, files=files)
print(response.json())`,
                              node: `const form = new FormData();
form.append('file', fs.createReadStream('/path/to/your/file.jpg'));

fetch('https://thirdstorage.cloud/api/upload', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_PINNING_SECRET',
    ...form.getHeaders()
  },
  body: form
})
.then(res => res.json())
.then(data => console.log(data));`
                            };
                            navigator.clipboard.writeText(codeSnippets[selectedCodeExample]);
                            showToast({
        type: 'success',
        title: 'Copied!',
        message: 'Code copied to clipboard'
      });
                          }}
                          className="text-xs text-zinc-400 hover:text-white transition-colors"
                        >
                          Copy
                        </button>
                      </div>

                      <div className="flex-1 p-3 font-mono text-xs text-zinc-300 overflow-hidden">
                        {selectedCodeExample === 'curl' && (
                          <div className="space-y-1">
                            <div className="text-zinc-500"># Upload a file using cURL</div>
                            <div><span className="text-zinc-400">curl</span> <span className="text-white">-X POST</span> <span className="text-zinc-300">&quot;{window.location.origin}/api/upload&quot;</span> <span className="text-white">\</span></div>
                            <div className="ml-2"><span className="text-white">-H</span> <span className="text-zinc-300">&quot;Authorization: Bearer YOUR_PINNING_SECRET&quot;</span> <span className="text-white">\</span></div>
                            <div className="ml-2"><span className="text-white">-F</span> <span className="text-zinc-300">&quot;file=@/path/to/your/file.jpg&quot;</span></div>
                          </div>
                        )}

                        {selectedCodeExample === 'javascript' && (
                          <div className="space-y-1">
                            <div><span className="text-blue-400">const</span> <span className="text-white">formData</span> <span className="text-zinc-400">=</span> <span className="text-blue-400">new</span> <span className="text-yellow-400">FormData</span><span className="text-zinc-400">();</span></div>
                            <div><span className="text-white">formData</span><span className="text-zinc-400">.</span><span className="text-yellow-400">append</span><span className="text-zinc-400">(</span><span className="text-green-400">'file'</span><span className="text-zinc-400">,</span> <span className="text-white">fileInput</span><span className="text-zinc-400">.</span><span className="text-white">files</span><span className="text-zinc-400">[</span><span className="text-purple-400">0</span><span className="text-zinc-400">]);</span></div>
                            <div className="mt-2"></div>
                            <div><span className="text-yellow-400">fetch</span><span className="text-zinc-400">(</span><span className="text-green-400">'{window.location.origin}/api/upload'</span><span className="text-zinc-400">,</span> <span className="text-zinc-400">{'{'}</span></div>
                            <div className="ml-2"><span className="text-white">method</span><span className="text-zinc-400">:</span> <span className="text-green-400">'POST'</span><span className="text-zinc-400">,</span></div>
                            <div className="ml-2"><span className="text-white">headers</span><span className="text-zinc-400">:</span> <span className="text-zinc-400">{'{'}</span></div>
                            <div className="ml-4"><span className="text-green-400">&apos;Authorization&apos;</span><span className="text-zinc-400">:</span> <span className="text-green-400">&apos;Bearer YOUR_PINNING_SECRET&apos;</span></div>
                            <div className="ml-2"><span className="text-zinc-400">{'}'}</span><span className="text-zinc-400">,</span></div>
                            <div className="ml-2"><span className="text-white">body</span><span className="text-zinc-400">:</span> <span className="text-white">formData</span></div>
                            <div><span className="text-zinc-400">{'}'}</span><span className="text-zinc-400">)</span></div>
                            <div><span className="text-zinc-400">.</span><span className="text-yellow-400">then</span><span className="text-zinc-400">(</span><span className="text-white">response</span> <span className="text-zinc-400">{'=>'}</span> <span className="text-white">response</span><span className="text-zinc-400">.</span><span className="text-yellow-400">json</span><span className="text-zinc-400">())</span></div>
                            <div><span className="text-zinc-400">.</span><span className="text-yellow-400">then</span><span className="text-zinc-400">(</span><span className="text-white">data</span> <span className="text-zinc-400">{'=>'}</span> <span className="text-white">console</span><span className="text-zinc-400">.</span><span className="text-yellow-400">log</span><span className="text-zinc-400">(</span><span className="text-white">data</span><span className="text-zinc-400">));</span></div>
                          </div>
                        )}

                        {selectedCodeExample === 'python' && (
                          <div className="space-y-1">
                            <div><span className="text-blue-400">import</span> <span className="text-white">requests</span></div>
                            <div className="mt-2"></div>
                            <div><span className="text-white">url</span> <span className="text-zinc-400">=</span> <span className="text-green-400">&quot;{window.location.origin}/api/upload&quot;</span></div>
                            <div><span className="text-white">headers</span> <span className="text-zinc-400">=</span> <span className="text-zinc-400">{'{'}</span><span className="text-green-400">&quot;Authorization&quot;</span><span className="text-zinc-400">:</span> <span className="text-green-400">&quot;Bearer YOUR_PINNING_SECRET&quot;</span><span className="text-zinc-400">{'}'}</span></div>
                            <div><span className="text-white">files</span> <span className="text-zinc-400">=</span> <span className="text-zinc-400">{'{'}</span><span className="text-green-400">&quot;file&quot;</span><span className="text-zinc-400">:</span> <span className="text-yellow-400">open</span><span className="text-zinc-400">(</span><span className="text-green-400">&quot;/path/to/your/file.jpg&quot;</span><span className="text-zinc-400">,</span> <span className="text-green-400">&quot;rb&quot;</span><span className="text-zinc-400">)</span><span className="text-zinc-400">{'}'}</span></div>
                            <div className="mt-2"></div>
                            <div><span className="text-white">response</span> <span className="text-zinc-400">=</span> <span className="text-white">requests</span><span className="text-zinc-400">.</span><span className="text-yellow-400">post</span><span className="text-zinc-400">(</span><span className="text-white">url</span><span className="text-zinc-400">,</span> <span className="text-white">headers</span><span className="text-zinc-400">=</span><span className="text-white">headers</span><span className="text-zinc-400">,</span> <span className="text-white">files</span><span className="text-zinc-400">=</span><span className="text-white">files</span><span className="text-zinc-400">)</span></div>
                            <div><span className="text-yellow-400">print</span><span className="text-zinc-400">(</span><span className="text-white">response</span><span className="text-zinc-400">.</span><span className="text-yellow-400">json</span><span className="text-zinc-400">())</span></div>
                          </div>
                        )}

                        {selectedCodeExample === 'node' && (
                          <div className="space-y-1">
                            <div><span className="text-blue-400">const</span> <span className="text-white">form</span> <span className="text-zinc-400">=</span> <span className="text-blue-400">new</span> <span className="text-yellow-400">FormData</span><span className="text-zinc-400">();</span></div>
                            <div><span className="text-white">form</span><span className="text-zinc-400">.</span><span className="text-yellow-400">append</span><span className="text-zinc-400">(</span><span className="text-green-400">'file'</span><span className="text-zinc-400">,</span> <span className="text-white">fs</span><span className="text-zinc-400">.</span><span className="text-yellow-400">createReadStream</span><span className="text-zinc-400">(</span><span className="text-green-400">'/path/to/file.jpg'</span><span className="text-zinc-400">));</span></div>
                            <div className="mt-2"></div>
                            <div><span className="text-yellow-400">fetch</span><span className="text-zinc-400">(</span><span className="text-green-400">'{window.location.origin}/api/upload'</span><span className="text-zinc-400">,</span> <span className="text-zinc-400">{'{'}</span></div>
                            <div className="ml-2"><span className="text-white">method</span><span className="text-zinc-400">:</span> <span className="text-green-400">'POST'</span><span className="text-zinc-400">,</span></div>
                            <div className="ml-2"><span className="text-white">headers</span><span className="text-zinc-400">:</span> <span className="text-zinc-400">{'{'}</span></div>
                            <div className="ml-4"><span className="text-green-400">'Authorization'</span><span className="text-zinc-400">:</span> <span className="text-green-400">'Bearer YOUR_PINNING_SECRET'</span><span className="text-zinc-400">,</span></div>
                            <div className="ml-4"><span className="text-zinc-400">...</span><span className="text-white">form</span><span className="text-zinc-400">.</span><span className="text-yellow-400">getHeaders</span><span className="text-zinc-400">()</span></div>
                            <div className="ml-2"><span className="text-zinc-400">{'}'}</span><span className="text-zinc-400">,</span></div>
                            <div className="ml-2"><span className="text-white">body</span><span className="text-zinc-400">:</span> <span className="text-white">form</span></div>
                            <div><span className="text-zinc-400">{'}'}</span><span className="text-zinc-400">)</span></div>
                            <div><span className="text-zinc-400">.</span><span className="text-yellow-400">then</span><span className="text-zinc-400">(</span><span className="text-white">res</span> <span className="text-zinc-400">{'=>'}</span> <span className="text-white">res</span><span className="text-zinc-400">.</span><span className="text-yellow-400">json</span><span className="text-zinc-400">())</span></div>
                            <div><span className="text-zinc-400">.</span><span className="text-yellow-400">then</span><span className="text-zinc-400">(</span><span className="text-white">data</span> <span className="text-zinc-400">{'=>'}</span> <span className="text-white">console</span><span className="text-zinc-400">.</span><span className="text-yellow-400">log</span><span className="text-zinc-400">(</span><span className="text-white">data</span><span className="text-zinc-400">));</span></div>
                          </div>
                        )}
                      </div>
                    </div>


                  </div>
                )}
              </div>

              {/* Recent Files */}
              {allFiles.length > 0 ? (
                <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800/50 rounded-lg p-6 h-[480px] flex flex-col">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-white">Recent Files</h3>
                    <button
                      onClick={() => setActiveSection('files')}
                      className="text-sm text-zinc-400 hover:text-white transition-colors"
                    >
                      View all →
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto space-y-3">
                    {allFiles.slice(0, 8).map((file) => (
                      <div key={file.id} className="flex items-center justify-between py-2">
                        <div className="flex items-center space-x-3">
                          <span className="text-lg">{getFileIcon(file.type)}</span>
                          <div>
                            <p className="font-medium text-white text-sm">{file.name}</p>
                            <p className="text-zinc-400 text-xs">{file.size}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium backdrop-blur-sm ${file.status === 'uploaded'
                              ? 'bg-zinc-800/80 text-zinc-300 border border-zinc-700/50'
                              : file.status === 'uploading'
                                ? 'bg-zinc-700/80 text-zinc-200 border border-zinc-600/50'
                                : 'bg-zinc-900/80 text-zinc-400 border border-zinc-800/50'
                            }`}>
                            {file.status === 'uploaded' ? 'Pinned' :
                              file.status === 'uploading' ? 'Uploading' : 'Error'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800/50 rounded-lg p-6 h-[480px] flex items-center justify-center">
                  <div className="text-center">
                    <div className="mx-auto w-12 h-12 bg-zinc-800 rounded-lg flex items-center justify-center mb-3">
                      <svg className="w-6 h-6 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <h3 className="text-sm font-medium text-white mb-1">No files yet</h3>
                    <p className="text-zinc-400 text-xs">Upload your first file to see recent files here</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Storage Section */}
        {activeSection === 'files' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-white">Storage</h1>
                <p className="text-zinc-400">Manage your uploaded files</p>
              </div>
              <div className="flex items-center space-x-3">
                <div className="flex bg-zinc-800 rounded-lg p-1">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 rounded transition-colors ${viewMode === 'grid'
                        ? 'bg-zinc-700 text-white'
                        : 'text-zinc-400 hover:text-white'
                      }`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 rounded transition-colors ${viewMode === 'list'
                        ? 'bg-zinc-700 text-white'
                        : 'text-zinc-400 hover:text-white'
                      }`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            {allFiles.length === 0 ? (
              <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800/50 rounded-lg h-[480px] flex items-center justify-center">
                <div className="text-center">
                  <div className="mx-auto w-16 h-16 bg-zinc-800 rounded-lg flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-white mb-2">No files yet</h3>
                  <p className="text-zinc-400 mb-6">Upload your first file to get started</p>
                  <button
                    onClick={() => setActiveSection('overview')}
                    className="inline-flex items-center px-4 py-2 bg-white text-black rounded-md hover:bg-zinc-100 transition-colors"
                  >
                    Upload Files
                  </button>
                </div>
              </div>
            ) : viewMode === 'grid' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {allFiles.map((file) => (
                  <div key={file.id} className="group bg-zinc-900/50 backdrop-blur-sm border border-zinc-800/50 rounded-lg p-4 hover:border-zinc-700/80 transition-colors">
                    <div className="flex items-start justify-between mb-3">
                      <div className="w-10 h-10 bg-zinc-800 rounded-lg flex items-center justify-center">
                        {file.status === 'uploading' ? (
                          <div className="animate-spin rounded-full h-5 w-5 border-2 border-zinc-600 border-t-white"></div>
                        ) : (
                          <span className="text-lg">{getFileIcon(file.type)}</span>
                        )}
                      </div>
                      {file.status === 'uploaded' && (
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleDeleteFile(file.originalId || file.id)}
                            className="p-1 text-zinc-400 hover:text-red-400 transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-medium text-white text-sm truncate">{file.name}</h4>
                      <p className="text-zinc-400 text-xs">{file.size}</p>
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium backdrop-blur-sm ${file.status === 'uploaded'
                          ? 'bg-zinc-800/80 text-zinc-300 border border-zinc-700/50'
                          : file.status === 'uploading'
                            ? 'bg-zinc-700/80 text-zinc-200 border border-zinc-600/50'
                            : 'bg-zinc-900/80 text-zinc-400 border border-zinc-800/50'
                        }`}>
                        {file.status === 'uploaded' ? 'Pinned' :
                          file.status === 'uploading' ? 'Uploading' : 'Error'}
                      </span>
                    </div>
                    {file.status === 'uploaded' && (
                      <div className="mt-3 pt-3 border-t border-zinc-800 space-y-2">
                        <button
                          onClick={() => handleViewContent(file.cid)}
                          className="w-full text-xs text-zinc-400 hover:text-white transition-colors text-left"
                        >
                          View content →
                        </button>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-zinc-500 font-mono truncate">{file.cid.slice(0, 12)}...</span>
                          <button
                            onClick={() => handleCopyCID(file.cid)}
                            className="p-1 text-zinc-400 hover:text-white transition-colors"
                            title="Copy CID"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800/50 rounded-lg overflow-hidden">
                <div className="divide-y divide-zinc-800">
                  {allFiles.map((file) => (
                    <div key={file.id} className="p-4 hover:bg-zinc-800 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3 flex-1 min-w-0">
                          <div className="w-8 h-8 bg-zinc-800 rounded flex items-center justify-center">
                            {file.status === 'uploading' ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-2 border-zinc-600 border-t-white"></div>
                            ) : (
                              <span>{getFileIcon(file.type)}</span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-white text-sm truncate">{file.name}</p>
                            <p className="text-zinc-400 text-xs">{file.size} • {formatContentType(file.type)}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium backdrop-blur-sm ${file.status === 'uploaded'
                              ? 'bg-zinc-800/80 text-zinc-300 border border-zinc-700/50'
                              : file.status === 'uploading'
                                ? 'bg-zinc-700/80 text-zinc-200 border border-zinc-600/50'
                                : 'bg-zinc-900/80 text-zinc-400 border border-zinc-800/50'
                            }`}>
                            {file.status === 'uploaded' ? 'Pinned' :
                              file.status === 'uploading' ? 'Uploading' : 'Error'}
                          </span>
                          {file.status === 'uploaded' && (
                            <div className="flex items-center space-x-1">
                              <button
                                onClick={() => handleCopyCID(file.cid)}
                                className="p-1 text-zinc-400 hover:text-white transition-colors"
                                title="Copy CID"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                              </button>
                              <button
                                onClick={() => handleViewContent(file.cid)}
                                className="p-1 text-zinc-400 hover:text-white transition-colors"
                                title="View content"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                              </button>
                              <button
                                onClick={() => handleDeleteFile(file.originalId || file.id)}
                                className="p-1 text-zinc-400 hover:text-red-400 transition-colors"
                                title="Delete"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Replication Section */}
        {activeSection === 'replication' && (
          <div className="relative">
            {/* Coming Soon Overlay */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-10 rounded-lg">
              <div className="absolute top-64 left-1/2 transform -translate-x-1/2 text-center">
                <div className="w-16 h-16 bg-zinc-800/80 backdrop-blur-sm rounded-lg flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">Coming Soon</h2>
                <p className="text-zinc-400 max-w-md">
                  Advanced replication management features are currently in development. Check back soon for comprehensive replication controls and monitoring.
                </p>
              </div>
            </div>

            {/* Blurred Content */}
            <div className="blur-[1px] pointer-events-none space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-white">Replication Management</h1>
                  <p className="text-zinc-400">Configure data redundancy and replication rules for your files</p>
                </div>
                <button className="inline-flex items-center px-4 py-2 bg-white text-black rounded-md hover:bg-zinc-100 transition-colors font-medium text-sm">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  New Rule
                </button>
              </div>

              {/* Global Replication Settings */}
              <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800/50 rounded-lg p-6">
                <h2 className="text-xl font-semibold text-white mb-6">Global Replication Settings</h2>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-zinc-300 mb-2">
                        Default Minimum Copies
                      </label>
                      <select className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-white focus:outline-none focus:ring-1 focus:ring-zinc-600">
                        <option value="2">2 copies</option>
                        <option value="3" selected>3 copies</option>
                        <option value="4">4 copies</option>
                        <option value="5">5 copies</option>
                      </select>
                      <p className="text-xs text-zinc-500 mt-1">Minimum number of copies to maintain across the network</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-zinc-300 mb-2">
                        Default Maximum Copies
                      </label>
                      <select className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-white focus:outline-none focus:ring-1 focus:ring-zinc-600">
                        <option value="5">5 copies</option>
                        <option value="10" selected>10 copies</option>
                        <option value="15">15 copies</option>
                        <option value="20">20 copies</option>
                      </select>
                      <p className="text-xs text-zinc-500 mt-1">Maximum number of copies to prevent over-replication</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-zinc-300 mb-2">
                        Replication Strategy
                      </label>
                      <select className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-white focus:outline-none focus:ring-1 focus:ring-zinc-600">
                        <option value="balanced" selected>Balanced Distribution</option>
                        <option value="performance">Performance Optimized</option>
                        <option value="geographic">Geographic Distribution</option>
                        <option value="cost">Cost Optimized</option>
                      </select>
                      <p className="text-xs text-zinc-500 mt-1">Strategy for distributing copies across nodes</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-zinc-300 mb-2">
                        Auto-healing
                      </label>
                      <div className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          defaultChecked
                          className="w-4 h-4 text-white bg-zinc-700 border-zinc-600 rounded focus:ring-zinc-500"
                        />
                        <span className="text-white text-sm">Enable automatic replication repair</span>
                      </div>
                      <p className="text-xs text-zinc-500 mt-1">Automatically create new copies if existing ones fail</p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end mt-6">
                  <button className="px-4 py-2 bg-white text-black rounded-md hover:bg-zinc-100 transition-colors font-medium text-sm">
                    Save Settings
                  </button>
                </div>
              </div>

              {/* Current Replication Rules */}
              <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800/50 rounded-lg p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-white">File Replication Rules</h2>
                  <div className="flex items-center space-x-3">
                    <span className="text-sm text-zinc-400">4 active rules</span>
                    <button className="text-sm text-zinc-400 hover:text-white transition-colors">
                      View all →
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  {[
                    { pattern: "*.mp4", minCopies: 5, maxCopies: 15, status: "active", files: 12 },
                    { pattern: "*.jpg", minCopies: 3, maxCopies: 8, status: "active", files: 245 },
                    { pattern: "documents/*", minCopies: 4, maxCopies: 10, status: "active", files: 67 },
                    { pattern: "backup/*", minCopies: 2, maxCopies: 5, status: "paused", files: 34 }
                  ].map((rule, index) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-zinc-800/30 backdrop-blur-sm border border-zinc-700/30 rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-zinc-800/80 backdrop-blur-sm rounded-lg flex items-center justify-center">
                          <svg className="w-5 h-5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <div>
                          <h4 className="font-medium text-white">{rule.pattern}</h4>
                          <p className="text-sm text-zinc-400">
                            {rule.minCopies}-{rule.maxCopies} copies • {rule.files} files
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium backdrop-blur-sm ${rule.status === 'active'
                            ? 'bg-zinc-800/80 text-zinc-300 border border-zinc-700/50'
                            : 'bg-zinc-900/80 text-zinc-400 border border-zinc-800/50'
                          }`}>
                          {rule.status}
                        </span>
                        <button className="p-1 text-zinc-400 hover:text-white transition-colors">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Replication Status Overview */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800/50 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white">Network Health</h3>
                    <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Active Nodes</span>
                      <span className="text-white">847</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Avg Response Time</span>
                      <span className="text-white">124ms</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Success Rate</span>
                      <span className="text-white">99.8%</span>
                    </div>
                  </div>
                </div>

                <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800/50 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white">Replication Status</h3>
                    <svg className="w-5 h-5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                    </svg>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Well Replicated</span>
                      <span className="text-white">342 files</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Under Replicated</span>
                      <span className="text-yellow-400">12 files</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Failed Copies</span>
                      <span className="text-red-400">3 files</span>
                    </div>
                  </div>
                </div>

                <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800/50 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white">Recent Activity</h3>
                    <svg className="w-5 h-5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-zinc-400">New Copies</span>
                      <span className="text-white">24 today</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Repairs</span>
                      <span className="text-white">7 today</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Last Check</span>
                      <span className="text-white">2m ago</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Individual File Management */}
              <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800/50 rounded-lg p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-white">File-Specific Replication</h2>
                  <div className="flex items-center space-x-3">
                    <input
                      type="text"
                      placeholder="Search files..."
                      className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-white placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-600 text-sm"
                    />
                    <select className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-white focus:outline-none focus:ring-1 focus:ring-zinc-600 text-sm">
                      <option>All files</option>
                      <option>Under-replicated</option>
                      <option>Over-replicated</option>
                      <option>Custom rules</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-3">
                  {[
                    { name: "video_presentation.mp4", size: "245 MB", copies: 8, target: "5-15", status: "healthy" },
                    { name: "project_documents.zip", size: "67 MB", copies: 2, target: "4-10", status: "under" },
                    { name: "backup_2024.tar.gz", size: "1.2 GB", copies: 1, target: "2-5", status: "critical" },
                    { name: "profile_image.jpg", size: "3 MB", copies: 12, target: "3-8", status: "over" }
                  ].map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-zinc-800/30 backdrop-blur-sm border border-zinc-700/30 rounded-lg hover:bg-zinc-800/50 transition-colors">
                      <div className="flex items-center space-x-4">
                        <div className="w-8 h-8 bg-zinc-800 rounded flex items-center justify-center">
                          <span className="text-sm">📁</span>
                        </div>
                        <div>
                          <h4 className="font-medium text-white text-sm">{file.name}</h4>
                          <p className="text-xs text-zinc-400">{file.size}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <p className="text-sm text-white">{file.copies} copies</p>
                          <p className="text-xs text-zinc-400">Target: {file.target}</p>
                        </div>
                        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium backdrop-blur-sm ${file.status === 'healthy' ? 'bg-zinc-800/80 text-zinc-300 border border-zinc-700/50' :
                            file.status === 'under' ? 'bg-yellow-900/50 text-yellow-300 border border-yellow-700/50' :
                              file.status === 'critical' ? 'bg-red-900/50 text-red-300 border border-red-700/50' :
                                'bg-blue-900/50 text-blue-300 border border-blue-700/50'
                          }`}>
                          {file.status === 'healthy' ? 'Healthy' :
                            file.status === 'under' ? 'Under-replicated' :
                              file.status === 'critical' ? 'Critical' :
                                'Over-replicated'}
                        </span>
                        <button className="p-1 text-zinc-400 hover:text-white transition-colors">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 text-center">
                  <button className="text-sm text-zinc-400 hover:text-white transition-colors">
                    Load more files →
                  </button>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* API Secrets Section */}
        {activeSection === 'secrets' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-white">Pinning Secrets</h1>
                <p className="text-zinc-400">Manage your pinning secrets for programmatic access</p>
              </div>
              <button
                onClick={() => setShowCreateSecretModal(true)}
                className="inline-flex items-center px-4 py-2 bg-white text-black rounded-md hover:bg-zinc-100 transition-colors font-medium text-sm"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                New Secret
              </button>
            </div>

            {/* Create Secret Modal */}
            {showCreateSecretModal && (
              <div
                className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
                onClick={(e) => {
                  if (e.target === e.currentTarget) {
                    setShowCreateSecretModal(false);
                    setNewSecretName('');
                  }
                }}
              >
                <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 w-full max-w-md"
                  onClick={(e) => e.stopPropagation()}>
                  <h3 className="text-lg font-semibold text-white mb-4">Create New Pinning Secret</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-zinc-300 mb-2">Secret Name</label>
                      <input
                        type="text"
                        placeholder="e.g., 'Production API'"
                        value={newSecretName}
                        onChange={(e) => setNewSecretName(e.target.value)}
                        className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-white placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-600"
                        autoFocus
                      />
                    </div>
                    <div className="flex space-x-3">
                      <button
                        onClick={createPinningSecret}
                        className="flex-1 px-4 py-2 bg-white text-black rounded-md hover:bg-zinc-100 transition-colors font-medium text-sm"
                      >
                        Create Secret
                      </button>
                      <button
                        onClick={() => {
                          setShowCreateSecretModal(false);
                          setNewSecretName('');
                        }}
                        className="flex-1 px-4 py-2 bg-zinc-800 text-zinc-300 border border-zinc-700 rounded-md hover:bg-zinc-700 transition-colors font-medium text-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Created Secret Display */}
            {createdSecret && (
              <div className="bg-zinc-900/80 backdrop-blur-sm border border-zinc-700/50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-3">Secret Created Successfully</h3>
                <p className="text-zinc-300 mb-4">Copy this secret now. It won't be shown again.</p>
                <div className="bg-zinc-800/80 backdrop-blur-sm border border-zinc-700/50 rounded-md p-3 font-mono text-sm text-zinc-100 mb-4 break-all">
                  {createdSecret}
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(createdSecret);
                      showToast({
                type: 'success',
                title: 'Copied!',
                message: 'Pinning secret copied to clipboard'
              });
                    }}
                    className="px-4 py-2 bg-white/90 text-black rounded-md hover:bg-white transition-colors"
                  >
                    Copy
                  </button>
                  <button
                    onClick={() => setCreatedSecret(null)}
                    className="px-4 py-2 bg-zinc-800/80 backdrop-blur-sm text-zinc-300 border border-zinc-700/50 rounded-md hover:bg-zinc-700/80 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}

            {/* Secrets List */}
            {pinningSecrets.length === 0 ? (
              <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800/50 rounded-lg h-[480px] flex items-center justify-center">
                <div className="text-center">
                  <div className="mx-auto w-16 h-16 bg-zinc-800 rounded-lg flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 12H9v4a1 1 0 01-1 1H4a1 1 0 01-1-1v-4c0-7.2 5.3-13.2 12.5-12.5A6 6 0 0115 7z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-white mb-2">No pinning secrets yet</h3>
                  <p className="text-zinc-400 mb-6">Create your first secret to start using the API</p>
                  <button
                    onClick={() => setShowCreateSecretModal(true)}
                    className="inline-flex items-center px-4 py-2 bg-white text-black rounded-md hover:bg-zinc-100 transition-colors"
                  >
                    Create Secret
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800/50 rounded-lg overflow-hidden">
                <div className="divide-y divide-zinc-800">
                  {pinningSecrets.map((secret) => (
                    <div key={secret.id} className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h4 className="font-semibold text-white">{secret.name}</h4>
                            <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium backdrop-blur-sm ${secret.isActive
                                ? 'bg-zinc-800/80 text-zinc-300 border border-zinc-700/50'
                                : 'bg-zinc-900/80 text-zinc-400 border border-zinc-800/50'
                              }`}>
                              {secret.isActive ? 'Active' : 'Revoked'}
                            </span>
                          </div>
                          <p className="text-zinc-400 font-mono text-sm mb-3">
                            {secret.prefix}••••••••••••••••••••••••••••••••••••••••••••••
                          </p>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                            <div>
                              <p className="text-zinc-500">Created</p>
                              <p className="text-zinc-300">{secret.createdAt}</p>
                            </div>
                            <div>
                              <p className="text-zinc-500">Last used</p>
                              <p className="text-zinc-300">{secret.lastUsed}</p>
                            </div>
                            <div>
                              <p className="text-zinc-500">Usage this month</p>
                              <p className="text-zinc-300">{secret.usageThisMonth} MB</p>
                            </div>
                          </div>
                        </div>
                        <div className="ml-6">
                          {secret.isActive && (
                            <button
                              onClick={() => revokePinningSecret(secret.id)}
                              className=" px-4 py-2 rounded-md font-medium text-sm bg-zinc-800/80 backdrop-blur-sm text-zinc-300 border border-zinc-700/50 hover:bg-zinc-700/80 transition-colors"
                            >
                              Revoke
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Gateway Section */}
        {activeSection === 'gateway' && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-white">Public Codex Gateway</h1>
              <p className="text-zinc-400">Access any Codex content - no authentication required</p>
            </div>

            {/* Info Section */}
            <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800/50 rounded-lg p-6">
              <div className="flex items-start space-x-4">
                <div className="w-10 h-10 bg-zinc-800/80 backdrop-blur-sm rounded-lg flex items-center justify-center">
                  <svg className="h-5 w-5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-white mb-3">Public Gateway Access</h3>
                  <p className="text-zinc-400 mb-4">This gateway provides public access to Codex content with no authentication required.</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-white/80 rounded-full mr-3"></div>
                      <span className="text-sm text-zinc-300">No authentication required</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-white/80 rounded-full mr-3"></div>
                      <span className="text-sm text-zinc-300">URLs are shareable with anyone</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-white/80 rounded-full mr-3"></div>
                      <span className="text-sm text-zinc-300">Works from any browser or application</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-white/80 rounded-full mr-3"></div>
                      <span className="text-sm text-zinc-300">CORS enabled for web app integration</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Test Form */}
            <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800/50 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-white mb-6">Test Gateway Access</h2>

              <div className="space-y-6">
                <div>
                  <label htmlFor="gateway-cid" className="block text-sm font-medium text-zinc-300 mb-3">
                    Codex CID
                  </label>
                  <input
                    type="text"
                    id="gateway-cid"
                    value={gatewayCid}
                    onChange={(e) => setGatewayCid(e.target.value)}
                    onKeyPress={handleGatewayKeyPress}
                    placeholder="e.g., QmYyQSo1c1Ym7orWxLYvCrM2EmxFTANf8wXmmE7DWjhx5N"
                    className="block w-full px-4 py-3 bg-zinc-800/50 backdrop-blur-sm border border-zinc-700/50 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-600 focus:border-zinc-600 text-sm"
                  />
                </div>



                <div className="flex space-x-4">
                  <button
                    onClick={handleTestGateway}
                    disabled={isGatewayLoading || !gatewayCid.trim()}
                    className="inline-flex items-center px-4 py-2 rounded-md font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-white text-black hover:bg-zinc-100"
                  >
                    {isGatewayLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-zinc-600 border-t-black mr-2"></div>
                        Loading...
                      </>
                    ) : (
                      'Access Content'
                    )}
                  </button>

                  {gatewayCid.trim() && gatewayTestResult?.success && (
                    <a
                      href={getGatewayUrl()}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center px-4 py-2 bg-zinc-800/80 backdrop-blur-sm hover:bg-zinc-700/80 border border-zinc-700/50 text-zinc-300 hover:text-white rounded-md font-medium text-sm transition-colors"
                    >
                      Open Content
                      <svg className="ml-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* Test Results */}
            {gatewayTestResult && (
              <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800/50 rounded-lg p-6">
                <h2 className="text-xl font-semibold text-white mb-6">Results</h2>

                <div className={`backdrop-blur-sm rounded-lg p-4 border ${gatewayTestResult.success
                    ? 'bg-zinc-800/50 border-zinc-700/50'
                    : 'bg-zinc-900/50 border-zinc-800/50'
                  }`}>
                  <div className="flex items-start space-x-4">
                    <div className="w-10 h-10 bg-zinc-800/80 backdrop-blur-sm rounded-lg flex items-center justify-center">
                      {gatewayTestResult.success ? (
                        <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      ) : (
                        <svg className="h-5 w-5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className={`text-lg font-semibold ${gatewayTestResult.success ? 'text-white' : 'text-zinc-300'
                        }`}>
                        Status: {gatewayTestResult.status} - {gatewayTestResult.success ? 'Success' : 'Error'}
                      </h3>
                      <p className={`mt-2 ${gatewayTestResult.success ? 'text-zinc-300' : 'text-zinc-400'
                        }`}>
                        {gatewayTestResult.message}
                      </p>
                      {gatewayTestResult.contentType && (
                        <div className="mt-3 text-sm text-zinc-400">
                          <p><strong className="text-zinc-300">Content Type:</strong> {gatewayTestResult.contentType}</p>
                          {gatewayTestResult.contentLength && (
                            <p><strong className="text-zinc-300">Content Length:</strong> {gatewayTestResult.contentLength} bytes</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}


          </div>
        )}

        {/* Migrations Section */}
        {activeSection === 'migrations' && (
          <div className="relative">
            {/* Coming Soon Overlay */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-10 rounded-lg">
              <div className="absolute top-64 left-1/2 transform -translate-x-1/2 text-center">
                <div className="w-16 h-16 bg-zinc-800/80 backdrop-blur-sm rounded-lg flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">Coming Soon</h2>
                <p className="text-zinc-400 max-w-md">
                  Migration functionality is currently in development. Check back soon for the ability to migrate content from IPFS, Arweave, and Storj.
                </p>
              </div>
            </div>

            {/* Blurred Content */}
            <div className="blur-[1px] pointer-events-none space-y-6">
              <div>
                <h1 className="text-2xl font-bold text-white">Content Migrations</h1>
                <p className="text-zinc-400">Migrate content from other decentralized networks to Third Storage</p>
              </div>

              {/* Migration Form */}
              <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800/50 rounded-lg p-6">
                <h2 className="text-xl font-semibold text-white mb-6">Migrate Content</h2>

                <div className="space-y-6">
                  {/* Network Selection */}
                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-3">Source Network</label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {[
                        { id: 'ipfs', name: 'IPFS', description: 'InterPlanetary File System' },
                        { id: 'arweave', name: 'Arweave', description: 'Permanent storage blockchain' },
                        { id: 'storj', name: 'Storj', description: 'Decentralized cloud storage' }
                      ].map((network) => (
                        <button
                          key={network.id}
                          onClick={() => setSelectedNetwork(network.id as 'ipfs' | 'arweave' | 'storj')}
                          className={`p-4 rounded-lg border transition-all duration-200 text-left ${selectedNetwork === network.id
                              ? 'bg-white/10 border-white/30 ring-1 ring-white/20'
                              : 'bg-zinc-800/50 border-zinc-700/50 hover:bg-zinc-800/80 hover:border-zinc-600/50'
                            }`}
                        >
                          <div className="font-medium text-white text-sm">{network.name}</div>
                          <div className="text-zinc-400 text-xs mt-1">{network.description}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* CID Input */}
                  <div>
                    <label htmlFor="migration-cid" className="block text-sm font-medium text-zinc-300 mb-3">
                      Content Identifier (CID)
                    </label>
                    <input
                      type="text"
                      id="migration-cid"
                      value={migrationCid}
                      onChange={(e) => setMigrationCid(e.target.value)}
                      placeholder={`Enter ${selectedNetwork.toUpperCase()} content identifier...`}
                      className="block w-full px-4 py-3 bg-zinc-800/50 backdrop-blur-sm border border-zinc-700/50 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-600 focus:border-zinc-600"
                    />
                    <p className="text-xs text-zinc-500 mt-2">
                      {selectedNetwork === 'ipfs' && 'Example: QmYyQSo1c1Ym7orWxLYvCrM2EmxFTANf8wXmmE7DWjhx5N'}
                      {selectedNetwork === 'arweave' && 'Example: 43MOwz-epUGQ5tKVdIGMQ5Ti2YU4Fx0Ur-KW-LUyGYw'}
                      {selectedNetwork === 'storj' && 'Example: jv6mfh6ffh6qj7u6k6k6k6k6k6k6k6k6k6k6k6k6k6k6'}
                    </p>
                  </div>

                  {/* Migration Options */}
                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-3">Migration Options</label>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-zinc-800/30 backdrop-blur-sm border border-zinc-700/30 rounded-lg">
                        <div>
                          <div className="font-medium text-white text-sm">Preserve Original Metadata</div>
                          <div className="text-zinc-400 text-xs">Keep original timestamps and file attributes</div>
                        </div>
                        <input
                          type="checkbox"
                          defaultChecked
                          className="w-4 h-4 text-white bg-zinc-700 border-zinc-600 rounded focus:ring-zinc-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Migration Button */}
                  <div className="flex space-x-4">
                    <button
                      onClick={() => setIsMigrating(true)}
                      disabled={isMigrating || !migrationCid.trim()}
                      className="inline-flex items-center px-4 py-2 rounded-md font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-white text-black hover:bg-zinc-100"
                    >
                      {isMigrating ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-2 border-zinc-600 border-t-black mr-2"></div>
                          Migrating...
                        </>
                      ) : (
                        <>
                          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                          </svg>
                          Start Migration
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Migration Status */}
              {isMigrating && (
                <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800/50 rounded-lg p-6">
                  <h2 className="text-xl font-semibold text-white mb-6">Migration Progress</h2>

                  <div className="space-y-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-zinc-800/80 backdrop-blur-sm rounded-lg flex items-center justify-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-zinc-600 border-t-white"></div>
                      </div>
                      <div>
                        <p className="text-white font-medium">Fetching content from {selectedNetwork.toUpperCase()}</p>
                        <p className="text-zinc-400 text-sm">Retrieving content and metadata...</p>
                      </div>
                    </div>

                    <div className="bg-zinc-800/30 backdrop-blur-sm border border-zinc-700/30 rounded-lg p-4">
                      <div className="flex justify-between text-sm text-zinc-400 mb-2">
                        <span>Progress</span>
                        <span>Processing...</span>
                      </div>
                      <div className="w-full bg-zinc-800/50 rounded-full h-2">
                        <div className="bg-white/80 h-2 rounded-full animate-pulse" style={{ width: '65%' }}></div>
                      </div>
                    </div>

                    <button
                      onClick={() => setIsMigrating(false)}
                      className="text-sm text-zinc-400 hover:text-white transition-colors"
                    >
                      Cancel Migration
                    </button>
                  </div>
                </div>
              )}

            </div>
          </div>
        )}

        {/* Payments Section */}
        {activeSection === 'payments' && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-white">Billing & Payments</h1>
              <p className="text-zinc-400">Manage your subscription and billing information</p>
            </div>

            {/* Current Plan & Usage */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Current Plan */}
              <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800/50 rounded-lg p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-white">Current Plan</h2>
                  <span className={`px-3 py-1 text-sm font-medium rounded-full ${userStats?.planType === 'pro'
                      ? 'bg-white/10 text-white border border-white/20'
                      : userStats?.planType === 'enterprise'
                        ? 'bg-purple-900/20 text-purple-300 border border-purple-500/30'
                        : 'bg-zinc-800 text-zinc-300 border border-zinc-700'
                    }`}>
                    {getPlan(userStats?.planType as PlanType || 'free').displayName}
                  </span>
                </div>

                {userStats?.planType === 'pro' ? (
                  <div className="space-y-4">
                    <div>
                      <p className="text-3xl font-bold text-white">$10<span className="text-lg text-zinc-400">/month</span></p>
                      <p className="text-zinc-400 mt-1">Billed monthly • Next billing: Dec 15, 2024</p>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center text-zinc-300">
                        <svg className="w-4 h-4 mr-3 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        {getPlan('pro').storage.formatted} storage included
                      </div>
                      <div className="flex items-center text-zinc-300">
                        <svg className="w-4 h-4 mr-3 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Unlimited private egress
                      </div>
                      <div className="flex items-center text-zinc-300">
                        <svg className="w-4 h-4 mr-3 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Priority support
                      </div>
                      <div className="flex items-center text-zinc-300">
                        <svg className="w-4 h-4 mr-3 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Advanced replication controls
                      </div>
                    </div>
                  </div>
                ) : userStats?.planType === 'enterprise' ? (
                  <div className="space-y-4">
                    <div>
                      <p className="text-3xl font-bold text-white">Custom<span className="text-lg text-zinc-400"> pricing</span></p>
                      <p className="text-zinc-400 mt-1">Enterprise Plan • Manual billing</p>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center text-zinc-300">
                        <svg className="w-4 h-4 mr-3 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        {userStats ? formatFileSize(userStats.storageLimit) : 'Custom'} storage included
                      </div>
                      <div className="flex items-center text-zinc-300">
                        <svg className="w-4 h-4 mr-3 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Unlimited private egress
                      </div>
                      <div className="flex items-center text-zinc-300">
                        <svg className="w-4 h-4 mr-3 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Dedicated support
                      </div>
                      <div className="flex items-center text-zinc-300">
                        <svg className="w-4 h-4 mr-3 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Custom integrations
                      </div>
                    </div>
                    <button className="w-full mt-6 px-4 py-2 bg-zinc-800 text-zinc-300 border border-zinc-700 rounded-md hover:bg-zinc-700 transition-colors font-medium text-sm">
                      Contact Support
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <p className="text-3xl font-bold text-white">$0<span className="text-lg text-zinc-400">/month</span></p>
                      <p className="text-zinc-400 mt-1">Free forever • No billing required</p>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center text-zinc-300">
                        <svg className="w-4 h-4 mr-3 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        {getPlan('free').storage.formatted} storage included
                      </div>
                      <div className="flex items-center text-zinc-300">
                        <svg className="w-4 h-4 mr-3 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        1,000 private egress/month
                      </div>
                      <div className="flex items-center text-zinc-300">
                        <svg className="w-4 h-4 mr-3 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Community support
                      </div>
                      <div className="flex items-center text-zinc-400">
                        <svg className="w-4 h-4 mr-3 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        Basic replication only
                      </div>
                    </div>
                    {/* Coupon Code Section */}
                    <div className="mt-6 space-y-3">
                      <div className="flex space-x-2">
                        <input
                          type="text"
                          value={couponCode}
                          onChange={(e) => setCouponCode(e.target.value)}
                          placeholder="Enter coupon code (optional)"
                          className="flex-1 px-3 py-2 bg-zinc-800/50 border border-zinc-700 rounded-md text-white placeholder-zinc-500 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-600 focus:border-zinc-600"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              validateCouponCode();
                            }
                          }}
                        />
                        <button
                          onClick={validateCouponCode}
                          disabled={!couponCode.trim() || couponValidation.isValidating}
                          className="px-3 py-2 bg-zinc-700 text-zinc-300 border border-zinc-600 rounded-md hover:bg-zinc-600 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {couponValidation.isValidating ? (
                            <div className="w-4 h-4 border-2 border-zinc-500 border-t-white animate-spin rounded-full"></div>
                          ) : (
                            'Apply'
                          )}
                        </button>
                      </div>

                      {/* Coupon Validation Results */}
                      {couponValidation.error && (
                        <div className="text-red-400 text-xs flex items-center">
                          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                          {couponValidation.error}
                        </div>
                      )}

                      {couponValidation.isValid && couponValidation.discount && (
                        <div className="bg-green-900/20 border border-green-500/30 rounded-md p-3">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center text-green-400 text-sm font-medium">
                              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              Coupon Applied: {couponCode}
                            </div>
                            <button
                              onClick={clearCouponCode}
                              className="text-green-400 hover:text-green-300 text-xs"
                            >
                              Remove
                            </button>
                          </div>
                          <div className="text-xs text-green-300 space-y-1">
                            <div className="flex justify-between">
                              <span>Original Price:</span>
                              <span className="line-through">{couponValidation.discount.formattedOriginalPrice}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Discount:</span>
                              <span>-{couponValidation.discount.formattedDiscountAmount}</span>
                            </div>
                            <div className="flex justify-between font-medium border-t border-green-500/20 pt-1">
                              <span>Final Price:</span>
                              <span>{couponValidation.discount.formattedFinalPrice}</span>
                            </div>
                            {couponValidation.discount.duration && (
                              <div className="text-green-400/80 text-xs mt-1">
                                Duration: {couponValidation.discount.duration === 'once' ? 'First payment only' :
                                  couponValidation.discount.duration === 'forever' ? 'Forever' :
                                    `${couponValidation.discount.durationInMonths} month(s)`}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={handleUpgradeToPro}
                      className="w-full mt-4 px-4 py-2 bg-white text-black rounded-md hover:bg-zinc-100 transition-colors font-medium text-sm"
                    >
                      {couponValidation.isValid ? `Upgrade to Pro (${couponValidation.discount?.formattedFinalPrice})` : 'Upgrade to Pro'}
                    </button>
                  </div>
                )}
              </div>

              {/* Usage Summary */}
              <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800/50 rounded-lg p-6">
                <h2 className="text-xl font-semibold text-white mb-6">Usage This Month</h2>

                <div className="space-y-6">
                  {/* Storage Usage */}
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-zinc-400">Storage</span>
                      <span className="text-white">{userStats ? formatFileSize(userStats.storageUsed) : '0 B'} / {userStats ? formatFileSize(userStats.storageLimit) : '1 GB'}</span>
                    </div>
                    <div className="w-full bg-zinc-800/50 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-500 ${userStats && userStats.usagePercentage >= 90 ? 'bg-red-400' :
                            userStats && userStats.usagePercentage >= 75 ? 'bg-yellow-400' :
                              'bg-green-400'
                          }`}
                        style={{ width: `${userStats?.usagePercentage || 0}%` }}
                      ></div>
                    </div>
                    <p className="text-xs text-zinc-500 mt-1">{userStats?.usagePercentage || 0}% of limit used</p>
                  </div>

                  {/* Private egress */}
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-zinc-400">Private egress</span>
                      <span className="text-zinc-500 text-xs">Coming soon</span>
                    </div>
                    <div className="w-full bg-zinc-800/50 rounded-full h-2">
                      <div className="h-2 bg-zinc-600 rounded-full transition-all duration-500 w-0"></div>
                    </div>
                    <p className="text-xs text-zinc-500 mt-1">
                      We're working on implementing usage tracking for private egress
                    </p>
                  </div>

                  {/* Pinned replications */}
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-zinc-400">Pinned replications</span>
                      <span className="text-zinc-500 text-xs">Coming soon</span>
                    </div>
                    <div className="w-full bg-zinc-800/50 rounded-full h-2">
                      <div className="h-2 bg-zinc-600 rounded-full transition-all duration-500 w-0"></div>
                    </div>
                    <p className="text-xs text-zinc-500 mt-1">
                      Replication monitoring and analytics are being developed
                    </p>
                  </div>

                  {/* Unpinned files */}
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-zinc-400">Unpinned files</span>
                      <span className="text-zinc-500 text-xs">Coming soon</span>
                    </div>
                    <div className="w-full bg-zinc-800/50 rounded-full h-2">
                      <div className="h-2 bg-zinc-600 rounded-full transition-all duration-500 w-0"></div>
                    </div>
                    <p className="text-xs text-zinc-500 mt-1">
                      Tracking for unpinned file usage is in development
                    </p>
                  </div>


                </div>
              </div>
            </div>

            {/* Billing History */}
            <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800/50 rounded-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-white">Billing History</h2>
                <button
                  onClick={() => {
                    // Open all invoice URLs in new tabs
                    const downloadableInvoices = billingHistory.filter(bill => bill.invoice_url || bill.invoice_pdf);
                    if (downloadableInvoices.length === 0) {
                      showToast({
              type: 'info',
              title: 'No Invoices',
              message: 'No invoices available for download'
            });
                      return;
                    }
                    downloadableInvoices.forEach(bill => {
                      window.open(bill.invoice_url || bill.invoice_pdf, '_blank');
                    });
                  }}
                  disabled={billingHistory.filter(bill => bill.invoice_url || bill.invoice_pdf).length === 0}
                  className="text-sm text-zinc-400 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Download all invoices ({billingHistory.filter(bill => bill.invoice_url || bill.invoice_pdf).length})
                </button>
              </div>

              {userStats?.planType === 'pro' ? (
                <div className="space-y-3">
                  {billingLoading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
                      <p className="text-zinc-400">Loading billing history...</p>
                    </div>
                  ) : billingError ? (
                    <div className="text-center py-8">
                      <div className="mx-auto w-12 h-12 bg-red-900/20 border border-red-800 rounded-lg flex items-center justify-center mb-4">
                        <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-medium text-white mb-2">Error Loading Billing History</h3>
                      <p className="text-zinc-400 mb-4">{billingError}</p>
                      <button
                        onClick={loadBillingHistory}
                        className="px-4 py-2 bg-white text-black rounded-md hover:bg-zinc-100 transition-colors font-medium text-sm"
                      >
                        Try Again
                      </button>
                    </div>
                  ) : billingHistory.length > 0 ? (
                    billingHistory.map((bill) => (
                      <div key={bill.id} className="flex items-center justify-between p-4 bg-zinc-800/30 backdrop-blur-sm border border-zinc-700/30 rounded-lg">
                        <div className="flex items-center space-x-4">
                          <div className="w-10 h-10 bg-zinc-800/80 backdrop-blur-sm rounded-lg flex items-center justify-center">
                            <svg className="w-5 h-5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </div>
                          <div>
                            <h4 className="font-medium text-white text-sm">{bill.plan}</h4>
                            <p className="text-xs text-zinc-400">{bill.period}</p>
                            <p className="text-xs text-zinc-500">{bill.date}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-4">
                          <div className="text-right">
                            <p className="text-sm text-white font-medium">{bill.amount}</p>
                            <p className={`text-xs ${bill.status === 'paid' ? 'text-green-400' :
                                bill.status === 'pending' ? 'text-yellow-400' :
                                  bill.status === 'failed' ? 'text-red-400' : 'text-zinc-400'
                              }`}>
                              {bill.status.charAt(0).toUpperCase() + bill.status.slice(1)}
                            </p>
                          </div>
                          {(bill.invoice_url || bill.invoice_pdf) && (
                            <button
                              onClick={() => window.open(bill.invoice_url || bill.invoice_pdf, '_blank')}
                              className="p-1 text-zinc-400 hover:text-white transition-colors"
                              title="Download Invoice"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <div className="mx-auto w-12 h-12 bg-zinc-800 rounded-lg flex items-center justify-center mb-4">
                        <svg className="w-6 h-6 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-medium text-white mb-2">No billing history yet</h3>
                      <p className="text-zinc-400">Your billing history will appear here after your first payment.</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="mx-auto w-16 h-16 bg-zinc-800 rounded-lg flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-white mb-2">No billing history</h3>
                  <p className="text-zinc-400 mb-6">You're on the free plan with no billing required.</p>
                  <button className="px-6 py-2 bg-white text-black rounded-md hover:bg-zinc-100 transition-colors font-medium text-sm">
                    Upgrade to Pro to see billing history
                  </button>
                </div>
              )}
            </div>



            {/* Plan Comparison */}
            <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800/50 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-white mb-6">Plan Comparison</h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Free Plan */}
                <div className={`p-6 rounded-lg border-2 transition-all flex flex-col h-full ${userStats?.planType === 'free'
                    ? 'border-white/30 bg-white/5'
                    : 'border-zinc-700/50 bg-zinc-800/30'
                  }`}>
                  <div className="text-center mb-6">
                    <h3 className="text-lg font-semibold text-white">Free Plan</h3>
                    <p className="text-3xl font-bold text-white mt-2">$0<span className="text-lg text-zinc-400">/month</span></p>
                  </div>
                  <div className="space-y-3 mb-6 flex-grow">
                    <div className="flex items-center text-zinc-300">
                      <svg className="w-4 h-4 mr-3 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      10 MB storage
                    </div>
                    <div className="flex items-center text-zinc-300">
                      <svg className="w-4 h-4 mr-3 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      1K private egress/month
                    </div>
                    <div className="flex items-center text-zinc-300">
                      <svg className="w-4 h-4 mr-3 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Community support
                    </div>
                  </div>
                  <div className="mt-auto">
                    {userStats?.planType !== 'free' && (
                      <button
                        onClick={initiateDowngrade}
                        className="w-full px-4 py-2 bg-zinc-800 text-zinc-300 border border-zinc-700 rounded-md hover:bg-zinc-700 transition-colors font-medium text-sm"
                      >
                        Downgrade to Free
                      </button>
                    )}
                  </div>
                </div>

                {/* Pro Plan */}
                <div className={`p-6 rounded-lg border-2 transition-all flex flex-col h-full ${userStats?.planType === 'pro'
                    ? 'border-white/30 bg-white/5'
                    : 'border-zinc-700/50 bg-zinc-800/30'
                  }`}>
                  <div className="text-center mb-6">
                    <h3 className="text-lg font-semibold text-white">Pro Plan</h3>
                    <p className="text-3xl font-bold text-white mt-2">$10<span className="text-lg text-zinc-400">/month</span></p>
                  </div>
                  <div className="space-y-3 mb-6 flex-grow">
                    <div className="flex items-center text-zinc-300">
                      <svg className="w-4 h-4 mr-3 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {getPlan('pro').storage.formatted} storage
                    </div>
                    <div className="flex items-center text-zinc-300">
                      <svg className="w-4 h-4 mr-3 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Unlimited private egress
                    </div>
                    <div className="flex items-center text-zinc-300">
                      <svg className="w-4 h-4 mr-3 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Rate-limited dedicated gateways
                    </div>
                    <div className="flex items-center text-zinc-300">
                      <svg className="w-4 h-4 mr-3 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      AI powered replication
                    </div>
                  </div>
                  <div className="mt-auto">
                    {userStats?.planType === 'pro' ? (
                      <button
                        onClick={initiateDowngrade}
                        className="w-full px-4 py-2 bg-red-600/80 text-white border border-red-500/50 rounded-md hover:bg-red-600 transition-colors font-medium text-sm"
                      >
                        Downgrade to Free
                      </button>
                    ) : (
                      <button
                        onClick={handleUpgradeToPro}
                        className="w-full px-4 py-2 bg-white text-black rounded-md hover:bg-zinc-100 transition-colors font-medium text-sm"
                      >
                        Upgrade to Pro
                      </button>
                    )}
                  </div>
                </div>

                {/* Enterprise Plan */}
                <div className={`p-6 rounded-lg border-2 transition-all flex flex-col h-full ${userStats?.planType === 'enterprise'
                    ? 'border-white/30 bg-white/5'
                    : 'border-zinc-700/50 bg-zinc-800/30'
                  }`}>
                  <div className="text-center mb-6">
                    <h3 className="text-lg font-semibold text-white">Enterprise Plan</h3>
                    <p className="text-3xl font-bold text-white mt-2">Custom<span className="text-lg text-zinc-400"></span></p>
                  </div>
                  <div className="space-y-3 mb-6 flex-grow">
                    <div className="flex items-center text-zinc-300">
                      <svg className="w-4 h-4 mr-3 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Custom storage limit
                    </div>
                    <div className="flex items-center text-zinc-300">
                      <svg className="w-4 h-4 mr-3 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Unlimited private egress
                    </div>
                    <div className="flex items-center text-zinc-300">
                      <svg className="w-4 h-4 mr-3 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Dedicated support
                    </div>
                    <div className="flex items-center text-zinc-300">
                      <svg className="w-4 h-4 mr-3 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Dedicated gateways
                    </div>
                    <div className="flex items-center text-zinc-300">
                      <svg className="w-4 h-4 mr-3 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Custom integrations
                    </div>
                  </div>
                  <div className="mt-auto">
                    {userStats?.planType !== 'enterprise' && (
                      <button className="w-full px-4 py-2 bg-zinc-800 text-zinc-300 border border-zinc-700 rounded-md hover:bg-zinc-700 transition-colors font-medium text-sm">
                        Contact Sales
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Settings Section */}
        {activeSection === 'settings' && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-white">Settings</h1>
              <p className="text-zinc-400">Manage your account and preferences</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Account Info */}
              <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800/50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Account Information</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-1">Email</label>
                    <p className="text-white">{getUserEmail()}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-1">Plan</label>
                    <p className="text-white capitalize">{userStats?.planType || 'free'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-1">Storage Used</label>
                    <p className="text-white">
                      {userStats ? `${formatFileSize(userStats.storageUsed)} of ${formatFileSize(userStats.storageLimit)}` : 'Loading...'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800/50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
                <div className="space-y-3">
                  <button
                    onClick={() => setActiveSection('gateway')}
                    className="w-full flex items-center justify-between p-3 bg-zinc-800 hover:bg-zinc-700 rounded-md transition-colors"
                  >
                    <div className="flex items-center">
                      <svg className="w-5 h-5 text-zinc-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                      <span className="text-white">Test Gateway</span>
                    </div>
                    <svg className="w-4 h-4 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center justify-between p-3 bg-zinc-800/80 backdrop-blur-sm hover:bg-zinc-700/80 rounded-md transition-colors border border-zinc-700/50"
                  >
                    <div className="flex items-center">
                      <svg className="w-5 h-5 text-zinc-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      <span className="text-zinc-300">Sign Out</span>
                    </div>
                    <svg className="w-4 h-4 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            {/* API Access Control */}
            <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800/50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-4">API Access Control</h3>
              <p className="text-zinc-400 mb-6">
                Restrict API access to specific domains. Only requests from these domains will be allowed.
              </p>

              <div className="space-y-4">
                {/* Add new domain */}
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={newDomain}
                    onChange={(e) => setNewDomain(e.target.value)}
                    placeholder="example.com"
                    className="flex-1 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
                    onKeyPress={(e) => e.key === 'Enter' && handleAddDomain()}
                  />
                  <button
                    onClick={handleAddDomain}
                    disabled={!newDomain.trim()}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white rounded-md transition-colors font-medium"
                  >
                    Add Domain
                  </button>
                </div>

                {/* Current allowed domains */}
                {allowedDomains.length > 0 ? (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-zinc-300">Allowed Domains:</h4>
                    {allowedDomains.map((domain) => (
                      <div key={domain} className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-md">
                        <div className="flex items-center">
                          <svg className="w-4 h-4 text-green-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="text-white">{domain}</span>
                        </div>
                        <button
                          onClick={() => handleRemoveDomain(domain)}
                          className="p-1 text-zinc-400 hover:text-red-400 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-zinc-400">
                    <svg className="w-8 h-8 mx-auto mb-2 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m0 0v2m0-2h2m-2 0h-2m9-5a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-sm">No domain restrictions active</p>
                    <p className="text-xs text-zinc-500">API access allowed from all domains</p>
                  </div>
                )}
              </div>
            </div>

            {/* Data Export */}
            <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800/50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Data Export</h3>
              <p className="text-zinc-400 mb-6">
                Download all your data including file CID mappings, metadata, and account information.
              </p>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-zinc-800/30 rounded-lg border border-zinc-700/50">
                  <div>
                    <h4 className="text-white font-medium">Complete Data Export</h4>
                    <p className="text-sm text-zinc-400">JSON file containing all your files with CIDs and metadata</p>
                  </div>
                  <button
                    onClick={handleExportData}
                    disabled={isExportingData}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white rounded-md transition-colors font-medium flex items-center"
                  >
                    {isExportingData ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Exporting...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Download Data
                      </>
                    )}
                  </button>
                </div>

                <div className="text-xs text-zinc-500 space-y-1">
                  <p>• File names, CIDs, upload dates, and sizes</p>
                  <p>• Pinning secret information (names and scopes only)</p>
                  <p>• Account settings and preferences</p>
                  <p>• Usage statistics and billing history</p>
                </div>
              </div>
            </div>

            {/* Danger Zone */}
            <div className="bg-red-900/20 backdrop-blur-sm border border-red-800/50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-red-400 mb-4">Danger Zone</h3>
              <p className="text-zinc-300 mb-6">
                Once you delete your account, there is no going back. Please be certain.
              </p>
              <button
                onClick={() => setShowDeleteAccountModal(true)}
                className="px-4 py-2 bg-red-500 hover:bg-red-400 text-white rounded-md transition-colors font-medium"
              >
                Delete Account
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Downgrade Confirmation Popup */}
      {showDowngradeConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-6 max-w-md w-full">
            {downgradeStep === 1 ? (
              <>
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-red-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">Downgrade to Free Plan?</h3>
                  <p className="text-zinc-400">
                    You'll lose access to Pro features including:
                  </p>
                </div>

                <div className="space-y-2 mb-6">
                  <div className="flex items-center text-zinc-300">
                    <svg className="w-4 h-4 mr-3 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    50 MB storage (reduced to 10 MB)
                  </div>
                  <div className="flex items-center text-zinc-300">
                    <svg className="w-4 h-4 mr-3 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Priority support
                  </div>
                  <div className="flex items-center text-zinc-300">
                    <svg className="w-4 h-4 mr-3 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Advanced replication
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={cancelDowngrade}
                    className="flex-1 px-4 py-2 bg-zinc-800 text-zinc-300 rounded-md hover:bg-zinc-700 transition-colors"
                  >
                    Keep Pro Plan
                  </button>
                  <button
                    onClick={() => setDowngradeStep(2)}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                  >
                    Continue
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-red-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">Final Confirmation</h3>
                  <p className="text-zinc-400">
                    Are you absolutely sure you want to downgrade to the Free plan? This action will take effect immediately.
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setDowngradeStep(1)}
                    className="flex-1 px-4 py-2 bg-zinc-800 text-zinc-300 rounded-md hover:bg-zinc-700 transition-colors"
                  >
                    Go Back
                  </button>
                  <button
                    onClick={handleDowngradeToFree}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                  >
                    Yes, Downgrade Now
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Delete Account Confirmation Modal */}
      {showDeleteAccountModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-red-700/50 rounded-lg p-6 max-w-md w-full">
            {deleteAccountStep === 1 ? (
              <>
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-red-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">Delete Account?</h3>
                  <p className="text-zinc-400">
                    This will permanently delete your account and all associated data. This action cannot be undone.
                  </p>
                </div>

                <div className="space-y-2 mb-6">
                  <div className="flex items-center text-zinc-300">
                    <svg className="w-4 h-4 mr-3 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    All your uploaded files will be deleted
                  </div>
                  <div className="flex items-center text-zinc-300">
                    <svg className="w-4 h-4 mr-3 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    All pinning secrets will be revoked
                  </div>
                  <div className="flex items-center text-zinc-300">
                    <svg className="w-4 h-4 mr-3 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Your subscription will be cancelled
                  </div>
                  <div className="flex items-center text-zinc-300">
                    <svg className="w-4 h-4 mr-3 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    All account data will be permanently lost
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowDeleteAccountModal(false);
                      setDeleteAccountStep(1);
                    }}
                    className="flex-1 px-4 py-2 bg-zinc-800 text-zinc-300 rounded-md hover:bg-zinc-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => setDeleteAccountStep(2)}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                  >
                    Continue
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-red-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">Final Confirmation</h3>
                  <p className="text-zinc-400 mb-4">
                    Type <strong className="text-white">DELETE ACCOUNT</strong> to confirm account deletion.
                  </p>
                </div>

                <div className="mb-6">
                  <input
                    type="text"
                    value={deleteConfirmationText}
                    onChange={(e) => setDeleteConfirmationText(e.target.value)}
                    placeholder="Type DELETE ACCOUNT"
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-white placeholder-zinc-500 focus:outline-none focus:border-red-500"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setDeleteAccountStep(1)}
                    className="flex-1 px-4 py-2 bg-zinc-800 text-zinc-300 rounded-md hover:bg-zinc-700 transition-colors"
                  >
                    Back
                  </button>
                  <button
                    onClick={async () => {
                      if (deleteConfirmationText === 'DELETE ACCOUNT') {
                        try {
                          const accessToken = await getAccessToken();
                          const response = await fetch('/api/user/delete-account', {
                            method: 'DELETE',
                            headers: {
                              'Authorization': `Bearer ${accessToken}`,
                            },
                          });

                          if (response.ok) {
                            // Account deleted successfully, log out user
                            logout();
                            router.push('/');
                          } else {
                            // Handle error
                            const errorData = await response.json().catch(() => ({}));
                            console.error('Failed to delete account:', response.status, response.statusText);
                            console.error('Error details:', errorData);
                            showToast({
              type: 'error',
              title: 'Account Deletion Failed',
              message: errorData.details || errorData.error || response.statusText
            });
                          }
                        } catch (error) {
                          console.error('Error deleting account:', error);
                        }
                      }
                    }}
                    disabled={deleteConfirmationText !== 'DELETE ACCOUNT'}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Delete My Account
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Coming Soon Modal */}
      {showComingSoonModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-6 max-w-md w-full">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">Pro Accounts Coming Soon</h3>
              <p className="text-zinc-400 mb-6">
                We're working hard to bring you Pro accounts with advanced features. Stay tuned for updates!
              </p>
              <button
                onClick={() => setShowComingSoonModal(false)}
                className="w-full px-4 py-2 bg-white text-black rounded-md hover:bg-zinc-100 transition-colors font-medium"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Testnet Limitations Modal */}
      {showTestnetModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 sm:p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h3 className="text-lg sm:text-xl font-semibold text-white">Codex Testnet Limitations</h3>
              <button
                onClick={() => setShowTestnetModal(false)}
                className="text-zinc-400 hover:text-white transition-colors flex-shrink-0"
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-3 sm:space-y-4 text-zinc-300 text-xs sm:text-sm">
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <span className="text-orange-400 mt-1">•</span>
                  <p>Files automatically get deleted when epoch / storage limit reaches in the testnet.</p>
                </div>
                <div className="flex items-start space-x-3">
                  <span className="text-orange-400 mt-1">•</span>
                  <p>The Codex testnet is currently not incentivized meaning that there are no monetary incentives for running a Codex node.</p>
                </div>
                <div className="flex items-start space-x-3">
                  <span className="text-orange-400 mt-1">•</span>
                  <p>Codex marketplace is currently not implemented in the Alpha version of Codex Storage.</p>
                </div>
                <div className="flex items-start space-x-3">
                  <span className="text-orange-400 mt-1">•</span>
                  <p>ThirdStorage gateway works on a public goods model. Hence, frequent downtimes are expected due to unavailability of resolver nodes.</p>
                </div>
                <div className="flex items-start space-x-3">
                  <span className="text-orange-400 mt-1">•</span>
                  <p>Third Storage does not provide any liability or availability guarantees for the files during testnet. However, the enterprise plan allows production ready use cases upon request. Please reach out to the Third Storage team for more information.</p>
                </div>
              </div>
            </div>

            <div className="mt-4 sm:mt-6">
              <button
                onClick={() => setShowTestnetModal(false)}
                className="w-full px-3 py-2 sm:px-4 bg-zinc-600 text-white rounded-md hover:bg-zinc-500 transition-colors font-medium text-sm sm:text-base"
              >
                Understood
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 