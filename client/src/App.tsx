import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Plus, MapPin, Calendar, DollarSign, Plane, Train, Bus, Car, Menu, X, Trash2, Edit2, CheckCircle2, XCircle, Settings, LogOut, User, Users, Share2, ChevronDown, ChevronRight, Eye, DownloadCloud, FileText, ListOrdered } from 'lucide-react';
import JourneyMapWrapper from './components/JourneyMapWrapper';
import ImportMapModal from './components/ImportMapModal';
import { PaymentCheckbox } from './components/PaymentCheckbox';
import { ToastContainer, useToast } from './components/Toast';
import ConfirmDialog from './components/ConfirmDialog';
import ManageSharesModal from './components/ManageSharesModal';
import { useConfirm } from './hooks/useConfirm';
import type { Journey, Stop, Transport, Attraction, ChecklistItem } from './types/journey';
import { journeyService, stopService, attractionService, transportService, journeyShareService, attachmentService } from './services/api';
import { getRates } from './services/currencyApi';
import { socketService } from './services/socket';
import { getAttractionTagInfo, getAvailableAttractionTags } from './utils/attractionTags';
import { parseYMDToDate, toYMD, formatYMDForDisplay } from './utils/date';
// Payment calculation helpers (unused directly here) are available in services/utils; import when needed.
import { useAuth } from './contexts/AuthContext';
import { geocodeAddress } from './services/geocoding';

// Helper function to format date to YYYY-MM-DD
const formatDateForInput = (date: Date | string | undefined): string => {
  if (!date) return '';
  if (typeof date === 'string') {
    const match = date.match(/^(\d{4}-\d{2}-\d{2})/);
    if (match) return match[1];
  }
  return toYMD(date);
};

// Helper function to format datetime for datetime-local input (local time)
const formatDateTimeForInput = (date: Date | string | undefined): string => {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  // Create local YYYY-MM-DDTHH:MM (datetime-local expects local time)
  const pad = (n: number) => String(n).padStart(2, '0');
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

// Validate HH:MM time string (24-hour)
const isValidTime = (t: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(t);

// (removed validateAndFormatTime - using isValidTime for strict validation)

// Helper function to format date for display
const formatDateForDisplay = (date: Date | string | undefined): string => {
  if (!date) return 'Not set';
  const s = formatYMDForDisplay(date, 'en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  return s || 'Invalid date';
};

// Helper to format date+time for display without seconds
const formatDateTimeForDisplay = (date: Date | string | undefined): string => {
  if (!date) return 'Not set';
  const d = parseYMDToDate(date) || new Date(date as any);
  if (!d || isNaN(d.getTime())) return 'Invalid date';
  return d.toLocaleString(undefined, { year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};

function App() {
  const { user, logout } = useAuth();
  const { toasts, closeToast, success, error, warning, info } = useToast();
  const confirmHook = useConfirm();
  const [journeys, setJourneys] = useState<Journey[]>([]);
  const [journeySearch, setJourneySearch] = useState<string>('');
  const [journeyPage, setJourneyPage] = useState<number>(1);
  const [selectedJourney, setSelectedJourney] = useState<Journey | null>(null);
  const [attachments, setAttachments] = useState<any[]>([]);
  // For file upload UI: keep server-side attachment persistent after upload
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState<string | null>(null);
  
  // Open preview for an attachment. For PDFs we use iframe (previewUrl).
  // For other types, backend may provide HTML. If the file is a DOCX, try
  // client-side conversion using `mammoth` for a nicer visual preview.
  const openAttachmentPreview = async (att: any) => {
    try {
      const preview = await attachmentService.viewAttachment(att.id);
      const filename = (att.originalFilename || '').toLowerCase();
      if (preview.type === 'pdf' || (preview.url && preview.type === 'pdf')) {
        setPreviewUrl(preview.url);
        setPreviewTitle(att.originalFilename || preview.title || 'Preview');
        setPreviewHtml(null);
        setPreviewOpen(true);
        return;
      }

      // If it's a docx and we have a URL, try to fetch and convert with mammoth
      if ((preview.type === 'docx' || filename.endsWith('.docx')) && preview.url) {
        try {
          const mammoth = await import('mammoth');
          const res = await fetch(preview.url);
          const arrayBuffer = await res.arrayBuffer();
          // Use styleMap to improve readability: add paragraph breaks, bold headings, table borders
          const result = await mammoth.convertToHtml({ arrayBuffer }, {
            styleMap: [
              "p => p:fresh ",
              "b => strong",
              "i => em",
              "table => table.table-auto border border-gray-300 dark:border-gray-600 my-4",
              "tr => tr border-b border-gray-200 dark:border-gray-700",
              "td => td px-2 py-1 border border-gray-200 dark:border-gray-700",
              "th => th px-2 py-1 border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-800 font-semibold",
              "h1 => h1 text-xl font-bold mt-4 mb-2",
              "h2 => h2 text-lg font-bold mt-3 mb-1",
              "h3 => h3 text-base font-semibold mt-2 mb-1"
            ]
          });
          // Add extra CSS for better spacing and readability
          const styledHtml = `
            <style>
              .docx-preview p { margin: 0.5em 0; }
              .docx-preview table { border-collapse: collapse; width: 100%; margin: 1em 0; }
              .docx-preview th, .docx-preview td { border: 1px solid #ccc; padding: 0.4em 0.7em; }
              .docx-preview th { background: #f3f4f6; font-weight: 600; }
              .dark .docx-preview th { background: #23232b; color: #fff; }
              .docx-preview h1, .docx-preview h2, .docx-preview h3 { margin-top: 1em; margin-bottom: 0.5em; }
            </style>
            <div class="docx-preview">${result.value}</div>
          `;
          setPreviewHtml(styledHtml);
          setPreviewTitle(att.originalFilename || 'Document');
          setPreviewUrl(null);
          setPreviewOpen(true);
          return;
        } catch (e) {
          // fallthrough to server-provided HTML if conversion fails
          console.warn('mammoth conversion failed, falling back to server HTML', e);
        }
      }

      // Default: server-provided HTML (if any) or a simple message
      setPreviewHtml(preview.html || '<div class="text-sm text-gray-500">No preview available</div>');
      setPreviewTitle(att.originalFilename || 'Preview');
      setPreviewUrl(null);
      setPreviewOpen(true);
    } catch (e: any) {
      error(e?.message || 'Failed to preview');
    }
  };
  // Helper: fetch full journey from server (authoritative data)
  const refreshJourneyFromServer = async (journeyId: number, setSelected = false) => {
    try {
      const fresh = await journeyService.getJourneyById(journeyId);
      setJourneys(prev => prev.map(j => j.id === fresh.id ? fresh : j));
      if (setSelected || selectedJourney?.id === fresh.id) setSelectedJourney(fresh);
      return fresh;
    } catch (err) {
      // If we can't fetch, return null and let client compute as fallback
      console.warn('Failed to refresh journey from server', err);
      return null;
    }
  };

  const handleImportComplete = async (result: { createdStops: any[]; createdAttractions: any[] }) => {
    try {
      const total = (result.createdStops?.length || 0) + (result.createdAttractions?.length || 0);
      if (selectedJourney?.id) {
        await refreshJourneyFromServer(selectedJourney.id);
      }
      success(`Imported ${total} items`);
    } catch (e: any) {
      console.error('Import completed but refresh failed', e);
      success('Import finished');
    }
  };

  // Find journey id for a stop id from local state cache
  const journeyIdFromStop = (stopId: number): number | null => {
    const j = journeys.find(j => (j.stops || []).some(s => s.id === stopId));
    return j ? (j.id ?? null) : null;
  };

  const journeyIdFromAttractionId = (attractionId: number): number | null => {
    const j = journeys.find(j => (j.stops || []).some(s => (s.attractions || []).some(a => a.id === attractionId)));
    return j ? (j.id ?? null) : null;
  };

  useEffect(() => {
    return () => {
      if (previewUrl) {
        try { window.URL.revokeObjectURL(previewUrl); } catch (e) { /* noop */ }
      }
    };
  }, [previewUrl]);
  const [extractModalOpen, setExtractModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [extractResult, setExtractResult] = useState<any | null>(null);
  const [openStopAttachments, setOpenStopAttachments] = useState<Record<number, boolean>>({});
  const [openTransportAttachments, setOpenTransportAttachments] = useState<Record<number, boolean>>({});
    const [openAttractions, setOpenAttractions] = useState<Record<number, boolean>>({});

    // Ensure attractions are expanded by default if present
    useEffect(() => {
      if (selectedJourney?.stops) {
        setOpenAttractions(prev => {
          const updated: Record<number, boolean> = { ...prev };
          (selectedJourney.stops || []).forEach(stop => {
            if (stop.id != null) {
              if (stop.attractions && stop.attractions.length > 0 && !(stop.id in updated)) {
                updated[stop.id] = true;
              } else if ((!stop.attractions || stop.attractions.length === 0) && !(stop.id in updated)) {
                updated[stop.id] = false;
              }
            }
          });
          return updated;
        });
      }
    }, [selectedJourney?.stops]);
  const transportFileRef = useRef<HTMLInputElement | null>(null);
  const stopFileRef = useRef<HTMLInputElement | null>(null);
  const allowedPreviewTypes = '.pdf,.doc,.docx';
  const allowedFileTypes = allowedPreviewTypes; // alias used in file input `accept`
  const [uploadingAttachment, setUploadingAttachment] = useState<any | null>(null);
  const [showNewJourneyForm, setShowNewJourneyForm] = useState(false);
  const [showStopForm, setShowStopForm] = useState(false);
  const [showTransportForm, setShowTransportForm] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [bookingUrl, setBookingUrl] = useState('');
  const [editBookingUrl, setEditBookingUrl] = useState('');
  
  const [newJourney, setNewJourney] = useState<Partial<Journey>>({
    title: '',
    description: '',
    startDate: '',
    endDate: '',
    currency: 'PLN',
    stops: [],
    transports: [],
  });

  const [newStop, setNewStop] = useState<Partial<Stop>>({
    city: '',
    country: '',
    latitude: 51.505,
    longitude: -0.09,
    addressStreet: '',
    addressHouseNumber: '',
    postalCode: '',
    arrivalDate: '',
    departureDate: '',
    accommodationName: '',
    accommodationUrl: '',
    accommodationPrice: 0,
    accommodationCurrency: 'PLN',
  });

  const [newTransport, setNewTransport] = useState<Partial<Transport>>({
    type: 'flight',
    fromLocation: '',
    toLocation: '',
    departureDate: '',
    arrivalDate: '',
    price: 0,
    currency: 'PLN',
    bookingUrl: '',
    flightNumber: '',
    trainNumber: '',
  });

  const [newAttraction, setNewAttraction] = useState<Partial<Attraction>>({
    name: '',
    description: '',
    estimatedCost: 0,
    duration: '',
  });
  const [geocodingAttraction, setGeocodingAttraction] = useState(false);

  const [selectedStopForAttraction, setSelectedStopForAttraction] = useState<number | null>(null);
  const [showAttractionForm, setShowAttractionForm] = useState(false);

  const [editingStop, setEditingStop] = useState<Stop | null>(null);
  const [showEditStopForm, setShowEditStopForm] = useState(false);
  
  const [editingTransport, setEditingTransport] = useState<Transport | null>(null);
  const [showEditTransportForm, setShowEditTransportForm] = useState(false);
  
  const [editingAttraction, setEditingAttraction] = useState<Attraction | null>(null);
  const [showEditAttractionForm, setShowEditAttractionForm] = useState(false);
  const [editingAttractionStopId, setEditingAttractionStopId] = useState<number | null>(null);
  const [geocodingEditAttraction, setGeocodingEditAttraction] = useState(false);

  const [editingJourney, setEditingJourney] = useState<Journey | null>(null);
  const [showEditJourneyForm, setShowEditJourneyForm] = useState(false);
  // Currency rates cache for client-side conversions
  const [ratesCache, setRatesCache] = useState<any>(null);

  useEffect(() => {
    // Load rates for PLN by default (so UI that is not showing a specific journey
    // can still display converted totals). When a journey is selected the other
    // effect below will load rates for that journey's currency.
    let mounted = true;
    const loadDefault = async () => {
      try {
        const data = await getRates('PLN');
        if (mounted) setRatesCache(data);
      } catch (e) {
        // ignore - UI will show original amounts if conversion unavailable
        console.warn('Failed to load default PLN rates', e);
      }
    };
    void loadDefault();
    return () => { mounted = false; };
  }, []);

  // When a journey is selected, fetch rates for its main currency so client-side conversions work
  useEffect(() => {
    let mounted = true;
    const loadForJourney = async () => {
      try {
        const base = selectedJourney?.currency || 'PLN';
        const data = await getRates(base);
        if (mounted) setRatesCache(data);
      } catch (e) {
        console.warn('Failed to load rates for selected journey:', e);
      }
    };
    void loadForJourney();
    return () => { mounted = false; };
  }, [selectedJourney?.id, selectedJourney?.currency]);

  // Load attachments for currently selected journey
  useEffect(() => {
    let mounted = true;
    const loadAttachments = async () => {
      if (!selectedJourney?.id) {
        if (mounted) setAttachments([]);
        return;
      }
      try {
        const list = await attachmentService.listAttachmentsForJourney(selectedJourney.id);
        if (mounted) setAttachments(list);
      } catch (e) {
        console.warn('Failed to load attachments', e);
      }
    };
    void loadAttachments();
    return () => { mounted = false; };
  }, [selectedJourney?.id]);

  const toggleStopAttachments = (stopId: number) => setOpenStopAttachments(prev => ({ ...prev, [stopId]: !prev[stopId] }));
  const toggleTransportAttachments = (transportId: number) => setOpenTransportAttachments(prev => ({ ...prev, [transportId]: !prev[transportId] }));

  const renderAttachmentRow = (att: any) => (
    <div key={att.id} className="flex items-center justify-between bg-gray-50 dark:bg-[#1c1c1e] px-4 h-12 rounded-md border border-gray-200 dark:border-[#38383a]">
      <div className="min-w-0 mr-2">
        <div className="font-medium text-black dark:text-white truncate">{att.originalFilename}</div>
        <div className="text-xs text-black/60 dark:text-white/60">{att.mimeType} • {Math.round((att.fileSize || att.file_size || 0) / 1024)} KB</div>
      </div>
      <div className="flex items-center gap-2">
        <button onClick={() => void openAttachmentPreview(att)} title="Preview" className="text-gray-500 hover:text-gray-700"><Eye className="w-5 h-5" /></button>
        <button onClick={async () => { try { await attachmentService.downloadAttachment(att.id, att.originalFilename); } catch (e) { error('Failed to download attachment'); } }} title="Download" className="text-gray-500 hover:text-gray-700"><DownloadCloud className="w-5 h-5"/></button>
        <button onClick={async () => { try { if (!(await confirmHook.confirm({ title: 'Delete', message: 'Delete attachment?' }))) return; await attachmentService.deleteAttachment(att.id); setAttachments(prev => prev.filter(a => a.id !== att.id)); success('Attachment deleted'); } catch (e) { error('Failed to delete'); } }} title="Delete" className="text-red-600 hover:text-red-700"><Trash2 className="w-5 h-5"/></button>

        {/* Extract data button - will call backend extract and open extract modal; when an item is being edited apply parsed fields */}
        <button onClick={async () => {
          try {
            const shouldAssign = false;
            const resp = await attachmentService.extractAttachmentData(att.id, shouldAssign);
            const parsed = resp?.parsed || resp;
            setExtractResult(parsed);
            setExtractModalOpen(true);

            // If editing a stop, apply likely stop fields defensively
            if (editingStop) {
              const parsedAddress = parsed?.address || parsed?.addressStreet || '';
              const parsedPostal = parsed?.addressPostcode || parsed?.postalCode || '';
              const parsedHouse = parsed?.addressHouseNumber || '';
              setEditingStop(prev => prev ? ({
                ...prev,
                accommodationName: parsed?.accommodationName || parsed?.hotelName || prev.accommodationName,
                accommodationUrl: parsed?.accommodationUrl || prev.accommodationUrl,
                city: parsed?.city || prev.city,
                country: parsed?.country || prev.country,
                addressStreet: parsed?.addressStreet || (parsedAddress ? parsedAddress : prev.addressStreet),
                addressHouseNumber: parsedHouse || prev.addressHouseNumber,
                postalCode: parsedPostal || prev.postalCode,
                arrivalDate: parsed?.arrivalDate || prev.arrivalDate,
                departureDate: parsed?.departureDate || prev.departureDate,
                accommodationPrice: parsed?.accommodationPrice ?? parsed?.price?.amount ?? prev.accommodationPrice,
                accommodationCurrency: parsed?.accommodationCurrency || parsed?.price?.currency || prev.accommodationCurrency,
              }) : prev);
              success('Extracted data applied to editing stop (please verify)');
            }

            // If editing a transport, apply likely transport fields defensively
            if (editingTransport) {
              setEditingTransport(prev => prev ? ({
                ...prev,
                flightNumber: parsed?.flightNumber || parsed?.pnr || prev.flightNumber,
                trainNumber: parsed?.trainNumber || prev.trainNumber,
                price: parsed?.price?.amount ?? parsed?.priceAmount ?? prev.price,
                currency: parsed?.price?.currency || parsed?.priceCurrency || prev.currency,
                fromLocation: parsed?.from || parsed?.fromLocation || prev.fromLocation,
                toLocation: parsed?.to || parsed?.toLocation || prev.toLocation,
                departureDate: parsed?.departureDate || prev.departureDate,
                arrivalDate: parsed?.arrivalDate || prev.arrivalDate,
              }) : prev);
              success('Extracted data applied to editing transport (please verify)');
            }

          } catch (e) {
            console.error(e);
            error('Failed to extract data from attachment');
          }
        }} title="Extract data" className="text-gray-500 hover:text-gray-700"><FileText className="w-5 h-5"/></button>
      </div>
    </div>
  );

  const getRate = (from: string, to: string): number | null => {
    try {
      if (!ratesCache) return null;
      const rates = ratesCache.rates || {};
      const f = (from || '').toUpperCase().trim();
      const t = (to || '').toUpperCase().trim();
      if (!f || !t) return null;
      if (f === t) return 1;
      const rateFrom = rates[f];
      const rateTo = rates[t];
      if (rateFrom == null || rateTo == null) return null;
      return (1 / rateFrom) * rateTo;
    } catch (e) {
      return null;
    }
  };

  const convertAmount = (amount: number, from: string, to: string): number | null => {
    const f = (from || '').toUpperCase().trim();
    const t = (to || '').toUpperCase().trim();
    if (!f || !t) return null;
    const rate = getRate(f, t);
    if (rate == null) return null;
    return amount * rate;
  };

  // Share journey state
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareEmailOrUsername, setShareEmailOrUsername] = useState('');
  const [shareRole, setShareRole] = useState<'view' | 'edit' | 'manage'>('edit');
  const [showManageSharesModal, setShowManageSharesModal] = useState(false);

  // UI state for collapsible sections
  const [stopsOpen, setStopsOpen] = useState<boolean>(true);
  const [transportsOpen, setTransportsOpen] = useState<boolean>(true);

  // Checklist UI state
  // Local storage key for per-journey UI state (collapses)
  const UI_STATE_KEY = 'jp:journey_ui_state_v1';

  const loadUIStateForJourney = (id: number) => {
    try {
      const raw = localStorage.getItem(UI_STATE_KEY);
      if (!raw) return null;
      const all = JSON.parse(raw || '{}');
      return all[id] || null;
    } catch (e) {
      console.warn('Failed to load UI state', e);
      return null;
    }
  };

  const saveUIStateForJourney = (id: number, state: { stopsOpen: boolean; transportsOpen: boolean; checklistOpen: boolean }) => {
    try {
      const raw = localStorage.getItem(UI_STATE_KEY);
      const all = raw ? JSON.parse(raw) : {};
      all[id] = state;
      localStorage.setItem(UI_STATE_KEY, JSON.stringify(all));
    } catch (e) {
      console.warn('Failed to save UI state', e);
    }
  };

  const [newChecklistItemName, setNewChecklistItemName] = useState<string>('');
  const [checklistOpen, setChecklistOpen] = useState<boolean>(true);
  const [editingChecklistId, setEditingChecklistId] = useState<string | null>(null);
  const [editingChecklistName, setEditingChecklistName] = useState<string>('');

  const toggleChecklistOpen = () => {
    setChecklistOpen(prev => {
      const next = !prev;
      if (selectedJourney?.id) saveUIStateForJourney(selectedJourney.id, { stopsOpen, transportsOpen, checklistOpen: next });
      return next;
    });
  };

  const startEditChecklistItem = (id: string, name: string) => {
    setEditingChecklistId(id);
    setEditingChecklistName(name);
  };

  const saveEditChecklistItem = () => {
    if (!selectedJourney || !editingChecklistId) return;
    const name = editingChecklistName.trim();
    if (!name) return;
    // Optimistic UI update
    setJourneys(prev => prev.map(j => {
      if (j.id !== selectedJourney.id) return j;
      const checklist = (j.checklist || []).map(it => it.id === editingChecklistId ? { ...it, name } : it);
      return { ...j, checklist };
    }));
    setSelectedJourney(prev => prev ? { ...prev, checklist: (prev.checklist || []).map(it => it.id === editingChecklistId ? { ...it, name } : it) } : prev);
    // Persist change
    (async () => {
      try {
        await journeyService.updateJourney(selectedJourney.id!, { checklist: (selectedJourney.checklist || []).map(it => it.id === editingChecklistId ? { ...it, name } : it) });
        success('Checklist updated');
      } catch (err) {
        console.error('Failed to save checklist edit:', err);
        error('Failed to save checklist edit');
      }
    })();
    setEditingChecklistId(null);
    setEditingChecklistName('');
  };

  const cancelEditChecklistItem = () => {
    setEditingChecklistId(null);
    setEditingChecklistName('');
  };

  const toggleStopsOpen = () => {
    setStopsOpen(prev => {
      const next = !prev;
      if (selectedJourney?.id) saveUIStateForJourney(selectedJourney.id, { stopsOpen: next, transportsOpen, checklistOpen });
      return next;
    });
  };

  const toggleTransportsOpen = () => {
    setTransportsOpen(prev => {
      const next = !prev;
      if (selectedJourney?.id) saveUIStateForJourney(selectedJourney.id, { stopsOpen, transportsOpen: next, checklistOpen });
      return next;
    });
  };

  const addChecklistItem = () => {
    if (!selectedJourney) return;
    const name = newChecklistItemName.trim();
    if (!name) return;
    const id = `${Date.now()}-${Math.random().toString(36).slice(2,9)}`;
    const item: ChecklistItem = { id, name, bought: false, packed: false };
    // Optimistic UI update
    setJourneys(prev => prev.map(j => j.id === selectedJourney.id ? { ...j, checklist: [...(j.checklist || []), item] } : j));
    setSelectedJourney(prev => prev ? { ...prev, checklist: [...(prev.checklist || []), item] } : prev);
    // Persist
    (async () => {
      try {
        await journeyService.updateJourney(selectedJourney.id!, { checklist: [...(selectedJourney.checklist || []), item] });
        success('Checklist item added');
      } catch (err) {
        console.error('Failed to add checklist item:', err);
        error('Failed to add checklist item');
      }
    })();
    setNewChecklistItemName('');
  };

  const toggleChecklistBought = (itemId: string) => {
    if (!selectedJourney) return;
    // update locally
    setJourneys(prev => prev.map(j => {
      if (j.id !== selectedJourney.id) return j;
      const checklist = (j.checklist || []).map(it => it.id === itemId ? { ...it, bought: !it.bought } : it);
      return { ...j, checklist };
    }));
    setSelectedJourney(prev => prev ? { ...prev, checklist: (prev.checklist || []).map(it => it.id === itemId ? { ...it, bought: !it.bought } : it) } : prev);
    // Persist
    (async () => {
      try {
        const updated = (selectedJourney.checklist || []).map(it => it.id === itemId ? { ...it, bought: !it.bought } : it);
        await journeyService.updateJourney(selectedJourney.id!, { checklist: updated });
      } catch (err) {
        console.error('Failed to update checklist bought status:', err);
        error('Failed to update checklist');
      }
    })();
  };

  const toggleChecklistPacked = (itemId: string) => {
    if (!selectedJourney) return;
    setJourneys(prev => prev.map(j => {
      if (j.id !== selectedJourney.id) return j;
      const checklist = (j.checklist || []).map(it => it.id === itemId ? { ...it, packed: !it.packed } : it);
      return { ...j, checklist };
    }));
    setSelectedJourney(prev => prev ? { ...prev, checklist: (prev.checklist || []).map(it => it.id === itemId ? { ...it, packed: !it.packed } : it) } : prev);
    (async () => {
      try {
        const updated = (selectedJourney.checklist || []).map(it => it.id === itemId ? { ...it, packed: !it.packed } : it);
        await journeyService.updateJourney(selectedJourney.id!, { checklist: updated });
      } catch (err) {
        console.error('Failed to update checklist packed status:', err);
        error('Failed to update checklist');
      }
    })();
  };

  const removeChecklistItem = (itemId: string) => {
    if (!selectedJourney) return;
    const updatedChecklist = (selectedJourney.checklist || []).filter(it => it.id !== itemId);
    setJourneys(prev => prev.map(j => j.id === selectedJourney.id ? { ...j, checklist: updatedChecklist } : j));
    setSelectedJourney(prev => prev ? { ...prev, checklist: updatedChecklist } : prev);
    (async () => {
      try {
        await journeyService.updateJourney(selectedJourney.id!, { checklist: updatedChecklist });
        success('Checklist item removed');
      } catch (err) {
        console.error('Failed to remove checklist item:', err);
        error('Failed to remove checklist item');
      }
    })();
  };

  // Helper for displaying amounts with optional conversion to selected journey currency (unused in current UI)

  // Prefer server-persisted converted values when available on items.
  const toCamel = (s: string) => s.replace(/_([a-z])/g, (_, l) => l.toUpperCase());
  // Prefer server-stored converted values: accept either snake_case or camelCase field names
  const getStoredConverted = (item: any, convertedField: string, convertedCurrencyField?: string) => {
    if (!item) return null;
    const variants = [convertedField, toCamel(convertedField)];
    const currVariants = convertedCurrencyField ? [convertedCurrencyField, toCamel(convertedCurrencyField)] : [];
    let v: any = null;
    for (const key of variants) {
      if (Object.prototype.hasOwnProperty.call(item, key) && item[key] != null) { v = item[key]; break; }
    }
    if (v == null) return null;
    let c: any = null;
    for (const key of currVariants) {
      if (Object.prototype.hasOwnProperty.call(item, key) && item[key] != null) { c = item[key]; break; }
    }
    const currencyOut = (c || selectedJourney?.currency || 'PLN').toString().toUpperCase();
    return { value: Number(v), currency: currencyOut };
  };

  const formatItemPrice = (amount: number | null | undefined, from: string | null | undefined, item: any, convertedField: string, convertedCurrencyField?: string) => {
    if (amount == null) return null;
    let stored = getStoredConverted(item, convertedField, convertedCurrencyField);
    // If server stored conversion exists but is zero while original amount is non-zero,
    // treat it as missing so client-side live conversion is used instead. This avoids
    // showing "≈ 0.00 PLN" when stored conversions were not properly computed.
    if (stored && Number(stored.value) === 0 && Number(amount) !== 0) {
      stored = null;
    }
    const fromCurr = (from || selectedJourney?.currency || 'PLN').toString().toUpperCase();
    const toCurr = (selectedJourney?.currency || 'PLN').toString().toUpperCase();

    // If target currency is the same as the source, don't display conversion
    if (fromCurr === toCurr) {
      return `${amount} ${fromCurr}`;
    }
    if (stored) {
      // If server already persisted the converted value, show that as authoritative value
      // But if stored value is the same currency as source, avoid showing redundant conversion
      if ((stored.currency || '').toString().toUpperCase() === fromCurr) return `${amount} ${fromCurr}`;
      // If the stored converted currency is equal to the target and its value equals the original amount,
      // skip the redundant approx display
      if ((stored.currency || '').toString().toUpperCase() === toCurr && Number(stored.value) === Number(amount)) return `${amount} ${fromCurr}`;
      return `${amount} ${fromCurr} ≈ ${stored.value.toFixed(2)} ${(stored.currency || '').toString().toUpperCase()}`;
    }
    const conv = convertAmount(amount, fromCurr, selectedJourney?.currency || 'PLN');
    return conv != null ? `${amount} ${fromCurr} ≈ ${conv.toFixed(2)} ${(selectedJourney?.currency || 'PLN').toString().toUpperCase()}` : `${amount} ${fromCurr}`;
  };

  useEffect(() => {
    // Only load journeys if user is authenticated
    if (user) {
      void loadJourneys(journeyPage, journeySearch);
    }
    
    // Connect to Socket.IO for real-time updates
    socketService.connect();
    
    // Listen for journey events
    socketService.on('journey:created', (journey: Journey) => {
      console.log('Real-time: Journey created', journey);
      setJourneys(prev => [...prev, journey]);
      // Don't show toast - avoid duplicate notifications when user creates journey
    });
    
    socketService.on('journey:updated', (journey: Journey) => {
      console.log('Real-time: Journey updated', journey);
      setJourneys(prev => prev.map(j => j.id === journey.id ? journey : j));
      if (selectedJourney?.id === journey.id) {
        setSelectedJourney(journey);
      }
      // Don't show toast - avoid duplicate notifications when user updates journey
    });
    
    socketService.on('journey:deleted', ({ id }: { id: number }) => {
      console.log('Real-time: Journey deleted', id);
      setJourneys(prev => prev.filter(j => j.id !== id));
      if (selectedJourney?.id === id) {
        setSelectedJourney(null);
      }
      // Don't show toast - user gets local success message if they deleted it
      // If another user deleted it, the journey just disappears from the list
    });
    

    // Listen for stop events
    socketService.on('stop:created', async (stop: Stop) => {
      console.log('Real-time: Stop created', stop);
      if (!stop.journeyId) return;
      const refreshed = await refreshJourneyFromServer(stop.journeyId);
      if (refreshed) return;

      setJourneys(prev => prev.map(j => {
        if (j.id === stop.journeyId) {
          const updated = { ...j, stops: [...(j.stops || []), stop] } as Journey;
          updated.totalEstimatedCost = updated.totalEstimatedCost ?? calculateJourneyTotalCost(updated);
          return updated;
        }
        return j;
      }));
      if (selectedJourney?.id === stop.journeyId) {
        setSelectedJourney(prev => {
          if (!prev) return null;
          const updated = { ...prev, stops: [...(prev.stops || []), stop] } as Journey;
          updated.totalEstimatedCost = updated.totalEstimatedCost ?? calculateJourneyTotalCost(updated);
          return updated;
        });
      }
      // Notification only for real-time updates from other users
    });
    
    socketService.on('stop:updated', async (stop: Stop) => {
      console.log('Real-time: Stop updated', stop);
      if (!stop.journeyId) return;
      const refreshed = await refreshJourneyFromServer(stop.journeyId);
      if (refreshed) return;

      setJourneys(prev => prev.map(j => {
        if (j.id === stop.journeyId) {
          const updated = { 
            ...j, 
            stops: (j.stops || []).map(s => s.id === stop.id ? stop : s)
          } as Journey;
          updated.totalEstimatedCost = updated.totalEstimatedCost ?? calculateJourneyTotalCost(updated);
          return updated;
        }
        return j;
      }));
      if (selectedJourney?.id === stop.journeyId) {
        setSelectedJourney(prev => {
          if (!prev) return null;
          const updated = { ...prev, stops: (prev.stops || []).map(s => s.id === stop.id ? stop : s) } as Journey;
          updated.totalEstimatedCost = updated.totalEstimatedCost ?? calculateJourneyTotalCost(updated);
          return updated;
        });
      }
      // Update editingStop if it's currently being edited
      setEditingStop(prev => {
        if (prev && prev.id === stop.id) {
          return stop;
        }
        return prev;
      });
      // Removed duplicate notification - handled by manual actions
    });
    
    socketService.on('stop:deleted', async ({ id }: { id: number }) => {
      console.log('Real-time: Stop deleted', id);
      const journeyId = journeyIdFromStop(id);
      const refreshed = journeyId ? await refreshJourneyFromServer(journeyId) : null;
      if (refreshed) return;

      setJourneys(prev => prev.map(j => {
        const updated = { ...j, stops: (j.stops || []).filter(s => s.id !== id) } as Journey;
        updated.totalEstimatedCost = updated.totalEstimatedCost ?? calculateJourneyTotalCost(updated);
        return updated;
      }));
      if (selectedJourney) {
        setSelectedJourney(prev => prev ? (() => {
          const updated = { ...prev, stops: (prev.stops || []).filter(s => s.id !== id) } as Journey;
          updated.totalEstimatedCost = updated.totalEstimatedCost ?? calculateJourneyTotalCost(updated);
          return updated;
        })() : null);
      }
      warning('Stop deleted');
    });
    
    // Listen for attraction events
    socketService.on('attraction:created', async (attraction: Attraction) => {
      console.log('Real-time: Attraction created', attraction);
      if (!attraction.stopId) return;
      const jId = journeyIdFromStop(attraction.stopId);
      if (!jId) return;
      const refreshed = await refreshJourneyFromServer(jId);
      if (refreshed) return;

      setJourneys(prev => prev.map(j => {
        const updated = {
          ...j,
          stops: (j.stops || []).map(s => {
            if (s.id === attraction.stopId) {
              return { ...s, attractions: [...(s.attractions || []), attraction] };
            }
            return s;
          })
        } as Journey;
        updated.totalEstimatedCost = updated.totalEstimatedCost ?? calculateJourneyTotalCost(updated);
        return updated;
      }));
      if (selectedJourney) {
        setSelectedJourney(prev => prev ? (() => {
          const updated = {
            ...prev,
            stops: (prev.stops || []).map(s => {
              if (s.id === attraction.stopId) {
                return { ...s, attractions: [...(s.attractions || []), attraction] };
              }
              return s;
            })
          } as Journey;
          updated.totalEstimatedCost = updated.totalEstimatedCost ?? calculateJourneyTotalCost(updated);
          setSelectedJourney(updated);
          return updated;
        })() : null);
      }
      // Notification only for real-time updates from other users
    });
    
    socketService.on('attraction:updated', async (attraction: Attraction) => {
      console.log('Real-time: Attraction updated', attraction);
      if (!attraction.id) return;
      const jId = journeyIdFromAttractionId(attraction.id);
      if (!jId) return;
      const refreshed = await refreshJourneyFromServer(jId);
      if (refreshed) return;

      setJourneys(prev => prev.map(j => {
        const updated = {
          ...j,
          stops: (j.stops || []).map(s => ({
            ...s,
            attractions: (s.attractions || []).map(a => a.id === attraction.id ? attraction : a)
          }))
        } as Journey;
        updated.totalEstimatedCost = updated.totalEstimatedCost ?? calculateJourneyTotalCost(updated);
        return updated;
      }));
      if (selectedJourney) {
        setSelectedJourney(prev => prev ? (() => {
          const updated = {
            ...prev,
            stops: (prev.stops || []).map(s => ({
              ...s,
              attractions: (s.attractions || []).map(a => a.id === attraction.id ? attraction : a)
            }))
          } as Journey;
          updated.totalEstimatedCost = updated.totalEstimatedCost ?? calculateJourneyTotalCost(updated);
          setSelectedJourney(updated);
          return updated;
        })() : null);
      }
      // Removed duplicate notification - handled by manual actions
    });
    
    socketService.on('attraction:deleted', async ({ id }: { id: number }) => {
      console.log('Real-time: Attraction deleted', id);
      const journeyId = journeyIdFromAttractionId(id);
      const refreshed = journeyId ? await refreshJourneyFromServer(journeyId) : null;
      if (refreshed) return;

      setJourneys(prev => prev.map(j => {
        const updated = {
          ...j,
          stops: (j.stops || []).map(s => ({
            ...s,
            attractions: (s.attractions || []).filter(a => a.id !== id)
          }))
        } as Journey;
        updated.totalEstimatedCost = updated.totalEstimatedCost ?? calculateJourneyTotalCost(updated);
        return updated;
      }));
      if (selectedJourney) {
        setSelectedJourney(prev => prev ? (() => {
          const updated = {
            ...prev,
            stops: (prev.stops || []).map(s => ({
              ...s,
              attractions: (s.attractions || []).filter(a => a.id !== id)
            }))
          } as Journey;
          updated.totalEstimatedCost = updated.totalEstimatedCost ?? calculateJourneyTotalCost(updated);
          setSelectedJourney(updated);
          return updated;
        })() : null);
      }
    });
    
    // Listen for transport events
    socketService.on('transport:created', async (transport: any) => {
      console.log('Real-time: Transport created', transport);
      const refreshed = await refreshJourneyFromServer(transport.journeyId);
      if (refreshed) return;

      setJourneys(prev => prev.map(j => {
          if (j.id === transport.journeyId) {
            const updated = { ...j, transports: [...(j.transports || []), transport] } as Journey;
            updated.totalEstimatedCost = updated.totalEstimatedCost ?? calculateJourneyTotalCost(updated);
          return updated;
        }
        return j;
      }));
      if (selectedJourney?.id === transport.journeyId) {
        setSelectedJourney(prev => {
          if (!prev) return null;
          const updated = { ...prev, transports: [...(prev.transports || []), transport] } as Journey;
          updated.totalEstimatedCost = updated.totalEstimatedCost ?? calculateJourneyTotalCost(updated);
          return updated;
        });
      }
      // Notification only for real-time updates from other users
    });
    
    socketService.on('transport:updated', async (transport: any) => {
      console.log('Real-time: Transport updated', transport);
      const refreshed = await refreshJourneyFromServer(transport.journeyId);
      if (refreshed) return;

      setJourneys(prev => prev.map(j => {
          if (j.id === transport.journeyId) {
          const updated = { 
            ...j, 
            transports: (j.transports || []).map(t => t.id === transport.id ? transport : t)
          } as Journey;
          updated.totalEstimatedCost = updated.totalEstimatedCost ?? calculateJourneyTotalCost(updated);
          return updated;
        }
        return j;
      }));
  if (selectedJourney?.id === transport.journeyId) {
        setSelectedJourney(prev => {
          if (!prev) return null;
          const updated = { ...prev, transports: (prev.transports || []).map(t => t.id === transport.id ? transport : t) } as Journey;
          updated.totalEstimatedCost = updated.totalEstimatedCost ?? calculateJourneyTotalCost(updated);
          return updated;
        });
      }
      // Removed duplicate notification - handled by manual actions
    });
    
    socketService.on('transport:deleted', async ({ id, journeyId }: { id: number; journeyId: number }) => {
      console.log('Real-time: Transport deleted', id);
      const refreshed = await refreshJourneyFromServer(journeyId);
      if (refreshed) return;

      setJourneys(prev => prev.map(j => {
          if (j.id === journeyId) {
          const updated = {
            ...j,
            transports: (j.transports || []).filter(t => t.id !== id)
          } as Journey;
          updated.totalEstimatedCost = updated.totalEstimatedCost ?? calculateJourneyTotalCost(updated);
          return updated;
        }
        return j;
      }));
      if (selectedJourney?.id === journeyId) {
        setSelectedJourney(prev => prev ? (() => {
          const updated = { ...prev, transports: (prev.transports || []).filter(t => t.id !== id) } as Journey;
          updated.totalEstimatedCost = updated.totalEstimatedCost ?? calculateJourneyTotalCost(updated);
          return updated;
        })() : null);
      }
      warning('Transport deleted');
    });
    
    // Cleanup on unmount
    return () => {
      socketService.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Load per-journey UI state (collapses) when selected journey changes
  useEffect(() => {
    if (selectedJourney?.id) {
      const s = loadUIStateForJourney(selectedJourney.id);
      if (s) {
        setStopsOpen(typeof s.stopsOpen === 'boolean' ? s.stopsOpen : true);
        setTransportsOpen(typeof s.transportsOpen === 'boolean' ? s.transportsOpen : true);
        setChecklistOpen(typeof s.checklistOpen === 'boolean' ? s.checklistOpen : true);
      } else {
        // defaults
        setStopsOpen(true);
        setTransportsOpen(true);
        setChecklistOpen(true);
      }
    }
  }, [selectedJourney?.id]);

  // Fetch paged stops when search or page changes
  // We no longer recompute totals client-side: the server is authoritative

  const loadJourneys = async (page: number = 1, q: string = '') => {
    try {
      setLoading(true);
      const data = await journeyService.getAllJourneys(page, 25, q);
      setJourneys(data);
    } catch (err) {
      console.error('Failed to load journeys:', err);
      error('Failed to load journeys. Please check if the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateJourney = async () => {
    if (!newJourney.title || !newJourney.startDate || !newJourney.endDate) {
      warning('Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);
      const created = await journeyService.createJourney(newJourney);
      setJourneys([created, ...journeys]);
      setShowNewJourneyForm(false);
      setNewJourney({
        title: '',
        description: '',
        startDate: '',
        endDate: '',
        currency: 'PLN',
        stops: [],
        transports: [],
      });
      success('Journey created successfully!');
    } catch (err) {
      console.error('Failed to create journey:', err);
      error('Failed to create journey');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteJourney = async (id: number) => {
    const confirmed = await confirmHook.confirm({
      title: 'Delete Journey',
      message: 'Are you sure you want to delete this journey? This action cannot be undone.',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      confirmVariant: 'danger',
    });

    if (!confirmed) return;

    try {
      setLoading(true);
      await journeyService.deleteJourney(id);
      setJourneys(journeys.filter(j => j.id !== id));
      if (selectedJourney?.id === id) {
        setSelectedJourney(null);
      }
      success('Journey deleted successfully');
    } catch (err) {
      console.error('Failed to delete journey:', err);
      error('Failed to delete journey');
    } finally {
      setLoading(false);
    }
  };

  const handleEditJourney = async () => {
    if (!editingJourney?.id || !editingJourney.title) {
      warning('Please fill in the journey title');
      return;
    }

    try {
      setLoading(true);
      const updated = await journeyService.updateJourney(editingJourney.id, editingJourney);
      
      setJourneys(journeys.map(j => j.id === updated.id ? updated : j));
      if (selectedJourney?.id === updated.id) {
        setSelectedJourney(updated);
      }
      setShowEditJourneyForm(false);
      setEditingJourney(null);
      success('Journey updated successfully!');
    } catch (err) {
      console.error('Failed to update journey:', err);
      error('Failed to update journey');
    } finally {
      setLoading(false);
    }
  };

  const handleMapClick = (lat: number, lng: number) => {
    setNewStop({ ...newStop, latitude: lat, longitude: lng });
    setShowStopForm(true);
  };

  // Geocoding helper removed - use `geocodeAddress` service for on-demand usage.

  const handleGeocodeAddress = async (street: string | undefined, house: string | undefined, postal: string | undefined, city: string | undefined, country: string | undefined) => {
    const parts = [] as string[];
    if (street) parts.push(street);
    if (house) parts.push(house);
    if (postal) parts.push(postal);
    if (city) parts.push(city);
    if (country) parts.push(country);
    const query = parts.join(', ');
    if (!query) {
      warning('Please fill address fields to geocode');
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`,
        { headers: { 'User-Agent': 'JourneyPlannerApp/1.0' } }
      );
      const data = await response.json();
      if (data && data.length > 0) {
        const { lat, lon } = data[0];
        setNewStop(prev => ({ ...prev, latitude: parseFloat(lat), longitude: parseFloat(lon) }));
        success('Address located on map!');
      } else {
        warning('Address not found. Try more details or try locating by city.');
      }
    } catch (err) {
      console.error('Geocoding by address failed:', err);
      error('Failed to locate address');
    } finally {
      setLoading(false);
    }
  };

  const handleGeocodeAddressEdit = async (street: string | undefined, house: string | undefined, postal: string | undefined, city: string | undefined, country: string | undefined) => {
    const parts = [] as string[];
    if (street) parts.push(street);
    if (house) parts.push(house);
    if (postal) parts.push(postal);
    if (city) parts.push(city);
    if (country) parts.push(country);
    const query = parts.join(', ');
    if (!query) {
      warning('Please fill address fields to geocode');
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`,
        { headers: { 'User-Agent': 'JourneyPlannerApp/1.0' } }
      );
      const data = await response.json();
      if (data && data.length > 0 && editingStop) {
        const { lat, lon } = data[0];
        setEditingStop({ ...editingStop, latitude: parseFloat(lat), longitude: parseFloat(lon) });
        success('Address located on map!');
      } else {
        warning('Address not found. Try more details or try locating by city.');
      }
    } catch (err) {
      console.error('Geocoding by address failed:', err);
      error('Failed to locate address');
    } finally {
      setLoading(false);
    }
  };

  const handleBookingUrlPaste = async () => {
    if (!bookingUrl || !bookingUrl.includes('booking.com')) {
      warning('Please enter a valid Booking.com URL');
      return;
    }

    try {
      setLoading(true);
      const result = await stopService.scrapeBookingUrl(bookingUrl);
      
      if (result.success && result.data) {
        setNewStop({
          ...newStop,
          accommodationName: result.data.accommodationName || newStop.accommodationName,
          accommodationUrl: result.data.accommodationUrl || newStop.accommodationUrl,
          city: result.data.city || newStop.city,
          addressStreet: result.data.addressStreet || result.data.address || newStop.addressStreet,
          addressHouseNumber: result.data.addressHouseNumber || newStop.addressHouseNumber,
          postalCode: result.data.addressPostcode || newStop.postalCode,
          arrivalDate: result.data.arrivalDate || newStop.arrivalDate,
          departureDate: result.data.departureDate || newStop.departureDate,
          accommodationPrice: result.data.accommodationPrice || newStop.accommodationPrice,
          accommodationCurrency: result.data.accommodationCurrency || newStop.accommodationCurrency,
        });
        
        if (result.data.arrivalDate && result.data.departureDate) {
          success('Booking details extracted! Please verify and add price.');
        } else {
          info('Hotel name extracted. Please fill in dates and price manually.');
        }
      } else {
        warning(result.message || 'Could not extract all details. Please fill manually.');
      }
      
      setBookingUrl('');
    } catch (err) {
      console.error('Failed to scrape Booking URL:', err);
      error('Failed to parse Booking.com URL. Please enter details manually.');
    } finally {
      setLoading(false);
    }
  };

  const handleBookingUrlPasteEdit = async () => {
    if (!editBookingUrl || !editBookingUrl.includes('booking.com')) {
      warning('Please enter a valid Booking.com URL');
      return;
    }

    if (!editingStop) return;

    try {
      setLoading(true);
      const result = await stopService.scrapeBookingUrl(editBookingUrl);

      if (result.success && result.data) {
        // Prefer parsed address components returned by server; fall back to raw address and heuristics
        const addressStr: string = result.data.address || '';
        const parsedStreet = result.data.addressStreet || null;
        const parsedHouse = result.data.addressHouseNumber || null;
        const parsedPostcode = result.data.addressPostcode || null;
        let extractedPostal = parsedPostcode || '';
        let extractedHouse = parsedHouse || '';
        if ((!parsedPostcode || !parsedHouse) && addressStr) {
          const postalMatch = addressStr.match(/\b\d{2}-\d{3}\b|\b\d{5}\b/);
          if (postalMatch && !extractedPostal) extractedPostal = postalMatch[0];
          const houseMatch = addressStr.match(/(\d+[A-Za-z0-9]*(?:[\s\/-]\d+)?)?/);
          if (houseMatch && !extractedHouse) extractedHouse = (houseMatch[0] || '').replace(/\s+/g, '/');
        }

        setEditingStop({
          ...editingStop,
          accommodationName: result.data.accommodationName || editingStop.accommodationName,
          accommodationUrl: result.data.accommodationUrl || editingStop.accommodationUrl,
          city: result.data.city || editingStop.city,
          country: result.data.country || editingStop.country,
          addressStreet: parsedStreet || (addressStr ? addressStr : editingStop.addressStreet),
          addressHouseNumber: extractedHouse || editingStop.addressHouseNumber,
          postalCode: extractedPostal || editingStop.postalCode,
          arrivalDate: result.data.arrivalDate || editingStop.arrivalDate,
          departureDate: result.data.departureDate || editingStop.departureDate,
          accommodationPrice: result.data.accommodationPrice ?? editingStop.accommodationPrice,
          accommodationCurrency: result.data.accommodationCurrency || editingStop.accommodationCurrency,
        });

        if (result.data.arrivalDate && result.data.departureDate) {
          success('Booking details extracted! Please verify and save.');
        } else {
          info('Hotel details extracted. Please verify address, dates and price.');
        }
      } else {
        warning(result.message || 'Could not extract all details. Please fill manually.');
      }

      setEditBookingUrl('');
    } catch (err) {
      console.error('Failed to scrape Booking URL (edit):', err);
      error('Failed to parse Booking.com URL. Please enter details manually.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddStop = async () => {
    if (!selectedJourney || !newStop.city || !newStop.country) {
      warning('Please fill in city and country');
      return;
    }

    try {
      setLoading(true);
      
      // Use the new createStop endpoint
      const createdStop = await stopService.createStop(selectedJourney.id!, newStop);
      
      // Update local state
      const updatedJourney = {
        ...selectedJourney,
        stops: [...(selectedJourney.stops || []), createdStop],
      };
      setSelectedJourney(updatedJourney);
      setJourneys(journeys.map(j => j.id === updatedJourney.id ? updatedJourney : j));

      // If there was a recently uploaded attachment, associate it with the newly created stop (if any)
      if (uploadingAttachment && uploadingAttachment.id) {
        try {
          const applied = await attachmentService.applyAttachmentToTarget(uploadingAttachment.id, 'stop', createdStop.id);
          setAttachments(prev => [applied, ...(prev || [])]);
          setUploadingAttachment(null);
          setPendingFile(null);
        } catch (e) {
          console.warn('Failed to associate uploaded attachment with stop', e);
        }
      }
      
      setNewStop({
        city: '',
        country: '',
        latitude: 51.505,
        longitude: -0.09,
        arrivalDate: '',
        departureDate: '',
        accommodationName: '',
        accommodationUrl: '',
        accommodationPrice: 0,
        accommodationCurrency: 'PLN',
      });
      setShowStopForm(false);
      setBookingUrl('');
      success('Stop added successfully!');
    } catch (err) {
      console.error('Failed to add stop:', err);
      error('Failed to add stop');
    } finally {
      setLoading(false);
    }
  };

  // Auto-geocode attraction address
  const handleGeocodeAttraction = async () => {
    const { addressStreet, addressCity, addressPostalCode, addressCountry } = newAttraction;
    
    if (!addressStreet && !addressCity && !addressPostalCode && !addressCountry) {
      warning('Please enter at least some address information');
      return;
    }

    try {
      setGeocodingAttraction(true);
      const result = await geocodeAddress(
        addressStreet,
        addressCity,
        addressPostalCode,
        addressCountry
      );

      if (result) {
        setNewAttraction({
          ...newAttraction,
          latitude: result.latitude,
          longitude: result.longitude,
          address: result.displayName, // Save full formatted address
        });
        success(`Coordinates found: ${result.latitude.toFixed(6)}, ${result.longitude.toFixed(6)}`);
      } else {
        error('Address not found. Please try different address details.');
      }
    } catch (err) {
      console.error('Geocoding error:', err);
      error('Failed to find coordinates');
    } finally {
      setGeocodingAttraction(false);
    }
  };

  const handleAddAttraction = async () => {
    if (!selectedStopForAttraction || !newAttraction.name) {
      warning('Please fill in attraction name');
      return;
    }

    try {
      setLoading(true);
      
      // Auto-geocode if coordinates are missing but address is provided
      let attractionData = { ...newAttraction };
      if (!attractionData.latitude || !attractionData.longitude) {
        const hasAddress = attractionData.addressStreet || attractionData.addressCity || 
                          attractionData.addressPostalCode || attractionData.addressCountry;
        if (hasAddress) {
          try {
            const result = await geocodeAddress(
              attractionData.addressStreet,
              attractionData.addressCity,
              attractionData.addressPostalCode,
              attractionData.addressCountry
            );
            if (result) {
              attractionData = {
                ...attractionData,
                latitude: result.latitude,
                longitude: result.longitude,
                address: result.displayName,
              };
              info('Coordinates found automatically');
            }
          } catch (err) {
            console.warn('Auto-geocoding failed:', err);
            // Continue without coordinates
          }
        }
      }
      
      // Create attraction using the new endpoint
      // Defensive: convert empty string to null for estimatedCost/duration
      const payload = {
        ...attractionData,
        estimatedCost:
          attractionData.estimatedCost === undefined || attractionData.estimatedCost === null
            ? null
            : attractionData.estimatedCost,
        duration:
          attractionData.duration === '' || attractionData.duration === undefined
            ? null
            : attractionData.duration,
      };
      const createdAttraction = await attractionService.createAttraction(
        selectedStopForAttraction!,
        payload
      );
      
      // Reload journey data from server to ensure all fields are up-to-date
      if (selectedJourney) {
        const refreshedJourney = await journeyService.getJourneyById(selectedJourney.id!);
        setSelectedJourney(refreshedJourney);
        setJourneys(journeys.map(j => j.id === refreshedJourney.id ? refreshedJourney : j));
      }
      
      setNewAttraction({
        name: '',
        description: '',
        estimatedCost: 0,
        duration: '',
      });
      setShowAttractionForm(false);
      setSelectedStopForAttraction(null);
      success('Attraction added successfully!');
    } catch (err) {
      console.error('Failed to add attraction:', err);
      error('Failed to add attraction');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteStop = async (stopId: number) => {
    if (!selectedJourney) return;

    const confirmed = await confirmHook.confirm({
      title: 'Delete Stop',
      message: 'Are you sure you want to delete this stop? All attractions at this stop will also be deleted.',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      confirmVariant: 'danger',
    });

    if (!confirmed) return;

    try {
      setLoading(true);
      await stopService.deleteStop(stopId);
      
      const updatedStops = selectedJourney.stops?.filter(s => s.id !== stopId);
      const updatedJourney = { ...selectedJourney, stops: updatedStops };
      
      setSelectedJourney(updatedJourney);
      setJourneys(journeys.map(j => j.id === updatedJourney.id ? updatedJourney : j));
      success('Stop deleted successfully!');
    } catch (err) {
      console.error('Failed to delete stop:', err);
      error('Failed to delete stop');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAttraction = async (stopId: number, attractionId: number) => {
    if (!selectedJourney) return;

    const confirmed = await confirmHook.confirm({
      title: 'Delete Attraction',
      message: 'Are you sure you want to delete this attraction?',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      confirmVariant: 'danger',
    });

    if (!confirmed) return;

    try {
      setLoading(true);
      await attractionService.deleteAttraction(attractionId);
      
      const updatedStops = selectedJourney.stops?.map(stop => {
        if (stop.id === stopId) {
          return {
            ...stop,
            attractions: stop.attractions?.filter(a => a.id !== attractionId),
          };
        }
        return stop;
      });
      
      const updatedJourney = { ...selectedJourney, stops: updatedStops };
      setSelectedJourney(updatedJourney);
      setJourneys(journeys.map(j => j.id === updatedJourney.id ? updatedJourney : j));
      success('Attraction deleted successfully!');
    } catch (err) {
      console.error('Failed to delete attraction:', err);
      error('Failed to delete attraction');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTransport = async (transportId: number) => {
    if (!selectedJourney) return;

    const confirmed = await confirmHook.confirm({
      title: 'Delete Transport',
      message: 'Are you sure you want to delete this transport?',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      confirmVariant: 'danger',
    });

    if (!confirmed) return;

    try {
      setLoading(true);
      await transportService.deleteTransport(transportId);
      
      const updatedTransports = selectedJourney.transports?.filter(t => t.id !== transportId);
      const updatedJourney = { ...selectedJourney, transports: updatedTransports };
      
      setSelectedJourney(updatedJourney);
      setJourneys(journeys.map(j => j.id === updatedJourney.id ? updatedJourney : j));
      success('Transport deleted successfully!');
    } catch (err) {
      console.error('Failed to delete transport:', err);
      error('Failed to delete transport');
    } finally {
      setLoading(false);
    }
  };

  const handleEditStop = async () => {
    if (!editingStop?.id || !selectedJourney) return;

    try {
      setLoading(true);
      const updated = await stopService.updateStop(editingStop.id, editingStop);
      
      const updatedStops = selectedJourney.stops?.map(s => s.id === updated.id ? updated : s);
      const updatedJourney = { ...selectedJourney, stops: updatedStops };
      
      setSelectedJourney(updatedJourney);
      setJourneys(journeys.map(j => j.id === updatedJourney.id ? updatedJourney : j));
      
      success('Stop updated successfully!');
      
      // Wait 1 second for socket event to update the form, then close
      setTimeout(() => {
        setShowEditStopForm(false);
        setEditingStop(null);
      }, 1000);
    } catch (err) {
      console.error('Failed to update stop:', err);
      error('Failed to update stop');
    } finally {
      setLoading(false);
    }
  };

  // Auto-geocode edited attraction address
  const handleGeocodeEditAttraction = async () => {
    if (!editingAttraction) return;
    
    const { addressStreet, addressCity, addressPostalCode, addressCountry } = editingAttraction;
    
    if (!addressStreet && !addressCity && !addressPostalCode && !addressCountry) {
      warning('Please enter at least some address information');
      return;
    }

    try {
      setGeocodingEditAttraction(true);
      const result = await geocodeAddress(
        addressStreet,
        addressCity,
        addressPostalCode,
        addressCountry
      );

      if (result) {
        setEditingAttraction({
          ...editingAttraction,
          latitude: result.latitude,
          longitude: result.longitude,
          address: result.displayName,
        });
        success(`Coordinates found: ${result.latitude.toFixed(6)}, ${result.longitude.toFixed(6)}`);
      } else {
        error('Address not found. Please try different address details.');
      }
    } catch (err) {
      console.error('Geocoding error:', err);
      error('Failed to find coordinates');
    } finally {
      setGeocodingEditAttraction(false);
    }
  };

  const handleEditAttraction = async () => {
    if (!editingAttraction?.id || !editingAttractionStopId || !selectedJourney) return;

    try {
      setLoading(true);
      
      // Auto-geocode if coordinates are missing but address is provided
      let attractionData = { ...editingAttraction };
      if (!attractionData.latitude || !attractionData.longitude) {
        const hasAddress = attractionData.addressStreet || attractionData.addressCity || 
                          attractionData.addressPostalCode || attractionData.addressCountry;
        if (hasAddress) {
          try {
            const result = await geocodeAddress(
              attractionData.addressStreet,
              attractionData.addressCity,
              attractionData.addressPostalCode,
              attractionData.addressCountry
            );
            if (result) {
              attractionData = {
                ...attractionData,
                latitude: result.latitude,
                longitude: result.longitude,
                address: result.displayName,
              };
              info('Coordinates found automatically');
            }
          } catch (err) {
            console.warn('Auto-geocoding failed:', err);
            // Continue without coordinates
          }
        }
      }
      
      const updated = await attractionService.updateAttraction(attractionData.id!, attractionData);
      
      // Reload journey data from server to ensure all fields are up-to-date
      const refreshedJourney = await journeyService.getJourneyById(selectedJourney.id!);
      setSelectedJourney(refreshedJourney);
      setJourneys(journeys.map(j => j.id === refreshedJourney.id ? refreshedJourney : j));
      
      setShowEditAttractionForm(false);
      setEditingAttraction(null);
      setEditingAttractionStopId(null);
      success('Attraction updated successfully!');
    } catch (err) {
      console.error('Failed to update attraction:', err);
      error('Failed to update attraction');
    } finally {
      setLoading(false);
    }
  };

  const handleEditTransport = async () => {
    if (!editingTransport?.id || !selectedJourney) return;

    try {
      setLoading(true);
      const updated = await transportService.updateTransport(editingTransport.id, editingTransport);
      
      const updatedTransports = selectedJourney.transports?.map(t => t.id === updated.id ? updated : t);
      const updatedJourney = { ...selectedJourney, transports: updatedTransports };
      
      setSelectedJourney(updatedJourney);
      setJourneys(journeys.map(j => j.id === updatedJourney.id ? updatedJourney : j));
      setShowEditTransportForm(false);
      setEditingTransport(null);
      success('Transport updated successfully!');
    } catch (err) {
      console.error('Failed to update transport:', err);
      error('Failed to update transport');
    } finally {
      setLoading(false);
    }
  };

  const handleAddTransport = async () => {
    if (!selectedJourney || !newTransport.fromLocation || !newTransport.toLocation) {
      warning('Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);
      // Use transportService instead of updating journey directly
      const createdTransport = await transportService.createTransport(selectedJourney.id!, newTransport);
      
      // Update local state
      const updatedJourney = {
        ...selectedJourney,
        transports: [...(selectedJourney.transports || []), createdTransport],
      };
      setSelectedJourney(updatedJourney);
      setJourneys(journeys.map(j => j.id === updatedJourney.id ? updatedJourney : j));
      
      setNewTransport({
        type: 'flight',
        fromLocation: '',
        toLocation: '',
        departureDate: '',
        arrivalDate: '',
        price: 0,
        currency: 'PLN',
        bookingUrl: '',
        flightNumber: '',
        trainNumber: '',
      });
      setShowTransportForm(false);
      // If an attachment was uploaded before creating transport, associate it now
      if (uploadingAttachment && uploadingAttachment.id) {
        try {
          const applied = await attachmentService.applyAttachmentToTarget(uploadingAttachment.id, 'transport', createdTransport.id);
          setAttachments(prev => [applied, ...(prev || [])]);
          setUploadingAttachment(null);
          setPendingFile(null);
        } catch (e) {
          console.warn('Failed to associate uploaded attachment with transport', e);
        }
      }
      success('Transport added successfully!');
    } catch (err) {
      console.error('Failed to add transport:', err);
      error('Failed to add transport');
    } finally {
      setLoading(false);
    }
  };

  // Payment status handlers
  const handleToggleStopPayment = async (stopId: number, currentStatus: boolean) => {
    if (!selectedJourney) return;
    
    try {
      await stopService.updatePaymentStatus(stopId, !currentStatus);
      
      // Update local state
      const updatedJourney = {
        ...selectedJourney,
        stops: selectedJourney.stops?.map(s => 
          s.id === stopId ? { ...s, isPaid: !currentStatus } : s
        ),
      };
      setSelectedJourney(updatedJourney);
      setJourneys(journeys.map(j => j.id === updatedJourney.id ? updatedJourney : j));
      
      success(`Payment status updated`);
    } catch (err) {
      console.error('Failed to update payment status:', err);
      error('Failed to update payment status');
    }
  };

  const handleToggleTransportPayment = async (transportId: number, currentStatus: boolean) => {
    if (!selectedJourney) return;
    
    try {
      await transportService.updatePaymentStatus(transportId, !currentStatus);
      
      // Update local state
      const updatedJourney = {
        ...selectedJourney,
        transports: selectedJourney.transports?.map(t => 
          t.id === transportId ? { ...t, isPaid: !currentStatus } : t
        ),
      };
      setSelectedJourney(updatedJourney);
      setJourneys(journeys.map(j => j.id === updatedJourney.id ? updatedJourney : j));
      
      success(`Payment status updated`);
    } catch (err) {
      console.error('Failed to update payment status:', err);
      error('Failed to update payment status');
    }
  };

  const handleToggleAttractionPayment = async (stopId: number, attractionId: number, currentStatus: boolean) => {
    if (!selectedJourney) return;
    
    try {
  // Defensive: only send isPaid, not other fields
  await attractionService.updatePaymentStatus(attractionId, !currentStatus);
      
      // Update local state
      const updatedJourney = {
        ...selectedJourney,
        stops: selectedJourney.stops?.map(s => 
          s.id === stopId ? {
            ...s,
            attractions: s.attractions?.map(a =>
              a.id === attractionId ? { ...a, isPaid: !currentStatus } : a
            )
          } : s
        ),
      };
      setSelectedJourney(updatedJourney);
      setJourneys(journeys.map(j => j.id === updatedJourney.id ? updatedJourney : j));
      
      success(`Payment status updated`);
    } catch (err) {
      console.error('Failed to update payment status:', err);
      error('Failed to update payment status');
    }
  };

  const getTransportIcon = (type: string) => {
    switch (type) {
      case 'flight':
        return <Plane className="w-4 h-4" />;
      case 'train':
        return <Train className="w-4 h-4" />;
      case 'bus':
        return <Bus className="w-4 h-4" />;
      case 'car':
        return <Car className="w-4 h-4" />;
      default:
        return <MapPin className="w-4 h-4" />;
    }
  };

  // Calculate total estimated cost dynamically from stops, transports, and attractions
  const calculateJourneyTotalCost = (journey: Journey): number => {
    // Always compute totals from item-level prices on the client to ensure
    // consistency between the journey list and the selected journey details.
    // Fallback: compute locally while converting per-item currencies to journey.currency when possible
    const mainCurr = journey.currency || 'PLN';
    const stopsCost = journey.stops?.reduce((sum, stop) => {
      const price = (stop as any).accommodationPrice ?? (stop as any).accommodation_price ?? 0;
      const from = (stop as any).accommodationCurrency || (stop as any).accommodation_currency || mainCurr;
      const stored = getStoredConverted(stop, 'accommodation_price_converted', 'accommodation_price_converted_currency');
      if (stored) {
        // stored value should already be in journey currency or include currency metadata
        if (stored.currency === mainCurr) return sum + stored.value;
        const convStored = convertAmount(stored.value, stored.currency, mainCurr);
        return sum + (convStored ?? stored.value);
      }
      const conv = convertAmount(price || 0, from, mainCurr);
      return sum + (conv ?? price ?? 0);
    }, 0) || 0;

    const attractionsCost = journey.stops?.reduce((sum, stop) => {
      const attrSum = (stop.attractions || []).reduce((s, a) => {
        const price = (a as any).estimatedCost ?? (a as any).estimated_cost ?? 0;
        const from = (a as any).currency || (a as any).curr || mainCurr;
        const stored = getStoredConverted(a, 'estimated_cost_converted', 'estimated_cost_converted_currency');
        if (stored) {
          if (stored.currency === mainCurr) return s + stored.value;
          const convStored = convertAmount(stored.value, stored.currency, mainCurr);
          return s + (convStored ?? stored.value);
        }
        const conv = convertAmount(price || 0, from, mainCurr);
        return s + (conv ?? price ?? 0);
      }, 0);
      return sum + attrSum;
    }, 0) || 0;

    const transportsCost = journey.transports?.reduce((sum, t) => {
      const price = (t as any).price ?? 0;
      const from = (t as any).currency || mainCurr;
      const stored = getStoredConverted(t, 'price_converted', 'price_converted_currency');
      if (stored) {
        if (stored.currency === mainCurr) return sum + stored.value;
        const convStored = convertAmount(stored.value, stored.currency, mainCurr);
        return sum + (convStored ?? stored.value);
      }
      const conv = convertAmount(price || 0, from, mainCurr);
      return sum + (conv ?? price ?? 0);
    }, 0) || 0;

    return stopsCost + attractionsCost + transportsCost;
  };

  // Calculate journey total converted to a provided base currency (used by the "No Journey Selected" summary)
  const calculateJourneyTotalInBase = (journey: Journey, base: string): number => {
    const mainCurr = journey.currency || base;
    let total = 0;

    (journey.stops || []).forEach(s => {
      const price = (s as any).accommodationPrice ?? (s as any).accommodation_price ?? 0;
      const from = (s as any).accommodationCurrency || (s as any).accommodation_currency || mainCurr;
      const stored = getStoredConverted(s, 'accommodation_price_converted', 'accommodation_price_converted_currency');
      if (stored) {
        const convStoredToBase = convertAmount(stored.value, stored.currency, base);
        total += convStoredToBase ?? stored.value;
      } else {
        const conv = convertAmount(price || 0, from, base);
        const eff = conv ?? price ?? 0;
        total += eff;
      }

      (s.attractions || []).forEach(a => {
        const aprice = (a as any).estimatedCost ?? (a as any).estimated_cost ?? 0;
        const afrom = (a as any).currency || mainCurr;
        const storedA = getStoredConverted(a, 'estimated_cost_converted', 'estimated_cost_converted_currency');
        if (storedA) {
          const aconvStored = convertAmount(storedA.value, storedA.currency, base);
          total += aconvStored ?? storedA.value;
        } else {
          const aconv = convertAmount(aprice || 0, afrom, base);
          const ae = aconv ?? aprice ?? 0;
          total += ae;
        }
      });
    });

    (journey.transports || []).forEach(t => {
      const tprice = (t as any).price ?? 0;
      const tfrom = (t as any).currency || mainCurr;
      const storedT = getStoredConverted(t, 'price_converted', 'price_converted_currency');
      if (storedT) {
        const tconvStored = convertAmount(storedT.value, storedT.currency, base);
        total += tconvStored ?? storedT.value;
      } else {
        const tconv = convertAmount(tprice || 0, tfrom, base);
        const te = tconv ?? tprice ?? 0;
        total += te;
      }
    });

    return total;
  };

  // Share journey handler
  const handleShareJourney = async () => {
    if (!selectedJourney || !shareEmailOrUsername.trim()) {
      warning('Please enter email or username');
      return;
    }

    try {
      setLoading(true);
      await journeyShareService.shareJourney(selectedJourney.id!, shareEmailOrUsername, shareRole);
      success(`Journey shared with ${shareEmailOrUsername}!`);
      setShowShareModal(false);
      setShareEmailOrUsername('');
      setShareRole('edit');
    } catch (err: any) {
      console.error('Failed to share journey:', err);
      error(err.message || 'Failed to share journey');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#1c1c1e] font-github transition-colors duration-200">
      {/* Header with Burger Menu */}
      <header className="bg-white dark:bg-[#2c2c2e] border-b border-gray-200 dark:border-[#38383a] sticky top-0 z-50 transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex justify-between items-center">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="lg:hidden p-2 hover:bg-gray-100 dark:hover:bg-[#38383a] rounded-lg transition-colors"
                aria-label="Toggle menu"
              >
                {isMobileMenuOpen ? (
                  <X className="w-6 h-6 text-gray-900 dark:text-[#ffffff]" />
                ) : (
                  <Menu className="w-6 h-6 text-gray-900 dark:text-[#ffffff]" />
                )}
              </button>
              {/* Modals moved outside the mobile menu button to avoid nested buttons */}
                  <h1 className="text-xl font-semibold text-black dark:text-white">
                🗺️ Journey Planner
              </h1>
            </div>

            {/* Desktop Actions */}
            <div className="hidden lg:flex items-center gap-3">
              {/* User Info */}
              {user && (
                <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-[#38383a] rounded-lg border border-gray-200 dark:border-[#38383a]">
                  <User className="w-4 h-4 text-gray-600 dark:text-[#98989d]" />
                  <span className="text-sm text-black dark:text-white font-medium">{user.username}</span>
                  {user.role === 'admin' && (
                    <span className="text-xs px-2 py-0.5 bg-blue-500 dark:bg-[#0a84ff] text-white rounded-full font-medium">
                      Admin
                    </span>
                  )}
                </div>
              )}
              
              {/* Settings Button */}
              <Link
                to="/settings"
                className="px-4 py-2 bg-gray-200 dark:bg-[#38383a] hover:bg-gray-300 dark:hover:bg-[#1c1c1e] border border-gray-300 dark:border-[#38383a] text-black dark:text-white rounded-lg transition-colors flex items-center gap-2"
              >
                <Settings className="w-5 h-5" />
                Settings
              </Link>
              
              {/* New Journey Button */}
              <button
                onClick={() => setShowNewJourneyForm(true)}
                className="gh-btn-primary"
                disabled={loading}
              >
                <Plus className="w-5 h-5" />
                New Journey
              </button>
              
              {/* Logout Button */}
              <button
                onClick={async () => {
                  const confirmed = await confirmHook.confirm({
                    title: 'Logout',
                    message: 'Are you sure you want to logout?',
                    confirmText: 'Logout',
                    cancelText: 'Cancel',
                    confirmVariant: 'danger',
                  });
                  if (confirmed) {
                    logout();
                  }
                }}
                className="gh-btn-danger"
                title="Logout"
              >
                <LogOut className="w-5 h-5" />
                Logout
              </button>
            </div>

            {/* Mobile New Journey Button */}
            <button
              onClick={() => setShowNewJourneyForm(true)}
              className="lg:hidden p-2 hover:bg-gray-100 dark:hover:bg-[#2c2c2e] rounded-lg transition-colors"
              disabled={loading}
            >
              <Plus className="w-6 h-6 text-blue-600 dark:text-[#0a84ff]" />
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="lg:hidden border-t border-gray-200 dark:border-[#38383a] bg-white dark:bg-[#2c2c2e]">
            <div className="px-4 py-3 space-y-2">
              {/* User Info */}
              {user && (
                <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-[#1c1c1e] rounded-lg border border-gray-200 dark:border-[#38383a] mb-3">
                  <User className="w-4 h-4 text-gray-600 dark:text-[#98989d]" />
                  <span className="text-sm text-gray-900 dark:text-[#ffffff] font-medium">{user.username}</span>
                  {user.role === 'admin' && (
                    <span className="text-xs px-2 py-0.5 bg-blue-600 text-white rounded-full font-medium">
                      Admin
                    </span>
                  )}
                </div>
              )}
              
              {/* Settings Link */}
              <Link
                to="/settings"
                onClick={() => setIsMobileMenuOpen(false)}
                className="w-full gh-btn-secondary justify-center"
              >
                <Settings className="w-5 h-5" />
                Settings
              </Link>
              
              {/* New Journey Button */}
              <button
                onClick={() => {
                  setShowNewJourneyForm(true);
                  setIsMobileMenuOpen(false);
                }}
                className="w-full gh-btn-primary justify-center"
                disabled={loading}
              >
                <Plus className="w-5 h-5" />
                New Journey
              </button>
              
              {/* Logout Button */}
              <button
                onClick={async () => {
                  const confirmed = await confirmHook.confirm({
                    title: 'Logout',
                    message: 'Are you sure you want to logout?',
                    confirmText: 'Logout',
                    cancelText: 'Cancel',
                    confirmVariant: 'danger',
                  });
                  if (confirmed) {
                    logout();
                    setIsMobileMenuOpen(false);
                  }
                }}
                className="w-full gh-btn-danger justify-center"
              >
                <LogOut className="w-5 h-5" />
                Logout
              </button>
            </div>
          </div>
        )}
      </header>


      {/* Preview modal always rendered at the top, above all other modals/forms */}
      {previewOpen && (
        <div className="gh-modal-overlay z-50" style={{ zIndex: 9999 }} onClick={() => setPreviewOpen(false)}>
          <div className="gh-modal max-w-4xl" onClick={(e) => e.stopPropagation()}>
            <div className="p-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-black dark:text-white">Preview: {previewTitle}</h2>
                <button onClick={() => setPreviewOpen(false)} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-[#2b2b2d]"><X className="w-4 h-4 text-black dark:text-white" /></button>
              </div>
              <div className="mt-4">
                {previewUrl ? (
                  <iframe src={previewUrl} title={previewTitle || 'Preview'} width="100%" height="600px" />
                ) : previewHtml ? (
                  <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
                ) : (
                  <div className="text-sm text-gray-500">No preview available</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {extractModalOpen && (
        <div className="gh-modal-overlay" onClick={() => setExtractModalOpen(false)}>
          <div className="gh-modal max-w-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">Extracted data</h2>
                <button onClick={() => setExtractModalOpen(false)} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-[#2b2b2d]"><X className="w-4 h-4 text-black dark:text-white" /></button>
              </div>

              <div className="mt-4 space-y-3">
                {!extractResult && (
                  <div className="text-sm text-gray-500">No data found in attachment.</div>
                )}

                {/* Build a normalized list of suggested fields to verify */}
                {extractResult ? (() => {
                  const fields: Array<{ key: string; label: string; value: any }> = [];
                  const p: any = extractResult;
                  if (p.flightNumber) fields.push({ key: 'flightNumber', label: 'Flight number', value: p.flightNumber });
                  if (p.trainNumber) fields.push({ key: 'trainNumber', label: 'Train number', value: p.trainNumber });
                  if (p.price) fields.push({ key: 'price', label: 'Price', value: p.price });
                  if (p.accommodationName || p.hotelName) fields.push({ key: 'accommodationName', label: 'Accommodation', value: p.accommodationName || p.hotelName });
                  if (p.city) fields.push({ key: 'city', label: 'City', value: p.city });
                  if (p.country) fields.push({ key: 'country', label: 'Country', value: p.country });
                  if (p.address || p.addressStreet) fields.push({ key: 'address', label: 'Address', value: p.address || p.addressStreet });
                  if (p.addressHouseNumber) fields.push({ key: 'addressHouseNumber', label: 'House / Number', value: p.addressHouseNumber });
                  if (p.postalCode || p.addressPostcode) fields.push({ key: 'postalCode', label: 'Postal code', value: p.postalCode || p.addressPostcode });
                  if (p.arrivalDate) fields.push({ key: 'arrivalDate', label: 'Arrival date', value: p.arrivalDate });
                  if (p.departureDate) fields.push({ key: 'departureDate', label: 'Departure date', value: p.departureDate });
                  if (p.from) fields.push({ key: 'from', label: 'From', value: p.from });
                  if (p.to) fields.push({ key: 'to', label: 'To', value: p.to });

                  if (!fields.length) return <div className="text-sm text-gray-500">No extractable fields detected.</div>;

                  return fields.map(f => (
                    <div key={f.key} className="bg-white dark:bg-[#151517] rounded-lg p-3 border border-gray-200 dark:border-[#2b2b2d] flex items-center justify-between">
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-black dark:text-white truncate">{f.label}</div>
                        <div className="text-xs text-gray-600 dark:text-white/60 truncate">{typeof f.value === 'object' ? JSON.stringify(f.value) : String(f.value)}</div>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <button
                          title="Apply"
                          onClick={() => {
                            try {
                              const key = f.key;
                              // Apply to editing/new stop when relevant
                              if (editingStop) {
                                setEditingStop(prev => prev ? ({
                                  ...prev,
                                  accommodationName: key === 'accommodationName' ? f.value : prev.accommodationName,
                                  city: key === 'city' ? f.value : prev.city,
                                  country: key === 'country' ? f.value : prev.country,
                                  addressStreet: key === 'address' ? f.value : prev.addressStreet,
                                  addressHouseNumber: key === 'addressHouseNumber' ? f.value : prev.addressHouseNumber,
                                  postalCode: key === 'postalCode' ? f.value : prev.postalCode,
                                  arrivalDate: key === 'arrivalDate' ? f.value : prev.arrivalDate,
                                  departureDate: key === 'departureDate' ? f.value : prev.departureDate,
                                  accommodationPrice: key === 'price' && typeof f.value === 'object' && f.value.amount ? f.value.amount : prev.accommodationPrice,
                                  accommodationCurrency: key === 'price' && typeof f.value === 'object' && f.value.currency ? f.value.currency : prev.accommodationCurrency,
                                }) : prev);
                                success('Applied to editing stop. Please verify.');
                              }
                              if (editingTransport) {
                                setEditingTransport(prev => prev ? ({
                                  ...prev,
                                  flightNumber: key === 'flightNumber' ? f.value : prev.flightNumber,
                                  trainNumber: key === 'trainNumber' ? f.value : prev.trainNumber,
                                  price: key === 'price' && typeof f.value === 'object' && f.value.amount ? f.value.amount : prev.price,
                                  currency: key === 'price' && typeof f.value === 'object' && f.value.currency ? f.value.currency : prev.currency,
                                  fromLocation: key === 'from' ? f.value : prev.fromLocation,
                                  toLocation: key === 'to' ? f.value : prev.toLocation,
                                  departureDate: key === 'departureDate' ? f.value : prev.departureDate,
                                  arrivalDate: key === 'arrivalDate' ? f.value : prev.arrivalDate,
                                }) : prev);
                                success('Applied to editing transport. Please verify.');
                              }
                              // Also apply to new items if present
                              if (!editingStop && !editingTransport) {
                                // If user is creating a new transport and newTransport exists
                                try { setNewTransport(prev => ({ ...prev, ...(f.key === 'flightNumber' ? { flightNumber: f.value } : {}), ...(f.key === 'price' && typeof f.value === 'object' ? { price: f.value.amount, currency: f.value.currency } : {}) })); } catch (e) {}
                                try { setNewStop(prev => ({ ...prev, ...(f.key === 'accommodationName' ? { accommodationName: f.value } : {}), ...(f.key === 'city' ? { city: f.value } : {}) })); } catch (e) {}
                                success('Applied to new item (if present). Please verify.');
                              }
                            } catch (e) {
                              console.error(e);
                              error('Failed to apply field');
                            }
                          }}
                          className="p-2 rounded-md bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900 dark:text-green-200 dark:hover:bg-green-800 transition-colors"
                        >
                          <CheckCircle2 className="w-5 h-5" />
                        </button>

                        <button
                          title="Reject"
                          onClick={() => {
                            // Remove this field from extractResult so user can dismiss it
                            try {
                              const copy = { ...extractResult };
                              delete copy[f.key];
                              setExtractResult(copy);
                              success('Suggestion dismissed');
                            } catch (e) {
                              console.error(e);
                              error('Failed to dismiss');
                            }
                          }}
                          className="p-2 rounded-md bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900 dark:text-red-200 dark:hover:bg-red-800 transition-colors"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  ));
                })() : null}
              </div>

              <div className="flex justify-end mt-6">
                <button onClick={() => setExtractModalOpen(false)} className="gh-btn-secondary">Close</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Import map modal (placed here so it sits alongside other modals) */}
      <ImportMapModal
        isOpen={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        onImportComplete={handleImportComplete}
        selectedJourneyId={selectedJourney?.id ?? null}
        existingStops={selectedJourney?.stops || []}
      />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Journey List - Sidebar */}
          <div className="lg:col-span-1">
            <div className="gh-card">
              <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-[#ffffff]">Your Journeys</h2>
              <div className="flex items-center gap-2 mb-4">
                <input placeholder="Search journeys..." value={journeySearch} onChange={e => setJourneySearch(e.target.value)} className="gh-input flex-1 text-sm" />
                <button onClick={() => { setJourneyPage(1); void loadJourneys(1, journeySearch); }} className="gh-btn-secondary text-sm">Search</button>
              </div>
              <div className="space-y-3 max-h-[calc(100vh-250px)] overflow-y-auto pr-2">
                {loading && journeys.length === 0 ? (
                  <p className="text-sm text-gray-600 dark:text-[#98989d] text-center py-8">
                    Loading journeys...
                  </p>
                ) : journeys.length === 0 ? (
                  <p className="text-sm text-gray-600 dark:text-[#98989d] text-center py-8">
                    No journeys yet. Create your first journey!
                  </p>
                ) : (
                  journeys.map((journey) => (
                    <div
                      key={journey.id}
                      className={`p-4 rounded-lg border transition-all ${
                        selectedJourney?.id === journey.id
                          ? 'bg-gray-100 dark:bg-[#3f3f44] border-gray-300 dark:border-[#48484a]'
                          : 'bg-gray-50 dark:bg-[#1c1c1e] border-gray-200 dark:border-[#38383a] hover:border-gray-300 dark:hover:border-[#48484a]'
                      }`}
                    >
                      <div
                        onClick={() => {
                          // Always refresh the journey from server when selecting — server is authoritative for converted fields
                          void (async () => {
                            try {
                              await refreshJourneyFromServer(journey.id!, true);
                            } catch (e) {
                              // fallback to local object if refresh fails
                              setSelectedJourney(journey);
                            }
                          })();
                        }}
                        className="cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-gray-900 dark:text-[#ffffff]">{journey.title}</h3>
                          {journey.isShared && (
                            <div title="Shared journey">
                              <Users className="w-4 h-4 text-blue-600 dark:text-[#0a84ff]" />
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-2 text-sm text-gray-600 dark:text-[#98989d]">
                          <Calendar className="w-4 h-4" />
                          <span>
                            {formatDateForDisplay(journey.startDate)} -{' '}
                            {formatDateForDisplay(journey.endDate)}
                          </span>
                        </div>
                      </div>
                      
                      {/* Estimated Cost - Always visible and dynamically calculated */}
                      <div className="mt-3 pt-3 border-t border-gray-200 dark:border-[#38383a]">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-sm font-medium text-green-600 dark:text-[#30d158]">
                            <DollarSign className="w-4 h-4" />
                            <span>Estimated Cost:</span>
                          </div>
                          <span className="text-sm font-semibold text-green-600 dark:text-[#30d158]">
                            {/* Use same calculation as the global "No Journey Selected" summary (PLN base) */}
                              {journey.totalEstimatedCost != null
                                ? `${journey.totalEstimatedCost.toFixed(2)} ${journey.currency || 'PLN'}`
                                : `${calculateJourneyTotalInBase(journey, 'PLN').toFixed(2)} PLN`}
                          </span>
                        </div>
                        
                        {/* Amount Due - Cost remaining after paid items (converted to journey currency when possible) */}
                          {(() => {
                          const mainCurr = journey.currency || 'PLN';
                          // compute total in the journey's currency (server-provided preferred)
                          const total = journey.totalEstimatedCost != null
                            ? journey.totalEstimatedCost
                            : calculateJourneyTotalInBase(journey, mainCurr);
                          let paid = 0;

                          // compute paid amount (prefer server-persisted converted per-item values)
                          (journey.stops || []).forEach(s => {
                            const storedStop = getStoredConverted(s, 'accommodation_price_converted', 'accommodation_price_converted_currency');
                            if (storedStop) {
                              const effective = storedStop.currency === mainCurr ? storedStop.value : (convertAmount(storedStop.value, storedStop.currency, mainCurr) ?? storedStop.value);
                              if (s.isPaid) paid += effective;
                            } else {
                              const price = (s as any).accommodationPrice ?? (s as any).accommodation_price ?? 0;
                              const from = (s as any).accommodationCurrency || (s as any).accommodation_currency || mainCurr;
                              const conv = convertAmount(price || 0, from, mainCurr);
                              const effective = conv ?? price ?? 0;
                              if (s.isPaid) paid += effective;
                            }

                            (s.attractions || []).forEach(a => {
                              const storedA = getStoredConverted(a, 'estimated_cost_converted', 'estimated_cost_converted_currency');
                              if (storedA) {
                                const ae = storedA.currency === mainCurr ? storedA.value : (convertAmount(storedA.value, storedA.currency, mainCurr) ?? storedA.value);
                                if (a.isPaid) paid += ae;
                              } else {
                                const aprice = (a as any).estimatedCost ?? (a as any).estimated_cost ?? 0;
                                const afrom = (a as any).currency || mainCurr;
                                const aconv = convertAmount(aprice || 0, afrom, mainCurr);
                                const ae = aconv ?? aprice ?? 0;
                                if (a.isPaid) paid += ae;
                              }
                            });
                          });

                          (journey.transports || []).forEach(t => {
                            const storedT = getStoredConverted(t, 'price_converted', 'price_converted_currency');
                            if (storedT) {
                              const te = storedT.currency === mainCurr ? storedT.value : (convertAmount(storedT.value, storedT.currency, mainCurr) ?? storedT.value);
                              if (t.isPaid) paid += te;
                            } else {
                              const tprice = (t as any).price ?? 0;
                              const tfrom = (t as any).currency || mainCurr;
                              const tconv = convertAmount(tprice || 0, tfrom, mainCurr);
                              const te = tconv ?? tprice ?? 0;
                              if (t.isPaid) paid += te;
                            }
                          });

                          const amountDue = Math.max(0, total - paid);
                          const percentPaid = total > 0 ? Math.round((paid / total) * 100) : 0;
                          // Use small epsilon for floating point comparison
                          const isFullyPaid = amountDue < 0.01;

                          return !isFullyPaid ? (
                            <div className="flex items-center justify-between mt-2">
                              <div className="flex items-center gap-2 text-sm font-medium text-red-600 dark:text-[#ff453a]">
                                <XCircle className="w-4 h-4 text-black dark:text-white" />
                                <span>Amount Due:</span>
                              </div>
                              <span className="text-sm font-semibold text-red-600 dark:text-[#ff453a]">
                                {amountDue.toFixed(2)} {mainCurr}
                              </span>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between mt-2">
                              <div className="flex items-center gap-2 text-sm font-medium text-green-600 dark:text-[#30d158]">
                                <CheckCircle2 className="w-4 h-4" />
                                <span>Fully Paid</span>
                              </div>
                              <span className="text-sm font-semibold text-green-600 dark:text-[#30d158]">
                                {percentPaid}%
                              </span>
                            </div>
                          );
                        })()}
                      </div>

                      {selectedJourney?.id === journey.id && (
                        <div className="space-y-2 mt-3 pt-3 border-t border-gray-200 dark:border-[#38383a]">
                          {/* Share Journey Button - Only for journey owner */}
                          <div className="flex gap-2">
                            {!journey.isShared && (
                              <button
                                onClick={() => setShowShareModal(true)}
                                className="flex-1 px-3 py-1.5 text-sm bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                                disabled={loading}
                              >
                                <Share2 className="w-4 h-4" />
                                Share Journey
                              </button>
                            )}

                            {selectedJourney?.createdBy === user?.id && (
                              <button
                                onClick={() => setShowManageSharesModal(true)}
                                className="flex-1 px-3 py-1.5 text-sm bg-violet-600 text-white rounded-lg transition-colors flex items-center justify-center gap-2 hover:bg-violet-700 focus:outline-none focus:ring-2 focus:ring-violet-500"
                              >
                                <Users className="w-4 h-4" />
                                Manage Shares
                              </button>
                            )}
                          </div>

                          <div className="flex gap-2 mt-2">
                            <button
                              onClick={() => {
                                setEditingJourney(journey);
                                setShowEditJourneyForm(true);
                              }}
                              className="flex-1 px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                              disabled={loading}
                            >
                              <Edit2 className="w-4 h-4" />
                              Edit Journey
                            </button>
                            <button
                              onClick={() => handleDeleteJourney(journey.id!)}
                              className="flex-1 px-3 py-1.5 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                              disabled={loading}
                            >
                              <Trash2 className="w-4 h-4" />
                              Delete Journey
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Map and Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Map */}
            <div className="gh-card p-0 overflow-hidden" style={{ height: '500px' }}>
              <JourneyMapWrapper
                locations={
                  selectedJourney?.stops?.map((stop) => ({
                    id: stop.id,
                    latitude: stop.latitude,
                    longitude: stop.longitude,
                    city: stop.city,
                    country: stop.country,
                    arrivalDate: stop.arrivalDate,
                    departureDate: stop.departureDate,
                    accommodationName: stop.accommodationName,
                    accommodationPrice: stop.accommodationPrice,
                    accommodationCurrency: stop.accommodationCurrency,
                    isPaid: stop.isPaid,
                    checkInTime: stop.checkInTime,
                    checkOutTime: stop.checkOutTime,
                    attractions: (stop.attractions || []).map(a => ({
                      ...a,
                      currency: (a as any).currency
                    })),
                  })) || []
                }
                onMapClick={selectedJourney ? handleMapClick : undefined}
                center={
                  // Use newStop coordinates if available (for geocoding), otherwise use first stop
                  newStop.latitude && newStop.longitude
                    ? [newStop.latitude, newStop.longitude]
                    : selectedJourney?.stops && selectedJourney.stops.length > 0
                    ? [
                        selectedJourney.stops[0].latitude,
                        selectedJourney.stops[0].longitude,
                      ]
                    : undefined
                }
                journeyCurrency={selectedJourney?.currency}
                ratesCache={ratesCache}
              />
            </div>

            {/* Journey Details */}
            {selectedJourney ? (
              <div className="gh-card">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-[#ffffff]">{selectedJourney.title}</h2>
                    {selectedJourney.description && (
                      <p className="text-gray-600 dark:text-[#98989d] mt-2">{selectedJourney.description}</p>
                    )}
                  </div>
                  <Link
                    to={`/journey/${selectedJourney.id}/itinerary`}
                    className="gh-btn-secondary text-sm flex-shrink-0"
                    title="Plan detailed itinerary with priorities"
                  >
                    <ListOrdered className="w-4 h-4" />
                      Schedule
                  </Link>
                </div>

                {/* Journey-level attachments removed: attachments are shown under each Stop/Transport only. */}

                {/* Checklist */}
                <div className="mb-6">
                  <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center gap-3">
                      <button onClick={toggleChecklistOpen} className="group p-2 rounded-full hover:bg-white/10 dark:hover:bg-white/10 transition-colors" aria-label="Toggle checklist">
                        <span className="sr-only">Toggle checklist</span>
                        {checklistOpen ? (
                          <ChevronDown className="w-4 h-4 text-black dark:text-white transition-transform duration-200 transform group-hover:-rotate-90 group-hover:scale-110" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-black dark:text-white transition-transform duration-200 transform group-hover:rotate-90 group-hover:scale-110" />
                        )}
                      </button>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-[#ffffff]">Checklist</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Add item (e.g., Passport)"
                        value={newChecklistItemName}
                        onChange={(e) => setNewChecklistItemName(e.target.value)}
                        className="gh-input text-sm"
                      />
                      <button onClick={addChecklistItem} className="gh-btn-secondary text-sm">
                        <Plus className="w-4 h-4" />
                        Add
                      </button>
                    </div>
                  </div>

                  <div className={`space-y-2 transition-collapse overflow-hidden ${checklistOpen ? 'collapse-visible' : 'collapse-hidden'}`} aria-hidden={!checklistOpen}>
                      {(selectedJourney?.checklist || []).length === 0 ? (
                        <p className="text-sm text-gray-600 dark:text-[#98989d]">No checklist items yet.</p>
                      ) : (
                        (selectedJourney!.checklist || []).map(item => (
                          <div key={item.id} className="flex items-center justify-between bg-gray-50 dark:bg-[#1c1c1e] p-2 rounded-md border border-gray-200 dark:border-[#38383a]">
                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-2">
                                <PaymentCheckbox id={`check-bought-${item.id}`} checked={item.bought || false} onChange={() => toggleChecklistBought(item.id)} label="Bought" />
                                <PaymentCheckbox id={`check-packed-${item.id}`} checked={item.packed || false} onChange={() => toggleChecklistPacked(item.id)} label="Packed" />
                              </div>
                              {editingChecklistId === item.id ? (
                                <input
                                  type="text"
                                  value={editingChecklistName}
                                  onChange={(e) => setEditingChecklistName(e.target.value)}
                                  className="gh-input text-sm ml-2"
                                />
                              ) : (
                                <span className="ml-2 text-sm text-gray-900 dark:text-[#ffffff]">{item.name}</span>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              {editingChecklistId === item.id ? (
                                <>
                                  <button onClick={saveEditChecklistItem} className="gh-btn-primary text-sm">Save</button>
                                  <button onClick={cancelEditChecklistItem} className="gh-btn-secondary text-sm">Cancel</button>
                                </>
                              ) : (
                                <>
                                  <button onClick={() => startEditChecklistItem(item.id, item.name)} className="group text-blue-600 hover:bg-blue-600 rounded p-1" title="Edit item">
                                    <Edit2 className="w-4 h-4 transition-colors group-hover:text-white" />
                                  </button>
                                  <button onClick={() => removeChecklistItem(item.id)} className="group text-red-600 hover:bg-red-600 rounded p-1" title="Remove item">
                                    <Trash2 className="w-4 h-4 transition-colors group-hover:text-white" />
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                </div>

                {/* Stops */}
                <div className="mb-6">
                  <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center gap-3">
                      <button onClick={toggleStopsOpen} className="group p-2 rounded-full hover:bg-white/10 dark:hover:bg-white/10 transition-colors" aria-label="Toggle stops">
                        <span className="sr-only">Toggle stops</span>
                        {stopsOpen ? (
                          <ChevronDown className="w-4 h-4 text-black dark:text-white transition-transform duration-200 transform group-hover:-rotate-90 group-hover:scale-110" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-black dark:text-white transition-transform duration-200 transform group-hover:rotate-90 group-hover:scale-110" />
                        )}
                      </button>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-[#ffffff]">Stops</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setImportModalOpen(true)} className="gh-btn-secondary text-sm" disabled={!selectedJourney || loading} title="Import stops from map">
                        <DownloadCloud className="w-4 h-4" />
                        Import
                      </button>

                      <button
                        onClick={() => setShowStopForm(true)}
                        className="gh-btn-secondary text-sm"
                        disabled={loading}
                      >
                        <Plus className="w-4 h-4" />
                        Add Stop
                      </button>
                    </div>
                  </div>
                  <div className={`space-y-3 transition-collapse overflow-hidden ${stopsOpen ? 'collapse-visible' : 'collapse-hidden'}`} aria-hidden={!stopsOpen}>
                      { (selectedJourney?.stops || []).length > 0 ? (
                        (selectedJourney?.stops || []).map((stop, index) => (
                          <div key={stop.id ?? index} className="bg-gray-50 dark:bg-[#1c1c1e] p-4 rounded-lg border border-gray-200 dark:border-[#38383a]">
                            <div className="flex items-start gap-3">
                              <MapPin className="w-5 h-5 text-blue-600 dark:text-[#0a84ff] mt-1 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-start mb-1">
                                  <h4 className="font-semibold text-gray-900 dark:text-[#ffffff]">{stop.city}, {stop.country}</h4>
                                  <div className="flex items-center gap-2">
                                    {stop.accommodationPrice != null && stop.accommodationPrice > 0 && (
                                      <PaymentCheckbox id={`stop-payment-${stop.id}`} checked={stop.isPaid || false} onChange={() => handleToggleStopPayment(stop.id!, stop.isPaid || false)} label="Paid" disabled={loading} />
                                    )}
                                    <button
                                      onClick={async () => {
                                        try {
                                          console.log('🔄 Fetching fresh stop data for ID:', stop.id);
                                          // Fetch fresh stop data from API to avoid stale dates
                                          const freshStop = await stopService.getStopById(stop.id!);
                                          console.log('✅ Received fresh stop:', freshStop);
                                          console.log('📅 Fresh dates - Arrival:', freshStop.arrivalDate, 'Departure:', freshStop.departureDate);
                                          setEditingStop(freshStop);
                                          setShowEditStopForm(true);
                                          setPendingFile(null);
                                          setUploadingAttachment(null);
                                          if (stopFileRef.current) stopFileRef.current.value = '';
                                        } catch (error) {
                                          console.error('Failed to fetch stop:', error);
                                          error('Failed to load stop data');
                                        }
                                      }}
                                      className="group text-blue-600 dark:text-[#0a84ff] hover:bg-blue-600 dark:hover:bg-[#0a84ff] rounded p-1"
                                    >
                                      <Edit2 className="w-4 h-4 transition-colors group-hover:text-white" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteStop(stop.id!)}
                                      className="group text-red-600 dark:text-[#ff453a] hover:bg-red-600 dark:hover:bg-[#ff453a] rounded p-1"
                                    >
                                      <Trash2 className="w-4 h-4 transition-colors group-hover:text-white" />
                                    </button>
                                  </div>
                                </div>
                              {/* Transport attachments not shown here - per-stop/transport attachments rendered in their respective sections */}
                                <p className="text-sm text-gray-600 dark:text-[#98989d]">
                                  {formatDateForDisplay(stop.arrivalDate)}{stop.checkInTime ? `, ${stop.checkInTime}` : ''} - {formatDateForDisplay(stop.departureDate)}{stop.checkOutTime ? `, ${stop.checkOutTime}` : ''}
                                </p>

                                {stop.accommodationName && (
                                  <div className="mt-2 text-sm">
                                    <p className="font-medium text-gray-900 dark:text-[#ffffff]">Accommodation</p>
                                    <p className="text-gray-600 dark:text-[#98989d]">{stop.accommodationName}</p>
                                    {stop.accommodationUrl && (
                                      <a href={stop.accommodationUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-[#0a84ff] hover:underline">View booking →</a>
                                    )}
                                  </div>
                                )}

                                {stop.accommodationPrice != null && stop.accommodationPrice > 0 && (
                                  <div className="mt-2 text-sm">
                                    <span className="font-medium text-green-600 dark:text-[#30d158]">{formatItemPrice(stop.accommodationPrice, stop.accommodationCurrency || selectedJourney.currency, stop, 'accommodation_price_converted', 'accommodation_price_converted_currency')}</span>
                                    {/* Payment control moved to top-right action area to avoid layout shift */}
                                  </div>
                                )}

                                {/* Collapsible Attractions or just Add button if none */}
                                <div className="mt-2 text-sm">
                                  {stop.attractions && stop.attractions.length > 0 ? (
                                    <>
                                      <button
                                        onClick={() => setOpenAttractions(prev => ({ ...prev, [stop.id!]: !prev[stop.id!] }))}
                                        className="group p-1 rounded flex items-center gap-2 text-sm text-gray-900 dark:text-[#ffffff] font-medium hover:bg-gray-100 dark:hover:bg-[#232326] transition-colors"
                                        aria-expanded={!!openAttractions[stop.id!]}
                                        aria-controls={`attractions-list-${stop.id}`}
                                      >
                                        <span className="text-xs">
                                          {openAttractions[stop.id!]
                                            ? <ChevronDown className="w-4 h-4 text-black dark:text-white transition-transform duration-200 transform group-hover:-rotate-90 group-hover:scale-110" />
                                            : <ChevronRight className="w-4 h-4 text-black dark:text-white transition-transform duration-200 transform group-hover:rotate-90 group-hover:scale-110" />}
                                        </span>
                                        <span>Attractions ({stop.attractions.length})</span>
                                      </button>
                                      <div
                                        id={`attractions-list-${stop.id}`}
                                        className={`transition-collapse overflow-hidden ${openAttractions[stop.id!] ? 'collapse-visible' : 'collapse-hidden'}`}
                                        aria-hidden={!openAttractions[stop.id!]}
                                      >
                                        <ul className="list-disc pl-4 ml-0 mt-1 marker:text-blue-600 dark:marker:text-[#0a84ff] text-gray-600 dark:text-[#98989d]">
                                          {stop.attractions.map((a: Attraction) => (
                                            <li key={a.id} className="flex justify-between items-center py-1 border-b border-transparent last:border-b-0">
                                              <div className="flex items-center gap-2">
                                                <span className="text-gray-600 dark:text-[#98989d]">•</span>
                                                {a.tag && (() => {
                                                  const tagInfo = getAttractionTagInfo(a.tag);
                                                  return tagInfo && <span className="text-sm">{tagInfo.emoji}</span>;
                                                })()}
                                                <span className="text-sm text-gray-600 dark:text-[#98989d]">{a.name}</span>
                                                {a.estimatedCost != null && a.estimatedCost > 0 ? (
                                                  <span className="ml-2 font-medium text-green-600 dark:text-[#30d158] text-sm">{formatItemPrice(a.estimatedCost, (a as any).currency || (a as any).curr || selectedJourney.currency, a, 'estimated_cost_converted', 'estimated_cost_converted_currency')}</span>
                                                ) : null}
                                              </div>
                                              <div className="flex items-center gap-2">
                                                {a.estimatedCost != null && a.estimatedCost > 0 && (
                                                  <PaymentCheckbox id={`attr-payment-${a.id}`} checked={a.isPaid || false} onChange={() => handleToggleAttractionPayment(stop.id!, a.id!, a.isPaid || false)} label="Paid" disabled={loading} />
                                                )}
                                                <button onClick={() => { setEditingAttraction(a); setEditingAttractionStopId(stop.id!); setShowEditAttractionForm(true); }} className="group text-blue-600 hover:bg-blue-600 rounded p-1">
                                                  <Edit2 className="w-4 h-4 transition-colors group-hover:text-white" />
                                                </button>
                                                <button onClick={() => handleDeleteAttraction(stop.id!, a.id!)} className="group text-red-600 hover:bg-red-600 rounded p-1">
                                                  <Trash2 className="w-4 h-4 transition-colors group-hover:text-white" />
                                                </button>
                                              </div>
                                            </li>
                                          ))}
                                        </ul>
                                        <div className="mt-2">
                                          <button
                                            onClick={() => { setSelectedStopForAttraction(stop.id!); setShowAttractionForm(true); }}
                                            className="text-blue-600 dark:text-[#0a84ff] hover:underline flex items-center gap-2 text-sm"
                                            aria-label="Add attraction"
                                          >
                                            <Plus className="w-4 h-4" />
                                            Add Attraction
                                          </button>
                                        </div>
                                      </div>
                                    </>
                                  ) : (
                                    <button
                                      onClick={() => { setSelectedStopForAttraction(stop.id!); setShowAttractionForm(true); }}
                                      className="text-blue-600 dark:text-[#0a84ff] hover:underline flex items-center gap-2 text-sm"
                                      aria-label="Add attraction"
                                    >
                                      <Plus className="w-4 h-4" />
                                      Add Attraction
                                    </button>
                                  )}
                                </div>
                                {/* Stop attachments toggle and list */}
                                {attachments && (
                                  (() => {
                                    const attForStop = attachments.filter(a => Number(a.stopId ?? a.stop_id ?? a.stop) === (stop.id ?? null));
                                    if (!attForStop || attForStop.length === 0) return null;
                                    return (
                                      <div className="mt-3">
                                        <button onClick={() => toggleStopAttachments(stop.id!)} className="group p-1 rounded flex items-center gap-2 text-sm text-gray-600 dark:text-[#98989d]" aria-expanded={!!openStopAttachments[stop.id!]}>
                                          <span className="text-xs">
                                            {openStopAttachments[stop.id!] ? <ChevronDown className="w-4 h-4 text-black dark:text-white transition-transform duration-200 transform group-hover:-rotate-90 group-hover:scale-110" /> : <ChevronRight className="w-4 h-4 text-black dark:text-white transition-transform duration-200 transform group-hover:rotate-90 group-hover:scale-110" />}
                                          </span>
                                          <span>{attForStop.length} Attachment{attForStop.length !== 1 ? 's' : ''}</span>
                                        </button>
                                        <div className={`mt-2 transition-collapse overflow-hidden ${openStopAttachments[stop.id!] ? 'collapse-visible' : 'collapse-hidden'}`} aria-hidden={!openStopAttachments[stop.id!]}>
                                          <div className="space-y-2">
                                            {attForStop.map((att: any) => renderAttachmentRow(att))}
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })()
                                )}
                                {/* Add Attraction button moved inside collapsible */}
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-gray-600 dark:text-[#98989d] text-center py-4">No stops yet. Click on the map to add your first stop!</p>
                      )}
                    </div>

                {/* Transportation */}
                <div className="mt-6">
                  <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center gap-3">
                      <button onClick={toggleTransportsOpen} className="group p-2 rounded-full hover:bg-white/10 dark:hover:bg-white/10 transition-colors" aria-label="Toggle transports">
                        <span className="sr-only">Toggle transports</span>
                        {transportsOpen ? (
                          <ChevronDown className="w-4 h-4 text-black dark:text-white transition-transform duration-200 transform group-hover:-rotate-90 group-hover:scale-110" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-black dark:text-white transition-transform duration-200 transform group-hover:rotate-90 group-hover:scale-110" />
                        )}
                      </button>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-[#ffffff]">Transportation</h3>
                    </div>
                    <button
                      onClick={() => setShowTransportForm(true)}
                      className="gh-btn-secondary text-sm"
                      disabled={loading}
                    >
                      <Plus className="w-4 h-4" />
                      Add Transport
                    </button>
                  </div>
                  <div className={`space-y-3 transition-collapse overflow-hidden ${transportsOpen ? 'collapse-visible' : 'collapse-hidden'}`} aria-hidden={!transportsOpen}>
                    {selectedJourney.transports && selectedJourney.transports.length > 0 ? (
                      selectedJourney.transports.map((transport, index) => (
                        <div key={transport.id ?? index} className="bg-gray-50 dark:bg-[#1c1c1e] p-4 rounded-lg border border-gray-200 dark:border-[#38383a]">
                          <div className="flex items-start gap-3">
                            <div className="text-blue-600 dark:text-[#0a84ff] mt-1 flex-shrink-0">
                              {getTransportIcon(transport.type)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex justify-between items-start mb-1">
                                <div>
                                  <h4 className="font-semibold capitalize text-gray-900 dark:text-[#ffffff]">{transport.type}</h4>
                                  {transport.flightNumber && (
                                    <p className="text-xs text-gray-500 dark:text-[#636366] mt-0.5">
                                      Flight: {transport.flightNumber}
                                    </p>
                                  )}
                                  {transport.trainNumber && (
                                    <p className="text-xs text-gray-500 dark:text-[#636366] mt-0.5">
                                      Train: {transport.trainNumber}
                                    </p>
                                  )}
                                </div>
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => {
                                      setEditingTransport(transport);
                                      setShowEditTransportForm(true);
                                      setPendingFile(null);
                                      setUploadingAttachment(null);
                                      if (transportFileRef.current) transportFileRef.current.value = '';
                                    }}
                                    className="group text-blue-600 dark:text-[#0a84ff] hover:bg-blue-600 dark:hover:bg-[#0a84ff] rounded p-1 cursor-pointer transition-all duration-300 ease-in-out"
                                    disabled={loading}
                                    title="Edit transport"
                                  >
                                    <Edit2 className="w-4 h-4 transition-colors group-hover:text-white" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteTransport(transport.id!)}
                                    className="group text-red-600 dark:text-[#ff453a] hover:bg-red-600 dark:hover:bg-[#ff453a] rounded p-1 cursor-pointer transition-all duration-300 ease-in-out"
                                    disabled={loading}
                                    title="Delete transport"
                                  >
                                    <Trash2 className="w-4 h-4 transition-colors group-hover:text-white" />
                                  </button>
                                </div>
                              </div>
                              <p className="text-sm text-gray-600 dark:text-[#98989d]">
                                {transport.fromLocation} → {transport.toLocation}
                              </p>
                              <p className="text-sm text-gray-600 dark:text-[#98989d] mt-1">
                                {formatDateTimeForDisplay(transport.departureDate)} - {formatDateTimeForDisplay(transport.arrivalDate)}
                              </p>
                              {transport.price != null && transport.price > 0 && (
                                <div className="text-sm mt-1 flex items-center justify-between">
                                  <p className="font-medium text-green-600 dark:text-[#30d158]">
                                    {formatItemPrice(transport.price, transport.currency, transport, 'price_converted', 'price_converted_currency')}
                                  </p>
                                  <PaymentCheckbox
                                    id={`transport-payment-${transport.id}`}
                                    checked={transport.isPaid || false}
                                    onChange={() => handleToggleTransportPayment(transport.id!, transport.isPaid || false)}
                                    disabled={loading}
                                  />
                                </div>
                              )}
                                {/* Transport booking link (show above attachments and attractions) */}
                                {transport.bookingUrl && (
                                  <a
                                    href={transport.bookingUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm text-blue-600 dark:text-[#0a84ff] hover:underline"
                                  >
                                    View booking →
                                  </a>
                                )}

                                {/* Transport attachments toggle and list */}
                                {attachments && (
                                  (() => {
                                    const attForTransport = attachments.filter(a => Number(a.transportId ?? a.transport_id ?? a.transport) === (transport.id ?? null));
                                    if (!attForTransport || attForTransport.length === 0) return null;
                                    return (
                                      <div className="mt-3">
                                        <button onClick={() => toggleTransportAttachments(transport.id!)} className="group p-1 rounded flex items-center gap-2 text-sm text-gray-600 dark:text-[#98989d]" aria-expanded={!!openTransportAttachments[transport.id!]}>
                                          <span className="text-xs">
                                            {openTransportAttachments[transport.id!] ? <ChevronDown className="w-4 h-4 text-black dark:text-white transition-transform duration-200 transform group-hover:-rotate-90 group-hover:scale-110" /> : <ChevronRight className="w-4 h-4 text-black dark:text-white transition-transform duration-200 transform group-hover:rotate-90 group-hover:scale-110" />}
                                          </span>
                                          <span>{attForTransport.length} Attachment{attForTransport.length !== 1 ? 's' : ''}</span>
                                        </button>
                                        <div className={`mt-2 transition-collapse overflow-hidden ${openTransportAttachments[transport.id!] ? 'collapse-visible' : 'collapse-hidden'}`} aria-hidden={!openTransportAttachments[transport.id!]}>
                                          <div className="space-y-2">
                                            {attForTransport.map((att: any) => renderAttachmentRow(att))}
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })()
                                )}
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-gray-600 dark:text-[#98989d] text-center py-4">
                        No transportation added yet.
                      </p>
                    )}
                  </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="gh-card text-center py-6">
                <MapPin className="w-16 h-16 text-gray-600 dark:text-[#98989d] mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-[#ffffff] mb-2">
                  No Journey Selected
                </h3>
                <p className="text-gray-600 dark:text-[#98989d] mb-4">
                  Select a journey from the list or create a new one to get started
                </p>
                {/* Aggregated totals across all journeys (converted to PLN when possible) */}
                {(() => {
                  const base = 'PLN';
                  let total = 0;
                  let paid = 0;

                  journeys.forEach(j => {
                    const mainCurr = j.currency || base;

                    // stops
                    (j.stops || []).forEach(s => {
                      const storedStop = getStoredConverted(s, 'accommodation_price_converted', 'accommodation_price_converted_currency');
                      if (storedStop) {
                        const eff = storedStop.currency === base ? storedStop.value : (convertAmount(storedStop.value, storedStop.currency, base) ?? storedStop.value);
                        total += eff;
                        if (s.isPaid) paid += eff;
                      } else {
                        const price = (s as any).accommodationPrice ?? (s as any).accommodation_price ?? 0;
                        const from = (s as any).accommodationCurrency || (s as any).accommodation_currency || mainCurr;
                        const conv = convertAmount(price || 0, from, base);
                        const eff = conv ?? price ?? 0;
                        total += eff;
                        if (s.isPaid) paid += eff;
                      }

                      // attractions
                      (s.attractions || []).forEach(a => {
                        const storedA = getStoredConverted(a, 'estimated_cost_converted', 'estimated_cost_converted_currency');
                        if (storedA) {
                          const ae = storedA.currency === base ? storedA.value : (convertAmount(storedA.value, storedA.currency, base) ?? storedA.value);
                          total += ae;
                          if (a.isPaid) paid += ae;
                        } else {
                          const aprice = (a as any).estimatedCost ?? (a as any).estimated_cost ?? 0;
                          const afrom = (a as any).currency || mainCurr;
                          const aconv = convertAmount(aprice || 0, afrom, base);
                          const ae = aconv ?? aprice ?? 0;
                          total += ae;
                          if (a.isPaid) paid += ae;
                        }
                      });
                    });

                    // transports
                    (j.transports || []).forEach(t => {
                      const storedT = getStoredConverted(t, 'price_converted', 'price_converted_currency');
                      if (storedT) {
                        const te = storedT.currency === base ? storedT.value : (convertAmount(storedT.value, storedT.currency, base) ?? storedT.value);
                        total += te;
                        if (t.isPaid) paid += te;
                      } else {
                        const tprice = (t as any).price ?? 0;
                        const tfrom = (t as any).currency || mainCurr;
                        const tconv = convertAmount(tprice || 0, tfrom, base);
                        const te = tconv ?? tprice ?? 0;
                        total += te;
                        if (t.isPaid) paid += te;
                      }
                    });
                  });

                  const amountDue = Math.max(0, total - paid);
                  const percentPaid = total > 0 ? Math.round((paid / total) * 100) : 0;

                  return (
                    <div className="max-w-md mx-auto text-left">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm font-medium text-green-600 dark:text-[#30d158]">
                          <DollarSign className="w-4 h-4" />
                          <span>Estimated Cost (all journeys):</span>
                        </div>
                        <span className="text-sm font-semibold text-green-600 dark:text-[#30d158]">{total.toFixed(2)} {base}</span>
                      </div>

                      <div className="mt-3">
                        {amountDue > 0 ? (
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-sm font-medium text-red-600 dark:text-[#ff453a]">
                              <XCircle className="w-4 h-4 text-black dark:text-white" />
                              <span>Amount Due:</span>
                            </div>
                            <span className="text-sm font-semibold text-red-600 dark:text-[#ff453a]">{amountDue.toFixed(2)} {base}</span>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-sm font-medium text-green-600 dark:text-[#30d158]">
                              <CheckCircle2 className="w-4 h-4" />
                              <span>Fully Paid</span>
                            </div>
                            <span className="text-sm font-semibold text-green-600 dark:text-[#30d158]">{percentPaid}%</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* New Journey Modal */}
      {showNewJourneyForm && (
        <div className="gh-modal-overlay" onClick={() => setShowNewJourneyForm(false)}>
          <div className="gh-modal" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-[#ffffff] mb-6">Create New Journey</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-[#ffffff] mb-2">
                    Journey Title *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Summer Europe Trip 2024"
                    value={newJourney.title}
                    onChange={(e) => setNewJourney({ ...newJourney, title: e.target.value })}
                    className="gh-input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-[#ffffff] mb-2">
                    Description
                  </label>
                  <textarea
                    placeholder="Describe your journey..."
                    value={newJourney.description}
                    onChange={(e) => setNewJourney({ ...newJourney, description: e.target.value })}
                    className="gh-textarea"
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-900 dark:text-[#ffffff] mb-2">
                      Start Date *
                    </label>
                    <input
                      type="date"
                      value={newJourney.startDate as string}
                      onChange={(e) => setNewJourney({ ...newJourney, startDate: e.target.value })}
                      className="gh-input"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-900 dark:text-[#ffffff] mb-2">
                      End Date *
                    </label>
                    <input
                      type="date"
                      value={newJourney.endDate as string}
                      onChange={(e) => setNewJourney({ ...newJourney, endDate: e.target.value })}
                      className="gh-input"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-[#ffffff] mb-2">
                    Currency
                  </label>
                  <select
                    value={newJourney.currency}
                    onChange={(e) => setNewJourney({ ...newJourney, currency: e.target.value })}
                    className="gh-select"
                  >
                    <option value="PLN">PLN (Polish Złoty)</option>
                    <option value="USD">USD (US Dollar)</option>
                    <option value="EUR">EUR (Euro)</option>
                    <option value="GBP">GBP (British Pound)</option>
                    <option value="KRW">KRW (Korean Won)</option>
                  </select>
                </div>
              </div>
              
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowNewJourneyForm(false)}
                  className="gh-btn-danger flex-1"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateJourney}
                  className="gh-btn-primary flex-1"
                  disabled={loading}
                >
                  {loading ? 'Creating...' : 'Create Journey'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Journey Modal */}
      {showEditJourneyForm && editingJourney && (
        <div className="gh-modal-overlay" onClick={() => setShowEditJourneyForm(false)}>
          <div className="gh-modal" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-[#ffffff] mb-6">Edit Journey</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-[#ffffff] mb-2">
                    Journey Title *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Summer Europe Trip 2024"
                    value={editingJourney.title}
                    onChange={(e) => setEditingJourney({ ...editingJourney, title: e.target.value })}
                    className="gh-input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-[#ffffff] mb-2">
                    Description
                  </label>
                  <textarea
                    placeholder="Describe your journey..."
                    value={editingJourney.description || ''}
                    onChange={(e) => setEditingJourney({ ...editingJourney, description: e.target.value })}
                    className="gh-textarea"
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-900 dark:text-[#ffffff] mb-2">
                      Start Date *
                    </label>
                    <input
                      type="date"
                      value={formatDateForInput(editingJourney.startDate)}
                      onChange={(e) => setEditingJourney({ ...editingJourney, startDate: e.target.value })}
                      className="gh-input"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-900 dark:text-[#ffffff] mb-2">
                      End Date *
                    </label>
                    <input
                      type="date"
                      value={formatDateForInput(editingJourney.endDate)}
                      onChange={(e) => setEditingJourney({ ...editingJourney, endDate: e.target.value })}
                      className="gh-input"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-[#ffffff] mb-2">
                    Currency
                  </label>
                  <select
                    value={editingJourney.currency}
                    onChange={(e) => setEditingJourney({ ...editingJourney, currency: e.target.value })}
                    className="gh-select"
                  >
                    <option value="PLN">PLN (Polish Złoty)</option>
                    <option value="USD">USD (US Dollar)</option>
                    <option value="EUR">EUR (Euro)</option>
                    <option value="GBP">GBP (British Pound)</option>
                    <option value="KRW">KRW (Korean Won)</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowEditJourneyForm(false);
                    setEditingJourney(null);
                  }}
                  className="gh-btn-danger flex-1"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  onClick={handleEditJourney}
                  className="gh-btn-primary flex-1"
                  disabled={loading}
                >
                  {loading ? 'Updating...' : 'Update Journey'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Share Journey Modal */}
      {showShareModal && selectedJourney && (
        <div className="gh-modal-overlay" onClick={() => setShowShareModal(false)}>
          <div className="gh-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-[#ffffff] mb-4">
                Share Journey
              </h2>
              <p className="text-sm text-gray-600 dark:text-[#98989d] mb-6">
                Share "{selectedJourney.title}" with another user. They will receive an email invitation.
              </p>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-[#ffffff] mb-2">
                    Email or Username *
                  </label>
                  <input
                    type="text"
                    placeholder="Enter email or username"
                    value={shareEmailOrUsername}
                    onChange={(e) => setShareEmailOrUsername(e.target.value)}
                    className="gh-input"
                    autoFocus
                  />
                  <p className="text-xs text-gray-500 dark:text-[#98989d] mt-2">
                    Enter the email address or username of the person you want to share with.
                  </p>
                </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-900 dark:text-[#ffffff] mb-2">Role</label>
                    <select value={shareRole} onChange={(e) => setShareRole(e.target.value as any)} className="gh-input w-full">
                      <option value="view">View</option>
                      <option value="edit">Edit</option>
                      <option value="manage">Manage</option>
                    </select>
                    <p className="text-xs text-gray-500 dark:text-[#98989d] mt-2">Choose the permission level for the invited user.</p>
                  </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowShareModal(false);
                    setShareEmailOrUsername('');
                  }}
                  className="gh-btn-danger flex-1"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  onClick={handleShareJourney}
                  className="gh-btn-primary flex-1"
                  disabled={loading || !shareEmailOrUsername.trim()}
                >
                  {loading ? 'Sharing...' : 'Share Journey'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Manage Shares Modal */}
      {showManageSharesModal && selectedJourney && (
        <ManageSharesModal
          journeyId={selectedJourney.id!}
          isOpen={showManageSharesModal}
          onClose={() => setShowManageSharesModal(false)}
            onUpdated={() => {
            void loadJourneys(journeyPage, journeySearch);
          }}
        />
      )}

      {/* Add Stop Modal */}
      {showStopForm && (
        <div className="gh-modal-overlay" onClick={() => setShowStopForm(false)}>
          <div className="gh-modal" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-[#ffffff] mb-6">Add Stop</h2>
              <div className="space-y-4">
                {/* Address block: Street & number, City* + Postal Code, Country*, then single locate button */}
                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-[#ffffff] mb-2">Address</label>
                  <input
                    type="text"
                    placeholder="Street and number"
                    value={newStop.addressStreet || ''}
                    onChange={(e) => setNewStop({ ...newStop, addressStreet: e.target.value })}
                    className="gh-input mb-3"
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-900 dark:text-[#ffffff] mb-2">City *</label>
                      <input
                        type="text"
                        placeholder="City"
                        value={newStop.city || ''}
                        onChange={(e) => setNewStop({ ...newStop, city: e.target.value })}
                        className="gh-input"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-900 dark:text-[#ffffff] mb-2">Postal Code</label>
                      <input
                        type="text"
                        placeholder="Postal Code"
                        value={newStop.postalCode || ''}
                        onChange={(e) => setNewStop({ ...newStop, postalCode: e.target.value })}
                        className="gh-input"
                      />
                    </div>
                  </div>

                  <div className="mt-3">
                    <label className="block text-sm font-medium text-gray-900 dark:text-[#ffffff] mb-2">Country *</label>
                    <input
                      type="text"
                      placeholder="Country"
                      value={newStop.country || ''}
                      onChange={(e) => setNewStop({ ...newStop, country: e.target.value })}
                      className="gh-input"
                    />
                  </div>

                  <div className="mt-4">
                    <button
                      onClick={() => handleGeocodeAddress(newStop.addressStreet, newStop.addressHouseNumber, newStop.postalCode, newStop.city, newStop.country)}
                      disabled={loading || !(newStop.addressStreet || newStop.city || newStop.postalCode || newStop.country)}
                      className="gh-btn-primary w-full flex items-center justify-center gap-2"
                    >
                      <MapPin className="w-4 h-4" />
                      Locate on Map
                    </button>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-900 dark:text-[#ffffff] mb-2">
                      Arrival Date
                    </label>
                    <input
                      type="date"
                      value={newStop.arrivalDate as string}
                      onChange={(e) => setNewStop({ ...newStop, arrivalDate: e.target.value })}
                      className="gh-input"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-900 dark:text-[#ffffff] mb-2">
                      Departure Date
                    </label>
                    <input
                      type="date"
                      value={newStop.departureDate as string}
                      onChange={(e) => setNewStop({ ...newStop, departureDate: e.target.value })}
                      className="gh-input"
                    />
                  </div>
                </div>
                
                {/* Booking.com URL Auto-fill */}
                <div className="p-4 bg-blue-900/20 border border-blue-700/30 rounded-lg">
                  <label className="block text-sm font-medium text-gray-900 dark:text-[#ffffff] mb-2">
                    📎 Quick Fill from Booking.com
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Paste Booking.com URL here..."
                      value={bookingUrl}
                      onChange={(e) => setBookingUrl(e.target.value)}
                      className="gh-input flex-1"
                    />
                    <button
                      onClick={handleBookingUrlPaste}
                      disabled={loading || !bookingUrl}
                      className="gh-btn-primary whitespace-nowrap"
                    >
                      Auto-fill
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-[#636366] mt-2">
                    💡 Paste a Booking.com link to automatically extract hotel name, location, and dates
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-[#ffffff] mb-2">
                    Accommodation Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Hotel Name"
                    value={newStop.accommodationName}
                    onChange={(e) => setNewStop({ ...newStop, accommodationName: e.target.value })}
                    className="gh-input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-[#ffffff] mb-2">
                    Accommodation URL (Booking.com, Airbnb, etc.)
                  </label>
                  <input
                    type="url"
                    placeholder="https://..."
                    value={newStop.accommodationUrl}
                    onChange={(e) => setNewStop({ ...newStop, accommodationUrl: e.target.value })}
                    className="gh-input"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-900 dark:text-[#ffffff] mb-2">
                      Accommodation Price
                    </label>
                    <input
                      type="number"
                      placeholder="0"
                      value={newStop.accommodationPrice || ''}
                      onChange={(e) => setNewStop({ ...newStop, accommodationPrice: parseFloat(e.target.value) || 0 })}
                      className="gh-input"
                    />
                    {/* Live conversion to journey main currency */}
                    {((newStop.accommodationPrice || 0) > 0) && (
                      <p className="text-xs text-gray-500 dark:text-[#636366] mt-1">
                        {(() => {
                          const mainCurr = newJourney.currency || selectedJourney?.currency || 'PLN';
                          const from = newStop.accommodationCurrency || mainCurr;
                          if (from === mainCurr) return null;
                          const conv = convertAmount(newStop.accommodationPrice || 0, from, mainCurr);
                          if (conv == null) return <span>≈ conversion not available</span>;
                          return <span>≈ {conv.toFixed(2)} {mainCurr}</span>;
                        })()}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-900 dark:text-[#ffffff] mb-2">
                      Currency
                    </label>
                    <select
                      value={newStop.accommodationCurrency}
                      onChange={(e) => setNewStop({ ...newStop, accommodationCurrency: e.target.value })}
                      className="gh-select"
                    >
                      <option value="PLN">PLN</option>
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                      <option value="GBP">GBP</option>
                      <option value="KRW">KRW</option>
                    </select>
                  </div>
                </div>
                {/* Attachments for new stop (moved below price, above coordinates) */}
                <div className="mt-3">
                  <label className="block text-sm font-medium text-gray-900 dark:text-[#ffffff] mb-2">Ticket / Attachment</label>
                  <div className="flex gap-4 items-center">
                    <input
                      type="file"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        setPendingFile(file);
                        setUploadingAttachment(null);
                      }}
                      ref={stopFileRef}
                      className="hidden"
                      accept={allowedFileTypes}
                    />

                    <div onClick={() => stopFileRef.current?.click()} className="w-3/4 cursor-pointer bg-gray-50 dark:bg-[#1c1c1e] px-4 h-12 rounded-md border border-gray-200 dark:border-[#38383a] flex items-center justify-between">
                      <span className={pendingFile ? 'text-sm text-white' : 'text-sm text-gray-500'}>{pendingFile ? `${pendingFile.name} • ${Math.round(pendingFile.size / 1024)} KB` : 'Choose file...'}</span>
                      <span className="text-sm text-gray-400">📎</span>
                    </div>

                    <button
                      onClick={async () => {
                        if (!pendingFile) { error('No file selected'); return; }
                        try {
                          setLoading(true);
                          const fd = new FormData();
                          fd.append('file', pendingFile);
                          fd.append('journeyId', String(selectedJourney?.id));
                          if (newStop?.id) fd.append('stopId', String(newStop.id));
                          const resp = await attachmentService.uploadAttachment(fd);
                          success('Attachment uploaded');
                          if (resp?.attachment) setAttachments(prev => [resp.attachment, ...(prev || [])]);
                          setUploadingAttachment(resp?.attachment ?? null);
                          setPendingFile(null);
                        } catch (err) {
                          error('Upload failed');
                        } finally { setLoading(false); }
                      }}
                      className="w-1/4 h-12 gh-btn-primary bg-green-500 hover:bg-green-600 flex items-center justify-center"
                    ><Plus className="w-4 h-4 mr-2" />Add</button>
                  </div>
                  {/* Removed temporary upload-preview row: keep only the static chooser and existing attachments */}
                  {/* Existing attachments for the new stop (if any) */}
                  {(newStop && attachments && attachments.length > 0) && (() => {
                    const attForNewStop = attachments.filter(a => Number(a.stopId ?? a.stop_id ?? a.stop) === (newStop.id ?? null));
                    if (!attForNewStop || attForNewStop.length === 0) return null;
                    return (
                      <div className="mt-3">
                        <div className="text-sm text-gray-600 dark:text-[#98989d] mb-2">Existing attachments</div>
                        <div className="space-y-2">
                          {attForNewStop.map((att: any) => renderAttachmentRow(att))}
                        </div>
                      </div>
                    );
                  })()}
                <div className="bg-gray-50 dark:bg-[#1c1c1e] p-3 rounded-lg border border-gray-200 dark:border-[#38383a]">
                  <p className="text-sm text-gray-600 dark:text-[#98989d]">
                    📍 Coordinates: {newStop.latitude?.toFixed(4)}, {newStop.longitude?.toFixed(4)}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-[#98989d] mt-1">
                    Click on the map to update coordinates
                  </p>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowStopForm(false)}
                  className="gh-btn-danger flex-1"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddStop}
                  className="gh-btn-primary flex-1"
                  disabled={loading}
                >
                  {loading ? 'Adding...' : 'Add Stop'}
                </button>
              </div>
            </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Stop Modal */}
      {showEditStopForm && editingStop && (
        <div className="gh-modal-overlay" onClick={() => setShowEditStopForm(false)}>
          <div className="gh-modal" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-[#ffffff] mb-6">Edit Stop</h2>
              <div className="space-y-4">
                {/* Address block: Street & number, City + Postal Code, Country, then single locate button */}
                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-[#ffffff] mb-2">Address</label>
                  <input
                    type="text"
                    placeholder="Street and number"
                    value={editingStop.addressStreet || ''}
                    onChange={(e) => setEditingStop({ ...editingStop, addressStreet: e.target.value })}
                    className="gh-input mb-3"
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-900 dark:text-[#ffffff] mb-2">City *</label>
                      <input
                        type="text"
                        placeholder="City"
                        value={editingStop.city || ''}
                        onChange={(e) => setEditingStop({ ...editingStop, city: e.target.value })}
                        className="gh-input"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-900 dark:text-[#ffffff] mb-2">Postal Code</label>
                      <input
                        type="text"
                        placeholder="Postal Code"
                        value={editingStop.postalCode || ''}
                        onChange={(e) => setEditingStop({ ...editingStop, postalCode: e.target.value })}
                        className="gh-input"
                      />
                    </div>
                  </div>

                  <div className="mt-3">
                    <label className="block text-sm font-medium text-gray-900 dark:text-[#ffffff] mb-2">Country *</label>
                    <input
                      type="text"
                      placeholder="Country"
                      value={editingStop.country || ''}
                      onChange={(e) => setEditingStop({ ...editingStop, country: e.target.value })}
                      className="gh-input"
                    />
                  </div>

                  <div className="mt-4">
                    <button
                      onClick={() => handleGeocodeAddressEdit(editingStop.addressStreet, undefined, editingStop.postalCode, editingStop.city, editingStop.country)}
                      disabled={loading || !(editingStop.addressStreet || editingStop.city || editingStop.postalCode || editingStop.country)}
                      className="gh-btn-primary w-full flex items-center justify-center gap-2"
                    >
                      <MapPin className="w-4 h-4" />
                      Locate on Map
                    </button>
                  </div>
                </div>
                {/* Booking.com URL Auto-fill for Edit */}
                <div className="p-4 bg-blue-900/20 border border-blue-700/30 rounded-lg">
                  <label className="block text-sm font-medium text-gray-900 dark:text-[#ffffff] mb-2">
                    📎 Quick Fill from Booking.com (Edit)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Paste Booking.com URL here..."
                      value={editBookingUrl}
                      onChange={(e) => setEditBookingUrl(e.target.value)}
                      className="gh-input flex-1"
                    />
                    <button
                      onClick={handleBookingUrlPasteEdit}
                      disabled={loading || !editBookingUrl}
                      className="gh-btn-primary whitespace-nowrap"
                    >
                      Auto-fill
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-[#636366] mt-2">
                    💡 Paste a Booking.com link to automatically extract hotel name, location and address. The address will populate street, house number and postal code when possible.
                  </p>
                </div>
                {/* attachments for stops moved below price/currency */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-900 dark:text-[#ffffff] mb-2">
                      Arrival Date
                    </label>
                    <input
                      type="date"
                      value={formatDateForInput(editingStop.arrivalDate)}
                      onChange={(e) => setEditingStop({ ...editingStop, arrivalDate: e.target.value })}
                      className="gh-input"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-900 dark:text-[#ffffff] mb-2">
                      Departure Date
                    </label>
                    <input
                      type="date"
                      value={formatDateForInput(editingStop.departureDate)}
                      onChange={(e) => setEditingStop({ ...editingStop, departureDate: e.target.value })}
                      className="gh-input"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-900 dark:text-[#ffffff] mb-2">
                      Check-in Time
                    </label>
                    <input
                      type="time"
                      value={editingStop.checkInTime ?? ''}
                      onChange={(e) => setEditingStop({ ...editingStop, checkInTime: e.target.value })}
                      onBlur={(e) => {
                        const v = e.target.value;
                        if (editingStop) setEditingStop({ ...editingStop, checkInTime: isValidTime(v) ? v : '' });
                      }}
                      className="gh-input"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-900 dark:text-[#ffffff] mb-2">
                      Check-out Time
                    </label>
                    <input
                      type="time"
                      value={editingStop.checkOutTime ?? ''}
                      onChange={(e) => setEditingStop({ ...editingStop, checkOutTime: e.target.value })}
                      onBlur={(e) => {
                        const v = e.target.value;
                        if (editingStop) setEditingStop({ ...editingStop, checkOutTime: isValidTime(v) ? v : '' });
                      }}
                      className="gh-input"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-[#ffffff] mb-2">
                    Accommodation Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Hotel Name"
                    value={editingStop.accommodationName || ''}
                    onChange={(e) => setEditingStop({ ...editingStop, accommodationName: e.target.value })}
                    className="gh-input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-[#ffffff] mb-2">
                    Accommodation URL
                  </label>
                  <input
                    type="url"
                    placeholder="https://..."
                    value={editingStop.accommodationUrl || ''}
                    onChange={(e) => setEditingStop({ ...editingStop, accommodationUrl: e.target.value })}
                    className="gh-input"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-900 dark:text-[#ffffff] mb-2">
                      Accommodation Price
                    </label>
                    <input
                      type="number"
                      placeholder="0"
                      value={editingStop.accommodationPrice || ''}
                      onChange={(e) => setEditingStop({ ...editingStop, accommodationPrice: parseFloat(e.target.value) || 0 })}
                      className="gh-input"
                    />
                    {((editingStop?.accommodationPrice || 0) > 0) && (
                      <p className="text-xs text-gray-500 dark:text-[#636366] mt-1">
                        {(() => {
                          const mainCurr = editingJourney?.currency || selectedJourney?.currency || newJourney.currency || 'PLN';
                          const from = editingStop?.accommodationCurrency || mainCurr;
                          if (from === mainCurr) return null;
                          const stored = getStoredConverted(editingStop, 'accommodation_price_converted', 'accommodation_price_converted_currency');
                          if (stored) {
                            const value = stored.currency === mainCurr ? stored.value : (convertAmount(stored.value, stored.currency, mainCurr) ?? stored.value);
                            return <span>≈ {value.toFixed(2)} {mainCurr}</span>;
                          }
                          const conv = convertAmount(editingStop!.accommodationPrice || 0, from, mainCurr);
                          if (conv == null) return <span>≈ conversion not available</span>;
                          return <span>≈ {conv.toFixed(2)} {mainCurr}</span>;
                        })()}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-900 dark:text-[#ffffff] mb-2">
                      Currency
                    </label>
                    <select
                      value={editingStop.accommodationCurrency || 'PLN'}
                      onChange={(e) => setEditingStop({ ...editingStop, accommodationCurrency: e.target.value })}
                      className="gh-select"
                    >
                      <option value="PLN">PLN</option>
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                      <option value="GBP">GBP</option>
                      <option value="KRW">KRW</option>
                    </select>
                  </div>
                </div>
                {/* Attachment chooser and existing attachments for Edit Stop (mirror Edit Transport) */}
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-900 dark:text-[#ffffff] mb-2">
                    Attachment
                  </label>
                  <div className="flex gap-4 items-center mt-2">
                    <input
                      type="file"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        setPendingFile(file);
                        setUploadingAttachment(null);
                      }}
                      ref={stopFileRef}
                      className="hidden"
                      accept={allowedFileTypes}
                    />

                    <div onClick={() => stopFileRef.current?.click()} className="w-3/4 cursor-pointer bg-gray-50 dark:bg-[#1c1c1e] px-4 h-12 rounded-md border border-gray-200 dark:border-[#38383a] flex items-center justify-between">
                      <span className={pendingFile ? 'text-sm text-white' : 'text-sm text-gray-500'}>{pendingFile ? `${pendingFile.name} • ${Math.round(pendingFile.size / 1024)} KB` : 'Choose file...'}</span>
                      <span className="text-sm text-gray-400">📎</span>
                    </div>

                    <button
                      onClick={async () => {
                        if (!pendingFile) { error('No file selected'); return; }
                        try {
                          setLoading(true);
                          const fd = new FormData();
                          fd.append('file', pendingFile);
                          fd.append('journeyId', String(selectedJourney?.id));
                          if (editingStop?.id) fd.append('stopId', String(editingStop.id));
                          const resp = await attachmentService.uploadAttachment(fd);
                          success('Attachment uploaded');
                          if (resp?.attachment) setAttachments(prev => [resp.attachment, ...(prev || [])]);
                          setUploadingAttachment(resp?.attachment ?? null);
                          setPendingFile(null);
                        } catch (err) {
                          error('Upload failed');
                        } finally { setLoading(false); }
                      }}
                      className="w-1/4 h-12 gh-btn-primary bg-green-500 hover:bg-green-600"
                    ><Plus className="w-4 h-4 mr-2" />Add</button>
                  </div>

                  {/* Removed temporary upload-preview and pending-file preview: only the chooser and Existing attachments are shown as requested */}

                  {/* Existing attachments for the stop being edited */}
                  {(editingStop && attachments && attachments.length > 0) && (() => {
                    const attForEditingStop = attachments.filter(a => Number(a.stopId ?? a.stop_id ?? a.stop) === (editingStop.id ?? null));
                    if (!attForEditingStop || attForEditingStop.length === 0) return null;
                    return (
                      <div className="mt-3">
                        <div className="text-sm text-gray-600 dark:text-[#98989d] mb-2">Existing attachments</div>
                        <div className="space-y-2">
                          {attForEditingStop.map((att: any) => renderAttachmentRow(att))}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowEditStopForm(false);
                    setEditingStop(null);
                  }}
                  className="gh-btn-danger flex-1"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  onClick={handleEditStop}
                  className="gh-btn-primary flex-1"
                  disabled={loading}
                >
                  {loading ? 'Updating...' : 'Update Stop'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Transport Modal */}
      {showTransportForm && (
        <div className="gh-modal-overlay" onClick={() => setShowTransportForm(false)}>
          <div className="gh-modal" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-[#ffffff] mb-6">Add Transportation</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-[#ffffff] mb-2">
                    Transport Type *
                  </label>
                  <select
                    value={newTransport.type}
                    onChange={(e) => setNewTransport({ ...newTransport, type: e.target.value as Transport['type'] })}
                    className="gh-select"
                  >
                    <option value="flight">✈️ Flight</option>
                    <option value="train">🚆 Train</option>
                    <option value="bus">🚌 Bus</option>
                    <option value="car">🚗 Car</option>
                    <option value="other">🚢 Other</option>
                  </select>
                </div>
                
                {/* Conditional field for Flight Number */}
                {newTransport.type === 'flight' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-900 dark:text-[#ffffff] mb-2">
                      Flight Number
                      <span className="text-xs text-gray-500 dark:text-[#98989d] ml-2">(e.g., LO123, FR1234)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., LO123"
                      value={newTransport.flightNumber || ''}
                      onChange={(e) => setNewTransport({ ...newTransport, flightNumber: e.target.value })}
                      className="gh-input"
                    />
                  </div>
                )}
                
                {/* Conditional field for Train Number */}
                {newTransport.type === 'train' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-900 dark:text-[#ffffff] mb-2">
                      Train Number
                      <span className="text-xs text-gray-500 dark:text-[#98989d] ml-2">(e.g., TLK 12345, IC 5002)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., TLK 12345"
                      value={newTransport.trainNumber || ''}
                      onChange={(e) => setNewTransport({ ...newTransport, trainNumber: e.target.value })}
                      className="gh-input"
                    />
                  </div>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-900 dark:text-[#ffffff] mb-2">
                      From *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., Warsaw"
                      value={newTransport.fromLocation}
                      onChange={(e) => setNewTransport({ ...newTransport, fromLocation: e.target.value })}
                      className="gh-input"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-900 dark:text-[#ffffff] mb-2">
                      To *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., Paris"
                      value={newTransport.toLocation}
                      onChange={(e) => setNewTransport({ ...newTransport, toLocation: e.target.value })}
                      className="gh-input"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-900 dark:text-[#ffffff] mb-2">
                      Departure *
                    </label>
                    <input
                      type="datetime-local"
                      value={newTransport.departureDate as string}
                      onChange={e => {
                        let val = e.target.value;
                        // Allow user to type with space instead of T
                        if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(val)) {
                          val = val.replace(' ', 'T');
                        }
                        setNewTransport({ ...newTransport, departureDate: val });
                      }}
                      onBlur={e => {
                        let val = e.target.value;
                        if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(val)) {
                          val = val.replace(' ', 'T');
                          setNewTransport(prev => ({ ...prev, departureDate: val }));
                        }
                      }}
                      className="gh-input"
                      placeholder="YYYY-MM-DD HH:MM"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-900 dark:text-[#ffffff] mb-2">
                      Arrival *
                    </label>
                    <input
                      type="datetime-local"
                      value={newTransport.arrivalDate as string}
                      onChange={e => {
                        let val = e.target.value;
                        if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(val)) {
                          val = val.replace(' ', 'T');
                        }
                        setNewTransport({ ...newTransport, arrivalDate: val });
                      }}
                      onBlur={e => {
                        let val = e.target.value;
                        if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(val)) {
                          val = val.replace(' ', 'T');
                          setNewTransport(prev => ({ ...prev, arrivalDate: val }));
                        }
                      }}
                      className="gh-input"
                      placeholder="YYYY-MM-DD HH:MM"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-900 dark:text-[#ffffff] mb-2">
                      Price *
                    </label>
                    <input
                      type="number"
                      placeholder="0"
                      value={newTransport.price || ''}
                      onChange={(e) => setNewTransport({ ...newTransport, price: parseFloat(e.target.value) || 0 })}
                      className="gh-input"
                    />
                    {((newTransport.price || 0) > 0) && (
                      <p className="text-xs text-gray-500 dark:text-[#636366] mt-1">
                        {(() => {
                          const mainCurr = newJourney.currency || selectedJourney?.currency || 'PLN';
                          const from = newTransport.currency || mainCurr;
                          if (from === mainCurr) return null;
                          const conv = convertAmount(newTransport.price || 0, from, mainCurr);
                          if (conv == null) return <span>≈ conversion not available</span>;
                          return <span>≈ {conv.toFixed(2)} {mainCurr}</span>;
                        })()}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-900 dark:text-[#ffffff] mb-2">
                      Currency
                    </label>
                    <select
                      value={newTransport.currency}
                      onChange={(e) => setNewTransport({ ...newTransport, currency: e.target.value })}
                      className="gh-select"
                    >
                      <option value="PLN">PLN</option>
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                      <option value="GBP">GBP</option>
                      <option value="KRW">KRW</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-[#ffffff] mb-2">
                    Ticket URL/Attachment
                    <span className="text-xs text-gray-500 dark:text-[#98989d] ml-2">(Flight, train, or bus ticket link)</span>
                  </label>
                  <div className="flex gap-4">
                    <input
                      type="url"
                      placeholder="https://ryanair.com/... or Booking.com link"
                      value={newTransport.bookingUrl}
                      onChange={(e) => setNewTransport({ ...newTransport, bookingUrl: e.target.value })}
                      className="gh-input flex-1 h-12"
                    />
                    <button
                      type="button"
                      onClick={async () => {
                        if (!newTransport.bookingUrl) {
                          warning('Please enter a ticket URL first');
                          return;
                        }
                        try {
                          setLoading(true);
                          const data = await transportService.scrapeTicket(newTransport.bookingUrl);
                          setNewTransport({
                            ...newTransport,
                            fromLocation: data.fromLocation || newTransport.fromLocation,
                            toLocation: data.toLocation || newTransport.toLocation,
                            departureDate: data.departureDate || newTransport.departureDate,
                            arrivalDate: data.arrivalDate || newTransport.arrivalDate,
                            price: data.price || newTransport.price,
                            currency: data.currency || newTransport.currency,
                          });
                          success('Ticket data scraped successfully!');
                        } catch {
                          error('Failed to scrape ticket data');
                        } finally {
                          setLoading(false);
                        }
                      }}
                      className="gh-btn-secondary px-4 h-12"
                      disabled={loading || !newTransport.bookingUrl}
                    >
                      {loading ? '🔍' : '🎫 Auto-fill'}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-[#98989d] mt-1">
                    Paste a link from Ryanair, Wizz Air, LOT, PKP Intercity, or Booking.com to auto-fill flight/train details
                  </p>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowTransportForm(false)}
                  className="gh-btn-danger flex-1"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddTransport}
                  className="gh-btn-primary flex-1"
                  disabled={loading}
                >
                  {loading ? 'Adding...' : 'Add Transport'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Edit Transport Modal */}
      {showEditTransportForm && editingTransport && (
        <div className="gh-modal-overlay" onClick={() => setShowEditTransportForm(false)}>
          <div className="gh-modal" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-[#ffffff] mb-6">Edit Transportation</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-[#ffffff] mb-2">
                    Transport Type *
                  </label>
                  <select
                    value={editingTransport.type}
                    onChange={(e) => setEditingTransport({ ...editingTransport, type: e.target.value as Transport['type'] })}
                    className="gh-select"
                  >
                    <option value="flight">✈️ Flight</option>
                    <option value="train">🚆 Train</option>
                    <option value="bus">🚌 Bus</option>
                    <option value="car">🚗 Car</option>
                    <option value="other">🚢 Other</option>
                  </select>
                </div>
                
                {/* Conditional field for Flight Number */}
                {editingTransport.type === 'flight' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-900 dark:text-[#ffffff] mb-2">
                      Flight Number
                      <span className="text-xs text-gray-500 dark:text-[#98989d] ml-2">(e.g., LO123, FR1234)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., LO123"
                      value={editingTransport.flightNumber || ''}
                      onChange={(e) => setEditingTransport({ ...editingTransport, flightNumber: e.target.value })}
                      className="gh-input"
                    />
                  </div>
                )}
                
                {/* Conditional field for Train Number */}
                {editingTransport.type === 'train' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-900 dark:text-[#ffffff] mb-2">
                      Train Number
                      <span className="text-xs text-gray-500 dark:text-[#98989d] ml-2">(e.g., TLK 12345, IC 5002)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., TLK 12345"
                      value={editingTransport.trainNumber || ''}
                      onChange={(e) => setEditingTransport({ ...editingTransport, trainNumber: e.target.value })}
                      className="gh-input"
                    />
                  </div>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-900 dark:text-[#ffffff] mb-2">
                      From *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., Warsaw"
                      value={editingTransport.fromLocation}
                      onChange={(e) => setEditingTransport({ ...editingTransport, fromLocation: e.target.value })}
                      className="gh-input"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-900 dark:text-[#ffffff] mb-2">
                      To *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., Paris"
                      value={editingTransport.toLocation}
                      onChange={(e) => setEditingTransport({ ...editingTransport, toLocation: e.target.value })}
                      className="gh-input"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-900 dark:text-[#ffffff] mb-2">
                      Departure *
                    </label>
                    <input
                      type="datetime-local"
                      value={formatDateTimeForInput(editingTransport.departureDate)}
                      onChange={e => {
                        let val = e.target.value;
                        if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(val)) {
                          val = val.replace(' ', 'T');
                        }
                        setEditingTransport({ ...editingTransport, departureDate: val });
                      }}
                      onBlur={e => {
                        let val = e.target.value;
                        if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(val)) {
                          val = val.replace(' ', 'T');
                          if (editingTransport) setEditingTransport({ ...editingTransport, departureDate: val });
                        }
                      }}
                      className="gh-input"
                      placeholder="YYYY-MM-DD HH:MM"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-900 dark:text-[#ffffff] mb-2">
                      Arrival *
                    </label>
                    <input
                      type="datetime-local"
                      value={formatDateTimeForInput(editingTransport.arrivalDate)}
                      onChange={e => {
                        let val = e.target.value;
                        if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(val)) {
                          val = val.replace(' ', 'T');
                        }
                        setEditingTransport({ ...editingTransport, arrivalDate: val });
                      }}
                      onBlur={e => {
                        let val = e.target.value;
                        if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(val)) {
                          val = val.replace(' ', 'T');
                          if (editingTransport) setEditingTransport({ ...editingTransport, arrivalDate: val });
                        }
                      }}
                      className="gh-input"
                      placeholder="YYYY-MM-DD HH:MM"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-900 dark:text-[#ffffff] mb-2">
                      Price *
                    </label>
                    <input
                      type="number"
                      placeholder="0"
                      value={editingTransport.price || ''}
                      onChange={(e) => setEditingTransport({ ...editingTransport, price: parseFloat(e.target.value) || 0 })}
                      className="gh-input"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-900 dark:text-[#ffffff] mb-2">
                      Currency
                    </label>
                    <select
                      value={editingTransport.currency}
                      onChange={(e) => setEditingTransport({ ...editingTransport, currency: e.target.value })}
                      className="gh-select"
                    >
                      <option value="PLN">PLN</option>
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                      <option value="GBP">GBP</option>
                      <option value="KRW">KRW</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-[#ffffff] mb-2">
                    Ticket URL/Attachment
                  </label>
                  <input
                    type="url"
                    placeholder="https://..."
                    value={editingTransport.bookingUrl || ''}
                    onChange={(e) => setEditingTransport({ ...editingTransport, bookingUrl: e.target.value })}
                    className="gh-input h-12"
                  />
                  <div className="flex gap-4 items-center mt-4">
                    <input
                      type="file"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        setPendingFile(file);
                        setUploadingAttachment(null);
                      }}
                      ref={transportFileRef}
                      className="hidden"
                      accept={allowedFileTypes}
                    />

                    <div onClick={() => transportFileRef.current?.click()} className="w-3/4 cursor-pointer bg-gray-50 dark:bg-[#1c1c1e] px-4 h-12 rounded-md border border-gray-200 dark:border-[#38383a] flex items-center justify-between">
                      <span className={pendingFile ? 'text-sm text-white' : 'text-sm text-gray-500'}>{pendingFile ? `${pendingFile.name} • ${Math.round(pendingFile.size / 1024)} KB` : 'Choose file...'}</span>
                      <span className="text-sm text-gray-400">📎</span>
                    </div>

                    <button
                      onClick={async () => {
                        if (!pendingFile) { error('No file selected'); return; }
                        try {
                          setLoading(true);
                          const fd = new FormData();
                          fd.append('file', pendingFile);
                          fd.append('journeyId', String(selectedJourney?.id));
                          if (editingTransport?.id) fd.append('transportId', String(editingTransport.id));
                          const resp = await attachmentService.uploadAttachment(fd);
                          success('Attachment uploaded');
                          if (resp?.attachment) setAttachments(prev => [resp.attachment, ...(prev || [])]);
                          setUploadingAttachment(resp?.attachment ?? null);
                          setPendingFile(null);
                        } catch (err) {
                          error('Upload failed');
                        } finally { setLoading(false); }
                      }}
                      className="w-1/4 h-12 gh-btn-primary bg-green-500 hover:bg-green-600"
                    ><Plus className="w-4 h-4 mr-2" />Add</button>
                  </div>
                    {/* Removed temporary upload-preview and pending-file preview: only the chooser and Existing attachments are shown as requested */}
                    {/* Existing attachments for the transport being edited */}
                    {(editingTransport && attachments && attachments.length > 0) && (() => {
                      const attForEditingTransport = attachments.filter(a => Number(a.transportId ?? a.transport_id ?? a.transport) === (editingTransport.id ?? null));
                      if (!attForEditingTransport || attForEditingTransport.length === 0) return null;
                      return (
                        <div className="mt-3">
                          <div className="text-sm text-gray-600 dark:text-[#98989d] mb-2">Existing attachments</div>
                          <div className="space-y-2">
                            {attForEditingTransport.map((att: any) => renderAttachmentRow(att))}
                          </div>
                        </div>
                      );
                    })()}
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowEditTransportForm(false);
                    setEditingTransport(null);
                  }}
                  className="gh-btn-danger flex-1"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  onClick={handleEditTransport}
                  className="gh-btn-primary flex-1"
                  disabled={loading}
                >
                  {loading ? 'Updating...' : 'Update Transport'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Add Attraction Modal */}
      {showAttractionForm && (
        <div className="gh-modal-overlay" onClick={() => {
          setShowAttractionForm(false);
          setSelectedStopForAttraction(null);
        }}>
          <div className="gh-modal" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-[#ffffff]">Add Attraction</h2>
                <button
                  onClick={() => {
                    setShowAttractionForm(false);
                    setSelectedStopForAttraction(null);
                  }}
                  className="text-gray-600 dark:text-[#98989d] hover:text-gray-900 dark:text-[#ffffff]"
                >
                  <X className="w-6 h-6 text-black dark:text-white" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-[#ffffff] mb-2">
                    Attraction Name *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Eiffel Tower"
                    value={newAttraction.name}
                    onChange={(e) => setNewAttraction({ ...newAttraction, name: e.target.value })}
                    className="gh-input"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-[#ffffff] mb-2">
                    Description
                  </label>
                  <textarea
                    placeholder="Details about the attraction..."
                    value={newAttraction.description}
                    onChange={(e) => setNewAttraction({ ...newAttraction, description: e.target.value })}
                    className="gh-input h-24 resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-900 dark:text-[#ffffff] mb-2">
                      Estimated Cost
                    </label>
                    <input
                      type="number"
                      placeholder="0"
                      value={newAttraction.estimatedCost || ''}
                      onChange={(e) => setNewAttraction({ ...newAttraction, estimatedCost: parseFloat(e.target.value) || 0 })}
                      className="gh-input"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-900 dark:text-[#ffffff] mb-2">
                      Currency
                    </label>
                    <select
                      value={(newAttraction as any).currency || newJourney.currency || 'PLN'}
                      onChange={(e) => setNewAttraction({ ...newAttraction, currency: e.target.value })}
                      className="gh-select"
                    >
                      <option value="PLN">PLN</option>
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                      <option value="GBP">GBP</option>
                      <option value="KRW">KRW</option>
                    </select>
                    {((newAttraction.estimatedCost || 0) > 0) && (
                      <p className="text-xs text-gray-500 dark:text-[#636366] mt-2">
                        {(() => {
                          const mainCurr = newJourney.currency || selectedJourney?.currency || 'PLN';
                          const from = (newAttraction as any).currency || mainCurr;
                          if (from === mainCurr) return null;
                          const conv = convertAmount(newAttraction.estimatedCost || 0, from, mainCurr);
                          if (conv == null) return <span>≈ conversion not available</span>;
                          return <span>≈ {conv.toFixed(2)} {mainCurr}</span>;
                        })()}
                      </p>
                    )}
                  </div>
                </div>

                {/* Planned Day - only for multi-day stops */}
                {(() => {
                  const stop = selectedJourney?.stops?.find(s => s.id === selectedStopForAttraction);
                  if (!stop) return null;
                  
                  // Extract date portion without timezone conversion (use shared helper)
                  const getDateOnly = (dateStr: Date | string): string => toYMD(dateStr);

                  const arrivalDate = getDateOnly(stop.arrivalDate);
                  const departureDate = getDateOnly(stop.departureDate);

                  // Calculate days difference using local dates
                  const arrivalTime = parseYMDToDate(arrivalDate)!.getTime();
                  const departureTime = parseYMDToDate(departureDate)!.getTime();
                  const daysDiff = Math.ceil((departureTime - arrivalTime) / (1000 * 60 * 60 * 24));
                  
                  if (daysDiff < 1) return null;
                  
                  return (
                    <div>
                      <label className="block text-sm font-medium text-gray-900 dark:text-[#ffffff] mb-2">
                        📅 Planned Day
                      </label>
                      <input
                        type="date"
                        value={newAttraction.plannedDate || ''}
                        onChange={(e) => setNewAttraction({ ...newAttraction, plannedDate: e.target.value || undefined })}
                        min={arrivalDate}
                        max={departureDate}
                        className="gh-input max-w-[200px]"
                      />
                      {newAttraction.plannedDate && (
                        <p className="text-xs text-gray-500 dark:text-[#8e8e93] mt-1">
                          {(() => {
                            const d = parseYMDToDate(newAttraction.plannedDate);
                            return d ? d.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' }) : '';
                          })()}
                        </p>
                      )}
                    </div>
                  );
                })()}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-900 dark:text-[#ffffff] mb-2">
                      Duration
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., 2 hours"
                      value={newAttraction.duration}
                      onChange={(e) => setNewAttraction({ ...newAttraction, duration: e.target.value })}
                      className="gh-input"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-900 dark:text-[#ffffff] mb-2">
                      Visit Time
                    </label>
                    <input
                      type="time"
                      value={newAttraction.visitTime ?? ''}
                      onChange={(e) => setNewAttraction({ ...newAttraction, visitTime: e.target.value })}
                      onBlur={(e) => {
                        const v = e.target.value;
                        setNewAttraction((prev) => ({ ...prev, visitTime: isValidTime(v) ? v : '' }));
                      }}
                      className="gh-input"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-900 dark:text-[#ffffff] mb-2">
                      Opening Time
                    </label>
                    <input
                      type="time"
                      value={newAttraction.openingTime ?? ''}
                      onChange={(e) => setNewAttraction({ ...newAttraction, openingTime: e.target.value })}
                      onBlur={(e) => {
                        const v = e.target.value;
                        setNewAttraction((prev) => ({ ...prev, openingTime: isValidTime(v) ? v : '' }));
                      }}
                      className="gh-input"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-900 dark:text-[#ffffff] mb-2">
                      Closing Time
                    </label>
                    <input
                      type="time"
                      value={newAttraction.closingTime ?? ''}
                      onChange={(e) => setNewAttraction({ ...newAttraction, closingTime: e.target.value })}
                      onBlur={(e) => {
                        const v = e.target.value;
                        setNewAttraction((prev) => ({ ...prev, closingTime: isValidTime(v) ? v : '' }));
                      }}
                      className="gh-input"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-[#ffffff] mb-2">
                    Category Tag
                  </label>
                  <select
                    value={newAttraction.tag || ''}
                    onChange={(e) => setNewAttraction({ ...newAttraction, tag: e.target.value as any || undefined })}
                    className="gh-select"
                  >
                    <option value="">No category</option>
                    {getAvailableAttractionTags().map(tag => (
                      <option key={tag.value} value={tag.value}>
                        {tag.emoji} {tag.label}
                      </option>
                    ))}
                  </select>
                  {newAttraction.tag && (() => {
                    const tagInfo = getAttractionTagInfo(newAttraction.tag);
                    return tagInfo && (
                      <p className="text-xs text-gray-500 dark:text-[#8e8e93] mt-1">
                        {tagInfo.emoji} {tagInfo.label}
                      </p>
                    );
                  })()}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-[#ffffff] mb-2">
                    Address
                  </label>
                  <div className="space-y-3">
                    <input
                      type="text"
                      placeholder="Street and number"
                      value={newAttraction.addressStreet || ''}
                      onChange={(e) => setNewAttraction({ ...newAttraction, addressStreet: e.target.value })}
                      className="gh-input"
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        type="text"
                        placeholder="City"
                        value={newAttraction.addressCity || ''}
                        onChange={(e) => setNewAttraction({ ...newAttraction, addressCity: e.target.value })}
                        className="gh-input"
                      />
                      <input
                        type="text"
                        placeholder="Postal Code"
                        value={newAttraction.addressPostalCode || ''}
                        onChange={(e) => setNewAttraction({ ...newAttraction, addressPostalCode: e.target.value })}
                        className="gh-input"
                      />
                    </div>
                    <input
                      type="text"
                      placeholder="Country"
                      value={newAttraction.addressCountry || ''}
                      onChange={(e) => setNewAttraction({ ...newAttraction, addressCountry: e.target.value })}
                      className="gh-input"
                    />
                    <button
                      onClick={handleGeocodeAttraction}
                      disabled={geocodingAttraction || !(newAttraction.addressStreet || newAttraction.addressCity || newAttraction.addressPostalCode || newAttraction.addressCountry)}
                      className="gh-btn-primary w-full flex items-center justify-center gap-2"
                    >
                      <MapPin className="w-4 h-4" />
                      {geocodingAttraction ? 'Finding coordinates...' : 'Locate on Map'}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-900 dark:text-[#ffffff] mb-2">
                      Latitude {newAttraction.latitude && '✓'}
                    </label>
                    <input
                      type="number"
                      step="0.000001"
                      placeholder="Auto-filled"
                      value={newAttraction.latitude || ''}
                      onChange={(e) => setNewAttraction({ ...newAttraction, latitude: parseFloat(e.target.value) || undefined })}
                      className="gh-input bg-gray-50 dark:bg-[#2c2c2e]"
                      readOnly
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-900 dark:text-[#ffffff] mb-2">
                      Longitude {newAttraction.longitude && '✓'}
                    </label>
                    <input
                      type="number"
                      step="0.000001"
                      placeholder="Auto-filled"
                      value={newAttraction.longitude || ''}
                      onChange={(e) => setNewAttraction({ ...newAttraction, longitude: parseFloat(e.target.value) || undefined })}
                      className="gh-input bg-gray-50 dark:bg-[#2c2c2e]"
                      readOnly
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowAttractionForm(false);
                    setSelectedStopForAttraction(null);
                  }}
                  className="gh-btn-danger flex-1"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddAttraction}
                  className="gh-btn-primary flex-1"
                  disabled={loading}
                >
                  {loading ? 'Adding...' : 'Add Attraction'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Attraction Modal */}
      {showEditAttractionForm && editingAttraction && (
        <div className="gh-modal-overlay" onClick={() => {
          setShowEditAttractionForm(false);
          setEditingAttraction(null);
          setEditingAttractionStopId(null);
        }}>
          <div className="gh-modal" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-[#ffffff]">Edit Attraction</h2>
                <button
                  onClick={() => {
                    setShowEditAttractionForm(false);
                    setEditingAttraction(null);
                    setEditingAttractionStopId(null);
                  }}
                  className="text-gray-600 dark:text-[#98989d] hover:text-gray-900 dark:text-[#ffffff]"
                >
                  <X className="w-6 h-6 text-black dark:text-white" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-[#ffffff] mb-2">
                    Attraction Name *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Eiffel Tower"
                    value={editingAttraction.name}
                    onChange={(e) => setEditingAttraction({ ...editingAttraction, name: e.target.value })}
                    className="gh-input"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-[#ffffff] mb-2">
                    Description
                  </label>
                  <textarea
                    placeholder="Details about the attraction..."
                    value={editingAttraction.description || ''}
                    onChange={(e) => setEditingAttraction({ ...editingAttraction, description: e.target.value })}
                    className="gh-input h-24 resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-900 dark:text-[#ffffff] mb-2">
                      Estimated Cost
                    </label>
                    <input
                      type="number"
                      placeholder="0"
                      value={editingAttraction.estimatedCost || ''}
                      onChange={(e) => setEditingAttraction({ ...editingAttraction, estimatedCost: parseFloat(e.target.value) || 0 })}
                      className="gh-input"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-900 dark:text-[#ffffff] mb-2">
                      Currency
                    </label>
                    <select
                      value={(editingAttraction as any).currency || selectedJourney?.currency || 'PLN'}
                      onChange={(e) => setEditingAttraction({ ...editingAttraction, currency: e.target.value })}
                      className="gh-select"
                    >
                      <option value="PLN">PLN</option>
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                      <option value="GBP">GBP</option>
                      <option value="KRW">KRW</option>
                    </select>
                  </div>
                </div>

                {/* Planned Day - only for multi-day stops */}
                {(() => {
                  const stop = selectedJourney?.stops?.find(s => s.id === editingAttractionStopId);
                  if (!stop) return null;
                  
                  // Extract date portion without timezone conversion (use shared helper)
                  const getDateOnly = (dateStr: Date | string): string => toYMD(dateStr);

                  const arrivalDate = getDateOnly(stop.arrivalDate);
                  const departureDate = getDateOnly(stop.departureDate);

                  // Calculate days difference using local dates
                  const arrivalTime = parseYMDToDate(arrivalDate)!.getTime();
                  const departureTime = parseYMDToDate(departureDate)!.getTime();
                  const daysDiff = Math.ceil((departureTime - arrivalTime) / (1000 * 60 * 60 * 24));
                  
                  if (daysDiff < 1) return null;
                  
                  return (
                    <div>
                      <label className="block text-sm font-medium text-gray-900 dark:text-[#ffffff] mb-2">
                        📅 Planned Day
                      </label>
                      <input
                        type="date"
                        value={editingAttraction.plannedDate || ''}
                        onChange={(e) => setEditingAttraction({ ...editingAttraction, plannedDate: e.target.value || undefined })}
                        min={arrivalDate}
                        max={departureDate}
                        className="gh-input max-w-[200px]"
                      />
                      {editingAttraction.plannedDate && (
                        <p className="text-xs text-gray-500 dark:text-[#8e8e93] mt-1">
                          {(() => {
                            const d = parseYMDToDate(editingAttraction.plannedDate);
                            return d ? d.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' }) : '';
                          })()}
                        </p>
                      )}
                    </div>
                  );
                })()}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-900 dark:text-[#ffffff] mb-2">
                      Duration
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., 2 hours"
                      value={editingAttraction.duration || ''}
                      onChange={(e) => setEditingAttraction({ ...editingAttraction, duration: e.target.value })}
                      className="gh-input"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-900 dark:text-[#ffffff] mb-2">
                      Visit Time
                    </label>
                    <input
                      type="time"
                      value={editingAttraction.visitTime ?? ''}
                      onChange={(e) => setEditingAttraction({ ...editingAttraction, visitTime: e.target.value })}
                      onBlur={(e) => {
                        const v = e.target.value;
                        if (editingAttraction) setEditingAttraction({ ...editingAttraction, visitTime: isValidTime(v) ? v : '' });
                      }}
                      className="gh-input"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-900 dark:text-[#ffffff] mb-2">
                      Opening Time
                    </label>
                    <input
                      type="time"
                      value={editingAttraction.openingTime ?? ''}
                      onChange={(e) => setEditingAttraction({ ...editingAttraction, openingTime: e.target.value })}
                      onBlur={(e) => {
                        const v = e.target.value;
                        if (editingAttraction) setEditingAttraction({ ...editingAttraction, openingTime: isValidTime(v) ? v : '' });
                      }}
                      className="gh-input"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-900 dark:text-[#ffffff] mb-2">
                      Closing Time
                    </label>
                    <input
                      type="time"
                      value={editingAttraction.closingTime ?? ''}
                      onChange={(e) => setEditingAttraction({ ...editingAttraction, closingTime: e.target.value })}
                      onBlur={(e) => {
                        const v = e.target.value;
                        if (editingAttraction) setEditingAttraction({ ...editingAttraction, closingTime: isValidTime(v) ? v : '' });
                      }}
                      className="gh-input"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-[#ffffff] mb-2">
                    Category Tag
                  </label>
                  <select
                    value={editingAttraction.tag || ''}
                    onChange={(e) => setEditingAttraction({ ...editingAttraction, tag: e.target.value as any || undefined })}
                    className="gh-select"
                  >
                    <option value="">No category</option>
                    {getAvailableAttractionTags().map(tag => (
                      <option key={tag.value} value={tag.value}>
                        {tag.emoji} {tag.label}
                      </option>
                    ))}
                  </select>
                  {editingAttraction.tag && (() => {
                    const tagInfo = getAttractionTagInfo(editingAttraction.tag);
                    return tagInfo && (
                      <p className="text-xs text-gray-500 dark:text-[#8e8e93] mt-1">
                        {tagInfo.emoji} {tagInfo.label}
                      </p>
                    );
                  })()}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-[#ffffff] mb-2">
                    Address
                  </label>
                  <div className="space-y-3">
                    <input
                      type="text"
                      placeholder="Street and number"
                      value={editingAttraction.addressStreet || ''}
                      onChange={(e) => setEditingAttraction({ ...editingAttraction, addressStreet: e.target.value })}
                      className="gh-input"
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        type="text"
                        placeholder="City"
                        value={editingAttraction.addressCity || ''}
                        onChange={(e) => setEditingAttraction({ ...editingAttraction, addressCity: e.target.value })}
                        className="gh-input"
                      />
                      <input
                        type="text"
                        placeholder="Postal Code"
                        value={editingAttraction.addressPostalCode || ''}
                        onChange={(e) => setEditingAttraction({ ...editingAttraction, addressPostalCode: e.target.value })}
                        className="gh-input"
                      />
                    </div>
                    <input
                      type="text"
                      placeholder="Country"
                      value={editingAttraction.addressCountry || ''}
                      onChange={(e) => setEditingAttraction({ ...editingAttraction, addressCountry: e.target.value })}
                      className="gh-input"
                    />
                    <button
                      onClick={handleGeocodeEditAttraction}
                      disabled={geocodingEditAttraction || !(editingAttraction.addressStreet || editingAttraction.addressCity || editingAttraction.addressPostalCode || editingAttraction.addressCountry)}
                      className="gh-btn-primary w-full flex items-center justify-center gap-2"
                    >
                      <MapPin className="w-4 h-4" />
                      {geocodingEditAttraction ? 'Finding coordinates...' : 'Locate on Map'}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-900 dark:text-[#ffffff] mb-2">
                      Latitude {editingAttraction.latitude && '✓'}
                    </label>
                    <input
                      type="number"
                      step="0.000001"
                      placeholder="Auto-filled"
                      value={editingAttraction.latitude || ''}
                      onChange={(e) => setEditingAttraction({ ...editingAttraction, latitude: parseFloat(e.target.value) || undefined })}
                      className="gh-input bg-gray-50 dark:bg-[#2c2c2e]"
                      readOnly
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-900 dark:text-[#ffffff] mb-2">
                      Longitude {editingAttraction.longitude && '✓'}
                    </label>
                    <input
                      type="number"
                      step="0.000001"
                      placeholder="Auto-filled"
                      value={editingAttraction.longitude || ''}
                      onChange={(e) => setEditingAttraction({ ...editingAttraction, longitude: parseFloat(e.target.value) || undefined })}
                      className="gh-input bg-gray-50 dark:bg-[#2c2c2e]"
                      readOnly
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowEditAttractionForm(false);
                    setEditingAttraction(null);
                    setEditingAttractionStopId(null);
                  }}
                  className="gh-btn-danger flex-1"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  onClick={handleEditAttraction}
                  className="gh-btn-primary flex-1"
                  disabled={loading}
                >
                  {loading ? 'Updating...' : 'Update Attraction'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onClose={closeToast} />

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmHook.isOpen}
        title={confirmHook.options.title}
        message={confirmHook.options.message}
        confirmText={confirmHook.options.confirmText}
        cancelText={confirmHook.options.cancelText}
        confirmVariant={confirmHook.options.confirmVariant}
        onConfirm={confirmHook.handleConfirm}
        onCancel={confirmHook.handleCancel}
      />
    </div>
  );
}

export default App;
