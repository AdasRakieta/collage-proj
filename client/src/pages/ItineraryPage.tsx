import React, { useState, useEffect, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  MapPin,
  Calendar,
  Clock,
  GripVertical,
  Star,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Loader2,
  Save,
  RotateCcw,
  Filter,
  Check,
  Map,
  Sparkles,
  CalendarDays,
  List,
  Navigation,
  Plus,
  Edit2,
  Trash2,
  X
} from 'lucide-react';
import { journeyService, attractionService } from '../services/api';
import { socketService } from '../services/socket';
import type { Journey, Stop, Attraction } from '../types/journey';
import { useToast, ToastContainer } from '../components/Toast';
import JourneyMapWrapper from '../components/JourneyMapWrapper';
import { getAttractionTagInfo, getAvailableAttractionTags } from '../utils/attractionTags';
import { geocodeAddress } from '../services/geocoding';

// Helper function for time validation
const isValidTime = (t: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(t);

// Helper function to parse duration string to minutes
const parseDurationToMinutes = (duration: string): number => {
  if (!duration) return 0;
  
  // Match various formats: "5h", "5 h", "5 hours", "5hours", "2.5h", "2.5 hours"
  const hourMatch = duration.match(/(\d+(?:\.\d+)?)\s*h(?:ours?)?/i);
  // Match: "30m", "30 m", "30 minutes", "30min"
  const minMatch = duration.match(/(\d+)\s*m(?:in(?:utes?)?)?/i);
  
  let minutes = 0;
  if (hourMatch) {
    minutes += parseFloat(hourMatch[1]) * 60;
  } else if (minMatch) {
    minutes += parseInt(minMatch[1]);
  } else {
    // If no unit specified, try to parse as plain number (assume hours)
    const plainNumber = parseFloat(duration);
    if (!isNaN(plainNumber)) {
      minutes = plainNumber * 60;
    }
  }
  
  return minutes;
};

// Helper function to add minutes to time string
const addMinutesToTime = (time: string, minutes: number): string => {
  if (!time || !isValidTime(time)) return '';
  const [h, m] = time.split(':').map(Number);
  const totalMinutes = h * 60 + m + minutes;
  const hours = Math.floor(totalMinutes / 60) % 24;
  const mins = totalMinutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
};

// Priority configuration with colors and labels
const PRIORITY_CONFIG = {
  must: { 
    label: 'Must See', 
    shortLabel: 'Must',
    color: 'bg-red-500 dark:bg-[#ff453a]', 
    textColor: 'text-red-600 dark:text-[#ff453a]',
    bgLight: 'bg-red-50 dark:bg-[#ff453a]/10',
    borderColor: 'border-red-300 dark:border-[#ff453a]/30'
  },
  should: { 
    label: 'Important', 
    shortLabel: 'Should',
    color: 'bg-orange-500 dark:bg-[#ff9f0a]', 
    textColor: 'text-orange-600 dark:text-[#ff9f0a]',
    bgLight: 'bg-orange-50 dark:bg-[#ff9f0a]/10',
    borderColor: 'border-orange-300 dark:border-[#ff9f0a]/30'
  },
  could: { 
    label: 'Opcjonalne', 
    shortLabel: 'Could',
    color: 'bg-blue-500 dark:bg-[#0a84ff]', 
    textColor: 'text-blue-600 dark:text-[#0a84ff]',
    bgLight: 'bg-blue-50 dark:bg-[#0a84ff]/10',
    borderColor: 'border-blue-300 dark:border-[#0a84ff]/30'
  },
  skip: { 
    label: 'Skip', 
    shortLabel: 'Skip',
    color: 'bg-gray-400 dark:bg-[#636366]', 
    textColor: 'text-gray-500 dark:text-[#636366]',
    bgLight: 'bg-gray-100 dark:bg-[#636366]/10',
    borderColor: 'border-gray-300 dark:border-[#636366]/30'
  },
};

type PriorityType = keyof typeof PRIORITY_CONFIG;

// Format date for display (use local parsing to avoid timezone shifts)
const formatDateForDisplay = (date: Date | string | undefined): string => {
  if (!date) return '';
  const d = parseYMDToDate(date);
  if (!d) return '';
  return d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' });
};

// Format date key YYYY-MM-DD
// Parse a DB date string (YYYY-MM-DD or YYYY-MM-DDTHH:MM:SS) into a local Date (no timezone shift)
const parseYMDToDate = (date: Date | string | undefined | null): Date | null => {
  if (!date) return null;
  if (date instanceof Date) return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const s = String(date);
  // Match YYYY-MM-DD at start
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) {
    const y = Number(m[1]);
    const mo = Number(m[2]);
    const d = Number(m[3]);
    return new Date(y, mo - 1, d);
  }
  // Fallback: try to construct a Date and take local YMD
  const dd = new Date(s);
  if (!isNaN(dd.getTime())) return new Date(dd.getFullYear(), dd.getMonth(), dd.getDate());
  return null;
};

// Return YYYY-MM-DD for a date-like input, preserving DB's day
const toYMD = (date: Date | string | undefined | null): string => {
  const d = parseYMDToDate(date);
  if (!d) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

// Calculate distance between two points (Haversine formula)
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371; // Radius of Earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

// Optimize route using nearest neighbor algorithm (TSP approximation)
const optimizeRoute = (attractions: Attraction[], startLat?: number, startLon?: number): Attraction[] => {
  if (attractions.length <= 1) return attractions;
  
  const withCoords = attractions.filter(a => a.latitude && a.longitude);
  const withoutCoords = attractions.filter(a => !a.latitude || !a.longitude);
  
  if (withCoords.length === 0) return attractions;
  
  const optimized: Attraction[] = [];
  const remaining = [...withCoords];
  
  // Start from accommodation or first attraction
  let currentLat = startLat || withCoords[0].latitude!;
  let currentLon = startLon || withCoords[0].longitude!;
  
  while (remaining.length > 0) {
    let nearestIndex = 0;
    let nearestDistance = Infinity;
    
    remaining.forEach((attr, index) => {
      const dist = calculateDistance(currentLat, currentLon, attr.latitude!, attr.longitude!);
      if (dist < nearestDistance) {
        nearestDistance = dist;
        nearestIndex = index;
      }
    });
    
    const nearest = remaining.splice(nearestIndex, 1)[0];
    optimized.push(nearest);
    currentLat = nearest.latitude!;
    currentLon = nearest.longitude!;
  }
  
  // Add attractions without coordinates at the end
  return [...optimized, ...withoutCoords];
};

// Priority Badge Component
const PriorityBadge: React.FC<{ priority?: PriorityType; compact?: boolean }> = ({ priority, compact }) => {
  if (!priority || priority === 'should') return null; // 'should' is default, don't show
  
  const config = PRIORITY_CONFIG[priority];
  
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${config.bgLight} ${config.textColor} ${config.borderColor} border`}>
      {priority === 'must' && <Star size={10} className="mr-1" />}
      {priority === 'skip' && <AlertTriangle size={10} className="mr-1" />}
      {compact ? config.shortLabel : config.label}
    </span>
  );
};

// Draggable Attraction Card Component
const AttractionCard: React.FC<{
  attraction: Attraction;
  stop?: Stop;
  onPriorityChange: (id: number, priority: PriorityType) => void;
  onPlannedDateChange?: (id: number, date: string | null) => void;
  onDragStart: (e: React.DragEvent, attraction: Attraction) => void;
  onDragEnd: (e: React.DragEvent) => void;
  isDragging: boolean;
  isDropTarget?: boolean;
  onEdit?: (attraction: Attraction) => void;
  onDelete?: (id: number) => void;
}> = ({ attraction, stop, onPriorityChange, onPlannedDateChange, onDragStart, onDragEnd, isDragging, isDropTarget, onEdit, onDelete }) => {
  const [showPriorityMenu, setShowPriorityMenu] = useState(false);
  
  const currentPriority = attraction.priority || 'should';
  const config = PRIORITY_CONFIG[currentPriority];
  
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, attraction)}
      onDragEnd={onDragEnd}
      className={`
        group flex items-start gap-3 p-3 rounded-lg border transition-all duration-200
        ${isDragging ? 'opacity-50 scale-95' : ''}
        ${isDropTarget ? 'border-blue-500 dark:border-[#0a84ff] bg-blue-50 dark:bg-[#0a84ff]/10' : ''}
        ${currentPriority === 'skip' 
          ? 'bg-gray-50 dark:bg-[#1c1c1e]/50 border-gray-200 dark:border-[#38383a]/50 opacity-60' 
          : 'bg-white dark:bg-[#2c2c2e] border-gray-200 dark:border-[#38383a]'}
        hover:border-gray-300 dark:hover:border-[#48484a] cursor-grab active:cursor-grabbing
      `}
    >
      {/* Drag Handle */}
      <div className="flex-shrink-0 pt-1 text-gray-400 dark:text-[#636366] opacity-0 group-hover:opacity-100 transition-opacity">
        <GripVertical size={16} />
      </div>
      
      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className={`font-medium truncate ${currentPriority === 'skip' ? 'line-through text-gray-500 dark:text-[#636366]' : 'text-gray-900 dark:text-white'}`}>
                {attraction.name}
              </h4>
              {attraction.tag && (() => {
                const tagInfo = getAttractionTagInfo(attraction.tag);
                return tagInfo && (
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border shrink-0 ${tagInfo.bgLight} ${tagInfo.textColor} ${tagInfo.borderColor}`}
                  >
                    {tagInfo.emoji} {tagInfo.label}
                  </span>
                );
              })()}
            </div>
            {attraction.description && (
              <p className="text-sm text-gray-500 dark:text-[#8e8e93] line-clamp-2 mt-0.5">
                {attraction.description}
              </p>
            )}
          </div>
          
          {/* Action Buttons & Priority Badge */}
          <div className="flex items-start gap-1 flex-shrink-0">
            {/* Edit & Delete buttons */}
            {(onEdit || onDelete) && (
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {onEdit && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(attraction);
                    }}
                    className="p-1 rounded hover:bg-gray-100 dark:hover:bg-[#3a3a3c] text-gray-600 dark:text-[#8e8e93] hover:text-blue-600 dark:hover:text-[#0a84ff] transition-colors"
                    title="Edit attraction"
                  >
                    <Edit2 size={14} />
                  </button>
                )}
                {onDelete && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(attraction.id!);
                    }}
                    className="p-1 rounded hover:bg-gray-100 dark:hover:bg-[#3a3a3c] text-gray-600 dark:text-[#8e8e93] hover:text-red-600 dark:hover:text-[#ff453a] transition-colors"
                    title="Delete attraction"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            )}
            
            {/* Priority Badge & Dropdown */}
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowPriorityMenu(!showPriorityMenu);
                }}
                className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-colors
                  ${config.bgLight} ${config.textColor} hover:opacity-80`}
              >
                {config.shortLabel}
                <ChevronDown size={12} />
              </button>
            
            {showPriorityMenu && (
              <>
                <div 
                  className="fixed inset-0 z-10" 
                  onClick={() => setShowPriorityMenu(false)} 
                />
                <div className="absolute right-0 top-full mt-1 z-20 w-36 bg-white dark:bg-[#2c2c2e] rounded-lg shadow-lg border border-gray-200 dark:border-[#38383a] py-1 overflow-hidden">
                  {(Object.keys(PRIORITY_CONFIG) as PriorityType[]).map((key) => (
                    <button
                      key={key}
                      onClick={(e) => {
                        e.stopPropagation();
                        onPriorityChange(attraction.id!, key);
                        setShowPriorityMenu(false);
                      }}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-[#3a3a3c] transition-colors
                        ${currentPriority === key ? 'bg-gray-50 dark:bg-[#3a3a3c]' : ''}`}
                    >
                      <span className={`w-2 h-2 rounded-full ${PRIORITY_CONFIG[key].color}`} />
                      <span className="text-gray-900 dark:text-white">{PRIORITY_CONFIG[key].label}</span>
                      {currentPriority === key && (
                        <Check size={14} className="ml-auto text-green-500 dark:text-[#30d158]" />
                      )}
                    </button>
                  ))}
                </div>
              </>
            )}
            </div>
          </div>
        </div>
        
        {/* Meta info - basic details */}
        <div className="flex items-center gap-3 mt-2 text-xs text-gray-500 dark:text-[#8e8e93]">
              {attraction.plannedDate && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-blue-100 dark:bg-[#0a84ff]/20 text-blue-600 dark:text-[#0a84ff] font-medium">
              📅 {(() => {
                const dateObj = parseYMDToDate(attraction.plannedDate);
                return dateObj ? dateObj.toLocaleDateString('en-US', { day: 'numeric', month: 'short' }) : '';
              })()}
            </span>
          )}
          {attraction.visitTime && (
            <span className="flex items-center gap-1">
              <Clock size={12} />
              {attraction.visitTime}
            </span>
          )}
          {attraction.duration && (
            <span className="flex items-center gap-1">
              ⏱️ {attraction.duration}
            </span>
          )}
          {attraction.estimatedCost && attraction.estimatedCost > 0 && (
            <span className="text-green-600 dark:text-[#30d158]">
              {attraction.estimatedCost} {attraction.currency || 'PLN'}
            </span>
          )}
        </div>

        {/* Timeline visualization - showing visit schedule */}
        {(attraction.visitTime || attraction.openingTime) && (
          <div className="mt-3 p-3 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-[#0a84ff]/10 dark:to-[#5e5ce6]/10 border border-blue-200 dark:border-[#0a84ff]/30">
            <div className="flex items-center gap-2 text-xs">
              {/* Opening time */}
              {attraction.openingTime && (
                <div className="flex items-center gap-1 text-gray-600 dark:text-[#8e8e93]">
                  <span className="font-medium">Opens:</span>
                  <span className="font-mono bg-white dark:bg-[#2c2c2e] px-1.5 py-0.5 rounded">{attraction.openingTime}</span>
                </div>
              )}
              
              {/* Visit time range */}
              {attraction.visitTime && (
                <>
                  <div className="flex-1 flex items-center justify-center">
                    <div className="px-3 py-1 rounded-md bg-blue-500 dark:bg-[#0a84ff] text-white font-medium font-mono shadow-sm">
                      {attraction.visitTime}
                      {attraction.duration && (() => {
                        const durationMin = parseDurationToMinutes(attraction.duration);
                        const endTime = addMinutesToTime(attraction.visitTime!, durationMin);
                        return endTime ? ` - ${endTime}` : '';
                      })()}
                    </div>
                    {attraction.duration && (
                      <span className="ml-2 text-gray-500 dark:text-[#636366]">
                        ({attraction.duration})
                      </span>
                    )}
                  </div>
                </>
              )}
              
              {/* Closing time */}
              {attraction.closingTime && (
                <div className="flex items-center gap-1 text-gray-600 dark:text-[#8e8e93]">
                  <span className="font-medium">Closes:</span>
                  <span className="font-mono bg-white dark:bg-[#2c2c2e] px-1.5 py-0.5 rounded">{attraction.closingTime}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Stop Section Component with droppable area
const StopSection: React.FC<{
  stop: Stop;
  attractions: Attraction[];
  isExpanded: boolean;
  onToggle: () => void;
  onPriorityChange: (attractionId: number, priority: PriorityType) => void;
  onPlannedDateChange: (attractionId: number, date: string | null) => void;
  onDragStart: (e: React.DragEvent, attraction: Attraction) => void;
  onDragEnd: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, stopId: number, index: number) => void;
  onDragOver: (e: React.DragEvent) => void;
  draggingAttraction: Attraction | null;
  dragOverStopId: number | null;
  onOptimize: (stopId: number) => void;
  onShowMap: (stopId: number) => void;
  onAddAttraction?: (stopId: number) => void;
  onEditAttraction?: (attraction: Attraction) => void;
  onDeleteAttraction?: (id: number) => void;
}> = ({
  stop,
  attractions,
  isExpanded,
  onToggle,
  onPriorityChange,
  onPlannedDateChange,
  onDragStart,
  onDragEnd,
  onDrop,
  onDragOver,
  draggingAttraction,
  dragOverStopId,
  onOptimize,
  onShowMap,
  onAddAttraction,
  onEditAttraction,
  onDeleteAttraction
}) => {
  const sortedAttractions = [...attractions].sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));
  const isDropTarget = dragOverStopId === stop.id;
  
  // Count by priority
  const mustCount = sortedAttractions.filter(a => a.priority === 'must').length;
  const skipCount = sortedAttractions.filter(a => a.priority === 'skip').length;
  
  // Check if attractions have coordinates
  const hasCoordinates = sortedAttractions.some(a => a.latitude && a.longitude);
  
  // Calculate days in stop
  const getDateOnly = (dateStr: Date | string): string => {
    return toYMD(dateStr);
  };
  
  const stopArrivalDate = getDateOnly(stop.arrivalDate);
  const stopDepartureDate = getDateOnly(stop.departureDate);
  const stopArrival = parseYMDToDate(stopArrivalDate)!;
  const stopDeparture = parseYMDToDate(stopDepartureDate)!;
  const daysDiff = Math.ceil((stopDeparture.getTime() - stopArrival.getTime()) / (1000 * 60 * 60 * 24));
  const daysCount = daysDiff + 1; // Include arrival day
  
  // Group attractions by day
  const attractionsByDay: Record<string, Attraction[]> = {};
  const unscheduledAttractions: Attraction[] = [];
  
  // Generate array of dates for this stop
  const stopDates: string[] = [];
  for (let i = 0; i < daysCount; i++) {
    const date = new Date(stopArrival.getFullYear(), stopArrival.getMonth(), stopArrival.getDate());
    date.setDate(date.getDate() + i);
    const dateStr = toYMD(date);
    stopDates.push(dateStr);
    attractionsByDay[dateStr] = [];
  }
  
  // Assign attractions to days
  sortedAttractions.forEach(attr => {
    if (attr.plannedDate) {
      const plannedDateStr = toYMD(attr.plannedDate);
      if (attractionsByDay[plannedDateStr]) {
        attractionsByDay[plannedDateStr].push(attr);
      } else {
        unscheduledAttractions.push(attr);
      }
    } else {
      unscheduledAttractions.push(attr);
    }
  });
  
  return (
    <div 
      className={`rounded-xl border transition-all duration-200 ${
        isDropTarget 
          ? 'border-blue-500 dark:border-[#0a84ff] shadow-md' 
          : 'border-gray-200 dark:border-[#38383a]'
      } bg-white dark:bg-[#2c2c2e]`}
      onDragOver={(e) => {
        e.preventDefault();
        onDragOver(e);
      }}
      onDrop={(e) => onDrop(e, stop.id!, sortedAttractions.length)}
    >
      {/* Stop Header */}
      <div className="flex items-center gap-3 p-4">
        <button
          onClick={onToggle}
          className="flex items-center gap-3 flex-1 hover:bg-gray-50 dark:hover:bg-[#3a3a3c] transition-colors rounded-lg p-2 -m-2"
        >
          <div className={`flex-shrink-0 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}>
            <ChevronRight size={20} className="text-gray-500 dark:text-[#8e8e93]" />
          </div>
          
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-100 dark:bg-[#0a84ff]/20 flex items-center justify-center">
            <MapPin size={18} className="text-blue-600 dark:text-[#0a84ff]" />
          </div>
          
          <div className="flex-1 min-w-0 text-left">
            <h3 className="font-semibold text-gray-900 dark:text-white truncate">
              {stop.city}
              {daysCount > 1 && (
                <span className="ml-2 text-sm font-normal text-blue-600 dark:text-[#0a84ff]">
                  ({daysCount} {daysCount === 2 ? 'dni' : daysCount === 3 ? 'dni' : daysCount === 4 ? 'dni' : 'dni'})
                </span>
              )}
            </h3>
            <p className="text-sm text-gray-500 dark:text-[#8e8e93]">
              {stop.country} • {formatDateForDisplay(stop.arrivalDate)} - {formatDateForDisplay(stop.departureDate)}
            </p>
          </div>
          
          {/* Badges */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {mustCount > 0 && (
              <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-50 dark:bg-[#ff453a]/10 text-red-600 dark:text-[#ff453a]">
                {mustCount} must
              </span>
            )}
            {skipCount > 0 && (
              <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 dark:bg-[#636366]/10 text-gray-500 dark:text-[#636366]">
                {skipCount} skip
              </span>
            )}
            <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 dark:bg-[#3a3a3c] text-gray-600 dark:text-[#8e8e93]">
              {sortedAttractions.length} attractions
            </span>
          </div>
        </button>
        
        {/* Action buttons */}
        {isExpanded && sortedAttractions.length > 0 && (
          <div className="flex items-center gap-2 flex-shrink-0">
            {hasCoordinates && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onOptimize(stop.id!);
                  }}
                  className="p-2 rounded-lg hover:bg-blue-100 dark:hover:bg-[#0a84ff]/20 text-blue-600 dark:text-[#0a84ff] transition-colors"
                  title="Optimize route"
                >
                  <Sparkles size={18} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onShowMap(stop.id!);
                  }}
                  className="p-2 rounded-lg hover:bg-blue-100 dark:hover:bg-[#0a84ff]/20 text-blue-600 dark:text-[#0a84ff] transition-colors"
                  title="Show on map"
                >
                  <Navigation size={18} />
                </button>
              </>
            )}
          </div>
        )}
      </div>
      
      {/* Attractions List */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-4">
          {sortedAttractions.length === 0 ? (
            <div 
              className={`py-8 text-center rounded-lg border-2 border-dashed transition-colors ${
                isDropTarget 
                  ? 'border-blue-500 dark:border-[#0a84ff] bg-blue-50 dark:bg-[#0a84ff]/10' 
                  : 'border-gray-200 dark:border-[#38383a]'
              }`}
            >
              <p className="text-gray-500 dark:text-[#8e8e93] mb-3">
                {isDropTarget ? 'Drop here' : 'No attractions'}
              </p>
              {onAddAttraction && (
                <button
                  type="button"
                  onClick={() => onAddAttraction(stop.id!)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 dark:bg-[#0a84ff] text-white rounded-lg hover:bg-blue-700 dark:hover:bg-[#0077ed] transition-colors"
                >
                  <Plus size={16} />
                  Add attraction
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Render attractions grouped by day */}
              {stopDates.map((dateStr, dayIndex) => {
                const dayAttractions = attractionsByDay[dateStr] || [];
                // Poprawne parsowanie daty bez przesunięcia strefowego
                const [year, month, day] = dateStr.split('-');
                const dateObj = new Date(Number(year), Number(month) - 1, Number(day));
                // Parse date without timezone shift
                const dayLabel = dateObj.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' });
                return (
                  <div key={dateStr} className="space-y-2">
                    {/* Day Header */}
                    <div className="flex items-center gap-2 py-2">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 dark:bg-[#0a84ff]/20 flex items-center justify-center">
                        <span className="text-xs font-semibold text-blue-600 dark:text-[#0a84ff]">
                          {dayIndex + 1}
                        </span>
                      </div>
                      <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                        {dayLabel}
                      </h4>
                      <div className="flex-1 h-px bg-gray-200 dark:bg-[#38383a]"></div>
                      <span className="text-xs text-gray-500 dark:text-[#8e8e93]">
                        {dayAttractions.length} {dayAttractions.length === 1 ? 'attraction' : 'attractions'}
                      </span>
                    </div>
                    
                    {/* Day Attractions */}
                    <div className="space-y-2 pl-10">
                      {dayAttractions.length === 0 ? (
                        <div className="py-4 text-center rounded-lg border border-dashed border-gray-200 dark:border-[#38383a]">
                          <p className="text-xs text-gray-400 dark:text-[#636366]">No attractions for this day</p>
                        </div>
                      ) : (
                        dayAttractions.map((attraction, index) => (
                          <div
                            key={attraction.id}
                            onDragOver={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                            }}
                            onDrop={(e) => {
                              e.stopPropagation();
                              onDrop(e, stop.id!, index);
                            }}
                          >
                            <AttractionCard
                              attraction={attraction}
                              stop={stop}
                              onPriorityChange={onPriorityChange}
                              onPlannedDateChange={onPlannedDateChange}
                              onDragStart={onDragStart}
                              onDragEnd={onDragEnd}
                              isDragging={draggingAttraction?.id === attraction.id}
                              isDropTarget={false}
                              onEdit={onEditAttraction}
                              onDelete={onDeleteAttraction}
                            />
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
              
              {/* Unscheduled Attractions Section */}
              {unscheduledAttractions.length > 0 && (
                <div className="space-y-2 mt-6">
                  <div className="flex items-center gap-2 py-2">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 dark:bg-[#3a3a3c] flex items-center justify-center">
                      <span className="text-xs font-semibold text-gray-500 dark:text-[#8e8e93]">?</span>
                    </div>
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                      Unscheduled
                    </h4>
                    <div className="flex-1 h-px bg-gray-200 dark:bg-[#38383a]"></div>
                    <span className="text-xs text-gray-500 dark:text-[#8e8e93]">
                      {unscheduledAttractions.length} {unscheduledAttractions.length === 1 ? 'attraction' : 'attractions'}
                    </span>
                  </div>
                  
                  <div className="space-y-2 pl-10">
                    {unscheduledAttractions.map((attraction, index) => (
                      <div
                        key={attraction.id}
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                        }}
                        onDrop={(e) => {
                          e.stopPropagation();
                          onDrop(e, stop.id!, sortedAttractions.length - unscheduledAttractions.length + index);
                        }}
                      >
                        <AttractionCard
                          attraction={attraction}
                          stop={stop}
                          onPriorityChange={onPriorityChange}
                          onPlannedDateChange={onPlannedDateChange}
                          onDragStart={onDragStart}
                          onDragEnd={onDragEnd}
                          isDragging={draggingAttraction?.id === attraction.id}
                          isDropTarget={false}
                          onEdit={onEditAttraction}
                          onDelete={onDeleteAttraction}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Add Attraction button at the bottom */}
              {onAddAttraction && (
                <button
                  type="button"
                  onClick={() => onAddAttraction(stop.id!)}
                  className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border-2 border-dashed border-gray-300 dark:border-[#48484a] text-gray-600 dark:text-[#8e8e93] hover:border-blue-500 dark:hover:border-[#0a84ff] hover:text-blue-600 dark:hover:text-[#0a84ff] transition-colors mt-4"
                >
                  <Plus size={16} />
                  Add attraction
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

// Main Itinerary Page Component
const ItineraryPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const toast = useToast();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [journey, setJourney] = useState<Journey | null>(null);
  const [stops, setStops] = useState<Stop[]>([]);
  const [attractionsByStop, setAttractionsByStop] = useState<Record<number, Attraction[]>>({});
  const [expandedStops, setExpandedStops] = useState<Set<number>>(new Set());
  const [hasChanges, setHasChanges] = useState(false);
  
  // Drag and drop state
  const [draggingAttraction, setDraggingAttraction] = useState<Attraction | null>(null);
  const [dragOverStopId, setDragOverStopId] = useState<number | null>(null);
  
  // Filter state
  const [filterPriority, setFilterPriority] = useState<PriorityType | 'all'>('all');
  const [showFilters, setShowFilters] = useState(false);
  
  // View mode: 'list' | 'map' | 'daily'
  const [viewMode, setViewMode] = useState<'list' | 'map' | 'daily'>('list');
  
  // Selected stop for map view
  const [selectedStopForMap, setSelectedStopForMap] = useState<number | null>(null);
  
  // Attraction management modals
  const [showAddAttractionModal, setShowAddAttractionModal] = useState(false);
  const [showEditAttractionModal, setShowEditAttractionModal] = useState(false);
  const [selectedStopForAttraction, setSelectedStopForAttraction] = useState<number | null>(null);
  const [editingAttraction, setEditingAttraction] = useState<Attraction | null>(null);
  const [geocodingEditAttraction, setGeocodingEditAttraction] = useState(false);
  const [geocodingNewAttraction, setGeocodingNewAttraction] = useState(false);
  const [newAttraction, setNewAttraction] = useState<Partial<Attraction>>({
    name: '',
    description: '',
    estimatedCost: undefined,
    currency: journey?.currency || 'PLN',
    duration: '',
    tag: undefined,
    addressStreet: '',
    addressCity: '',
    addressPostalCode: '',
    addressCountry: '',
    latitude: null,
    longitude: null
  });

  // Load journey data
  const loadData = useCallback(async () => {
    if (!id) return;
    
    setLoading(true);
    try {
      console.log('📡 ItineraryPage: Loading journey data from API...');
      const journeyData = await journeyService.getJourneyById(parseInt(id));
      console.log('📥 ItineraryPage: Received journey data:', journeyData);
      console.log('📥 ItineraryPage: Stop dates:', journeyData.stops?.map((s: Stop) => ({
        id: s.id,
        city: s.city,
        arrival: s.arrivalDate,
        departure: s.departureDate
      })));
      setJourney(journeyData);
      
      const stopsData = journeyData.stops || [];
      setStops(stopsData.sort((a: Stop, b: Stop) => {
        const da = parseYMDToDate(a.arrivalDate) || new Date(a.arrivalDate);
        const db = parseYMDToDate(b.arrivalDate) || new Date(b.arrivalDate);
        return da.getTime() - db.getTime();
      }));
      
      // Load attractions for each stop
      const attractionsMap: Record<number, Attraction[]> = {};
      for (const stop of stopsData) {
        if (stop.id) {
          const attractions = stop.attractions || [];
          attractionsMap[stop.id] = attractions.sort((a: Attraction, b: Attraction) => 
            (a.orderIndex || 0) - (b.orderIndex || 0)
          );
        }
      }
      setAttractionsByStop(attractionsMap);
      
      // Expand all stops by default
      setExpandedStops(new Set(stopsData.map((s: Stop) => s.id!)));
      
    } catch (error) {
      console.error('Error loading journey:', error);
      toast.error('Failed to load journey');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]); // 'toast' intentionally omitted to prevent infinite re-render loop

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Connect socket for real-time updates
  useEffect(() => {
    console.log('🔌 ItineraryPage: Connecting to socket...');
    socketService.connect();
    
    return () => {
      // Don't disconnect here as other components might use it
      console.log('🔌 ItineraryPage: Component unmounting (keeping socket connected)');
    };
  }, []);

  // Listen for real-time updates from other clients
  useEffect(() => {
    console.log('👂 ItineraryPage: Registering socket listeners...');
    
    const handleStopUpdate = (data: any) => {
      console.log('🔄 ItineraryPage received: Stop updated', data);
      loadData();
    };

    const handleJourneyUpdate = (data: any) => {
      console.log('🔄 ItineraryPage received: Journey updated', data);
      loadData();
    };

    const handleAttractionUpdate = (data: any) => {
      console.log('🔄 ItineraryPage received: Attraction updated', data);
      loadData();
    };

    socketService.on('stop:updated', handleStopUpdate);
    socketService.on('journey:updated', handleJourneyUpdate);
    socketService.on('attraction:updated', handleAttractionUpdate);

    console.log('✅ ItineraryPage: Socket listeners registered');

    return () => {
      console.log('🧹 ItineraryPage: Cleaning up socket listeners');
      socketService.off('stop:updated', handleStopUpdate);
      socketService.off('journey:updated', handleJourneyUpdate);
      socketService.off('attraction:updated', handleAttractionUpdate);
    };
  }, [loadData]);

  // Handle priority change
  const handlePriorityChange = useCallback((attractionId: number, priority: PriorityType) => {
    setAttractionsByStop(prev => {
      const updated = { ...prev };
      for (const stopId of Object.keys(updated)) {
        updated[parseInt(stopId)] = updated[parseInt(stopId)].map(attr =>
          attr.id === attractionId ? { ...attr, priority } : attr
        );
      }
      return updated;
    });
    setHasChanges(true);
  }, []);

  // Handle planned date change
  const handlePlannedDateChange = useCallback(async (attractionId: number, plannedDate: string | null) => {
    setAttractionsByStop(prev => {
      const updated = { ...prev };
      for (const stopId of Object.keys(updated)) {
        updated[parseInt(stopId)] = updated[parseInt(stopId)].map(attr =>
          attr.id === attractionId ? { ...attr, plannedDate: plannedDate || undefined } : attr
        );
      }
      return updated;
    });
    
    // Save immediately to backend
    try {
      await attractionService.bulkUpdateAttractions([{
        id: attractionId,
        plannedDate: plannedDate || undefined
      }]);
      toast.success('Data zapisana');
    } catch (error) {
      console.error('Error saving planned date:', error);
      toast.error('Failed to save date');
    }
  }, [toast]);

  // Add new attraction
  const handleAddAttraction = useCallback(async () => {
    if (!selectedStopForAttraction || !newAttraction.name) {
      toast.error('Enter attraction name');
      return;
    }

    try {
      setLoading(true);
      const created = await attractionService.createAttraction(selectedStopForAttraction, {
        ...newAttraction,
        currency: newAttraction.currency || journey?.currency || 'PLN'
      });

      // Reload data to get fresh state
      await loadData();
      
      setNewAttraction({
        name: '',
        description: '',
        estimatedCost: undefined,
        currency: journey?.currency || 'PLN',
        duration: '',
        tag: undefined,
        addressStreet: '',
        addressCity: '',
        addressPostalCode: '',
        addressCountry: '',
        latitude: null,
        longitude: null
      });
      setShowAddAttractionModal(false);
      setSelectedStopForAttraction(null);
      toast.success('Attraction added!');
    } catch (error) {
      console.error('Error adding attraction:', error);
      toast.error('Failed to add attraction');
    } finally {
      setLoading(false);
    }
  }, [selectedStopForAttraction, newAttraction, journey, loadData, toast]);

  // Edit attraction
  const handleEditAttraction = useCallback(async () => {
    if (!editingAttraction?.id || !editingAttraction.name) {
      toast.error('Enter attraction name');
      return;
    }

    try {
      setLoading(true);
      await attractionService.updateAttraction(editingAttraction.id, editingAttraction);

      // Reload data to get fresh state
      await loadData();
      
      setEditingAttraction(null);
      setShowEditAttractionModal(false);
      toast.success('Attraction updated!');
    } catch (error) {
      console.error('Error updating attraction:', error);
      toast.error('Failed to update attraction');
    } finally {
      setLoading(false);
    }
  }, [editingAttraction, loadData, toast]);

  // Delete attraction
  const handleDeleteAttraction = useCallback(async (attractionId: number) => {
    if (!window.confirm('Are you sure you want to delete this attraction?')) {
      return;
    }

    try {
      setLoading(true);
      await attractionService.deleteAttraction(attractionId);

      // Reload data
      await loadData();
      
      toast.success('Attraction deleted');
    } catch (error) {
      console.error('Error deleting attraction:', error);
      toast.error('Failed to delete attraction');
    } finally {
      setLoading(false);
    }
  }, [loadData, toast]);

  // Geocode edit attraction address
  const handleGeocodeEditAttraction = useCallback(async () => {
    if (!editingAttraction) return;
    
    const parts = [
      editingAttraction.addressStreet,
      editingAttraction.addressCity,
      editingAttraction.addressPostalCode,
      editingAttraction.addressCountry
    ].filter(Boolean);
    
    if (parts.length === 0) {
      toast.error('Enter at least one address field');
      return;
    }
    
    const fullAddress = parts.join(', ');
    
    try {
      setGeocodingEditAttraction(true);
      const coords = await geocodeAddress(fullAddress);
      
      if (coords) {
        setEditingAttraction({
          ...editingAttraction,
          latitude: coords.lat,
          longitude: coords.lng,
          address: coords.display_name || fullAddress
        });
        toast.success('Coordinates found!');
      } else {
        toast.error('Failed to find location');
      }
    } catch (error) {
      console.error('Geocoding error:', error);
      toast.error('Error while searching for location');
    } finally {
      setGeocodingEditAttraction(false);
    }
  }, [editingAttraction, toast]);

  // Geocode new attraction address
  const handleGeocodeNewAttraction = useCallback(async () => {
    const parts = [
      newAttraction.addressStreet,
      newAttraction.addressCity,
      newAttraction.addressPostalCode,
      newAttraction.addressCountry
    ].filter(Boolean);
    
    if (parts.length === 0) {
      toast.error('Enter at least one address field');
      return;
    }
    
    const fullAddress = parts.join(', ');
    
    try {
      setGeocodingNewAttraction(true);
      const coords = await geocodeAddress(fullAddress);
      
      if (coords) {
        setNewAttraction({
          ...newAttraction,
          latitude: coords.lat,
          longitude: coords.lng,
          address: coords.display_name || fullAddress
        });
        toast.success('Coordinates found!');
      } else {
        toast.error('Failed to find location');
      }
    } catch (error) {
      console.error('Geocoding error:', error);
      toast.error('Error while searching for location');
    } finally {
      setGeocodingNewAttraction(false);
    }
  }, [newAttraction, toast]);

  // Drag handlers
  const handleDragStart = useCallback((e: React.DragEvent, attraction: Attraction) => {
    setDraggingAttraction(attraction);
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggingAttraction(null);
    setDragOverStopId(null);
  }, []);

  const handleDragOver = useCallback((stopId: number) => {
    setDragOverStopId(stopId);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, targetStopId: number, targetIndex: number) => {
    e.preventDefault();
    
    if (!draggingAttraction) return;
    
    const sourceStopId = draggingAttraction.stopId;
    
    setAttractionsByStop(prev => {
      const updated = { ...prev };
      
      // Remove from source
      if (sourceStopId && updated[sourceStopId]) {
        updated[sourceStopId] = updated[sourceStopId].filter(a => a.id !== draggingAttraction.id);
        // Reindex source
        updated[sourceStopId] = updated[sourceStopId].map((a, i) => ({ ...a, orderIndex: i }));
      }
      
      // Add to target
      if (!updated[targetStopId]) {
        updated[targetStopId] = [];
      }
      
      const movedAttraction = { ...draggingAttraction, stopId: targetStopId, orderIndex: targetIndex };
      
      // Insert at target index
      const targetAttractions = [...updated[targetStopId]];
      targetAttractions.splice(targetIndex, 0, movedAttraction);
      
      // Reindex target
      updated[targetStopId] = targetAttractions.map((a, i) => ({ ...a, orderIndex: i }));
      
      return updated;
    });
    
    setHasChanges(true);
    setDraggingAttraction(null);
    setDragOverStopId(null);
  }, [draggingAttraction]);

  // Save changes
  const handleSave = async () => {
    setSaving(true);
    try {
      const updates: Array<{
        id: number;
        orderIndex: number;
        priority: PriorityType;
        stopId: number;
      }> = [];
      
      for (const [stopId, attractions] of Object.entries(attractionsByStop)) {
        for (const attr of attractions) {
          if (attr.id) {
            updates.push({
              id: attr.id,
              orderIndex: attr.orderIndex || 0,
              priority: attr.priority || 'should',
              stopId: parseInt(stopId)
            });
          }
        }
      }
      
      await attractionService.bulkUpdateAttractions(updates);
      toast.success('Changes saved');
      setHasChanges(false);
    } catch (error) {
      console.error('Error saving changes:', error);
      toast.error('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  // Reset changes
  const handleReset = () => {
    loadData();
    setHasChanges(false);
  };

  // Toggle stop expansion
  const toggleStop = (stopId: number) => {
    setExpandedStops(prev => {
      const next = new Set(prev);
      if (next.has(stopId)) {
        next.delete(stopId);
      } else {
        next.add(stopId);
      }
      return next;
    });
  };

  // Filter attractions
  const getFilteredAttractions = (attractions: Attraction[]) => {
    if (filterPriority === 'all') return attractions;
    return attractions.filter(a => (a.priority || 'should') === filterPriority);
  };
  
  // Optimize route for a stop
  const handleOptimizeRoute = (stopId: number) => {
    const stop = stops.find(s => s.id === stopId);
    if (!stop) return;
    
    const attractions = attractionsByStop[stopId] || [];
    const optimized = optimizeRoute(attractions, stop.latitude, stop.longitude);
    
    setAttractionsByStop(prev => ({
      ...prev,
      [stopId]: optimized.map((a, i) => ({ ...a, orderIndex: i }))
    }));
    setHasChanges(true);
    toast.success(`Route optimized for ${stop.city}`);
  };
  
  // Group attractions by date
  const getAttractionsByDate = () => {
    const byDate: Record<string, Array<{ stop: Stop; attraction: Attraction }>> = {};
    
    stops.forEach(stop => {
      const attractions = attractionsByStop[stop.id!] || [];
      
      attractions.forEach(attr => {
        // Use planned date if available, otherwise use stop arrival date
        const dateKey = attr.plannedDate 
          ? toYMD(attr.plannedDate)
          : toYMD(stop.arrivalDate);
        
        if (!byDate[dateKey]) {
          byDate[dateKey] = [];
        }
        byDate[dateKey].push({ stop, attraction: attr });
      });
    });
    
    return byDate;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#1c1c1e] flex items-center justify-center">
        <div className="flex items-center gap-3 text-gray-600 dark:text-[#8e8e93]">
          <Loader2 size={24} className="animate-spin" />
          <span>Loading itinerary...</span>
        </div>
      </div>
    );
  }

  if (!journey) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#1c1c1e] flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 dark:text-[#8e8e93] mb-4">Journey not found</p>
          <Link to="/" className="gh-btn-primary">
            Back to list
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#1c1c1e]">
      <ToastContainer toasts={toast.toasts} onClose={toast.closeToast} />
      
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white dark:bg-[#2c2c2e] border-b border-gray-200 dark:border-[#38383a] shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            {/* Back button and title */}
            <div className="flex items-center gap-3 min-w-0">
              <Link
                to="/"
                className="flex-shrink-0 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-[#3a3a3c] transition-colors"
              >
                <ArrowLeft size={20} className="text-gray-600 dark:text-[#8e8e93]" />
              </Link>
              <div className="min-w-0">
                <h1 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                  {journey.title}
                </h1>
                <p className="text-sm text-gray-500 dark:text-[#8e8e93]">
                  Itinerary
                </p>
              </div>
            </div>
            
            {/* Actions */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* View mode toggle */}
              <div className="flex items-center bg-gray-100 dark:bg-[#3a3a3c] rounded-lg p-1">
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-md transition-colors ${
                    viewMode === 'list' 
                      ? 'bg-white dark:bg-[#2c2c2e] text-blue-600 dark:text-[#0a84ff] shadow-sm' 
                      : 'text-gray-600 dark:text-[#8e8e93] hover:text-gray-900 dark:hover:text-white'
                  }`}
                  title="Widok listy"
                >
                  <List size={18} />
                </button>
                <button
                  onClick={() => setViewMode('daily')}
                  className={`p-2 rounded-md transition-colors ${
                    viewMode === 'daily' 
                      ? 'bg-white dark:bg-[#2c2c2e] text-blue-600 dark:text-[#0a84ff] shadow-sm' 
                      : 'text-gray-600 dark:text-[#8e8e93] hover:text-gray-900 dark:hover:text-white'
                  }`}
                  title="Widok dzienny"
                >
                  <CalendarDays size={18} />
                </button>
                <button
                  onClick={() => setViewMode('map')}
                  className={`p-2 rounded-md transition-colors ${
                    viewMode === 'map' 
                      ? 'bg-white dark:bg-[#2c2c2e] text-blue-600 dark:text-[#0a84ff] shadow-sm' 
                      : 'text-gray-600 dark:text-[#8e8e93] hover:text-gray-900 dark:hover:text-white'
                  }`}
                  title="Widok mapy"
                >
                  <Map size={18} />
                </button>
              </div>
              
              {/* Filter button */}
              <div className="relative">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`p-2 rounded-lg transition-colors ${
                    filterPriority !== 'all' 
                      ? 'bg-blue-100 dark:bg-[#0a84ff]/20 text-blue-600 dark:text-[#0a84ff]' 
                      : 'hover:bg-gray-100 dark:hover:bg-[#3a3a3c] text-gray-600 dark:text-[#8e8e93]'
                  }`}
                >
                  <Filter size={20} />
                </button>
                
                {showFilters && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowFilters(false)} />
                    <div className="absolute right-0 top-full mt-2 z-20 w-44 bg-white dark:bg-[#2c2c2e] rounded-lg shadow-lg border border-gray-200 dark:border-[#38383a] py-1 overflow-hidden">
                      <button
                        onClick={() => { setFilterPriority('all'); setShowFilters(false); }}
                        className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-[#3a3a3c] ${
                          filterPriority === 'all' ? 'bg-gray-50 dark:bg-[#3a3a3c]' : ''
                        }`}
                      >
                        <span className="text-gray-900 dark:text-white">Wszystkie</span>
                        {filterPriority === 'all' && <Check size={14} className="ml-auto text-green-500" />}
                      </button>
                      {(Object.keys(PRIORITY_CONFIG) as PriorityType[]).map((key) => (
                        <button
                          key={key}
                          onClick={() => { setFilterPriority(key); setShowFilters(false); }}
                          className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-[#3a3a3c] ${
                            filterPriority === key ? 'bg-gray-50 dark:bg-[#3a3a3c]' : ''
                          }`}
                        >
                          <span className={`w-2 h-2 rounded-full ${PRIORITY_CONFIG[key].color}`} />
                          <span className="text-gray-900 dark:text-white">{PRIORITY_CONFIG[key].label}</span>
                          {filterPriority === key && <Check size={14} className="ml-auto text-green-500" />}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
              
              {/* Reset button */}
              {hasChanges && (
                <button
                  onClick={handleReset}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-[#3a3a3c] transition-colors text-gray-600 dark:text-[#8e8e93]"
                  title="Cofnij zmiany"
                >
                  <RotateCcw size={20} />
                </button>
              )}
              
              {/* Save button */}
              <button
                onClick={handleSave}
                disabled={!hasChanges || saving}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                  hasChanges 
                    ? 'bg-green-600 hover:bg-green-700 dark:bg-[#30d158] dark:hover:bg-green-600 text-white' 
                    : 'bg-gray-200 dark:bg-[#3a3a3c] text-gray-500 dark:text-[#636366] cursor-not-allowed'
                }`}
              >
                {saving ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Save size={18} />
                )}
                <span className="hidden sm:inline">Zapisz</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* Info banner */}
        <div className="mb-6 p-4 rounded-xl bg-blue-50 dark:bg-[#0a84ff]/10 border border-blue-200 dark:border-[#0a84ff]/30">
          <p className="text-sm text-blue-800 dark:text-[#0a84ff]">
            <strong>Tip:</strong> Drag attractions to reorder or move between stops. 
            Set priorities to easily identify what to skip when running out of time.
          </p>
        </div>
        
        {/* Priority legend */}
        <div className="mb-6 flex flex-wrap gap-3">
          {(Object.keys(PRIORITY_CONFIG) as PriorityType[]).map((key) => (
            <div key={key} className="flex items-center gap-2 text-sm">
              <span className={`w-3 h-3 rounded-full ${PRIORITY_CONFIG[key].color}`} />
              <span className="text-gray-600 dark:text-[#8e8e93]">{PRIORITY_CONFIG[key].label}</span>
            </div>
          ))}
        </div>

        {/* List View */}
        {viewMode === 'list' && (
          <div className="space-y-4">
            {stops.length === 0 ? (
              <div className="text-center py-12">
                <MapPin size={48} className="mx-auto mb-4 text-gray-300 dark:text-[#48484a]" />
                <p className="text-gray-500 dark:text-[#8e8e93]">
                  No stops in this journey
                </p>
                <Link to="/" className="text-blue-600 dark:text-[#0a84ff] hover:underline mt-2 inline-block">
                  Add stops in the main view
                </Link>
              </div>
            ) : (
              stops.map((stop) => (
                <StopSection
                  key={stop.id}
                  stop={stop}
                  attractions={getFilteredAttractions(attractionsByStop[stop.id!] || [])}
                  isExpanded={expandedStops.has(stop.id!)}
                  onToggle={() => toggleStop(stop.id!)}
                  onPriorityChange={handlePriorityChange}
                  onPlannedDateChange={handlePlannedDateChange}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                  onDrop={handleDrop}
                  onDragOver={() => handleDragOver(stop.id!)}
                  draggingAttraction={draggingAttraction}
                  dragOverStopId={dragOverStopId}
                  onOptimize={handleOptimizeRoute}
                  onShowMap={(stopId) => {
                    setSelectedStopForMap(stopId);
                    setViewMode('map');
                  }}
                  onAddAttraction={async (stopId) => {
                    // Reload data to ensure fresh stop dates
                    await loadData();
                    setSelectedStopForAttraction(stopId);
                    setNewAttraction({
                      name: '',
                      description: '',
                      estimatedCost: 0,
                      duration: '',
                      currency: journey?.currency || 'PLN',
                      latitude: null,
                      longitude: null,
                      addressStreet: '',
                      addressCity: '',
                      addressPostalCode: '',
                      addressCountry: '',
                      priority: 'should',
                      tag: null
                    });
                    setShowAddAttractionModal(true);
                  }}
                  onEditAttraction={async (attraction) => {
                    // Reload data to ensure fresh stop dates
                    await loadData();
                    setEditingAttraction(attraction);
                    setShowEditAttractionModal(true);
                  }}
                  onDeleteAttraction={handleDeleteAttraction}
                />
              ))
            )}
          </div>
        )}

        {/* Daily View */}
        {viewMode === 'daily' && (
          <div className="space-y-6">
            {(() => {
              const byDate = getAttractionsByDate();
              const sortedDates = Object.keys(byDate).sort();
              
              if (sortedDates.length === 0) {
                return (
                  <div className="text-center py-12">
                    <CalendarDays size={48} className="mx-auto mb-4 text-gray-300 dark:text-[#48484a]" />
                    <p className="text-gray-500 dark:text-[#8e8e93]">Brak zaplanowanych atrakcji</p>
                  </div>
                );
              }
              
              return sortedDates.map(dateKey => {
                const items = byDate[dateKey];
                const date = parseYMDToDate(dateKey) || new Date(dateKey);
                
                return (
                  <div key={dateKey} className="gh-card">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-[#0a84ff]/20 flex items-center justify-center">
                        <Calendar size={24} className="text-blue-600 dark:text-[#0a84ff]" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          {date.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-[#8e8e93]">
                          {items.length} {items.length === 1 ? 'attraction' : 'attractions'}
                        </p>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      {items.map(({ stop, attraction }) => {
                        const stopArrival = parseYMDToDate(stop.arrivalDate) || new Date(stop.arrivalDate);
                        const stopDeparture = parseYMDToDate(stop.departureDate) || new Date(stop.departureDate);
                        const daysDiff = Math.ceil((stopDeparture.getTime() - stopArrival.getTime()) / (1000 * 60 * 60 * 24));
                        const isMultiDay = daysDiff >= 1;
                        
                        return (
                          <div
                            key={attraction.id}
                            className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 dark:bg-[#1c1c1e] border border-gray-200 dark:border-[#38383a]"
                          >
                            <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-blue-100 dark:bg-[#0a84ff]/20 flex items-center justify-center">
                              <MapPin size={16} className="text-blue-600 dark:text-[#0a84ff]" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2 mb-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h4 className="font-medium text-gray-900 dark:text-white">{attraction.name}</h4>
                                  {attraction.tag && (() => {
                                    const tagInfo = getAttractionTagInfo(attraction.tag);
                                    return tagInfo && (
                                      <span 
                                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium shrink-0"
                                        style={{
                                          backgroundColor: `${tagInfo.color}20`,
                                          color: tagInfo.color,
                                          border: `1px solid ${tagInfo.color}40`
                                        }}
                                      >
                                        {tagInfo.emoji} {tagInfo.label}
                                      </span>
                                    );
                                  })()}
                                </div>
                                <PriorityBadge priority={attraction.priority as PriorityType} compact />
                              </div>
                              <p className="text-sm text-gray-500 dark:text-[#8e8e93]">
                                📍 {stop.city}, {stop.country}
                              </p>
                              {attraction.plannedTime && (
                                <p className="text-sm text-gray-600 dark:text-[#8e8e93] mt-1">
                                  🕐 {attraction.plannedTime}
                                </p>
                              )}
                              {attraction.duration && (
                                <p className="text-sm text-gray-600 dark:text-[#8e8e93]">
                                  ⏱️ {attraction.duration}
                                </p>
                              )}
                              
                              {/* Inline date picker for multi-day stops */}
                              {isMultiDay && (
                                <div className="mt-2">
                                  <label className="block text-xs text-gray-600 dark:text-[#8e8e93] mb-1">
                                    Change day:
                                  </label>
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="date"
                                      value={attraction.plannedDate || ''}
                                      onChange={(e) => handlePlannedDateChange(attraction.id!, e.target.value || null)}
                                      min={toYMD(stop.arrivalDate)}
                                      max={toYMD(stop.departureDate)}
                                      className="max-w-[160px] px-2 py-1 text-xs rounded border border-gray-300 dark:border-[#48484a] bg-white dark:bg-[#2c2c2e] text-gray-900 dark:text-white focus:border-blue-500 dark:focus:border-[#0a84ff] focus:ring-1 focus:ring-blue-500 dark:focus:ring-[#0a84ff]"
                                    />
                                    {attraction.plannedDate && (
                                      <button
                                        onClick={() => handlePlannedDateChange(attraction.id!, null)}
                                        className="text-xs text-gray-500 dark:text-[#8e8e93] hover:text-red-600 dark:hover:text-[#ff453a] px-2 py-1"
                                        title="Clear date"
                                      >
                                        ✕
                                      </button>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        )}

        {/* Map View */}
        {viewMode === 'map' && (
          <div className="space-y-4">
            {/* Stop selector */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2">
              <button
                onClick={() => setSelectedStopForMap(null)}
                className={`flex-shrink-0 px-4 py-2 rounded-lg font-medium transition-colors ${
                  selectedStopForMap === null
                    ? 'bg-blue-600 dark:bg-[#0a84ff] text-white'
                    : 'bg-gray-100 dark:bg-[#3a3a3c] text-gray-600 dark:text-[#8e8e93] hover:bg-gray-200 dark:hover:bg-[#48484a]'
                }`}
              >
                Wszystkie przystanki
              </button>
              {stops.map(stop => (
                <button
                  key={stop.id}
                  onClick={() => setSelectedStopForMap(stop.id!)}
                  className={`flex-shrink-0 px-4 py-2 rounded-lg font-medium transition-colors ${
                    selectedStopForMap === stop.id
                      ? 'bg-blue-600 dark:bg-[#0a84ff] text-white'
                      : 'bg-gray-100 dark:bg-[#3a3a3c] text-gray-600 dark:text-[#8e8e93] hover:bg-gray-200 dark:hover:bg-[#48484a]'
                  }`}
                >
                  {stop.city}
                </button>
              ))}
            </div>
            
            {/* Map container */}
            <div className="h-[600px] rounded-xl overflow-hidden border border-gray-200 dark:border-[#38383a]">
              <JourneyMapWrapper
                locations={selectedStopForMap 
                  ? stops.filter(s => s.id === selectedStopForMap).map(s => ({
                      ...s,
                      lat: s.latitude,
                      lng: s.longitude,
                      attractions: (attractionsByStop[s.id!] || []).sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0))
                    }))
                  : stops.map(s => ({
                      ...s,
                      lat: s.latitude,
                      lng: s.longitude,
                      attractions: (attractionsByStop[s.id!] || []).sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0))
                    }))
                }
                center={selectedStopForMap 
                  ? stops.find(s => s.id === selectedStopForMap) 
                    ? [stops.find(s => s.id === selectedStopForMap)!.latitude, stops.find(s => s.id === selectedStopForMap)!.longitude]
                    : undefined
                  : undefined
                }
                zoom={selectedStopForMap ? 14 : 6}
              />
            </div>
            
            {/* Legend for selected stop */}
            {selectedStopForMap && (() => {
              const stop = stops.find(s => s.id === selectedStopForMap);
              const attractions = (attractionsByStop[selectedStopForMap] || []).sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));
              
              if (!stop || attractions.length === 0) return null;
              
              return (
                <div className="gh-card">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
                    Trasa dla {stop.city}
                  </h3>
                  <div className="space-y-2">
                    {attractions.map((attr, index) => (
                      <div key={attr.id} className="flex items-center gap-3 text-sm">
                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 dark:bg-[#0a84ff] text-white flex items-center justify-center text-xs font-medium">
                          {index + 1}
                        </span>
                        <span className="text-gray-900 dark:text-white">{attr.name}</span>
                        {attr.plannedTime && (
                          <span className="text-gray-500 dark:text-[#8e8e93] ml-auto">{attr.plannedTime}</span>
                        )}
                        <PriorityBadge priority={attr.priority as PriorityType} compact />
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </main>

      {/* Add Attraction Modal */}
      {showAddAttractionModal && selectedStopForAttraction && (
        <div className="gh-modal-overlay" onClick={() => setShowAddAttractionModal(false)}>
          <div className="gh-modal max-w-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="gh-card w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Add Attraction
              </h2>
              <button
                type="button"
                onClick={() => setShowAddAttractionModal(false)}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-[#3a3a3c] text-gray-500 dark:text-[#8e8e93] transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              handleAddAttraction();
            }} className="space-y-4">
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
                  Category Tag
                </label>
                <select
                  value={newAttraction.tag || ''}
                  onChange={(e) => setNewAttraction({ ...newAttraction, tag: e.target.value || null })}
                  className="gh-select"
                >
                  <option value="">No category</option>
                  {getAvailableAttractionTags().map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.emoji} {option.label}
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
                  Description
                </label>
                <textarea
                  placeholder="Details about the attraction..."
                  value={newAttraction.description || ''}
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
                    onChange={(e) => {
                      const val = e.target.value.trim();
                      const num = val ? parseFloat(val) : undefined;
                      setNewAttraction({ ...newAttraction, estimatedCost: (num && !isNaN(num)) ? num : undefined });
                    }}
                    className="gh-input"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-[#ffffff] mb-2">
                    Currency
                  </label>
                  <select
                    value={newAttraction.currency || 'PLN'}
                    onChange={(e) => setNewAttraction({ ...newAttraction, currency: e.target.value })}
                    className="gh-select"
                  >
                    <option value="PLN">PLN</option>
                    <option value="EUR">EUR</option>
                    <option value="USD">USD</option>
                    <option value="GBP">GBP</option>
                    <option value="KRW">KRW</option>
                  </select>
                </div>
              </div>

              {/* Planned Day - only for multi-day stops */}
              {(() => {
                const stop = journey?.stops?.find(s => s.id === selectedStopForAttraction);
                if (!stop) return null;
                
                console.log('🔍 Add Attraction - Stop dates:', {
                  stopId: stop.id,
                  city: stop.city,
                  arrivalDate: stop.arrivalDate,
                  departureDate: stop.departureDate
                });
                
                // Extract date portion without timezone conversion (use shared helper)
                const getDateOnly = (dateStr: Date | string): string => toYMD(dateStr);

                const arrivalDate = getDateOnly(stop.arrivalDate);
                const departureDate = getDateOnly(stop.departureDate);
                
                console.log('📅 Formatted dates:', { arrivalDate, departureDate });
                
                // Calculate days difference using date strings
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
                          return d ? d.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' }) : 'Choose a valid date';
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
                    value={newAttraction.duration || ''}
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
                    placeholder="09:00"
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
                    placeholder="18:00"
                  />
                </div>
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
                    type="button"
                    onClick={handleGeocodeNewAttraction}
                    disabled={geocodingNewAttraction || !(newAttraction.addressStreet || newAttraction.addressCity || newAttraction.addressPostalCode || newAttraction.addressCountry)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 dark:bg-[#0a84ff] text-white rounded-lg hover:bg-blue-700 dark:hover:bg-[#0077ed] transition-colors disabled:opacity-50"
                  >
                    <MapPin size={16} />
                    {geocodingNewAttraction ? 'Finding coordinates...' : 'Locate on Map'}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-[#ffffff] mb-2">
                    Latitude {newAttraction.latitude && '✓'}
                  </label>
                  <input
                    type="number"
                    value={newAttraction.latitude || ''}
                    onChange={(e) => setNewAttraction({ ...newAttraction, latitude: parseFloat(e.target.value) || null })}
                    className="gh-input bg-gray-50 dark:bg-[#2c2c2e]"
                    step="0.000001"
                    placeholder="Auto-filled"
                    readOnly
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-[#ffffff] mb-2">
                    Longitude {newAttraction.longitude && '✓'}
                  </label>
                  <input
                    type="number"
                    value={newAttraction.longitude || ''}
                    onChange={(e) => setNewAttraction({ ...newAttraction, longitude: parseFloat(e.target.value) || null })}
                    className="gh-input bg-gray-50 dark:bg-[#2c2c2e]"
                    step="0.000001"
                    placeholder="Auto-filled"
                    readOnly
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-[#38383a]">
                <button
                  type="button"
                  onClick={() => setShowAddAttractionModal(false)}
                  className="px-4 py-2 rounded-lg text-gray-700 dark:text-[#8e8e93] hover:bg-gray-100 dark:hover:bg-[#3a3a3c] transition-colors"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 dark:bg-[#0a84ff] text-white rounded-lg hover:bg-blue-700 dark:hover:bg-[#0077ed] transition-colors disabled:opacity-50"
                >
                  {loading ? 'Adding...' : 'Add Attraction'}
                </button>
              </div>
            </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Attraction Modal */}
      {showEditAttractionModal && editingAttraction && (
        <div className="gh-modal-overlay" onClick={() => setShowEditAttractionModal(false)}>
          <div className="gh-modal max-w-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="gh-card w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Edit Attraction
              </h2>
              <button
                type="button"
                onClick={() => setShowEditAttractionModal(false)}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-[#3a3a3c] text-gray-500 dark:text-[#8e8e93] transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              handleEditAttraction();
            }} className="space-y-4">
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
                  Category Tag
                </label>
                <select
                  value={editingAttraction.tag || ''}
                  onChange={(e) => setEditingAttraction({ ...editingAttraction, tag: e.target.value || null })}
                  className="gh-select"
                >
                  <option value="">No category</option>
                  {getAvailableAttractionTags().map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.emoji} {option.label}
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
                    onChange={(e) => {
                      const val = e.target.value.trim();
                      const num = val ? parseFloat(val) : undefined;
                      setEditingAttraction({ ...editingAttraction, estimatedCost: (num && !isNaN(num)) ? num : undefined });
                    }}
                    className="gh-input"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-[#ffffff] mb-2">
                    Currency
                  </label>
                  <select
                    value={editingAttraction.currency || 'PLN'}
                    onChange={(e) => setEditingAttraction({ ...editingAttraction, currency: e.target.value })}
                    className="gh-select"
                  >
                    <option value="PLN">PLN</option>
                    <option value="EUR">EUR</option>
                    <option value="USD">USD</option>
                    <option value="GBP">GBP</option>
                    <option value="KRW">KRW</option>
                  </select>
                </div>
              </div>

              {/* Planned Day - only for multi-day stops */}
              {(() => {
                const stop = journey?.stops?.find(s => 
                  s.id === editingAttraction.stopId || 
                  s.attractions?.some(a => a.id === editingAttraction.id)
                );
                if (!stop) return null;
                
                console.log('🔍 Edit Attraction - Stop dates:', {
                  stopId: stop.id,
                  city: stop.city,
                  arrivalDate: stop.arrivalDate,
                  departureDate: stop.departureDate
                });
                
                // Extract date portion without timezone conversion (use shared helper)
                const getDateOnly = (dateStr: Date | string): string => toYMD(dateStr);

                const arrivalDate = getDateOnly(stop.arrivalDate);
                const departureDate = getDateOnly(stop.departureDate);
                
                console.log('📅 Formatted dates:', { arrivalDate, departureDate });
                
                // Calculate days difference using date strings
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
                          // Always parse as a local date (not UTC)
                          const d = parseYMDToDate(editingAttraction.plannedDate);
                          if (!d) return 'Choose a valid date';
                          return d.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' });
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
                    placeholder="09:00"
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
                    placeholder="18:00"
                  />
                </div>
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
                    type="button"
                    onClick={handleGeocodeEditAttraction}
                    disabled={geocodingEditAttraction || !(editingAttraction.addressStreet || editingAttraction.addressCity || editingAttraction.addressPostalCode || editingAttraction.addressCountry)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 dark:bg-[#0a84ff] text-white rounded-lg hover:bg-blue-700 dark:hover:bg-[#0077ed] transition-colors disabled:opacity-50"
                  >
                    <MapPin size={16} />
                    {geocodingEditAttraction ? 'Finding coordinates...' : 'Locate on Map'}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-[#ffffff] mb-2">
                    Latitude {editingAttraction.latitude && '✓'}
                  </label>
                  <input
                    type="number"
                    value={editingAttraction.latitude || ''}
                    onChange={(e) => setEditingAttraction({ ...editingAttraction, latitude: parseFloat(e.target.value) || null })}
                    className="gh-input bg-gray-50 dark:bg-[#2c2c2e]"
                    step="0.000001"
                    placeholder="Auto-filled"
                    readOnly
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-[#ffffff] mb-2">
                    Longitude {editingAttraction.longitude && '✓'}
                  </label>
                  <input
                    type="number"
                    value={editingAttraction.longitude || ''}
                    onChange={(e) => setEditingAttraction({ ...editingAttraction, longitude: parseFloat(e.target.value) || null })}
                    className="gh-input bg-gray-50 dark:bg-[#2c2c2e]"
                    step="0.000001"
                    placeholder="Auto-filled"
                    readOnly
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-[#38383a]">
                <button
                  type="button"
                  onClick={() => setShowEditAttractionModal(false)}
                  className="px-4 py-2 rounded-lg text-gray-700 dark:text-[#8e8e93] hover:bg-gray-100 dark:hover:bg-[#3a3a3c] transition-colors"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 dark:bg-[#0a84ff] text-white rounded-lg hover:bg-blue-700 dark:hover:bg-[#0077ed] transition-colors disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
      )}
    </div>
  );
};

export default ItineraryPage;
