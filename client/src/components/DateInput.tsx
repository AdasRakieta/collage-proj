import React from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { toYMD, parseYMDToDate } from '../utils/date';

export interface DateInputProps {
  value?: string;
  onChange: (val: string) => void;
  minDate?: string; // YYYY-MM-DD or ISO
  maxDate?: string;
  showTime?: boolean;
  placeholder?: string;
  className?: string;
}

const DateInput: React.FC<DateInputProps> = ({
  value,
  onChange,
  minDate,
  maxDate,
  showTime = false,
  placeholder = '',
  className = '',
}) => {
  // convert string to Date
  const parse = (s?: string): Date | null => {
    if (!s) return null;
    if (showTime) {
      // For datetime values (stored as ISO/UTC), parse as full Date so the
      // browser's local timezone is applied correctly — avoids off-by-one-day
      // when toISOString() shifts midnight to the previous UTC day.
      const d = new Date(s);
      return !isNaN(d.getTime()) ? d : null;
    }
    // For date-only values use parseYMDToDate to keep local midnight (avoids
    // the same timezone shift in the opposite direction).
    const d = parseYMDToDate(s);
    return d;
  };

  const selected = parse(value);
  const min = parse(minDate);
  const max = parse(maxDate);

  const handle = (d: Date | null) => {
    if (!d) {
      onChange('');
      return;
    }
    // produce ISO friendly string
    if (showTime) {
      onChange(d.toISOString());
    } else {
      onChange(toYMD(d));
    }
  };

  return (
    <DatePicker
      selected={selected}
      onChange={handle}
      minDate={min || undefined}
      maxDate={max || undefined}
      showTimeSelect={showTime}
      timeIntervals={15}
      dateFormat={showTime ? 'yyyy-MM-dd HH:mm' : 'yyyy-MM-dd'}
      className={`${className} gh-input`}
      placeholderText={placeholder}
      popperClassName="rdp-popper"
      calendarClassName="rdp-calendar"
      popperPlacement="bottom-start"
    />
  );
};

export default DateInput;
