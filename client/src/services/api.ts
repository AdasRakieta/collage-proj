import type { Journey, JourneyShare } from '../types/journey';
import { toYMD } from '../utils/date';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

// Helper function to get auth headers
const getAuthHeaders = () => {
  const token = localStorage.getItem('accessToken');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
  };
};

export const journeyService = {
  async getAllJourneys(page: number = 1, pageSize: number = 25, q: string = ''): Promise<Journey[]> {
    const token = localStorage.getItem('accessToken');
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('pageSize', String(pageSize));
    if (q) params.set('q', q);
    const response = await fetch(`${API_URL}/journeys?${params.toString()}`, {
      headers: {
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
    });
    if (!response.ok) throw new Error('Failed to fetch journeys');
    const result = await response.json();
    // Backend now returns {data: Journey[], pagination: {...}}
    // Return only the data array for backwards compatibility
    return Array.isArray(result) ? result : result.data || [];
  },

  async getJourneyById(id: number): Promise<Journey> {
    const token = localStorage.getItem('accessToken');
    const response = await fetch(`${API_URL}/journeys/${id}`, {
      headers: {
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
    });
    if (!response.ok) throw new Error('Failed to fetch journey');
    return response.json();
  },

  async createJourney(journey: Partial<Journey>): Promise<Journey> {
    const response = await fetch(`${API_URL}/journeys`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(journey),
    });
    if (!response.ok) throw new Error('Failed to create journey');
    return response.json();
  },

  async updateJourney(id: number, journey: Partial<Journey>): Promise<Journey> {
    const response = await fetch(`${API_URL}/journeys/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(journey),
    });
    if (!response.ok) throw new Error('Failed to update journey');
    return response.json();
  },

  async deleteJourney(id: number): Promise<void> {
    const token = localStorage.getItem('accessToken');
    const response = await fetch(`${API_URL}/journeys/${id}`, {
      method: 'DELETE',
      headers: {
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
    });
    if (!response.ok) throw new Error('Failed to delete journey');
  },

  async calculateTotalCost(id: number): Promise<{ totalCost: number; currency: string }> {
    const response = await fetch(`${API_URL}/journeys/${id}/calculate-cost`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to calculate cost');
    return response.json();
  },

  async exportJourneys(id?: number) {
    const token = localStorage.getItem('accessToken');
    const url = id ? `${API_URL}/journeys/export?id=${id}` : `${API_URL}/journeys/export`;
    const response = await fetch(url, {
      headers: { ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to export journeys');
    }
    return response.json();
  },

  async importJourneys(payload: any) {
    const response = await fetch(`${API_URL}/journeys/import`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to import journeys');
    }
    return response.json();
  },
};

// Stop Service
export const stopService = {
  async getStopsByJourneyId(journeyId: number) {
    const token = localStorage.getItem('accessToken');
    const response = await fetch(`${API_URL}/stops/journey/${journeyId}`, {
      headers: {
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
    });
    if (!response.ok) throw new Error('Failed to fetch stops');
    return response.json();
  },
  async getStopsByJourneyIdPaged(journeyId: number, page: number = 1, pageSize: number = 25, q: string = '') {
    const token = localStorage.getItem('accessToken');
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('pageSize', String(pageSize));
    if (q) params.set('q', q);
    const response = await fetch(`${API_URL}/stops/journey/${journeyId}?${params.toString()}`, {
      headers: {
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
    });
    if (!response.ok) throw new Error('Failed to fetch stops');
    return response.json();
  },

  async createStop(journeyId: number, stop: any) {
      const response = await fetch(`${API_URL}/stops/journey/${journeyId}`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(stop),
    });
    if (!response.ok) throw new Error('Failed to create stop');
    return response.json();
  },

  async updateStop(stopId: number, stop: any) {
      const response = await fetch(`${API_URL}/stops/${stopId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(stop),
    });
    if (!response.ok) throw new Error('Failed to update stop');
    return response.json();
  },

  async getStopById(stopId: number) {
    const token = localStorage.getItem('accessToken');
    const response = await fetch(`${API_URL}/stops/${stopId}`, {
      headers: {
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
    });
    if (!response.ok) throw new Error('Failed to fetch stop');
    return response.json();
  },

  async deleteStop(stopId: number) {
    const token = localStorage.getItem('accessToken');
    const response = await fetch(`${API_URL}/stops/${stopId}`, {
      method: 'DELETE',
      headers: {
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
    });
    if (!response.ok) throw new Error('Failed to delete stop');
  },

  async scrapeBookingUrl(url: string) {
    const response = await fetch(`${API_URL}/stops/scrape-booking`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ url }),
    });
    if (!response.ok) throw new Error('Failed to scrape Booking.com URL');
    return response.json();
  },

  async updatePaymentStatus(stopId: number, isPaid: boolean) {
    const response = await fetch(`${API_URL}/stops/${stopId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ isPaid }),
    });
    if (!response.ok) throw new Error('Failed to update payment status');
    return response.json();
  },
};

// Attraction Service
export const attractionService = {
  async getAttractionsByStopId(stopId: number) {
    const token = localStorage.getItem('accessToken');
    const response = await fetch(`${API_URL}/attractions/stop/${stopId}`, {
      headers: {
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
    });
    if (!response.ok) throw new Error('Failed to fetch attractions');
    return response.json();
  },

  async createAttraction(stopId: number, attraction: any) {
      const response = await fetch(`${API_URL}/attractions/stop/${stopId}`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(attraction),
    });
    if (!response.ok) throw new Error('Failed to create attraction');
    return response.json();
  },

  async updateAttraction(attractionId: number, attraction: any) {
    // Convert plannedDate to planned_date for backend compatibility
    const payload = { ...attraction };
    if ('plannedDate' in payload) {
      // Ensure planned_date is always YYYY-MM-DD (strip time / convert Date objects)
      payload.planned_date = toYMD(payload.plannedDate);
      delete payload.plannedDate;
    }
    const response = await fetch(`${API_URL}/attractions/${attractionId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error('Failed to update attraction');
    return response.json();
  },

  async deleteAttraction(attractionId: number) {
    const token = localStorage.getItem('accessToken');
    const response = await fetch(`${API_URL}/attractions/${attractionId}`, {
      method: 'DELETE',
      headers: {
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
    });
    if (!response.ok) throw new Error('Failed to delete attraction');
  },

  async updatePaymentStatus(attractionId: number, isPaid: boolean) {
    const response = await fetch(`${API_URL}/attractions/${attractionId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ isPaid }),
    });
    if (!response.ok) throw new Error('Failed to update payment status');
    return response.json();
  },

  // Reorder attractions within a stop
  async reorderAttractions(stopId: number, orderedIds: number[]) {
    const response = await fetch(`${API_URL}/attractions/stop/${stopId}/reorder`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ orderedIds }),
    });
    if (!response.ok) throw new Error('Failed to reorder attractions');
    return response.json();
  },

  // Move attraction to another stop
  async moveAttraction(attractionId: number, newStopId: number, orderIndex?: number) {
    const response = await fetch(`${API_URL}/attractions/${attractionId}/move`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ newStopId, orderIndex }),
    });
    if (!response.ok) throw new Error('Failed to move attraction');
    return response.json();
  },

  // Update attraction priority
  async updateAttractionPriority(attractionId: number, priority: 'must' | 'should' | 'could' | 'skip') {
    const response = await fetch(`${API_URL}/attractions/${attractionId}/priority`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ priority }),
    });
    if (!response.ok) throw new Error('Failed to update attraction priority');
    return response.json();
  },

  // Bulk update attractions (order, priority, planned date/time, move)
  async bulkUpdateAttractions(updates: Array<{
    id: number;
    orderIndex?: number;
    priority?: 'must' | 'should' | 'could' | 'skip';
    plannedDate?: string;
    plannedTime?: string;
    stopId?: number;
  }>) {
    // Always send planned_date as YYYY-MM-DD string (never Date object or with time)
    const safeUpdates = updates.map(u => {
      const update: any = { ...u };
      if (update.plannedDate) {
        // Always convert to YYYY-MM-DD via toYMD helper so we preserve the DB day exactly
        update.planned_date = toYMD(update.plannedDate);
        delete update.plannedDate;
      }
      return update;
    });
    const response = await fetch(`${API_URL}/attractions/bulk`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ updates: safeUpdates }),
    });
    if (!response.ok) throw new Error('Failed to bulk update attractions');
    return response.json();
  },
};

// Transport Service
export const transportService = {
  async getTransportsByJourneyId(journeyId: number) {
    const token = localStorage.getItem('accessToken');
    const response = await fetch(`${API_URL}/transports/journey/${journeyId}`, {
      headers: {
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
    });
    if (!response.ok) throw new Error('Failed to fetch transports');
    return response.json();
  },

  async createTransport(journeyId: number, transport: any) {
      const response = await fetch(`${API_URL}/transports/journey/${journeyId}`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(transport),
    });
    if (!response.ok) throw new Error('Failed to create transport');
    return response.json();
  },

  async updateTransport(transportId: number, transport: any) {
      const response = await fetch(`${API_URL}/transports/${transportId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(transport),
    });
    if (!response.ok) throw new Error('Failed to update transport');
    return response.json();
  },

  async deleteTransport(transportId: number) {
    const token = localStorage.getItem('accessToken');
    const response = await fetch(`${API_URL}/transports/${transportId}`, {
      method: 'DELETE',
      headers: {
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
    });
    if (!response.ok) throw new Error('Failed to delete transport');
  },

  async scrapeTicket(url: string) {
    const response = await fetch(`${API_URL}/transports/scrape-ticket`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ url }),
    });
    if (!response.ok) throw new Error('Failed to scrape ticket');
    return response.json();
  },

  async updatePaymentStatus(transportId: number, isPaid: boolean) {
    const response = await fetch(`${API_URL}/transports/${transportId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ isPaid }),
    });
    if (!response.ok) throw new Error('Failed to update payment status');
    return response.json();
  },
};

export const attachmentService = {
  async uploadAttachment(formData: FormData) {
    const token = localStorage.getItem('accessToken');
    const response = await fetch(`${API_URL}/attachments`, {
      method: 'POST',
      body: formData,
      headers: {
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      }
    });
    if (!response.ok) throw new Error('Failed to upload attachment');
    return response.json();
  },
  async listAttachmentsForJourney(journeyId: number) {
    const token = localStorage.getItem('accessToken');
    const response = await fetch(`${API_URL}/attachments/journey/${journeyId}`, {
      headers: { ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
    });
    if (!response.ok) throw new Error('Failed to list attachments');
    return response.json();
  },
  async deleteAttachment(id: number) {
    const token = localStorage.getItem('accessToken');
    const response = await fetch(`${API_URL}/attachments/${id}`, {
      method: 'DELETE',
      headers: { ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
    });
    if (!response.ok) throw new Error('Failed to delete attachment');
    return response.json();
  },
  async applyAttachmentToTarget(id: number, targetType: 'transport'|'stop'|'journey', targetId: number) {
    const token = localStorage.getItem('accessToken');
    const response = await fetch(`${API_URL}/attachments/${id}/apply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
      body: JSON.stringify({ targetType, targetId })
    });
    if (!response.ok) throw new Error('Failed to apply attachment');
    return response.json();
  },
  async downloadAttachment(id: number, filename?: string) {
    const token = localStorage.getItem('accessToken');
    const response = await fetch(`${API_URL}/attachments/${id}/download`, {
      headers: { ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
    });
    if (!response.ok) throw new Error('Failed to download attachment');
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || 'attachment';
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  },
  async extractAttachmentData(id: number, assign?: boolean) {
    const token = localStorage.getItem('accessToken');
    const query = assign ? '?assign=1' : '';
    const response = await fetch(`${API_URL}/attachments/${id}/extract${query}`, {
      method: 'POST',
      headers: { ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
    });
    if (!response.ok) throw new Error('Failed to extract attachment');
    return response.json();
  },
  async viewAttachment(id: number) {
    const token = localStorage.getItem('accessToken');
    const response = await fetch(`${API_URL}/attachments/${id}/view`, {
      headers: { ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
    });
    if (!response.ok) {
      // Try to parse server error message
      let errMsg = 'Failed to view attachment';
      try { const errJson = await response.json(); errMsg = errJson.message || errJson.error || errMsg; } catch (e) {}
      throw new Error(errMsg);
    }
    const data = await response.json();
    if (data.type === 'pdf' && data.url) {
      // fetch the protected PDF via an authorized request and return a blob URL
      const pdfResponse = await fetch(`${API_URL}/attachments/${id}/download?inline=1`, {
        headers: { ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
      });
      if (!pdfResponse.ok) throw new Error('Failed to fetch PDF preview');
      const blob = await pdfResponse.blob();
      const url = window.URL.createObjectURL(blob);
      return { type: 'pdf', url };
    }
    return data;
  }
};

// Journey Share Service
export const journeyShareService = {
  async shareJourney(journeyId: number, emailOrUsername: string, role?: 'view' | 'edit' | 'manage'): Promise<JourneyShare> {
    const token = localStorage.getItem('accessToken');
    const response = await fetch(`${API_URL}/journeys/${journeyId}/share`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ emailOrUsername, role }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to share journey');
    }
    return response.json();
  },
  

  async getSharesForJourney(journeyId: number): Promise<JourneyShare[]> {
    const token = localStorage.getItem('accessToken');
    const response = await fetch(`${API_URL}/journeys/${journeyId}/shares`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to fetch shares');
    }
    return response.json();
  },

  async updateShareRole(journeyId: number, shareId: number, role: 'view' | 'edit' | 'manage') {
    const response = await fetch(`${API_URL}/journeys/${journeyId}/shares/${shareId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ role }),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to update share role');
    }
    return response.json();
  },

  async removeShare(journeyId: number, shareId: number) {
    const response = await fetch(`${API_URL}/journeys/${journeyId}/shares/${shareId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to remove share');
    }
    return response.json();
  },

  async getSharedWithMe(): Promise<JourneyShare[]> {
    const token = localStorage.getItem('accessToken');
    const response = await fetch(`${API_URL}/journeys/shared-with-me`, {
      headers: { 
        'Authorization': `Bearer ${token}`,
      },
    });
    if (!response.ok) throw new Error('Failed to fetch shared journeys');
    return response.json();
  },

  async acceptInvitation(tokenOrId: string, isToken: boolean = true): Promise<JourneyShare> {
    const authToken = localStorage.getItem('accessToken');
    const body = isToken 
      ? { token: tokenOrId }
      : { invitationId: parseInt(tokenOrId) };
    
    const response = await fetch(`${API_URL}/journeys/invitations/accept`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to accept invitation');
    }
    return response.json();
  },

  async rejectInvitation(invitationId: number): Promise<JourneyShare> {
    const token = localStorage.getItem('accessToken');
    const response = await fetch(`${API_URL}/journeys/invitations/${invitationId}/reject`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${token}`,
      },
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to reject invitation');
    }
    return response.json();
  },
};
