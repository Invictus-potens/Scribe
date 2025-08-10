
'use client';

import { useState, useEffect } from 'react';
import { useI18n, useDateFormatter } from './I18nProvider';
import { calendarHelpers, authHelpers, CalendarEvent } from '../lib/supabase';

interface Event {
  id: string;
  title: string;
  date: string;
  time: string;
  description: string;
  reminder: boolean;
  reminderMinutes?: number;
  color: string;
}

const EVENT_COLORS = [
  { name: 'Blue', value: 'blue', class: 'bg-blue-500' },
  { name: 'Red', value: 'red', class: 'bg-red-500' },
  { name: 'Green', value: 'green', class: 'bg-green-500' },
  { name: 'Yellow', value: 'yellow', class: 'bg-yellow-500' },
  { name: 'Purple', value: 'purple', class: 'bg-purple-500' },
  { name: 'Pink', value: 'pink', class: 'bg-pink-500' },
  { name: 'Indigo', value: 'indigo', class: 'bg-indigo-500' },
  { name: 'Gray', value: 'gray', class: 'bg-gray-500' },
];

const REMINDER_OPTIONS = [
  { label: '5 minutes before', value: 5 },
  { label: '10 minutes before', value: 10 },
  { label: '15 minutes before', value: 15 },
  { label: '30 minutes before', value: 30 },
  { label: '1 hour before', value: 60 },
  { label: '2 hours before', value: 120 },
  { label: '1 day before', value: 1440 },
];

export default function Calendar() {
  const { t } = useI18n();
  const { formatDate, formatMonthYear, formatLongDate, getWeekdayShortNames } = useDateFormatter();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<Event[]>([]);
  const [_, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [newEvent, setNewEvent] = useState({
    title: '',
    date: '',
    time: '',
    description: '',
    reminder: false,
    reminderMinutes: 15,
    color: 'blue'
  });
  const [notificationPermission, setNotificationPermission] = useState<'default' | 'granted' | 'denied'>('default');

  // Helpers to format local date/time strings
  const formatLocalDateStr = (dateInput: string | Date) => {
    const d = new Date(dateInput);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const formatLocalTimeStr = (dateInput: string | Date) => {
    const d = new Date(dateInput);
    const hh = String(d.getHours()).padStart(2, '0');
    const mi = String(d.getMinutes()).padStart(2, '0');
    return `${hh}:${mi}`;
  };

  const getLocalDateFromYYYYMMDD = (dateStr: string) => {
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, (m || 1) - 1, d || 1);
  };

  // Request notification permission on component mount
  useEffect(() => {
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  // Check for upcoming reminders
  useEffect(() => {
    const checkReminders = () => {
      const now = new Date();
      events.forEach(event => {
        if (event.reminder && event.date && event.time) {
          const eventDate = new Date(`${event.date}T${event.time}:00`);
          const reminderTime = new Date(eventDate.getTime() - (event.reminderMinutes || 15) * 60 * 1000);
          
          if (now >= reminderTime && now <= eventDate) {
            showNotification(event);
          }
        }
      });
    };

    const interval = setInterval(checkReminders, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [events]);

  const showNotification = (event: Event) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      const reminderText = event.reminderMinutes === 1 
        ? '1 minute' 
        : event.reminderMinutes === 60 
        ? '1 hour' 
        : event.reminderMinutes === 120 
        ? '2 hours' 
        : event.reminderMinutes === 1440 
        ? '1 day' 
        : `${event.reminderMinutes} minutes`;
        
      new Notification('Event Reminder', {
        body: `${event.title} starts in ${reminderText}`,
        icon: '/favicon.ico',
        tag: event.id, // Prevents duplicate notifications
      });
    }
  };

  // Load events from database
  useEffect(() => {
    const loadEvents = async () => {
      try {
        const { user } = await authHelpers.getCurrentUser();
        if (!user) {
          setLoading(false);
          return;
        }
        
        // Get events for current month
        const startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).toISOString();
        const endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).toISOString();
        
        const { data, error } = await calendarHelpers.getEvents(user.id, startDate, endDate);
        if (error) {
          console.error('Error loading events:', error);
          return;
        }

        // Convert CalendarEvent to Event format (local timezone)
        const convertedEvents: Event[] = (data || []).map(event => ({
          id: event.id,
          title: event.title,
          date: formatLocalDateStr(event.start_date),
          time: formatLocalTimeStr(event.start_date),
          description: event.description || '',
          reminder: event.reminder_set || false,
          reminderMinutes: event.reminder_minutes || 15,
          color: event.color || 'blue'
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

  const monthLabel = formatMonthYear(currentDate);

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    
    // Usar construtor simples sem especificar horas
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    
    // Get the day of week for the first day (0 = Sunday, 1 = Monday, etc.)
    const firstDayOfWeek = firstDayOfMonth.getDay();
    const daysInMonth = lastDayOfMonth.getDate();
  
    const days = [];
  
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDayOfWeek; i++) {
      days.push(null);
    }
  
    // Add all days of the month
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
    const filtered = events.filter(event => event.date === dateStr);
    return filtered.sort((a, b) => {
      const aKey = a.time && a.time.length === 5 ? a.time : '99:99';
      const bKey = b.time && b.time.length === 5 ? b.time : '99:99';
      return aKey.localeCompare(bKey);
    });
  };

  const handlePrevMonth = () => {
    const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1);
    setCurrentDate(newDate);
  };

  const handleNextMonth = () => {
    const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1);
    setCurrentDate(newDate);
  };

  const handleCreateEvent = async () => {
    if (!newEvent.title.trim() || !newEvent.date) return;

    try {
      const { user } = await authHelpers.getCurrentUser();
      if (!user) return;

      // Create start date with time (default to 00:00 if empty)
      const safeTime = newEvent.time && newEvent.time.trim() ? newEvent.time : '00:00';
      const startDate = new Date(`${newEvent.date}T${safeTime}:00`);
      
      const calendarEvent: Omit<CalendarEvent, 'id' | 'created_at' | 'updated_at'> = {
        user_id: user.id,
        title: newEvent.title,
        description: newEvent.description,
        start_date: startDate.toISOString(),
        color: newEvent.color,
        reminder_set: newEvent.reminder,
        reminder_minutes: newEvent.reminder ? newEvent.reminderMinutes : undefined
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
        date: formatLocalDateStr(data.start_date),
        time: formatLocalTimeStr(data.start_date),
        description: data.description || '',
        reminder: data.reminder_set || false,
        reminderMinutes: data.reminder_minutes || 15,
        color: data.color || 'blue'
      };

      setEvents(prev => [...prev, event]);
      setShowEventModal(false);
      setNewEvent({
        title: '',
        date: '',
        time: '',
        description: '',
        reminder: false,
        reminderMinutes: 15,
        color: 'blue'
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
      setEvents(prev => prev.filter(event => event.id !== eventId));
    } catch (error) {
      console.error('Error deleting event:', error);
    }
  };

  

  const requestNotificationPermission = () => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then(permission => {
        setNotificationPermission(permission);
      });
    }
  };

  const handleEditEvent = (event: Event) => {
    setEditingEvent({
      ...event,
      reminderMinutes: event.reminderMinutes || 15
    });
    setShowEditModal(true);
  };

  const handleUpdateEvent = async () => {
    if (!editingEvent || !editingEvent.title.trim() || !editingEvent.date) return;

    try {
      const { user } = await authHelpers.getCurrentUser();
      if (!user) return;

      // Create start date with time (default to 00:00 if empty)
      const safeTime = editingEvent.time && editingEvent.time.trim() ? editingEvent.time : '00:00';
      const startDate = new Date(`${editingEvent.date}T${safeTime}:00`);
      
      const calendarEvent: Partial<CalendarEvent> = {
        title: editingEvent.title,
        description: editingEvent.description,
        start_date: startDate.toISOString(),
        color: editingEvent.color,
        reminder_set: editingEvent.reminder,
        reminder_minutes: editingEvent.reminder ? editingEvent.reminderMinutes : undefined
      };

      const { data, error } = await calendarHelpers.updateEvent(editingEvent.id, calendarEvent);
      if (error) {
        console.error('Error updating event:', error);
        return;
      }

      // Update the event in the local state
      setEvents(prev => prev.map(event => 
        event.id === editingEvent.id 
          ? {
              ...event,
              title: editingEvent.title,
              date: formatLocalDateStr(data.start_date),
              time: formatLocalTimeStr(data.start_date),
              description: editingEvent.description,
              reminder: editingEvent.reminder,
              reminderMinutes: editingEvent.reminderMinutes,
              color: editingEvent.color
            }
          : event
      ));

      setShowEditModal(false);
      setEditingEvent(null);
    } catch (error) {
      console.error('Error updating event:', error);
    }
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
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-200">{t('calendar.title')}</h1>
          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrevMonth}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title="Prev"
            >
              <i className="ri-arrow-left-line w-4 h-4 flex items-center justify-center text-gray-600 dark:text-gray-400"></i>
            </button>
            <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300 min-w-[180px] text-center">
              {monthLabel}
            </h2>
            <button
              onClick={handleNextMonth}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title="Next"
            >
              <i className="ri-arrow-right-line w-4 h-4 flex items-center justify-center text-gray-600 dark:text-gray-400"></i>
            </button>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          {notificationPermission !== 'granted' && (
            <button
              onClick={requestNotificationPermission}
              className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2 whitespace-nowrap"
            >
              <i className="ri-notification-line w-4 h-4 flex items-center justify-center"></i>
              <span>{t('calendar.enableNotifications')}</span>
            </button>
          )}

          <button
            onClick={() => setShowEventModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2 whitespace-nowrap"
          >
            <i className="ri-add-line w-4 h-4 flex items-center justify-center"></i>
            <span>{t('calendar.newEvent')}</span>
          </button>
        </div>
      </div>

      <div className="flex-1 p-6">
        <div className="grid grid-cols-7 gap-2 mb-4">
          {getWeekdayShortNames().map(day => (
            <div key={day} className="text-center text-sm font-semibold text-gray-700 dark:text-gray-300 py-2">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-2 flex-1">
  {days.map((day, index) => {
    if (day === null) {
      return <div key={`empty-${index}`} className="p-2"></div>;
    }

    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    const dayStr = String(day).padStart(2, '0');
    const dateStr = `${year}-${month}-${dayStr}`;
    const dayEvents = getEventsForDate(day);
    const isToday = dateStr === todayStr;
    const isSelected = selectedDate === dateStr;

    // Função para determinar as classes CSS do dia
    const getDayClasses = () => {
      const baseClasses = 'p-2 min-h-[120px] border rounded-lg cursor-pointer transition-colors';
      
      if (isToday) {
        return `${baseClasses} bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700`;
      }
      
      if (isSelected) {
        return `${baseClasses} bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600`;
      }
      
      return `${baseClasses} bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700`;
    };

    // Função para determinar as classes do número do dia
    const getDayNumberClasses = () => {
      const baseClasses = 'text-sm font-medium mb-1';
      
      return isToday 
        ? `${baseClasses} text-blue-600 dark:text-blue-400`
        : `${baseClasses} text-gray-700 dark:text-gray-300`;
    };

    return (
      <div
        key={`day-${day}`}
        onClick={() => setSelectedDate(dateStr)}
        className={getDayClasses()}
      >
        <div className={getDayNumberClasses()}>
          {day}
        </div>

        <div className="space-y-1">
          {dayEvents.slice(0, 3).map(event => {
            const colorClass = EVENT_COLORS.find(c => c.value === event.color)?.class || 'bg-blue-500';
            return (
              <div
                key={event.id}
                className={`text-xs p-1 rounded text-white truncate ${colorClass}`}
                title={`${event.time ? event.time + ' - ' : ''}${event.title}`}
              >
                {event.time && `${event.time} `}{event.title}
              </div>
            );
          })}
          {dayEvents.length > 3 && (
            <div className="text-xs text-gray-500 px-1">
              +{dayEvents.length - 3} {t('calendar.more')}
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
            <h3 className="font-semibold text-gray-800 dark:text-gray-200">{formatLongDate(getLocalDateFromYYYYMMDD(selectedDate))}</h3>
            <button
              onClick={() => setSelectedDate(null)}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
              title="Close"
            >
              <i className="ri-close-line w-4 h-4 flex items-center justify-center text-gray-500"></i>
            </button>
          </div>

          <div className="space-y-2">
            {getEventsForDate(parseInt(selectedDate.split('-')[2])).map(event => {
              const colorClass = EVENT_COLORS.find(c => c.value === event.color)?.class || 'bg-blue-500';
              return (
                <div key={event.id} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <div className={'w-2 h-2 rounded-full ' + colorClass}></div>
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
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => handleEditEvent(event)}
                        className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
                        title={t('editor.edit') ?? 'Edit'}
                      >
                        <i className="ri-edit-line w-3 h-3 flex items-center justify-center text-gray-500"></i>
                      </button>
                      <button
                        onClick={() => handleDeleteEvent(event.id)}
                        className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
                        title={t('common.delete')}
                      >
                        <i className="ri-delete-bin-line w-3 h-3 flex items-center justify-center text-gray-500"></i>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {getEventsForDate(parseInt(selectedDate.split('-')[2])).length === 0 && (
              <p className="text-sm text-gray-500 text-center py-4">{t('calendar.noEventsOnDay')}</p>
            )}
          </div>
        </div>
      )}

      {showEventModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg w-96 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-200">{t('calendar.createNewEvent')}</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('calendar.eventTitle')}</label>
                <input
                  type="text"
                  value={newEvent.title}
                  onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                  placeholder={t('calendar.enterEventTitle')}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('calendar.date')}</label>
                  <label className="sr-only" htmlFor="create-date">{t('calendar.date')}</label>
                  <input
                    id="create-date"
                    type="date"
                    value={newEvent.date}
                    onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('calendar.time')}</label>
                  <label className="sr-only" htmlFor="create-time">{t('calendar.time')}</label>
                  <input
                    id="create-time"
                    type="time"
                    value={newEvent.time}
                    onChange={(e) => setNewEvent({ ...newEvent, time: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('calendar.description')}</label>
                <textarea
                  value={newEvent.description}
                  onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                  rows={3}
                  placeholder="Event description"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('calendar.eventColor')}</label>
                <div className="grid grid-cols-4 gap-2">
                  {EVENT_COLORS.map(color => (
                    <button
                      key={color.value}
                      onClick={() => setNewEvent({ ...newEvent, color: color.value })}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        newEvent.color === color.value
                          ? 'border-gray-800 dark:border-gray-200 scale-105'
                          : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                      }`}
                    >
                      <div className={`w-full h-6 rounded ${color.class}`}></div>
                      <span className="text-xs mt-1 block text-gray-700 dark:text-gray-300">{color.name}</span>
                    </button>
                  ))}
                </div>
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
                  {t('calendar.setReminder')}
                </label>
              </div>

              {newEvent.reminder && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('calendar.reminderTime')}</label>
                  <label className="sr-only" htmlFor="reminder-time-select">{t('calendar.reminderTime')}</label>
                  <select
                    id="reminder-time-select"
                    value={newEvent.reminderMinutes}
                    onChange={(e) => setNewEvent({ ...newEvent, reminderMinutes: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                  >
                    {REMINDER_OPTIONS.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {newEvent.reminder && notificationPermission !== 'granted' && (
                <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    {t('calendar.enableNotifications')}
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowEventModal(false)}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors whitespace-nowrap"
              >
                {t('calendar.cancel')}
              </button>
              <button
                onClick={handleCreateEvent}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors whitespace-nowrap"
              >
                {t('calendar.createEvent')}
              </button>
            </div>
          </div>
        </div>
      )}

      {showEditModal && editingEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg w-96 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-200">{t('calendar.editEvent')}</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('calendar.eventTitle')}</label>
                <input
                  type="text"
                  value={editingEvent.title}
                  onChange={(e) => setEditingEvent({ ...editingEvent, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                  placeholder={t('calendar.enterEventTitle')}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('calendar.date')}</label>
                  <label className="sr-only" htmlFor="edit-date">{t('calendar.date')}</label>
                  <input
                    id="edit-date"
                    type="date"
                    value={editingEvent.date}
                    onChange={(e) => setEditingEvent({ ...editingEvent, date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('calendar.time')}</label>
                  <label className="sr-only" htmlFor="edit-time">{t('calendar.time')}</label>
                  <input
                    id="edit-time"
                    type="time"
                    value={editingEvent.time}
                    onChange={(e) => setEditingEvent({ ...editingEvent, time: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('calendar.description')}</label>
                <textarea
                  value={editingEvent.description}
                  onChange={(e) => setEditingEvent({ ...editingEvent, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                  rows={3}
                  placeholder="Event description"
                />
              </div>

              <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('calendar.eventColor')}</label>
                <div className="grid grid-cols-4 gap-2">
                  {EVENT_COLORS.map(color => (
                    <button
                      key={color.value}
                      onClick={() => setEditingEvent({ ...editingEvent, color: color.value })}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        editingEvent.color === color.value
                          ? 'border-gray-800 dark:border-gray-200 scale-105'
                          : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                      }`}
                    >
                      <div className={`w-full h-6 rounded ${color.class}`}></div>
                      <span className="text-xs mt-1 block text-gray-700 dark:text-gray-300">{color.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="edit-reminder"
                  checked={editingEvent.reminder}
                  onChange={(e) => setEditingEvent({ ...editingEvent, reminder: e.target.checked })}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                />
                  <label htmlFor="edit-reminder" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t('calendar.setReminder')}
                </label>
              </div>

              {editingEvent.reminder && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('calendar.reminderTime')}</label>
                  <label className="sr-only" htmlFor="edit-reminder-time-select">{t('calendar.reminderTime')}</label>
                  <select
                    id="edit-reminder-time-select"
                    value={editingEvent.reminderMinutes}
                    onChange={(e) => setEditingEvent({ ...editingEvent, reminderMinutes: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                  >
                    {REMINDER_OPTIONS.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {editingEvent.reminder && notificationPermission !== 'granted' && (
                <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    {t('calendar.enableNotifications')}
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingEvent(null);
                }}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors whitespace-nowrap"
              >
                {t('calendar.cancel')}
              </button>
              <button
                onClick={handleUpdateEvent}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors whitespace-nowrap"
              >
                {t('calendar.updateEvent')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
