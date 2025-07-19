import React, { useState, useEffect } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import format from 'date-fns/format';
import parse from 'date-fns/parse';
import startOfWeek from 'date-fns/startOfWeek';
import getDay from 'date-fns/getDay';
import enUS from 'date-fns/locale/en-US';
import { toast } from 'react-toastify';
import { supabase } from '../../supabaseClient';
import API_BASE_URL from '../../apiConfig';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import './ProjectCalendar.css';

const locales = {
  'en-US': enUS,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }),
  getDay,
  locales,
});

const ProjectCalendar = ({ projectId, userId, currentUser, viewMode }) => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showEventModal, setShowEventModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [modalData, setModalData] = useState({});

  useEffect(() => {
    fetchEvents();
  }, [projectId, userId]);

  const fetchEvents = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const params = new URLSearchParams();
      if (userId) params.append('userId', userId);

      const response = await fetch(`${API_BASE_URL}/api/project-calendar/${projectId}?${params}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        const formattedEvents = data.map(event => ({
          ...event,
          start: new Date(event.start_date),
          end: new Date(event.end_date),
          title: event.title,
          resource: event
        }));
        setEvents(formattedEvents);
      }
    } catch (error) {
      console.error('Error fetching events:', error);
      toast.error('Failed to load calendar events');
    } finally {
      setLoading(false);
    }
  };

  const createEvent = async (eventData) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(`${API_BASE_URL}/api/project-calendar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          ...eventData,
          project_id: projectId
        })
      });

      if (response.ok) {
        const newEvent = await response.json();
        const formattedEvent = {
          ...newEvent,
          start: new Date(newEvent.start_date),
          end: new Date(newEvent.end_date),
          title: newEvent.title,
          resource: newEvent
        };
        setEvents(prev => [...prev, formattedEvent]);
        setShowEventModal(false);
        toast.success('Event created successfully!');
      }
    } catch (error) {
      console.error('Error creating event:', error);
      toast.error('Failed to create event');
    }
  };

  const updateEvent = async (eventId, updates) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(`${API_BASE_URL}/api/project-calendar/${eventId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(updates)
      });

      if (response.ok) {
        const updatedEvent = await response.json();
        const formattedEvent = {
          ...updatedEvent,
          start: new Date(updatedEvent.start_date),
          end: new Date(updatedEvent.end_date),
          title: updatedEvent.title,
          resource: updatedEvent
        };
        setEvents(prev => prev.map(event => 
          event.id === eventId ? formattedEvent : event
        ));
        setShowEventModal(false);
        toast.success('Event updated successfully!');
      }
    } catch (error) {
      console.error('Error updating event:', error);
      toast.error('Failed to update event');
    }
  };

  const deleteEvent = async (eventId) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(`${API_BASE_URL}/api/project-calendar/${eventId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (response.ok) {
        setEvents(prev => prev.filter(event => event.id !== eventId));
        setShowEventModal(false);
        toast.success('Event deleted successfully!');
      }
    } catch (error) {
      console.error('Error deleting event:', error);
      toast.error('Failed to delete event');
    }
  };

  const handleSelectSlot = (slotInfo) => {
    if (viewMode !== 'me' && viewMode !== 'all') return;
    
    setSelectedEvent(null);
    setModalData({
      title: '',
      description: '',
      start_date: slotInfo.start.toISOString().slice(0, 16),
      end_date: slotInfo.end.toISOString().slice(0, 16),
      event_type: 'meeting',
      color: '#007bff',
      is_all_day: false
    });
    setShowEventModal(true);
  };

  const handleSelectEvent = (event) => {
    const canEdit = event.resource.user_id === currentUser?.id || viewMode === 'all';
    if (!canEdit) return;

    setSelectedEvent(event.resource);
    setModalData({
      title: event.resource.title,
      description: event.resource.description || '',
      start_date: new Date(event.resource.start_date).toISOString().slice(0, 16),
      end_date: new Date(event.resource.end_date).toISOString().slice(0, 16),
      event_type: event.resource.event_type,
      color: event.resource.color,
      is_all_day: event.resource.is_all_day
    });
    setShowEventModal(true);
  };

  const eventStyleGetter = (event) => {
    const backgroundColor = event.resource?.color || '#007bff';
    return {
      style: {
        backgroundColor,
        borderRadius: '4px',
        opacity: 0.8,
        color: 'white',
        border: '0px',
        display: 'block'
      }
    };
  };

  if (loading) {
    return <div className="loading-spinner">Loading calendar...</div>;
  }

  return (
    <div className="project-calendar">
      <div className="calendar-header">
        <div className="header-info">
          <h2>
            {viewMode === 'me' ? 'My Calendar' : 
             viewMode === 'all' ? 'Team Calendar' : 
             `Calendar`}
          </h2>
          <span className="events-count">{events.length} event(s)</span>
        </div>
        {(viewMode === 'me' || viewMode === 'all') && (
          <button 
            className="btn btn-primary"
            onClick={() => {
              setSelectedEvent(null);
              setModalData({
                title: '',
                description: '',
                start_date: new Date().toISOString().slice(0, 16),
                end_date: new Date(Date.now() + 3600000).toISOString().slice(0, 16),
                event_type: 'meeting',
                color: '#007bff',
                is_all_day: false
              });
              setShowEventModal(true);
            }}
          >
            + Add Event
          </button>
        )}
      </div>

      <div className="calendar-container">
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          style={{ height: 600 }}
          onSelectSlot={handleSelectSlot}
          onSelectEvent={handleSelectEvent}
          selectable={viewMode === 'me' || viewMode === 'all'}
          eventPropGetter={eventStyleGetter}
          views={['month', 'week', 'day']}
          defaultView="month"
          popup
          tooltipAccessor={(event) => `${event.title} - ${event.resource?.user?.name}`}
        />
      </div>

      {showEventModal && (
        <EventModal
          event={selectedEvent}
          modalData={modalData}
          setModalData={setModalData}
          onClose={() => setShowEventModal(false)}
          onSubmit={selectedEvent ? 
            (data) => updateEvent(selectedEvent.id, data) : 
            createEvent
          }
          onDelete={selectedEvent ? 
            () => deleteEvent(selectedEvent.id) : 
            null
          }
        />
      )}
    </div>
  );
};

// Event Modal Component
const EventModal = ({ event, modalData, setModalData, onClose, onSubmit, onDelete }) => {
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!modalData.title.trim()) {
      toast.error('Event title is required');
      return;
    }

    const eventData = {
      ...modalData,
      start_date: new Date(modalData.start_date).toISOString(),
      end_date: new Date(modalData.end_date).toISOString()
    };

    onSubmit(eventData);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setModalData(prev => ({ 
      ...prev, 
      [name]: type === 'checkbox' ? checked : value 
    }));
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{event ? 'Edit Event' : 'Add New Event'}</h2>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>
        
        <form onSubmit={handleSubmit} className="modal-body">
          <div className="form-group">
            <label>Event Title *</label>
            <input
              type="text"
              name="title"
              value={modalData.title}
              onChange={handleChange}
              placeholder="Enter event title..."
              required
            />
          </div>
          
          <div className="form-group">
            <label>Description</label>
            <textarea
              name="description"
              value={modalData.description}
              onChange={handleChange}
              placeholder="Describe the event..."
              rows="3"
            />
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label>Start Date & Time</label>
              <input
                type="datetime-local"
                name="start_date"
                value={modalData.start_date}
                onChange={handleChange}
                required
              />
            </div>
            
            <div className="form-group">
              <label>End Date & Time</label>
              <input
                type="datetime-local"
                name="end_date"
                value={modalData.end_date}
                onChange={handleChange}
                required
              />
            </div>
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label>Event Type</label>
              <select name="event_type" value={modalData.event_type} onChange={handleChange}>
                <option value="meeting">Meeting</option>
                <option value="deadline">Deadline</option>
                <option value="milestone">Milestone</option>
                <option value="reminder">Reminder</option>
              </select>
            </div>
            
            <div className="form-group">
              <label>Color</label>
              <input
                type="color"
                name="color"
                value={modalData.color}
                onChange={handleChange}
              />
            </div>
          </div>
          
          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                name="is_all_day"
                checked={modalData.is_all_day}
                onChange={handleChange}
              />
              All Day Event
            </label>
          </div>
          
          <div className="modal-actions">
            {onDelete && (
              <button 
                type="button" 
                className="btn btn-danger"
                onClick={onDelete}
              >
                Delete
              </button>
            )}
            <div className="action-group">
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                {event ? 'Update Event' : 'Add Event'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProjectCalendar;
