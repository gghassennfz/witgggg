import React, { useState } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import format from 'date-fns/format';
import parse from 'date-fns/parse';
import startOfWeek from 'date-fns/startOfWeek';
import getDay from 'date-fns/getDay';
import enUS from 'date-fns/locale/en-US';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import './CalendarPage.css';
import './CalendarPage.override.css';
import './CalendarPage.modal.override.css';

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

function eventStyleGetter(event) {
  return {
    style: {
      backgroundColor: '#007bff',
      color: '#fff',
      borderRadius: '6px',
      border: 'none',
      fontWeight: 500,
      padding: '2px 5px',
    },
  };
}

export default function CalendarPage({ tasks, events, addOrEditEvent, deleteEvent }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [modalData, setModalData] = useState({});
  const [isEdit, setIsEdit] = useState(false);

  // Prepare events for the calendar
  const calendarEvents = events.map(e => ({
    ...e,
    title: e.title,
    start: new Date(e.start),
    end: new Date(e.end),
  }));

  function handleSelectSlot(slotInfo) {
    setModalOpen(true);
    setIsEdit(false);
    setModalData({
      start: slotInfo.start,
      end: slotInfo.end,
      taskId: '',
      title: '',
    });
  }

  function handleSelectEvent(event) {
    setModalOpen(true);
    setIsEdit(true);
    setModalData({ ...event });
  }

  function handleModalChange(e) {
    const { name, value } = e.target;
    setModalData(d => ({ ...d, [name]: value }));
    if (name === 'taskId') {
      // auto-fill title
      const t = tasks.find(t => t.id === value);
      if (t) setModalData(d => ({ ...d, title: t.text }));
    }
  }

  function handleModalDateChange(e) {
    const { name, value } = e.target;
    setModalData(d => ({ ...d, [name]: new Date(value) }));
  }

  function handleModalSubmit(e) {
    e.preventDefault();
    if (!modalData.taskId || !modalData.start || !modalData.end) return;
    addOrEditEvent({
      ...modalData,
      id: modalData.id || Date.now().toString(),
      title: tasks.find(t => t.id === modalData.taskId)?.text || modalData.title,
      start: new Date(modalData.start),
      end: new Date(modalData.end),
    });
    setModalOpen(false);
    setModalData({});
  }

  function handleDelete() {
    if (modalData.id) deleteEvent(modalData.id);
    setModalOpen(false);
    setModalData({});
  }

  return (
    <div className="calendar-page">
      <h2>Calendar</h2>
      <div style={{ background: '#fff', borderRadius: 8, padding: 8 }}>
        <Calendar
          selectable
          localizer={localizer}
          events={calendarEvents}
          startAccessor="start"
          endAccessor="end"
          style={{ height: 500 }}
          onSelectSlot={handleSelectSlot}
          onSelectEvent={handleSelectEvent}
          eventPropGetter={eventStyleGetter}
        />
      </div>
      {modalOpen && (
        <div className="calendar-modal-bg">
          <div className="calendar-modal">
            <form onSubmit={handleModalSubmit}>
              <h3>{isEdit ? 'Edit Deadline' : 'Add Deadline'}</h3>
              <label>Task
                <select name="taskId" value={modalData.taskId || ''} onChange={handleModalChange} required>
                  <option value="">Select a task</option>
                  {tasks.map(t => (
                    <option key={t.id} value={t.id}>{t.text}</option>
                  ))}
                </select>
              </label>
              <label>Start
                <input type="datetime-local" name="start" value={modalData.start ? format(modalData.start, 'yyyy-MM-dd\'T\'HH:mm') : ''} onChange={handleModalDateChange} required />
              </label>
              <label>End
                <input type="datetime-local" name="end" value={modalData.end ? format(modalData.end, 'yyyy-MM-dd\'T\'HH:mm') : ''} onChange={handleModalDateChange} required />
              </label>
              <div style={{ marginTop: 16, display: 'flex', gap: 12 }}>
                <button type="submit">{isEdit ? 'Save' : 'Add'}</button>
                {isEdit && <button type="button" onClick={handleDelete} style={{ background: '#ff4d4f', color: '#fff' }}>Delete</button>}
                <button type="button" onClick={() => setModalOpen(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
