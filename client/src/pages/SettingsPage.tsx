import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { 
  Settings, 
  LogOut, 
  User, 
  Lock, 
  Mail, 
  Shield, 
  Trash2, 
  UserPlus, 
  Save,
  AlertCircle,
  Loader2,
  X,
  ArrowLeft,
  Moon,
  Sun,
  Check,
  Share2
} from 'lucide-react';
import { userAPI, adminAPI } from '../services/authApi';
import type { User as UserType, Invitation } from '../types/auth';
import type { JourneyShare } from '../types/journey';
import { useToast, ToastContainer } from '../components/Toast';
import ConfirmDialog from '../components/ConfirmDialog';
import { useConfirm } from '../hooks/useConfirm';
import { journeyShareService, journeyService } from '../services/api';

const SettingsPage: React.FC = () => {
  const { user, logout, updateUser, refreshUser } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const toast = useToast();
  const confirmDialog = useConfirm();
  const navigate = useNavigate();
  
  // Journey Invitations State
  const [journeyInvitations, setJourneyInvitations] = useState<JourneyShare[]>([]);
  const [invitationsLoading, setInvitationsLoading] = useState(false);
  
  // User Profile State
  const [username, setUsername] = useState(user?.username || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // Admin Panel State
  const [users, setUsers] = useState<UserType[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [registrationRequests, setRegistrationRequests] = useState<any[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [adminLoading, setAdminLoading] = useState(false);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [adminError, setAdminError] = useState('');
  const [ratesLastUpdated, setRatesLastUpdated] = useState<number | null>(null);
  const [ratesLoadingState, setRatesLoadingState] = useState(false);
  // Export/Import state
  const [exportLoading, setExportLoading] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [importFileName, setImportFileName] = useState<string | null>(null);
  // Import modal state
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [parsedImportData, setParsedImportData] = useState<any>(null);
  const [importJourneysFlag, setImportJourneysFlag] = useState(true);
  const [importStopsFlag, setImportStopsFlag] = useState(true);
  const [importTransportsFlag, setImportTransportsFlag] = useState(true);
  const [importResult, setImportResult] = useState<{ success: boolean; message: string; count?: number } | null>(null);

  // Initialize username from user on mount only
  useEffect(() => {
    if (user?.username && username === '') {
      setUsername(user.username);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.username]); // Only when user.username becomes available
  
  // Refresh user data from database on mount (only once)
  useEffect(() => {
    refreshUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array - run only once on mount

  // Load journey invitations
  const loadJourneyInvitations = useCallback(async () => {
    setInvitationsLoading(true);
    try {
      const invitations = await journeyShareService.getSharedWithMe();
      setJourneyInvitations(invitations);
    } catch (error: any) {
      console.error('Failed to load journey invitations:', error);
      toast.error('Failed to load journey invitations');
    } finally {
      setInvitationsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependencies - toast is stable enough

  // Accept journey invitation
  const handleAcceptInvitation = async (invitationId: number) => {
    try {
      await journeyShareService.acceptInvitation(invitationId.toString(), false);
      toast.success('Journey invitation accepted!');
      loadJourneyInvitations();
      // Optional: navigate to main page to see the new journey
      setTimeout(() => navigate('/'), 1000);
    } catch (error: any) {
      console.error('Failed to accept invitation:', error);
      toast.error(error.message || 'Failed to accept invitation');
    }
  };

  // Reject journey invitation
  const handleRejectInvitation = async (invitationId: number) => {
    const confirmed = await confirmDialog.confirm({
      title: 'Reject Invitation',
      message: 'Are you sure you want to reject this journey invitation?',
      confirmText: 'Reject',
      cancelText: 'Cancel'
    });

    if (!confirmed) return;

    try {
      await journeyShareService.rejectInvitation(invitationId);
      toast.success('Journey invitation rejected');
      loadJourneyInvitations();
    } catch (error: any) {
      console.error('Failed to reject invitation:', error);
      toast.error(error.message || 'Failed to reject invitation');
    }
  };

  const loadAdminData = useCallback(async () => {
    setAdminLoading(true);
    try {
      const [usersResponse, invitationsResponse] = await Promise.all([
        adminAPI.getAllUsers(),
        adminAPI.getPendingInvitations()
      ]);
      setUsers(usersResponse.data.users);
      setInvitations(invitationsResponse.data.invitations);
      // fetch registration requests separately
      try {
        const rr = await adminAPI.getRegistrationRequests();
        setRegistrationRequests(rr.data.requests || []);
      } catch (err) {
        console.warn('Failed to load registration requests', err);
        setRegistrationRequests([]);
      }
    } catch (error: any) {
      setAdminError('Failed to load admin data');
    } finally {
      setAdminLoading(false);
    }
  }, []); // No dependencies - function doesn't change

  const loadRegistrationRequests = useCallback(async () => {
    try {
      const resp = await adminAPI.getRegistrationRequests();
      setRegistrationRequests(resp.data.requests || []);
    } catch (err: any) {
      console.error('Failed to load registration requests', err);
      toast.error('Failed to load registration requests');
    } finally {
    }
  }, []);

  useEffect(() => {
    if (user?.role === 'admin') {
      loadAdminData();
      loadRegistrationRequests();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.role]); // loadAdminData is stable, no need to include

  // Load cached rates info (timestamp) for admin UI
  const loadRatesInfo = useCallback(async () => {
    try {
      setRatesLoadingState(true);
      const data = await (await import('../services/currencyApi')).getRates('PLN');
      // server returns timestamp in ms
      setRatesLastUpdated(data.timestamp || null);
    } catch (err: any) {
      console.warn('Failed to load rates info', err);
      setRatesLastUpdated(null);
    } finally {
      setRatesLoadingState(false);
    }
  }, []);

  useEffect(() => {
    if (user?.role === 'admin') {
      void loadRatesInfo();
    }
  }, [user?.role, loadRatesInfo]);

  // Load journey invitations on mount
  useEffect(() => {
    loadJourneyInvitations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only once on mount

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError('');
    setProfileLoading(true);

    try {
      const response = await userAPI.updateProfile(username);
      updateUser(response.data.user);
      toast.success('Profile updated successfully!');
    } catch (error: any) {
      setProfileError(error.response?.data?.error || 'Failed to update profile');
      toast.error(error.response?.data?.error || 'Failed to update profile');
    } finally {
      setProfileLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');

    if (newPassword !== confirmPassword) {
      const errorMsg = 'New passwords do not match';
      setPasswordError(errorMsg);
      toast.error(errorMsg);
      return;
    }

    if (newPassword.length < 8) {
      const errorMsg = 'Password must be at least 8 characters long';
      setPasswordError(errorMsg);
      toast.error(errorMsg);
      return;
    }

    setPasswordLoading(true);

    try {
      await userAPI.changePassword(currentPassword, newPassword);
      toast.success('Password changed successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordError('');
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || 'Failed to change password';
      setPasswordError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminError('');
    setInviteLoading(true);

    try {
      await adminAPI.inviteUser(inviteEmail);
      toast.success(`Invitation sent to ${inviteEmail}`);
      setInviteEmail('');
      await loadAdminData();
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || 'Failed to send invitation';
      setAdminError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setInviteLoading(false);
    }
  };

  const handleDeleteUser = async (userId: number, username: string) => {
    const confirmed = await confirmDialog.confirm({
      title: 'Delete User',
      message: `Are you sure you want to delete user "${username}"? This action cannot be undone.`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      confirmVariant: 'danger',
    });

    if (!confirmed) return;

    try {
      await adminAPI.deleteUser(userId);
      toast.success(`User "${username}" deleted successfully`);
      await loadAdminData();
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || 'Failed to delete user';
      setAdminError(errorMsg);
      toast.error(errorMsg);
    }
  };

  const handleChangeRole = async (userId: number, username: string, newRole: 'admin' | 'user') => {
    const confirmed = await confirmDialog.confirm({
      title: 'Change User Role',
      message: `Change ${username}'s role to ${newRole}?`,
      confirmText: 'Change Role',
      cancelText: 'Cancel',
      confirmVariant: 'primary',
    });

    if (!confirmed) return;

    try {
      await adminAPI.changeUserRole(userId, newRole);
      toast.success(`User "${username}" role changed to ${newRole}`);
      await loadAdminData();
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || 'Failed to change user role';
      setAdminError(errorMsg);
      toast.error(errorMsg);
    }
  };

  const handleCancelInvitation = async (invitationId: number, email: string) => {
    const confirmed = await confirmDialog.confirm({
      title: 'Cancel Invitation',
      message: `Cancel invitation for ${email}?`,
      confirmText: 'Cancel Invitation',
      cancelText: 'Keep Invitation',
      confirmVariant: 'danger',
    });

    if (!confirmed) return;

    try {
      await adminAPI.cancelInvitation(invitationId);
      toast.success(`Invitation for ${email} cancelled`);
      await loadAdminData();
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || 'Failed to cancel invitation';
      setAdminError(errorMsg);
      toast.error(errorMsg);
    }
  };

  // Export all journeys (or single if id param provided)
  const handleExportJourneys = async () => {
    setExportLoading(true);
    try {
      const data = await journeyService.exportJourneys();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const fname = `journeys-export-${new Date().toISOString().slice(0,19).replace(/[:T]/g,'-')}.json`;
      a.download = fname;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success('Journeys exported');
    } catch (error: any) {
      console.error('Export failed', error);
      toast.error(error.message || 'Export failed');
    } finally {
      setExportLoading(false);
    }
  };

  // Import from uploaded JSON file
  const handleImportFile = async (file?: File) => {
    if (!file) return;
    setImportFileName(file.name);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      // Accept either { journeys: [...] } or raw array
      const payload = Array.isArray(parsed) ? { journeys: parsed } : parsed.journeys ? parsed : { journeys: [] };
      if (!payload.journeys || !Array.isArray(payload.journeys) || payload.journeys.length === 0) {
        throw new Error('No journeys array found in file');
      }
      // Store parsed data and open modal
      setParsedImportData(payload);
      setImportJourneysFlag(true);
      setImportStopsFlag(true);
      setImportTransportsFlag(true);
      setImportResult(null);
      setImportModalOpen(true);
    } catch (error: any) {
      console.error('Failed to parse JSON', error);
      toast.error(error.message || 'Invalid JSON file');
    }
  };

  // Execute import with selected options
  const handleExecuteImport = async () => {
    if (!parsedImportData) return;
    setImportLoading(true);
    setImportResult(null);
    try {
      const payload = {
        ...parsedImportData,
        options: {
          importJourneys: importJourneysFlag,
          importStops: importStopsFlag,
          importTransports: importTransportsFlag,
        }
      };
      const resp = await journeyService.importJourneys(payload);
      setImportResult({ success: true, message: resp.message || 'Import successful', count: resp.count });
      toast.success(resp.message || 'Import successful');
    } catch (error: any) {
      console.error('Import failed', error);
      const errorMsg = error.message || 'Import failed';
      setImportResult({ success: false, message: errorMsg });
      toast.error(errorMsg);
    } finally {
      setImportLoading(false);
    }
  };

  // Close import modal
  const handleCloseImportModal = () => {
    setImportModalOpen(false);
    setParsedImportData(null);
    setImportFileName(null);
    setImportResult(null);
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#1c1c1e] p-6 transition-colors duration-200">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Settings size={32} className="text-blue-500 dark:text-[#0a84ff]" />
            <h1 className="text-3xl font-bold text-gray-900 dark:text-[#ffffff]">Settings</h1>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="px-4 py-2 bg-white dark:bg-[#2c2c2e] border border-gray-200 dark:border-[#38383a] text-gray-700 dark:text-[#ffffff] rounded-lg hover:bg-gray-50 dark:hover:bg-[#38383a] transition-all flex items-center gap-2"
            >
              <ArrowLeft size={20} />
              Back to Home
            </Link>
            <button
              onClick={logout}
              className="px-4 py-2 bg-red-500 dark:bg-[#ff453a] text-white rounded-lg hover:bg-red-600 dark:hover:bg-red-600 transition-all flex items-center gap-2"
            >
              <LogOut size={20} />
              Logout
            </button>
          </div>
        </div>

        {/* Dynamic layout: single centered column for users, two columns for admins */}
        <div className={`${user.role === 'admin' ? 'grid grid-cols-1 lg:grid-cols-2 gap-6' : 'max-w-2xl mx-auto space-y-6'}`}>
          {/* User Profile Section */}
          <div className="space-y-6">
            {/* Theme Settings */}
            <div className="bg-white dark:bg-[#2c2c2e] rounded-xl shadow-sm p-6 border border-gray-200 dark:border-[#38383a] transition-colors duration-200">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                {theme === 'dark' ? (
                  <Moon size={24} className="text-[#0a84ff]" />
                ) : (
                  <Sun size={24} className="text-blue-500" />
                )}
                Appearance
              </h2>
              
              <div className="space-y-4">
                <p className="text-sm text-gray-600 dark:text-[#98989d]">
                  Choose your preferred theme for the application
                </p>
                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-[#1c1c1e] rounded-lg border border-gray-200 dark:border-[#38383a]">
                  <div className="flex items-center gap-3">
                    {theme === 'dark' ? (
                      <Moon size={20} className="text-[#0a84ff]" />
                    ) : (
                      <Sun size={20} className="text-blue-500" />
                    )}
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">
                        {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-[#636366]">
                        {theme === 'dark' ? 'Dark theme' : 'Classic light theme'}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={toggleTheme}
                    className={`relative w-14 h-8 rounded-full transition-colors duration-200 ${
                      theme === 'dark' 
                        ? 'bg-[#0a84ff]' 
                        : 'bg-gray-300'
                    }`}
                    aria-label="Toggle theme"
                  >
                    <span
                      className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full transition-transform duration-200 flex items-center justify-center ${
                        theme === 'dark' ? 'translate-x-6' : 'translate-x-0'
                      }`}
                    >
                      {theme === 'dark' ? (
                        <Moon size={14} className="text-[#0a84ff]" />
                      ) : (
                        <Sun size={14} className="text-gray-600" />
                      )}
                    </span>
                  </button>
                </div>
              </div>
            </div>

            {/* Account Information */}
            <div className="bg-white dark:bg-[#2c2c2e] rounded-xl shadow-sm p-6 border border-gray-200 dark:border-[#38383a] transition-colors duration-200">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <User size={24} className="text-blue-500 dark:text-[#0a84ff]" />
                Account Information
              </h2>
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-[#1c1c1e] rounded-lg border border-gray-200 dark:border-[#38383a]">
                  <User size={20} className="text-gray-400 dark:text-[#636366]" />
                  <div>
                    <div className="text-xs text-gray-500 dark:text-[#636366]">Username</div>
                    <div className="font-medium text-gray-900 dark:text-[#ffffff]">{user.username}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-[#1c1c1e] rounded-lg border border-gray-200 dark:border-[#38383a]">
                  <Mail size={20} className="text-gray-400 dark:text-[#636366]" />
                  <div>
                    <div className="text-xs text-gray-500 dark:text-[#636366]">Email</div>
                    <div className="font-medium text-gray-900 dark:text-[#ffffff]">{user.email}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-[#1c1c1e] rounded-lg border border-gray-200 dark:border-[#38383a]">
                  <Shield size={20} className="text-gray-400 dark:text-[#636366]" />
                  <div>
                    <div className="text-xs text-gray-500 dark:text-[#636366]">Role</div>
                    <div className="font-medium text-gray-900 dark:text-[#ffffff] capitalize">{user.role}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Export / Import Journeys */}
            <div className="bg-white dark:bg-[#2c2c2e] rounded-xl shadow-sm p-6 border border-gray-200 dark:border-[#38383a] transition-colors duration-200">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Save size={24} className="text-blue-500 dark:text-[#0a84ff]" />
                Export / Import Journeys
              </h2>

              <p className="text-sm text-gray-600 dark:text-[#98989d] mb-4">Export your journeys to JSON or import previously exported journeys.</p>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleExportJourneys}
                  disabled={exportLoading}
                  className="px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {exportLoading ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                  Export Journeys (JSON)
                </button>

                <label className="px-4 py-3 bg-green-500 dark:bg-[#30d158] text-white rounded-lg hover:bg-green-600 dark:hover:bg-green-600 transition-all duration-300 ease-in-out shadow-sm hover:shadow-lg cursor-pointer flex items-center gap-2">
                  <input
                    type="file"
                    accept="application/json"
                    className="hidden"
                    onChange={e => handleImportFile(e.target.files ? e.target.files[0] : undefined)}
                  />
                  <ArrowLeft size={16} className="text-white" />
                  <span className="text-sm text-white">Import Journeys (JSON)</span>
                </label>
              </div>
            </div>

            {/* Journey Invitations */}
            <div className="bg-white dark:bg-[#2c2c2e] rounded-xl shadow-sm p-6 border border-gray-200 dark:border-[#38383a] transition-colors duration-200">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Share2 size={24} className="text-blue-500 dark:text-[#0a84ff]" />
                Journey Invitations
              </h2>
              
              {invitationsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-500 dark:text-[#0a84ff]" />
                </div>
              ) : journeyInvitations.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-[#636366]">
                  <Share2 size={48} className="mx-auto mb-3 opacity-50" />
                  <p className="text-sm">No pending journey invitations</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {journeyInvitations.map((invitation) => (
                    <div
                      key={invitation.id}
                      className="p-4 bg-gray-50 dark:bg-[#1c1c1e] rounded-lg border border-gray-200 dark:border-[#38383a]"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900 dark:text-white mb-1">
                            {invitation.journeyTitle}
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-[#98989d] mb-2">
                            Shared by <span className="font-medium">{invitation.sharedByUsername}</span>
                          </p>
                          {invitation.journeyDescription && (
                            <p className="text-xs text-gray-500 dark:text-[#636366] mb-2">
                              {invitation.journeyDescription}
                            </p>
                          )}
                          <p className="text-xs text-gray-400 dark:text-[#636366]">
                            Invited on {new Date(invitation.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex flex-col gap-2">
                          <button
                            onClick={() => handleAcceptInvitation(invitation.id!)}
                            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center gap-2 text-sm"
                          >
                            <Check size={16} />
                            Accept
                          </button>
                          <button
                            onClick={() => handleRejectInvitation(invitation.id!)}
                            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center gap-2 text-sm"
                          >
                            <X size={16} className="text-black dark:text-white" />
                            Reject
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Update Username */}
            <div className="bg-white dark:bg-[#2c2c2e] rounded-xl shadow-sm p-6 border border-gray-200 dark:border-[#38383a] transition-colors duration-200">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-[#ffffff] mb-4">Update Username</h2>
              
              {profileError && (
                <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-2">
                  <AlertCircle size={20} className="text-red-500 dark:text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-600 dark:text-red-300">{profileError}</p>
                </div>
              )}

              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div>
                  <label htmlFor="username" className="block text-sm font-medium text-gray-700 dark:text-[#98989d] mb-2">
                    New Username
                  </label>
                  <input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg bg-gray-50 dark:bg-[#1c1c1e] border border-gray-200 dark:border-[#38383a] text-gray-900 dark:text-[#ffffff] placeholder-gray-400 dark:placeholder-[#636366] focus:border-blue-500 dark:focus:border-[#0a84ff] focus:ring-2 focus:ring-blue-200 dark:focus:ring-[#0a84ff]/20 outline-none transition-all"
                    placeholder="Enter new username"
                    required
                    minLength={3}
                    maxLength={50}
                  />
                </div>
                <button
                  type="submit"
                  disabled={profileLoading || username === user.username}
                  className="w-full bg-blue-500 dark:bg-[#0a84ff] hover:bg-blue-600 dark:hover:bg-blue-600 text-white font-semibold py-3 rounded-lg shadow-md transition-all duration-300 ease-in-out hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {profileLoading ? (
                    <>
                      <Loader2 size={20} className="animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <Save size={20} />
                      Update Username
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Change Password */}
            <div className="bg-white dark:bg-[#2c2c2e] rounded-xl shadow-sm p-6 border border-gray-200 dark:border-[#38383a] transition-colors duration-200">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-[#ffffff] mb-4">Change Password</h2>
              
              {passwordError && (
                <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-2">
                  <AlertCircle size={20} className="text-red-500 dark:text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-600 dark:text-red-300">{passwordError}</p>
                </div>
              )}

              <form onSubmit={handleChangePassword} className="space-y-4">
                <div>
                  <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 dark:text-[#98989d] mb-2">
                    Current Password
                  </label>
                  <input
                    id="currentPassword"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg bg-gray-50 dark:bg-[#1c1c1e] border border-gray-200 dark:border-[#38383a] text-gray-900 dark:text-[#ffffff] placeholder-gray-400 dark:placeholder-[#636366] focus:border-blue-500 dark:focus:border-[#0a84ff] focus:ring-2 focus:ring-blue-200 dark:focus:ring-[#0a84ff]/20 outline-none transition-all"
                    placeholder="Enter current password"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 dark:text-[#98989d] mb-2">
                    New Password
                  </label>
                  <input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg bg-gray-50 dark:bg-[#1c1c1e] border border-gray-200 dark:border-[#38383a] text-gray-900 dark:text-[#ffffff] placeholder-gray-400 dark:placeholder-[#636366] focus:border-blue-500 dark:focus:border-[#0a84ff] focus:ring-2 focus:ring-blue-200 dark:focus:ring-[#0a84ff]/20 outline-none transition-all"
                    placeholder="Enter new password"
                    required
                    minLength={8}
                  />
                </div>
                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-[#98989d] mb-2">
                    Confirm New Password
                  </label>
                  <input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg bg-gray-50 dark:bg-[#1c1c1e] border border-gray-200 dark:border-[#38383a] text-gray-900 dark:text-[#ffffff] placeholder-gray-400 dark:placeholder-[#636366] focus:border-blue-500 dark:focus:border-[#0a84ff] focus:ring-2 focus:ring-blue-200 dark:focus:ring-[#0a84ff]/20 outline-none transition-all"
                    placeholder="Confirm new password"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={passwordLoading}
                  className="w-full bg-blue-500 dark:bg-[#0a84ff] hover:bg-blue-600 dark:hover:bg-blue-600 text-white font-semibold py-3 rounded-lg shadow-md transition-all duration-300 ease-in-out hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {passwordLoading ? (
                    <>
                      <Loader2 size={20} className="animate-spin" />
                      Changing...
                    </>
                  ) : (
                    <>
                      <Lock size={20} />
                      Change Password
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* Admin Panel (only visible for admins) */}
          {user.role === 'admin' && (
            <div className="space-y-6">
              {/* Admin Header */}
              <div className="bg-white dark:bg-[#2c2c2e] rounded-xl shadow-sm p-6 border border-gray-200 dark:border-[#38383a] transition-colors duration-200">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-[#ffffff] mb-2 flex items-center gap-2">
                  <Shield size={24} className="text-yellow-500 dark:text-[#ff9f0a]" />
                  Admin Panel
                </h2>
                <p className="text-gray-600 dark:text-[#98989d] text-sm">Manage users and invitations</p>
              </div>

              {adminError && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-2">
                  <AlertCircle size={20} className="text-red-500 dark:text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-600 dark:text-red-300">{adminError}</p>
                </div>
              )}

              {/* Invite User */}
              <div className="bg-white dark:bg-[#2c2c2e] rounded-xl shadow-sm p-6 border border-gray-200 dark:border-[#38383a] transition-colors duration-200">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-[#ffffff] mb-4 flex items-center gap-2">
                  <UserPlus size={20} className="text-green-500 dark:text-[#30d158]" />
                  Invite New User
                </h3>
                <form onSubmit={handleInviteUser} className="space-y-4">
                  <div>
                    <label htmlFor="inviteEmail" className="block text-sm font-medium text-gray-700 dark:text-[#98989d] mb-2">
                      Email Address
                    </label>
                    <input
                      id="inviteEmail"
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      className="w-full px-4 py-3 rounded-lg bg-gray-50 dark:bg-[#1c1c1e] border border-gray-200 dark:border-[#38383a] text-gray-900 dark:text-[#ffffff] placeholder-gray-400 dark:placeholder-[#636366] focus:border-blue-500 dark:focus:border-[#0a84ff] focus:ring-2 focus:ring-blue-200 dark:focus:ring-[#0a84ff]/20 outline-none transition-all"
                      placeholder="user@example.com"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={inviteLoading}
                    className="w-full bg-green-500 dark:bg-[#30d158] hover:bg-green-600 dark:hover:bg-green-600 text-white font-semibold py-3 rounded-lg shadow-md transition-all duration-300 ease-in-out hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {inviteLoading ? (
                      <>
                        <Loader2 size={20} className="animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Mail size={20} />
                        Send Invitation
                      </>
                    )}
                  </button>
                </form>
              </div>

              {/* Pending Invitations */}
              {invitations.length > 0 && (
                <div className="bg-white dark:bg-[#2c2c2e] rounded-xl shadow-sm p-6 border border-gray-200 dark:border-[#38383a] transition-colors duration-200">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-[#ffffff] mb-4">Pending Invitations</h3>
                  <div className="space-y-2">
                    {invitations.map((invitation) => (
                      <div
                        key={invitation.id}
                        className="flex items-center justify-between p-3 bg-gray-50 dark:bg-[#1c1c1e] rounded-lg border border-gray-200 dark:border-[#38383a]"
                      >
                        <div>
                          <div className="text-gray-900 dark:text-[#ffffff] font-medium">{invitation.email}</div>
                          <div className="text-xs text-gray-500 dark:text-[#636366]">
                            Expires: {invitation.expiresAt ? new Date(invitation.expiresAt).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            }) : 'N/A'}
                          </div>
                        </div>
                        <button
                          onClick={() => handleCancelInvitation(invitation.id!, invitation.email)}
                          className="p-2 text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all duration-300 ease-in-out"
                          title="Cancel invitation"
                        >
                          <X size={20} className="text-black dark:text-white" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Pending Registration Requests */}
              {registrationRequests.length > 0 && (
                <div className="bg-white dark:bg-[#2c2c2e] rounded-xl shadow-sm p-6 border border-gray-200 dark:border-[#38383a] transition-colors duration-200">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-[#ffffff] mb-4">Pending Registration Requests</h3>
                  <div className="space-y-2">
                    {registrationRequests.map((r) => (
                      <div key={r.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-[#1c1c1e] rounded-lg border border-gray-200 dark:border-[#38383a]">
                        <div>
                          <div className="text-gray-900 dark:text-[#ffffff] font-medium">{r.email}</div>
                          <div className="text-xs text-gray-500 dark:text-[#636366]">{r.name || '—'} • {r.created_at ? new Date(r.created_at).toLocaleString() : ''}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={async () => {
                              const confirmed = await confirmDialog.confirm({ title: 'Approve Registration', message: `Approve registration for ${r.email}?`, confirmText: 'Approve', cancelText: 'Cancel' });
                              if (!confirmed) return;
                              try {
                                await adminAPI.approveRegistrationRequest(r.id);
                                toast.success('Registration approved');
                                await loadRegistrationRequests();
                                await loadAdminData();
                              } catch (err: any) {
                                console.error('Approve failed', err);
                                toast.error(err.response?.data?.error || 'Failed to approve registration');
                              }
                            }}
                            className="px-3 py-2 text-sm bg-green-500 dark:bg-green-600 hover:bg-green-600 text-white rounded-lg transition-all"
                          >
                            Approve
                          </button>
                          <button
                            onClick={async () => {
                              const confirmed = await confirmDialog.confirm({ title: 'Reject Registration', message: `Reject registration for ${r.email}?`, confirmText: 'Reject', cancelText: 'Cancel', confirmVariant: 'danger' });
                              if (!confirmed) return;
                              try {
                                await adminAPI.rejectRegistrationRequest(r.id);
                                toast.success('Registration rejected');
                                await loadRegistrationRequests();
                              } catch (err: any) {
                                console.error('Reject failed', err);
                                toast.error(err.response?.data?.error || 'Failed to reject registration');
                              }
                            }}
                            className="px-3 py-2 text-sm bg-red-100 dark:bg-red-900/20 text-red-600 rounded-lg transition-all"
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Users List */}
              <div className="bg-white dark:bg-[#2c2c2e] rounded-xl shadow-sm p-6 border border-gray-200 dark:border-[#38383a] transition-colors duration-200">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-[#ffffff] mb-4">
                  Users ({users.length})
                </h3>
                {adminLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 size={32} className="animate-spin text-blue-500 dark:text-[#0a84ff]" />
                  </div>
                ) : (
                  <div className="space-y-2">
                    {users.map((u) => (
                      <div
                        key={u.id}
                        className="flex items-center justify-between p-4 bg-gray-50 dark:bg-[#1c1c1e] rounded-lg border border-gray-200 dark:border-[#38383a]"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-gray-900 dark:text-[#ffffff] font-medium">{u.username}</span>
                            <span className={`text-xs px-2 py-1 rounded ${
                              u.role === 'admin' 
                                ? 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-800' 
                                : 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800'
                            }`}>
                              {u.role}
                            </span>
                          </div>
                          <div className="text-sm text-gray-600 dark:text-[#98989d]">{u.email}</div>
                        </div>
                        {u.id !== user.id && (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleChangeRole(
                                u.id!,
                                u.username,
                                u.role === 'admin' ? 'user' : 'admin'
                              )}
                              className="px-3 py-2 text-sm bg-blue-500 dark:bg-[#0a84ff] hover:bg-blue-600 dark:hover:bg-blue-600 text-white rounded-lg transition-all duration-300 ease-in-out"
                            >
                              {u.role === 'admin' ? 'Make User' : 'Make Admin'}
                            </button>
                            <button
                              onClick={() => handleDeleteUser(u.id!, u.username)}
                              className="p-2 text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all duration-300 ease-in-out"
                              title="Delete user"
                            >
                              <Trash2 size={20} />
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Removed duplicate Registration Approvals table — Pending Registration Requests above is kept */}

              {/* Rates Cache Control */}
              <div className="bg-white dark:bg-[#2c2c2e] rounded-xl shadow-sm p-6 border border-gray-200 dark:border-[#38383a] transition-colors duration-200">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-[#ffffff] mb-3">Rates Cache</h3>
                <p className="text-sm text-gray-600 dark:text-[#98989d] mb-4">Cached exchange rates are used by the site. Click to force-update the cache.</p>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <div className="text-sm text-gray-700 dark:text-[#ffffff]">Last updated:</div>
                    <div className="text-sm text-gray-600 dark:text-[#98989d]">
                      {ratesLoadingState ? 'Loading...' : (ratesLastUpdated ? new Date(ratesLastUpdated).toLocaleString() : 'Not available')}
                    </div>
                  </div>
                  <div className="w-40">
                    <button
                      onClick={async () => {
                        try {
                          setRatesLoadingState(true);
                          const resp = await (await import('../services/currencyApi')).refreshRates('PLN');
                          setRatesLastUpdated(resp.timestamp || Date.now());
                          toast.success('Rates cache refreshed');
                        } catch (err: any) {
                          console.error('Failed to refresh rates cache', err);
                          toast.error(err.message || 'Failed to refresh rates');
                        } finally {
                          setRatesLoadingState(false);
                        }
                      }}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-3 rounded-lg"
                      disabled={ratesLoadingState}
                    >
                      {ratesLoadingState ? 'Updating...' : 'Update Cache'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Import Modal */}
      {importModalOpen && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#2c2c2e] rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-[#38383a]">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white dark:bg-[#2c2c2e] border-b border-gray-200 dark:border-[#38383a] px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <ArrowLeft size={24} className="text-blue-500 dark:text-[#0a84ff]" />
                Import Journeys
              </h2>
              <button
                onClick={handleCloseImportModal}
                className="p-2 hover:bg-gray-100 dark:hover:bg-[#38383a] rounded-lg transition-colors"
                aria-label="Close"
              >
                <X size={24} className="text-gray-500 dark:text-[#98989d]" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="px-6 py-4 space-y-4">
              {/* File Info */}
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
                  <Save size={20} />
                  <span className="font-medium">File: {importFileName}</span>
                </div>
                <p className="text-sm text-blue-600 dark:text-blue-300 mt-1">
                  {parsedImportData?.journeys?.length || 0} journey(s) found
                </p>
              </div>

              {/* Selection Options */}
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Select what to import:</h3>
                
                <label className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-[#1c1c1e] rounded-lg border border-gray-200 dark:border-[#38383a] cursor-pointer hover:bg-gray-100 dark:hover:bg-[#2c2c2e] transition-colors">
                  <input
                    type="checkbox"
                    checked={importJourneysFlag}
                    onChange={(e) => setImportJourneysFlag(e.target.checked)}
                    className="w-5 h-5 text-blue-500 bg-white dark:bg-[#2c2c2e] border-gray-300 dark:border-[#48484a] rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-gray-900 dark:text-white">Journeys</div>
                    <div className="text-sm text-gray-600 dark:text-[#98989d]">
                      Import journey metadata (title, dates, description)
                    </div>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-[#1c1c1e] rounded-lg border border-gray-200 dark:border-[#38383a] cursor-pointer hover:bg-gray-100 dark:hover:bg-[#2c2c2e] transition-colors">
                  <input
                    type="checkbox"
                    checked={importStopsFlag}
                    onChange={(e) => setImportStopsFlag(e.target.checked)}
                    className="w-5 h-5 text-blue-500 bg-white dark:bg-[#2c2c2e] border-gray-300 dark:border-[#48484a] rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-gray-900 dark:text-white">Stops & Attractions</div>
                    <div className="text-sm text-gray-600 dark:text-[#98989d]">
                      Import cities, accommodation, and attractions
                    </div>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-[#1c1c1e] rounded-lg border border-gray-200 dark:border-[#38383a] cursor-pointer hover:bg-gray-100 dark:hover:bg-[#2c2c2e] transition-colors">
                  <input
                    type="checkbox"
                    checked={importTransportsFlag}
                    onChange={(e) => setImportTransportsFlag(e.target.checked)}
                    className="w-5 h-5 text-blue-500 bg-white dark:bg-[#2c2c2e] border-gray-300 dark:border-[#48484a] rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-gray-900 dark:text-white">Transports</div>
                    <div className="text-sm text-gray-600 dark:text-[#98989d]">
                      Import flights, trains, buses, and car rentals
                    </div>
                  </div>
                </label>
              </div>

              {/* Import Result */}
              {importResult && (
                <div className={`p-4 rounded-lg border ${
                  importResult.success
                    ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                    : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                }`}>
                  <div className="flex items-start gap-2">
                    {importResult.success ? (
                      <Check size={20} className="text-green-500 dark:text-green-400 flex-shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle size={20} className="text-red-500 dark:text-red-400 flex-shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <p className={`text-sm font-medium ${
                        importResult.success
                          ? 'text-green-700 dark:text-green-300'
                          : 'text-red-700 dark:text-red-300'
                      }`}>
                        {importResult.message}
                      </p>
                      {importResult.success && importResult.count !== undefined && (
                        <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                          {importResult.count} journey(s) imported successfully
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 bg-white dark:bg-[#2c2c2e] border-t border-gray-200 dark:border-[#38383a] px-6 py-4 flex items-center justify-end gap-3">
              <button
                onClick={handleCloseImportModal}
                className="px-6 py-3 bg-gray-200 dark:bg-[#38383a] text-gray-700 dark:text-[#ffffff] rounded-lg hover:bg-gray-300 dark:hover:bg-[#48484a] transition-colors"
              >
                {importResult ? 'Close' : 'Cancel'}
              </button>
              {!importResult && (
                <button
                  onClick={handleExecuteImport}
                  disabled={importLoading || (!importJourneysFlag && !importStopsFlag && !importTransportsFlag)}
                  className="px-6 py-3 bg-blue-500 dark:bg-[#0a84ff] text-white rounded-lg hover:bg-blue-600 dark:hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {importLoading ? (
                    <>
                      <Loader2 size={20} className="animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <ArrowLeft size={20} />
                      Import Selected
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Toast Notifications */}
      <ToastContainer toasts={toast.toasts} onClose={toast.closeToast} />

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.options.title}
        message={confirmDialog.options.message}
        confirmText={confirmDialog.options.confirmText}
        cancelText={confirmDialog.options.cancelText}
        confirmVariant={confirmDialog.options.confirmVariant}
        onConfirm={confirmDialog.handleConfirm}
        onCancel={confirmDialog.handleCancel}
      />
    </div>
  );
};

export default SettingsPage;
