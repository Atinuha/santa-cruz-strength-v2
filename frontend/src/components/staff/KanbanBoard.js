import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { updateLead } from '../../lib/api';
import { KANBAN_COLUMNS, LEAD_STATUSES } from '../../config';
import { Phone, Mail, ChevronRight, Calendar, ArrowRight, Loader2 } from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from '../../components/ui/dropdown-menu';
import { toast } from 'sonner';

const SOURCE_LABELS = {
  website_form: 'Website',
  book_a_tour: 'Tour',
  book_a_visit: 'Visit',
  contact_page: 'Contact',
  personal_training_inquiry: 'PT',
  manual_entry: 'Manual',
};

function StatusBadgeInline({ status }) {
  const found = LEAD_STATUSES.find((s) => s.value === status);
  const colorClass = found?.color || 'bg-white/10 text-white border-white/15';
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${colorClass}`}>
      {found?.label || status}
    </span>
  );
}

function KanbanCard({ lead, onStatusChange, movingId }) {
  const navigate = useNavigate();
  const nextStatuses = LEAD_STATUSES.filter((s) => s.value !== lead.status);
  const isMoving = movingId === lead.id;

  return (
    <div
      className="kanban-card p-3.5 select-none"
      onClick={() => navigate(`/staff/leads/${lead.id}`)}
    >
      {/* Name + Status */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0">
          <p className="text-white text-sm font-medium truncate">
            {lead.first_name} {lead.last_name}
          </p>
          <StatusBadgeInline status={lead.status} />
        </div>
        {isMoving && <Loader2 size={12} className="text-white/40 animate-spin shrink-0 mt-1" />}
      </div>

      {/* Contact */}
      <div className="space-y-1 mb-3">
        {lead.phone && (
          <a href={`tel:${lead.phone}`} onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1.5 text-white/50 hover:text-[#7FCCA6] text-xs transition-colors duration-200">
            <Phone size={10} />{lead.phone}
          </a>
        )}
        {lead.email && (
          <p className="text-white/35 text-xs truncate">{lead.email}</p>
        )}
      </div>

      {/* Meta */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1.5">
          {lead.lead_source && (
            <span className="text-[10px] text-white/30 bg-white/5 border border-white/8 px-1.5 py-0.5 rounded">
              {SOURCE_LABELS[lead.lead_source] || lead.lead_source}
            </span>
          )}
          {lead.created_at && (
            <span className="text-[10px] text-white/25">
              {new Date(lead.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          )}
        </div>

        {/* Move button */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              onClick={(e) => e.stopPropagation()}
              disabled={isMoving}
              className="text-white/30 hover:text-white/70 p-1 rounded transition-colors duration-200"
              title="Move to..."
            >
              <ArrowRight size={12} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="bg-[#1A1A1A] border-white/12 w-44"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-white/35 text-xs px-2 py-1 font-medium uppercase tracking-wide">Move to...</p>
            {nextStatuses.map((s) => (
              <DropdownMenuItem
                key={s.value}
                onClick={(e) => {
                  e.stopPropagation();
                  onStatusChange(lead.id, s.value);
                }}
                className="text-white text-xs cursor-pointer hover:bg-white/8"
              >
                {s.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Follow-up date */}
      {lead.next_follow_up_date && (
        <div className="mt-2 flex items-center gap-1 text-[10px] text-[#7FCCA6]/70">
          <Calendar size={9} />
          Follow-up: {new Date(lead.next_follow_up_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </div>
      )}
    </div>
  );
}

export default function KanbanBoard({ leads, onLeadsUpdated }) {
  const [movingId, setMovingId] = useState(null);

  const handleStatusChange = async (leadId, newStatus) => {
    setMovingId(leadId);
    try {
      await updateLead(leadId, { status: newStatus });
      toast.success(`Moved to "${newStatus}"`);
      onLeadsUpdated();
    } catch {
      toast.error('Failed to update status');
    } finally {
      setMovingId(null);
    }
  };

  const getLeadsForColumn = (column) =>
    leads.filter((l) => column.statuses.includes(l.status));

  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex gap-4" style={{ minWidth: `${KANBAN_COLUMNS.length * 260}px` }}>
        {KANBAN_COLUMNS.map((col) => {
          const colLeads = getLeadsForColumn(col);
          return (
            <div key={col.id} className={`kanban-column flex-1 min-w-[240px] max-w-xs border-t-2 ${col.color}`}>
              {/* Column header */}
              <div className="px-3 py-3 flex items-center justify-between border-b border-white/6">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${col.dotColor}`} />
                  <span className={`text-xs font-semibold uppercase tracking-wider ${col.headerColor}`}>
                    {col.title}
                  </span>
                </div>
                <span className="text-xs text-white/30 bg-white/5 px-1.5 py-0.5 rounded">
                  {colLeads.length}
                </span>
              </div>

              {/* Cards */}
              <div className="p-2 space-y-2 min-h-[120px]">
                {colLeads.length === 0 ? (
                  <div className="text-center py-6">
                    <p className="text-white/20 text-xs">No leads</p>
                  </div>
                ) : (
                  colLeads.map((lead) => (
                    <KanbanCard
                      key={lead.id}
                      lead={lead}
                      onStatusChange={handleStatusChange}
                      movingId={movingId}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
