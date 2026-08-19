import React, { useState, useEffect, useRef } from 'react';
import { getStaffedHours } from '../../lib/api';
import { Clock, ChevronDown, AlertTriangle, CheckCircle2 } from 'lucide-react';

// 30-min slots 6:00 AM - 9:00 PM
const ALL_SLOTS = [];
for (let h = 6; h <= 21; h++) {
  for (const m of [0, 30]) {
    if (h === 21 && m === 30) continue;
    const period = h >= 12 ? 'PM' : 'AM';
    const h12 = h > 12 ? h - 12 : h === 0 ? 12 : h;
    const min = m === 0 ? ':00' : ':30';
    ALL_SLOTS.push({
      value: `${String(h).padStart(2, '0')}:${m === 0 ? '00' : '30'}`,
      label: `${h12}${min} ${period}`,
    });
  }
}

const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

function isStaffed(time, schedule) {
  if (!schedule || !schedule.enabled || !time) return null;
  const [h, m] = time.split(':').map(Number);
  const [oh, om] = schedule.open.split(':').map(Number);
  const [ch, cm] = schedule.close.split(':').map(Number);
  const t = h * 60 + m;
  return t >= oh * 60 + om && t <= ch * 60 + cm;
}

function fmt12(t) {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  const p = h >= 12 ? 'PM' : 'AM';
  const h12 = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${h12}:${String(m).padStart(2, '0')} ${p}`;
}

export default function TimeQuickSelect({ value, onChange, selectedDate, className = '' }) {
  const [open, setOpen] = useState(false);
  const [staffedHours, setStaffedHours] = useState(null);
  const ref = useRef(null);

  useEffect(() => {
    getStaffedHours().then(r => setStaffedHours(r.data)).catch(() => {});
  }, []);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const daySchedule = (() => {
    if (!selectedDate || !staffedHours) return null;
    const d = new Date(selectedDate + 'T12:00:00');
    return staffedHours[DAY_NAMES[d.getDay()]] || null;
  })();

  const isAfterHours = value ? (isStaffed(value, daySchedule) === false) : false;
  const noStaffToday = daySchedule && !daySchedule.enabled;

  return (
    <div ref={ref} className={`relative ${className}`}>
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg border text-sm transition-colors duration-200 ${
          isAfterHours || noStaffToday
            ? 'bg-red-950/40 border-red-500/30 text-red-300 hover:border-red-400/50'
            : value
            ? 'bg-[#1B7A4A]/15 border-[#1B7A4A]/35 text-[#7FCCA6] hover:border-[#1B7A4A]/60'
            : 'bg-[var(--elevated)] border-white/12 text-white/55 hover:border-white/25 hover:text-white'
        }`}
      >
        <div className="flex items-center gap-2">
          <Clock size={14} className={value ? (isAfterHours ? 'text-red-400' : 'text-[#1B7A4A]') : 'text-white/52'} />
          <span className={value ? 'font-medium' : ''}>
            {value ? fmt12(value) : 'Pick a time...'}
          </span>
        </div>
        <ChevronDown size={13} className={`transition-transform duration-200 ${open ? 'rotate-180' : ''} opacity-50`} />
      </button>

      {/* After-hours warning */}
      {(isAfterHours || noStaffToday) && (
        <div className="mt-1.5 flex items-start gap-2 px-3 py-2 bg-amber-950/40 border border-amber-500/25 rounded-lg">
          <AlertTriangle size={13} className="text-amber-400 mt-0.5 shrink-0" />
          <p className="text-amber-300/80 text-xs leading-relaxed">
            {noStaffToday
              ? 'No staff scheduled this day. Please ensure someone will be available before confirming this appointment.'
              : `${fmt12(value)} is outside staffed hours (${daySchedule?.open ? fmt12(daySchedule.open + ':00').replace(':00','') : ''}-${daySchedule?.close ? fmt12(daySchedule.close + ':00').replace(':00','') : ''}). Make sure someone will be here for this appointment.`
            }
          </p>
        </div>
      )}

      {/* Dropdown */}
      {open && (
        <div className="time-picker-dropdown absolute left-0 right-0 top-full mt-2 z-50 p-3 animate-fade-in">
          {/* Header */}
          {daySchedule && (
            <div className={`flex items-center gap-2 mb-3 px-1 pb-2 border-b ${
              daySchedule.enabled ? 'border-[#1B7A4A]/20' : 'border-amber-500/20'
            }`}>
              {daySchedule.enabled ? (
                <>
                  <CheckCircle2 size={12} className="text-[#1B7A4A]" />
                  <span className="text-[#7FCCA6] text-xs font-medium">
                    Staffed: {fmt12(daySchedule.open)} - {fmt12(daySchedule.close)}
                  </span>
                </>
              ) : (
                <>
                  <AlertTriangle size={12} className="text-amber-400" />
                  <span className="text-amber-300/80 text-xs">No staff scheduled today</span>
                </>
              )}
            </div>
          )}

          {/* Staffed slots */}
          {daySchedule?.enabled && (
            <div className="mb-3">
              <p className="text-[#7FCCA6]/60 text-[10px] uppercase tracking-wider font-semibold mb-2 px-1">Staffed Hours</p>
              <div className="grid grid-cols-4 gap-1.5">
                {ALL_SLOTS.filter(s => isStaffed(s.value, daySchedule) === true).map(slot => (
                  <button
                    key={slot.value}
                    type="button"
                    onClick={() => { onChange(slot.value); setOpen(false); }}
                    className={`px-2 py-1.5 rounded-md text-xs font-medium transition-all duration-150 ${
                      value === slot.value
                        ? 'bg-[#1B7A4A] text-white shadow-sm'
                        : 'bg-[#1B7A4A]/12 text-[#7FCCA6] border border-[#1B7A4A]/25 hover:bg-[#1B7A4A]/25 hover:border-[#1B7A4A]/45'
                    }`}
                  >
                    {slot.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* After-hours slots */}
          <div>
            <p className={`text-[10px] uppercase tracking-wider font-semibold mb-2 px-1 ${
              daySchedule?.enabled ? 'text-red-400/60' : 'text-white/58'
            }`}>
              {daySchedule?.enabled ? 'After Hours' : 'All Times'}
            </p>
            <div className="grid grid-cols-4 gap-1.5 max-h-36 overflow-y-auto">
              {(daySchedule?.enabled
                ? ALL_SLOTS.filter(s => isStaffed(s.value, daySchedule) === false)
                : ALL_SLOTS
              ).map(slot => (
                <button
                  key={slot.value}
                  type="button"
                  onClick={() => { onChange(slot.value); setOpen(false); }}
                  className={`px-2 py-1.5 rounded-md text-xs font-medium transition-all duration-150 relative ${
                    value === slot.value
                      ? 'bg-red-700 text-white'
                      : daySchedule?.enabled
                      ? 'bg-red-950/40 text-red-300/70 border border-red-500/20 hover:bg-red-900/50 hover:text-red-200'
                      : 'bg-[var(--elevated-2)] text-white/60 border border-white/10 hover:bg-white/8'
                  }`}
                  title={daySchedule?.enabled ? 'Outside staffed hours - ensure coverage' : ''}
                >
                  {slot.label}
                </button>
              ))}
            </div>
            {daySchedule?.enabled && (
              <p className="text-red-400/50 text-[10px] mt-2 px-1">
                ⚠ Red times are outside staffed hours. Staff must ensure someone will be available.
              </p>
            )}
          </div>

          {/* Clear */}
          {value && (
            <button
              type="button"
              onClick={() => { onChange(''); setOpen(false); }}
              className="w-full mt-2.5 pt-2.5 border-t border-white/8 text-xs text-white/52 hover:text-white/60 transition-colors duration-200"
            >
              Clear time
            </button>
          )}
        </div>
      )}
    </div>
  );
}
