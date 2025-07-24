
'use client';

import { useState, useEffect } from 'react';
import { calendarHelpers, authHelpers, CalendarEvent } from '../lib/supabase';

interface Event {
  id: string;
  title: string;
  date: string;
  time: string;
  description: string;
  reminder: boolean;
  color: string;
}

export default function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const [newEvent, setNewEvent] = useState({
    title: '',
    date: '',
    time: '',
    description: '',
    reminder: false,
    color: 'bg-blue-500'
  });

  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Load events from database
  useEffect(() => {
    const loadEvents = async () => {
      try {
        const { user } = await authHelpers.getCurrentUser();
        if (!user) {
          setIsAuthenticated(false);
          setLoading(false);
          return;
        }

        setIsAuthenticated(true);
        
        // Get events for current month
        const startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).toISOString();
        const endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).toISOString();
        
        const { data, error } = await calendarHelpers.getEvents(user.id, startDate, endDate);
        if (error) {
          console.error('Error loading events:', error);
          return;
        }

        // Convert CalendarEvent to Event format
        const convertedEvents: Event[] = (data || []).map(event => ({
          id: event.id,
          title: event.title,
          date: new Date(event.start_date).toISOString().split('T')[0],
          time: new Date(event.start_date).toTimeString().slice(0, 5),
          description: event.description || '',
          reminder: event.reminder_set || false,
          color: event.color ? `bg-${event.color}-500` : 'bg-blue-500'
        }));

        setEvents(convertedEvents);
      } catch (error) {
        console.error('Error loading events:', error);
      } finally {
        setLoading(false);
      }
    };

    loadEvents();
  }, [currentDate]);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];

    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day);
    }

    return days;
  };

  const getEventsForDate = (day: number) => {
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    const dayStr = String(day).padStart(2, '0');
    const dateStr = year + '-' + month + '-' + dayStr;
    return events.filter(event => event.date === dateStr);
  };

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const handleCreateEvent = async () => {
    if (!newEvent.title.trim() || !newEvent.date) return;

    try {
      const { user } = await authHelpers.getCurrentUser();
      if (!user) return;

      // Create start date with time
      const startDate = new Date(`${newEvent.date}T${newEvent.time}:00`);
      
      const calendarEvent: Omit<CalendarEvent, 'id' | 'created_at' | 'updated_at'> = {
        user_id: user.id,
        title: newEvent.title,
        description: newEvent.description,
        start_date: startDate.toISOString(),
        color: newEvent.color.replace('bg-', '').replace('-500', ''),
        reminder_set: newEvent.reminder,
        reminder_minutes: newEvent.reminder ? 15 : undefined
      };

      const { data, error } = await calendarHelpers.createEvent(calendarEvent);
      if (error) {
        console.error('Error creating event:', error);
        return;
      }

      // Convert back to Event format and add to state
      const event: Event = {
        id: data.id,
        title: data.title,
        date: new Date(data.start_date).toISOString().split('T')[0],
        time: new Date(data.start_date).toTimeString().slice(0, 5),
        description: data.description || '',
        reminder: data.reminder_set || false,
        color: data.color ? `bg-${data.color}-500` : 'bg-blue-500'
      };

      setEvents([...events, event]);
      setShowEventModal(false);
      setNewEvent({
        title: '',
        date: '',
        time: '',
        description: '',
        reminder: false,
        color: 'bg-blue-500'
      });
    } catch (error) {
      console.error('Error creating event:', error);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    try {
      const { error } = await calendarHelpers.deleteEvent(eventId);
      if (error) {
        console.error('Error deleting event:', error);
        return;
      }
      setEvents(events.filter(event => event.id !== eventId));
    } catch (error) {
      console.error('Error deleting event:', error);
    }
  };

  const handleMicrosoftAuth = () => {
    setIsAuthenticated(true);
  };

  const days = getDaysInMonth(currentDate);
  const today = new Date();
  const todayYear = today.getFullYear();
  const todayMonth = String(today.getMonth() + 1).padStart(2, '0');
  const todayDay = String(today.getDate()).padStart(2, '0');
  const todayStr = todayYear + '-' + todayMonth + '-' + todayDay;

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between p-6 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-4">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-200">Calendar</h1>
          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrevMonth}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <i className="ri-arrow-left-line w-4 h-4 flex items-center justify-center text-gray-600 dark:text-gray-400"></i>
            </button>
            <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300 min-w-[180px] text-center">
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h2>
            <button
              onClick={handleNextMonth}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <i className="ri-arrow-right-line w-4 h-4 flex items-center justify-center text-gray-600 dark:text-gray-400"></i>
            </button>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          {!isAuthenticated ? (
            <button
              onClick={handleMicrosoftAuth}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2 whitespace-nowrap"
            >
              <i className="ri-microsoft-line w-4 h-4 flex items-center justify-center"></i>
              <span>Connect Microsoft</span>
            </button>
          ) : (
            <div className="flex items-center space-x-2 text-sm text-green-600 dark:text-green-400">
              <i className="ri-check-line w-4 h-4 flex items-center justify-center"></i>
              <span>Microsoft Connected</span>
            </div>
          )}

          <button
            onClick={() => setShowEventModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2 whitespace-nowrap"
          >
            <i className="ri-add-line w-4 h-4 flex items-center justify-center"></i>
            <span>New Event</span>
          </button>
        </div>
      </div>

      <div className="flex-1 p-6">
        <div className="grid grid-cols-7 gap-2 mb-4">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="text-center text-sm font-semibold text-gray-700 dark:text-gray-300 py-2">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-2 flex-1">
          {days.map((day, index) => {
            if (day === null) {
              return <div key={index} className="p-2"></div>;
            }

            const year = currentDate.getFullYear();
            const month = String(currentDate.getMonth() + 1).padStart(2, '0');
            const dayStr = String(day).padStart(2, '0');
            const dateStr = year + '-' + month + '-' + dayStr;
            const dayEvents = getEventsForDate(day);
            const isToday = dateStr === todayStr;
            const isSelected = selectedDate === dateStr;

            return (
              <div
                key={day}
                onClick={() => setSelectedDate(dateStr)}
                className={'p-2 min-h-[120px] border rounded-lg cursor-pointer transition-colors ' + (
                  isToday
                    ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700'
                    : isSelected
                    ? 'bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600'
                    : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750'
                )}
              >
                <div className={'text-sm font-medium mb-1 ' + (
                  isToday
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-gray-700 dark:text-gray-300'
                )}>
                  {day}
                </div>

                <div className="space-y-1">
                  {dayEvents.slice(0, 3).map(event => (
                    <div
                      key={event.id}
                      className={'text-xs p-1 rounded text-white truncate ' + event.color}
                      title={event.title}
                    >
                      {event.time && event.time + ' '}{event.title}
                    </div>
                  ))}
                  {dayEvents.length > 3 && (
                    <div className="text-xs text-gray-500 px-1">
                      +{dayEvents.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {selectedDate && (
        <div className="fixed right-6 top-20 w-80 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-4 z-40">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-800 dark:text-gray-200">
              {new Date(selectedDate).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </h3>
            <button
              onClick={() => setSelectedDate(null)}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
            >
              <i className="ri-close-line w-4 h-4 flex items-center justify-center text-gray-500"></i>
            </button>
          </div>

          <div className="space-y-2">
            {getEventsForDate(parseInt(selectedDate.split('-')[2])).map(event => (
              <div key={event.id} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <div className={'w-2 h-2 rounded-full ' + event.color}></div>
                      <h4 className="font-medium text-gray-800 dark:text-gray-200 text-sm">
                        {event.title}
                      </h4>
                    </div>
                    {event.time && (
                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                        {event.time}
                      </p>
                    )}
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {event.description}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDeleteEvent(event.id)}
                    className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
                  >
                    <i className="ri-delete-bin-line w-3 h-3 flex items-center justify-center text-gray-500"></i>
                  </button>
                </div>
              </div>
            ))}

            {getEventsForDate(parseInt(selectedDate.split('-')[2])).length === 0 && (
              <p className="text-sm text-gray-500 text-center py-4">No events on this day</p>
            )}
          </div>
        </div>
      )}

      {showEventModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg w-96">
            <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-200">Create New Event</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Event Title</label>
                <input
                  type="text"
                  value={newEvent.title}
                  onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                  placeholder="Enter event title"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date</label>
                  <input
                    type="date"
                    value={newEvent.date}
                    onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Time</label>
                  <input
                    type="time"
                    value={newEvent.time}
                    onChange={(e) => setNewEvent({ ...newEvent, time: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                <textarea
                  value={newEvent.description}
                  onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                  rows={3}
                  placeholder="Event description"
                />
              </div>

              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="reminder"
                  checked={newEvent.reminder}
                  onChange={(e) => setNewEvent({ ...newEvent, reminder: e.target.checked })}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                />
                <label htmlFor="reminder" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Set reminder
                </label>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowEventModal(false)}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors whitespace-nowrap"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateEvent}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors whitespace-nowrap"
              >
                Create Event
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
