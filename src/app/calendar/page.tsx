'use client';

import { useState, useCallback, useEffect } from 'react';
import { CalendarView, EventEditor, UpcomingEvents } from '@/components/Calendar';

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

interface TicklerData {
  date: string;
  dayOfWeek: string;
  greeting: string;
  today: {
    events: Array<{
      id: string;
      title: string;
      time: string;
      location?: string;
      status: string;
    }>;
    eventCount: number;
  };
  upcoming: {
    events: Array<{
      id: string;
      title: string;
      time: string;
      location?: string;
      status: string;
    }>;
    eventCount: number;
  };
  tasks: {
    pending: number;
  };
  briefing?: string;
}

export default function CalendarPage() {
  const [isEventEditorOpen, setIsEventEditorOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | undefined>();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [refreshKey, setRefreshKey] = useState(0);
  const [tickler, setTickler] = useState<TicklerData | null>(null);
  const [briefing, setBriefing] = useState<string>('');
  const [loadingBriefing, setLoadingBriefing] = useState(false);

  useEffect(() => {
    loadTickler();
  }, []);

  const loadTickler = async () => {
    try {
      const response = await fetch('/api/tickler');
      const data = await response.json();
      setTickler(data);
    } catch (error) {
      console.error('Error loading tickler:', error);
    }
  };

  const generateBriefing = async () => {
    setLoadingBriefing(true);
    try {
      const response = await fetch('/api/tickler?action=briefing');
      const data = await response.json();
      setBriefing(data.briefing || '');
    } catch (error) {
      console.error('Error generating briefing:', error);
    } finally {
      setLoadingBriefing(false);
    }
  };

  const handleNewEvent = (date?: Date) => {
    setEditingEvent(undefined);
    setSelectedDate(date);
    setIsEventEditorOpen(true);
  };

  const handleEventClick = (event: CalendarEvent) => {
    setEditingEvent(event);
    setSelectedDate(undefined);
    setIsEventEditorOpen(true);
  };

  const handleDateClick = (date: Date) => {
    handleNewEvent(date);
  };

  const handleCloseEditor = () => {
    setIsEventEditorOpen(false);
    setEditingEvent(undefined);
    setSelectedDate(undefined);
  };

  const handleSaveEvent = useCallback(() => {
    setRefreshKey(prev => prev + 1);
    loadTickler();
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white">Calendar</h1>
            <p className="text-gray-400 mt-1">
              Manage events and export to your favorite calendar app
            </p>
          </div>
          <button
            onClick={() => handleNewEvent()}
            className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Event
          </button>
        </div>

        {/* Tickler / Daily Briefing */}
        {tickler && (
          <div className="bg-gradient-to-r from-purple-900/50 to-slate-800/50 rounded-lg p-6 mb-6 border border-purple-700/50">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-2xl font-bold text-white">
                  {tickler.greeting} • {tickler.dayOfWeek}
                </h2>
                <p className="text-gray-400 text-sm">{tickler.date}</p>
              </div>
              <button
                onClick={generateBriefing}
                disabled={loadingBriefing}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white rounded text-sm flex items-center gap-2"
              >
                {loadingBriefing ? (
                  <>
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Generating...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Generate Briefing
                  </>
                )}
              </button>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="bg-slate-800/50 rounded-lg p-3">
                <div className="text-2xl font-bold text-white">{tickler?.today?.eventCount ?? 0}</div>
                <div className="text-gray-400 text-sm">Today's Events</div>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-3">
                <div className="text-2xl font-bold text-white">{tickler?.upcoming?.eventCount ?? 0}</div>
                <div className="text-gray-400 text-sm">This Week</div>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-3">
                <div className="text-2xl font-bold text-white">{tickler?.tasks?.pending ?? 0}</div>
                <div className="text-gray-400 text-sm">Pending Tasks</div>
              </div>
            </div>

            {/* Today's Schedule */}
            {tickler?.today?.events?.length > 0 && (
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-purple-400 mb-2">Today's Schedule</h3>
                <div className="space-y-2">
                  {tickler?.today?.events?.map((event) => (
                    <div key={event.id} className="flex items-center gap-3 bg-slate-800/30 rounded p-2">
                      <span className="text-purple-400 font-mono text-sm w-16">{event.time}</span>
                      <span className="text-white">{event.title}</span>
                      {event.location && (
                        <span className="text-gray-500 text-sm">• {event.location}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* AI Generated Briefing */}
            {briefing && (
              <div className="bg-slate-800/50 rounded-lg p-4 border border-purple-700/30">
                <h3 className="text-sm font-semibold text-purple-400 mb-2">Daily Briefing</h3>
                <div className="text-gray-300 text-sm whitespace-pre-wrap">{briefing}</div>
              </div>
            )}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <CalendarView
              onEventClick={handleEventClick}
              onDateClick={handleDateClick}
              refreshKey={refreshKey}
            />
          </div>
          
          <div>
            <div className="bg-gray-800 rounded-lg p-4 mb-6">
              <h3 className="text-lg font-semibold text-white mb-4">Upcoming Events</h3>
              <UpcomingEvents onEventClick={handleEventClick} refreshKey={refreshKey} />
            </div>

            <div className="bg-gray-800 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-white mb-4">Export to Calendar</h3>
              <p className="text-sm text-gray-400 mb-4">
                When you create or edit an event, you can download an ICS file to import into:
              </p>
              <ul className="text-sm text-gray-400 space-y-2">
                <li className="flex items-center gap-2">
                  <span className="text-purple-400">•</span> Microsoft Outlook
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-purple-400">•</span> Google Calendar
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-purple-400">•</span> Apple Calendar
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-purple-400">•</span> Any other calendar app
                </li>
              </ul>
            </div>
          </div>
        </div>

        <EventEditor
          isOpen={isEventEditorOpen}
          onClose={handleCloseEditor}
          initialEvent={editingEvent}
          selectedDate={selectedDate}
          onSave={handleSaveEvent}
        />
      </div>
    </div>
  );
}