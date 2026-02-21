import React, { useEffect, useState } from 'react';
import type { JourneyShare } from '../types/journey';
import { journeyShareService } from '../services/api';
import { X, Trash2 } from 'lucide-react';

interface Props {
  journeyId: number;
  isOpen: boolean;
  onClose: () => void;
  onUpdated?: () => void;
}

const ManageSharesModal: React.FC<Props> = ({ journeyId, isOpen, onClose, onUpdated }) => {
  const [shares, setShares] = useState<JourneyShare[]>([]);
  const [loading, setLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    void loadShares();
  }, [isOpen]);

  const loadShares = async () => {
    try {
      setLoading(true);
      const data = await journeyShareService.getSharesForJourney(journeyId);
      setShares(data || []);
    } catch (err) {
      console.error('Failed to load shares', err);
      setShares([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (shareId: number, role: 'view' | 'edit' | 'manage') => {
    try {
      setUpdatingId(shareId);
      await journeyShareService.updateShareRole(journeyId, shareId, role);
      await loadShares();
      onUpdated?.();
    } catch (err) {
      console.error('Failed to update role', err);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleRemove = async (shareId: number) => {
    if (!confirm('Remove this share?')) return;
    try {
      setUpdatingId(shareId);
      await journeyShareService.removeShare(journeyId, shareId);
      await loadShares();
      onUpdated?.();
    } catch (err) {
      console.error('Failed to remove share', err);
    } finally {
      setUpdatingId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="gh-modal-overlay" onClick={onClose}>
      <div className="gh-modal max-w-3xl" onClick={(e) => e.stopPropagation()}>
        <div className="p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Manage Shares</h2>
            <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-[#2b2b2d]">
              <X className="w-4 h-4 text-black dark:text-white" />
            </button>
          </div>

          <p className="text-sm text-gray-600 dark:text-[#98989d] mt-2">List of users with access to this journey. Change roles or remove access.</p>

          <div className="mt-4">
            {loading ? (
              <div className="text-sm text-gray-500">Loading...</div>
            ) : (
              <div className="space-y-3">
                {shares.length === 0 && <div className="text-sm text-gray-500">No shares found.</div>}
                {shares.map((s) => (
                  <div key={s.id} className="flex items-center justify-between bg-white dark:bg-[#1f1f1f] p-3 rounded-lg border border-gray-100 dark:border-[#2b2b2d]">
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">{s.sharedWithUsername || s.invitedEmail || 'Unknown'}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">Status: {s.status}{s.sharedByUsername ? ` • Invited by ${s.sharedByUsername}` : ''}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <select
                        value={s.role || 'edit'}
                        onChange={(e) => handleRoleChange(s.id, e.target.value as any)}
                        className="gh-input text-sm"
                        disabled={updatingId === s.id}
                      >
                        <option value="view">View</option>
                        <option value="edit">Edit</option>
                        <option value="manage">Manage</option>
                      </select>
                      <button
                        onClick={() => handleRemove(s.id)}
                        className="p-1 rounded text-red-600 dark:text-[#ff453a] hover:bg-red-600 dark:hover:bg-[#ff453a] hover:text-white transition-all duration-150 ease-in-out"
                        disabled={updatingId === s.id}
                        title="Remove access"
                      >
                        <Trash2 />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end mt-6">
            <button onClick={onClose} className="gh-btn-danger">Close</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManageSharesModal;
