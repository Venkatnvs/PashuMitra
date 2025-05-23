import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { Syringe, FileText, CheckCircle, RotateCcw } from 'lucide-react';
import React from 'react';

const CattleCalendar = ({
  calendarEvents,
  handleDateSelect,
  handleEventClick,
  handleEventDrop,
  handleMarkOccurrenceAsCompleted,
  handleMarkOccurrenceAsIncomplete
}) => (
  <div className="calendar-container">
    <FullCalendar
      plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
      initialView="dayGridMonth"
      headerToolbar={{
        left: 'prev,next today',
        center: 'title',
        right: 'dayGridMonth,timeGridWeek,timeGridDay'
      }}
      selectable={true}
      selectMirror={true}
      dayMaxEvents={true}
      weekends={true}
      events={calendarEvents}
      select={handleDateSelect}
      eventClick={handleEventClick}
      eventDrop={handleEventDrop}
      eventContent={(eventInfo) => (
        <div className="flex items-center gap-1 p-1" style={{backgroundColor: eventInfo.event.backgroundColor, borderRadius: 4, padding: '2px 6px'}}>
          {eventInfo.event.extendedProps.isInjection ? (
            <Syringe className="h-3 w-3" />
          ) : (
            <FileText className="h-3 w-3" />
          )}
          <span className="text-xs truncate">
            {eventInfo.event.title}
            {eventInfo.event.extendedProps.isRepeatedEvent && ' (Repeat)'}
            {eventInfo.event.extendedProps.completed && ' ✓'}
            {eventInfo.event.extendedProps.isToday && (
              eventInfo.event.extendedProps.completed ?
                <RotateCcw className="inline h-3 w-3 ml-1 text-yellow-600 cursor-pointer" onClick={e => { e.stopPropagation(); handleMarkOccurrenceAsIncomplete(eventInfo.event.extendedProps.eventId, eventInfo.event.extendedProps.occurrenceDate); }} />
                :
                <CheckCircle className="inline h-3 w-3 ml-1 text-green-600 cursor-pointer" onClick={e => { e.stopPropagation(); handleMarkOccurrenceAsCompleted(eventInfo.event.extendedProps.eventId, eventInfo.event.extendedProps.occurrenceDate); }} />
            )}
          </span>
        </div>
      )}
      eventDidMount={(info) => {
        if (info.event.extendedProps.isRepeated) {
          info.el.classList.add('repeated-event');
        }
        if (info.event.extendedProps.completed) {
          info.el.classList.add('completed-event');
        }
      }}
      height="auto"
      selectConstraint={{
        start: new Date().toISOString().split('T')[0], // Today
        end: '2100-12-31' // Far future date
      }}
      selectOverlap={false}
      slotMinTime="00:00:00"
      slotMaxTime="24:00:00"
      allDaySlot={true}
      nowIndicator={true}
      editable={true}
      droppable={true}
      dayCellClassNames={(arg) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const cellDate = new Date(arg.date);
        cellDate.setHours(0, 0, 0, 0);
        return cellDate < today ? 'fc-past-date' : '';
      }}
    />
  </div>
);

export default CattleCalendar; 