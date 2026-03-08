import React, { useState, useEffect } from 'react';
import { getStaffedHours } from '../../lib/api';
import { Clock } from 'lucide-react';

// Generate 30-min slots from 6:00 to 21:00
const ALL_SLOTS = [];
for (let h = 6; h <= 21; h++) {
  for (let m of [0, 30]) {
    if (h === 21 && m === 30) continue;
    const label = (() => {
      const period = h >= 12 ? 'PM' : 'AM';
      const hour12 = h > 12 ? h - 12 : h === 0 ? 12 : h;
      const min = m === 0 ? ':00' : ':30';
      return `${hour12}${min}${period}`;
    })();
    const value = `${String(h).padStart(2, '0')}:${m === 0 ? '00' : '30'}`;
    ALL_SLOTS.push({ value, label });
  }
}

const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

function isTimeInStaffed(time, daySchedule) {
  if (!daySchedule?.enabled || !time) return null;
  const [h, m] = time.split(':').map(Number);
  const [oh, om] = daySchedule.open.split(':').map(Number);
  const [ch, cm] = daySchedule.close.split(':').map(Number);
  const t = h * 60 + m;
  const o = oh * 60 + om;
  const c = ch * 60 + cm;
  return t >= o && t <= c;
}

export default function TimeQuickSelect({ value, onChange, selectedDate, className = '' }) {
  const [staffedHours, setStaffedHours] = useState(null);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    getStaffedHours()
      .then(r => setStaffedHours(r.data))
      .catch(() => {});
  }, []);

  // Determine day of week from selectedDate
  const daySchedule = (() => {
    if (!selectedDate || !staffedHours) return null;
    const d = new Date(selectedDate + 'T12:00:00');
    const dayName = DAY_NAMES[d.getDay()];
    return staffedHours[dayName];
  })();

  // Categorize slots
  const staffedSlots = ALL_SLOTS.filter(s => isTimeInStaffed(s.value, daySchedule) === true);
  const afterHoursSlots = ALL_SLOTS.filter(s => isTimeInStaffed(s.value, daySchedule) === false);
  const hasSchedule = daySchedule !== null;

  const visibleSlots = !hasSchedule || showAll ? ALL_SLOTS
    : staffedSlots.length > 0 ? (showAll ? ALL_SLOTS : staffedSlots.concat(afterHoursSlots.slice(0, 3)))
    : ALL_SLOTS;

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Manual input */}
      <div className="flex items-center gap-2">
        <Clock size={12} className="text-[#1B7A4A] shrink-0" />
        <input
          type="time"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 bg-black/40 border border-white/12 text-white rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-white/45"
          style={{ colorScheme: 'dark' }}
        />
        {value && (
          <button onClick={() => onChange('')} className="text-white/30 hover:text-white/60 text-xs px-2 py-1">clear</button>
        )}
      </div>

      {/* Quick slots */}
      <div>
        {hasSchedule && daySchedule?.enabled && (
          <p className="text-white/30 text-xs mb-1.5">
            Staffed: {daySchedule.open} – {daySchedule.close}
            {!showAll && afterHoursSlots.length > 0 && (
              <button onClick={() => setShowAll(true)} className="ml-2 text-[#7FCCA6]/70 hover:text-[#7FCCA6]">+ show after-hours</button>
            )}
          </p>
        )}
        {hasSchedule && !daySchedule?.enabled && (
          <p className="text-amber-400/60 text-xs mb-1.5">⚠️ No staff scheduled this day — you can still set a time</p>
        )}

        <div className="flex flex-wrap gap-1.5">
          {(showAll || !hasSchedule ? ALL_SLOTS : [
            ...staffedSlots,
            ...(afterHoursSlots.slice(0, 4))
          ]).map((slot) => {
            const staffed = isTimeInStaffed(slot.value, daySchedule);
            const isSelected = value === slot.value;
            return (
              <button
                key={slot.value}
                type="button"
                onClick={() => onChange(slot.value)}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors duration-150 ${
                  isSelected
                    ? 'bg-[#1B7A4A] text-white'
                    : staffed === true
                    ? 'bg-white/6 text-white/70 border border-white/10 hover:bg-white/12'
                    : staffed === false
                    ? 'bg-white/3 text-white/40 border border-white/6 hover:bg-white/8'
                    : 'bg-white/6 text-white/65 border border-white/10 hover:bg-white/12'
                }`}
                title={staffed === true ? 'Staffed hours' : staffed === false ? 'After hours' : ''}
              >
                {slot.label}
                {staffed === false && hasSchedule && <span className="ml-0.5 opacity-50">*</span>}
              </button>
            );
          })}
          {hasSchedule && !showAll && afterHoursSlots.length > 4 && (
            <button onClick={() => setShowAll(true)}
              className="px-2.5 py-1 rounded text-xs text-white/30 border border-white/6 hover:text-white/55 hover:bg-white/5">
              +{afterHoursSlots.length - 4} more
            </button>
          )}
        </div>
        {hasSchedule && showAll && (
          <button onClick={() => setShowAll(false)} className="text-white/30 text-xs mt-1.5 hover:text-white/50">show staffed only</button>
        )}
      </div>
    </div>
  );
}
