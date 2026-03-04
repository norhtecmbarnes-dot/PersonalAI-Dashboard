'use client';

import { useState, useEffect, useCallback } from 'react';

interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  startDate: number;
  endDate?: number;
  location?: string;
  attendees?: string[];
  status: 'pending' | 'confirmed' | 'cancelled';
}

interface EventEditorProps {
  isOpen: boolean;
  onClose: () => void;
  initialEvent?: CalendarEvent;
  selectedDate?: Date;
  onSave?: () => void;
}

export function EventEditor({ isOpen, onClose, initialEvent, selectedDate, onSave }: EventEditorProps) {
  const [title, setTitle] = useState(initialEvent?.title || '');
  const [description, setDescription] = useState(initialEvent?.description || '');
  const [startDate, setStartDate] = useState(
    initialEvent?.startDate 
      ? new Date(initialEvent.startDate).toISOString().slice(0, 16)
      : selectedDate 
        ? new Date(selectedDate).toISOString().slice(0, 16)
        : new Date().toISOString().slice(0, 16)
  );
  const [endDate, setEndDate] = useState(
    initialEvent?.endDate
      ? new Date(initialEvent.endDate).toISOString().slice(0, 16)
      : ''
  );
  const [location, setLocation] = useState(initialEvent?.location || '');
  const [attendees, setAttendees] = useState(initialEvent?.attendees?.join(', ') || '');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (initialEvent) {
      setTitle(initialEvent.title);
      setDescription(initialEvent.description || '');
      setStartDate(new Date(initialEvent.startDate).toISOString().slice(0, 16));
      setEndDate(initialEvent.endDate ? new Date(initialEvent.endDate).toISOString().slice(0, 16) : '');
      setLocation(initialEvent.location || '');
      setAttendees(initialEvent.attendees?.join(', ') || '');
    } else if (isOpen) {
      setTitle('');
      setDescription('');
      setStartDate(selectedDate ? new Date(selectedDate).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16));
      setEndDate('');
      setLocation('');
      setAttendees('');
    }
  }, [initialEvent, isOpen, selectedDate]);

  const generateICS = () => {
    if (!title.trim()) return;

    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : new Date(start.getTime() + 60 * 60 * 1000);
    
    const formatDate = (date: Date) => {
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    const uid = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const attendeesList = attendees.split(',').map(e => e.trim()).filter(Boolean);
    
    let icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//AI Research Assistant//Calendar//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
BEGIN:VEVENT
UID:${uid}
DTSTAMP:${formatDate(new Date())}
DTSTART:${formatDate(start)}
DTEND:${formatDate(end)}
SUMMARY:${title}
DESCRIPTION:${(description || '').replace(/\n/g, '\\n')}
`;

    if (location) {
      icsContent += `LOCATION:${location}\n`;
    }

    for (const attendee of attendeesList) {
      icsContent += `ATTENDEE;CN=${attendee}:mailto:${attendee}\n`;
    }

    icsContent += `END:VEVENT
END:VCALENDAR`;

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.replace(/[^a-z0-9]/gi, '_')}.ics`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const saveEvent = async () => {
    if (!title.trim()) return;

    setIsSaving(true);
    try {
      const eventData = {
        title,
        description,
        startDate: new Date(startDate).getTime(),
        endDate: endDate ? new Date(endDate).getTime() : undefined,
        location: location || undefined,
        attendees: attendees.split(',').map(e => e.trim()).filter(Boolean),
        status: 'confirmed' as const,
      };

      const action = initialEvent ? 'updateEvent' : 'addEvent';
      const data = initialEvent 
        ? { id: initialEvent.id, updates: eventData }
        : eventData;

      const response = await fetch('/api/database', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, data }),
      });

      if (response.ok) {
        onSave?.();
        onClose();
      }
    } catch (error) {
      console.error('Error saving event:', error);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg w-full max-w-lg">
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-xl font-semibold text-white">
            {initialEvent ? 'Edit Event' : 'New Event'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Event Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Meeting, appointment, deadline..."
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Event details..."
              rows={3}
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Start Date/Time *</label>
              <input
                type="datetime-local"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded text-white focus:outline-none focus:border-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">End Date/Time</label>
              <input
                type="datetime-local"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded text-white focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Location</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Conference room, Zoom link, address..."
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Attendees</label>
            <input
              type="text"
              value={attendees}
              onChange={(e) => setAttendees(e.target.value)}
              placeholder="email@example.com, name2@example.com..."
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
            />
            <p className="text-xs text-gray-500 mt-1">Separate multiple attendees with commas</p>
          </div>
        </div>

        <div className="flex justify-end gap-2 p-4 border-t border-gray-700">
          <button
            onClick={generateICS}
            disabled={!title.trim()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded text-sm"
          >
            Download ICS
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm"
          >
            Cancel
          </button>
          <button
            onClick={saveEvent}
            disabled={isSaving || !title.trim()}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white rounded text-sm"
          >
            {isSaving ? 'Saving...' : 'Save Event'}
          </button>
        </div>
      </div>
    </div>
  );
}

interface CalendarViewProps {
  onEventClick: (event: CalendarEvent) => void;
  onDateClick: (date: Date) => void;
  refreshKey?: number;
}

export function CalendarView({ onEventClick, onDateClick, refreshKey }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);

  const loadEvents = useCallback(async () => {
    try {
      const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getTime();
      const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getTime();
      
      const response = await fetch(`/api/database?action=events&start=${startOfMonth}&end=${endOfMonth}`);
      const data = await response.json();
      setEvents(data.events || []);
    } catch (error) {
      console.error('Error loading events:', error);
    }
  }, [currentDate]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents, refreshKey]);

  const getDaysInMonth = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();

    const days: (Date | null)[] = [];

    for (let i = 0; i < startingDay; i++) {
      days.push(null);
    }

    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }

    return days;
  };

  const getEventsForDate = (date: Date) => {
    return events.filter(event => {
      const eventDate = new Date(event.startDate);
      return eventDate.toDateString() === date.toDateString();
    });
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const days = getDaysInMonth();
  const today = new Date();

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-white">
          {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
        </h2>
        <div className="flex gap-2">
          <button
            onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))}
            className="p-2 hover:bg-gray-700 rounded text-white"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={() => setCurrentDate(new Date())}
            className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-white text-sm"
          >
            Today
          </button>
          <button
            onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))}
            className="p-2 hover:bg-gray-700 rounded text-white"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {dayNames.map(day => (
          <div key={day} className="text-center text-sm font-medium text-gray-400 py-2">
            {day}
          </div>
        ))}

        {days.map((day, index) => {
          const dayEvents = day ? getEventsForDate(day) : [];
          const isToday = day && day.toDateString() === today.toDateString();
          const isFuture = day && day > today;

          return (
            <div
              key={index}
              onClick={() => day && onDateClick(day)}
              className={`
                min-h-[80px] p-1 border rounded cursor-pointer transition-colors
                ${day ? 'bg-gray-900 border-gray-700 hover:border-purple-500' : 'border-transparent'}
                ${isToday ? 'ring-2 ring-purple-500' : ''}
              `}
            >
              {day && (
                <>
                  <div className={`text-sm mb-1 ${isToday ? 'text-purple-400 font-bold' : isFuture ? 'text-white' : 'text-gray-500'}`}>
                    {day.getDate()}
                  </div>
                  <div className="space-y-1">
                    {dayEvents.slice(0, 2).map(event => (
                      <div
                        key={event.id}
                        onClick={(e) => { e.stopPropagation(); onEventClick(event); }}
                        className="text-xs px-1 py-0.5 bg-blue-900/50 text-blue-300 rounded truncate hover:bg-blue-800"
                      >
                        {event.title}
                      </div>
                    ))}
                    {dayEvents.length > 2 && (
                      <div className="text-xs text-gray-500">+{dayEvents.length - 2} more</div>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface UpcomingEventsProps {
  onEventClick: (event: CalendarEvent) => void;
  refreshKey?: number;
}

export function UpcomingEvents({ onEventClick, refreshKey }: UpcomingEventsProps) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);

  useEffect(() => {
    const loadEvents = async () => {
      try {
        const now = Date.now();
        const response = await fetch(`/api/database?action=events&start=${now}&end=${now + 30 * 24 * 60 * 60 * 1000}`);
        const data = await response.json();
        setEvents(data.events || []);
      } catch (error) {
        console.error('Error loading events:', error);
      }
    };
    loadEvents();
  }, [refreshKey]);

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
      return `Today at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return `Tomorrow at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else {
      return date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' }) + 
             ' at ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
  };

  return (
    <div className="space-y-2">
      {events.length === 0 ? (
        <p className="text-gray-400 text-sm">No upcoming events</p>
      ) : (
        events.slice(0, 5).map(event => (
          <div
            key={event.id}
            onClick={() => onEventClick(event)}
            className="p-3 bg-gray-800 border border-gray-700 rounded hover:border-purple-500 cursor-pointer transition-colors"
          >
            <div className="flex justify-between items-start">
              <h4 className="font-medium text-white">{event.title}</h4>
              <span className={`text-xs px-2 py-0.5 rounded ${
                event.status === 'confirmed' ? 'bg-green-900/50 text-green-300' : 'bg-yellow-900/50 text-yellow-300'
              }`}>
                {event.status}
              </span>
            </div>
            <p className="text-sm text-gray-400 mt-1">{formatDate(event.startDate)}</p>
            {event.location && (
              <p className="text-xs text-gray-500 mt-1">{event.location}</p>
            )}
          </div>
        ))
      )}
    </div>
  );
}