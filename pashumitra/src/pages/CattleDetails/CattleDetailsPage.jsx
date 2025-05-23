import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ref, get, update } from 'firebase/database';
import { database } from '@/firebase/firebaseConfig';
import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ArrowLeft, Calendar as CalendarIcon, FileText, Syringe, Trash2, Edit2, Plus, CheckCircle, RotateCcw } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { createEvent, getAllEvents, updateEvent, deleteEvent } from '@/firebase/services/event';
import CattleCalendar from './CattleCalendar';

const eventSchema = z.object({
  note: z.string().min(1, "Note is required"),
  repeatDuration: z.number().min(1, "Repeat duration must be at least 1 day").optional(),
});

const CattleDetailsPage = () => {
  const [selectedDate, setSelectedDate] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isInjection, setIsInjection] = useState(true);
  const [isRepeated, setIsRepeated] = useState(false);
  const [cattle, setCattle] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingEvent, setEditingEvent] = useState(null);
  const { id } = useParams();
  const navigate = useNavigate();

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      note: '',
      repeatDuration: 1,
    }
  });

  useEffect(() => {
    const fetchCattleDetails = async () => {
      try {
        const cattleRef = ref(database, `cattles/${id}`);
        const snapshot = await get(cattleRef);
        
        if (snapshot.exists()) {
          setCattle(snapshot.val());
        }
        
        const eventsList = await getAllEvents(id);
        const formattedEvents = eventsList.map(event => ({
          ...event,
          date: new Date(event.date).toISOString()
        }));
        setEvents(formattedEvents);
        
        setLoading(false);
      } catch (error) {
        console.error('Error fetching cattle details:', error);
        toast.error('Failed to fetch cattle details');
        setLoading(false);
      }
    };

    fetchCattleDetails();
  }, [id]);

  const handleDateSelect = (selectInfo) => {
    setSelectedDate(selectInfo.start);
    setIsDialogOpen(true);
    reset();
    setEditingEvent(null);
  };

  const handleEventClick = (clickInfo) => {
    const event = events.find(e => e.id === clickInfo.event.id);
    if (event) {
      setEditingEvent(event);
      setSelectedDate(new Date(event.date));
      setIsInjection(event.isInjection);
      setIsRepeated(event.isRepeated);
      setValue('note', event.note);
      setValue('repeatDuration', event.repeatDuration || 1);
      setIsDialogOpen(true);
    }
  };

  const handleSchedule = async (data) => {
    try {
      const eventData = {
        ...data,
        date: selectedDate.toISOString(),
        cattleId: id,
        isInjection,
        isRepeated,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      if (editingEvent) {
        // Update existing event
        await updateEvent(id, editingEvent.id, eventData);
        setEvents(prevEvents => prevEvents.map(event => 
          event.id === editingEvent.id ? { ...event, ...eventData } : event
        ));
        toast.success('Event updated successfully');
      } else {
        // Create new event
        const newEvent = await createEvent(id, eventData);
        setEvents(prevEvents => [...prevEvents, newEvent]);
        toast.success('Event scheduled successfully');
      }

      setIsDialogOpen(false);
      setEditingEvent(null);
      setSelectedDate(null);
      reset();
    } catch (error) {
      console.error('Error scheduling event:', error);
      toast.error('Failed to schedule event');
    }
  };

  const handleDeleteEvent = async (eventId) => {
    try {
      await deleteEvent(id, eventId);
      setEvents(events.filter(event => event.id !== eventId));
      toast.success('Event deleted successfully');
    } catch (error) {
      console.error('Error deleting event:', error);
      toast.error('Failed to delete event');
    }
  };

  const handleEventDrop = async (info) => {
    try {
      // Prevent drag-drop for repeated events
      if (info.event.extendedProps.isRepeatedEvent) {
        toast.error('Repeated events cannot be moved.');
        info.revert();
        return;
      }
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const dropDate = new Date(info.event.start);
      dropDate.setHours(0, 0, 0, 0);

      if (dropDate < today) {
        toast.error('Cannot move events to past dates');
        info.revert();
        return;
      }

      const event = events.find(e => e.id === info.event.id);
      if (event) {
        const updatedEvent = {
          ...event,
          date: info.event.start.toISOString(),
          updatedAt: new Date().toISOString()
        };
        await update(ref(database, `cattles/${id}/events/${event.id}`), updatedEvent);
        setEvents(prevEvents => prevEvents.map(e => e.id === event.id ? updatedEvent : e));
        toast.success('Event date updated successfully');
      }
    } catch (error) {
      console.error('Error updating event date:', error);
      toast.error('Failed to update event date');
      info.revert();
    }
  };

  const generateRepeatedEvents = (event) => {
    if (!event.isRepeated || !event.repeatDuration) return [event];
    
    const events = [event];
    const startDate = new Date(event.date);
    
    // Generate events for the next 12 months
    for (let i = 1; i <= 52; i++) { // 52 weeks = ~12 months
      const nextDate = new Date(startDate);
      nextDate.setDate(startDate.getDate() + (event.repeatDuration * i));
      events.push({
        ...event,
        id: `${event.id}_repeat_${i}`,
        date: nextDate.toISOString(),
        isRepeatedEvent: true
      });
    }
    
    return events;
  };

  const handleMarkAsCompleted = async (eventId) => {
    try {
      const event = events.find(e => e.id === eventId);
      if (event) {
        // Set completedAt to (current date + 1 day)
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const updatedEvent = {
          ...event,
          completed: true,
          completedAt: tomorrow.toISOString(),
        };
        await update(ref(database, `cattles/${id}/events/${eventId}`), updatedEvent);
        setEvents(prevEvents => prevEvents.map(e => e.id === eventId ? updatedEvent : e));
        toast.success('Event marked as completed');
      }
    } catch (error) {
      console.error('Error marking event as completed:', error);
      toast.error('Failed to mark event as completed');
    }
  };

  const handleMarkAsIncomplete = async (eventId) => {
    try {
      const event = events.find(e => e.id === eventId);
      if (event) {
        let newCompletedAt = event.completedAt;
        if (event.completedAt && event.repeatDuration) {
          const prevCompleted = new Date(event.completedAt);
          prevCompleted.setDate(prevCompleted.getDate() + event.repeatDuration);
          newCompletedAt = prevCompleted.toISOString();
        }
        const updatedEvent = {
          ...event,
          completed: false,
          completedAt: newCompletedAt,
        };
        await update(ref(database, `cattles/${id}/events/${eventId}`), updatedEvent);
        setEvents(prevEvents => prevEvents.map(e => e.id === eventId ? updatedEvent : e));
        toast.success('Event marked as incomplete');
      }
    } catch (error) {
      console.error('Error marking event as incomplete:', error);
      toast.error('Failed to mark event as incomplete');
    }
  };

  // Helper to check if a given date is completed for a repeated event
  const isOccurrenceCompleted = (event, occurrenceDate) => {
    if (!event.isRepeated || !event.completedTill) return false;
    return new Date(occurrenceDate) <= new Date(event.completedTill);
  };

  // Mark as complete for a specific occurrence (for repeated events)
  const handleMarkOccurrenceAsCompleted = async (eventId, occurrenceDate) => {
    try {
      const event = events.find(e => e.id === eventId);
      if (event) {
        // Set completedTill to occurrenceDate (or tomorrow if you want)
        const completedTill = new Date(occurrenceDate);
        completedTill.setDate(completedTill.getDate() + 1); // as per previous logic
        const updatedEvent = {
          ...event,
          completedTill: completedTill.toISOString(),
        };
        await update(ref(database, `cattles/${id}/events/${eventId}`), updatedEvent);
        setEvents(prevEvents => prevEvents.map(e => e.id === eventId ? updatedEvent : e));
        toast.success('Occurrence marked as completed');
      }
    } catch (error) {
      console.error('Error marking occurrence as completed:', error);
      toast.error('Failed to mark occurrence as completed');
    }
  };

  // Mark as incomplete for a specific occurrence (for repeated events)
  const handleMarkOccurrenceAsIncomplete = async (eventId, occurrenceDate) => {
    try {
      const event = events.find(e => e.id === eventId);
      if (event) {
        // Set completedTill to previous occurrence (or null if none)
        let newCompletedTill = null;
        if (event.completedTill) {
          const prev = new Date(occurrenceDate);
          prev.setDate(prev.getDate() - event.repeatDuration);
          if (prev >= new Date(event.date)) {
            newCompletedTill = prev.toISOString();
          }
        }
        const updatedEvent = {
          ...event,
          completedTill: newCompletedTill,
        };
        await update(ref(database, `cattles/${id}/events/${eventId}`), updatedEvent);
        setEvents(prevEvents => prevEvents.map(e => e.id === eventId ? updatedEvent : e));
        toast.success('Occurrence marked as incomplete');
      }
    } catch (error) {
      console.error('Error marking occurrence as incomplete:', error);
      toast.error('Failed to mark occurrence as incomplete');
    }
  };

  // Helper to check if a given date is today
  const isToday = (date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return today.getTime() === d.getTime();
  };

  const calendarEvents = events.flatMap(event => {
    const repeatedEvents = generateRepeatedEvents(event);
    return repeatedEvents.map(occurrence => {
      // For repeated events, check completedTill for this occurrence
      const completed = event.isRepeated ? isOccurrenceCompleted(event, occurrence.date) : event.completed;
      let bgColor = '';
      if (completed) {
        bgColor = occurrence.isInjection ? '#bbf7d0' : '#a7f3d0'; // light green shades
      } else if (occurrence.isInjection) {
        bgColor = occurrence.isRepeatedEvent ? '#fee2e2' : '#fecaca'; // light red shades
      } else {
        bgColor = occurrence.isRepeatedEvent ? '#dbeafe' : '#bfdbfe'; // light blue shades
      }
      return {
        id: occurrence.id,
        title: occurrence.isInjection ? 'Injection' : 'Note',
        start: occurrence.date,
        end: occurrence.date,
        color: completed 
          ? occurrence.isInjection 
            ? '#22c55e' // Green for completed injections
            : '#10b981' // Green for completed notes
          : occurrence.isInjection 
            ? occurrence.isRepeatedEvent 
              ? '#ef4444' // Red for repeated injections
              : '#dc2626' // Darker red for single injections
            : occurrence.isRepeatedEvent
              ? '#3b82f6' // Blue for repeated notes
              : '#2563eb', // Darker blue for single notes
        backgroundColor: bgColor,
        extendedProps: {
          note: occurrence.note,
          isInjection: occurrence.isInjection,
          isRepeated: occurrence.isRepeated,
          repeatDuration: occurrence.repeatDuration,
          isRepeatedEvent: occurrence.isRepeatedEvent,
          completed: completed,
          isToday: isToday(occurrence.date),
          eventId: event.id,
          occurrenceDate: occurrence.date
        }
      };
    });
  });

  const getNextScheduledDate = (event) => {
    if (!event.isRepeated || !event.repeatDuration) return null;
    
    const lastDate = new Date(event.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let nextDate = new Date(lastDate);
    nextDate.setDate(lastDate.getDate() + event.repeatDuration);
    
    // If the next date is in the past, calculate the next future date
    while (nextDate < today) {
      nextDate.setDate(nextDate.getDate() + event.repeatDuration);
    }
    
    return nextDate;
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
          <p>Loading...</p>
        </div>
      </MainLayout>
    );
  }

  if (!cattle) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center h-[calc(100vh-4rem)]">
          <p className="text-muted-foreground mb-4">Cattle not found</p>
          <Button onClick={() => navigate('/')}>Go Back</Button>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto p-6">
        <Button 
          variant="ghost" 
          className="mb-6" 
          onClick={() => navigate('/')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to List
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Cattle Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Name</Label>
                <p className="text-lg font-medium">{cattle.name}</p>
              </div>
              <div>
                <Label>Type</Label>
                <p className="text-lg font-medium">{cattle.type}</p>
              </div>
              <div>
                <Label>Image</Label>
                <div className="mt-2 aspect-video rounded-lg overflow-hidden bg-muted">
                  <img 
                    src={cattle.image} 
                    alt={cattle.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
              <div>
                <Label>Created At</Label>
                <p className="text-lg font-medium">{format(new Date(cattle.createdAt), 'MMMM d, yyyy, HH:mm')}</p>
              </div>
            </CardContent>
          </Card>

          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center">
                  <CalendarIcon className="h-5 w-5 mr-2" />
                  Schedule Calendar
                </CardTitle>
                <Button
                  size="sm"
                  onClick={() => {
                    setSelectedDate(new Date());
                    setIsDialogOpen(true);
                    reset();
                    setEditingEvent(null);
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Event
                </Button>
              </CardHeader>
              <CardContent>
                <CattleCalendar
                  calendarEvents={calendarEvents}
                  handleDateSelect={handleDateSelect}
                  handleEventClick={handleEventClick}
                  handleEventDrop={handleEventDrop}
                  handleMarkOccurrenceAsCompleted={handleMarkOccurrenceAsCompleted}
                  handleMarkOccurrenceAsIncomplete={handleMarkOccurrenceAsIncomplete}
                />

                <div className="mt-4 space-y-2">
                  <h4 className="font-medium">All Events</h4>
                  <div className="space-y-2">
                    {events
                      .sort((a, b) => new Date(b.date) - new Date(a.date))
                      .map(event => {
                        const nextDate = getNextScheduledDate(event);
                        const completed = event.isRepeated ? isOccurrenceCompleted(event, event.date) : event.completed;
                        const showMarkButton = isToday(event.date);
                        return (
                          <div 
                            key={event.id}
                            className={`flex items-center p-2 rounded-lg border group ${
                              completed ? 'bg-green-50' : ''
                            }`}
                            style={{ 
                              borderLeftColor: event.isInjection ? '#ef4444' : '#3b82f6', 
                              borderLeftWidth: 4
                            }}
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <p className="font-medium">
                                  {format(new Date(event.date), 'MMMM d, yyyy')}
                                </p>
                                {completed && (
                                  <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                                    Completed
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {event.isInjection ? 'Injection' : 'Note'}: {event.note}
                              </p>
                              {event.isRepeated && nextDate && isOccurrenceCompleted(event, event.date) && (
                                <p className="text-sm text-blue-600 mt-1">
                                  Next scheduled: {format(nextDate, 'MMMM d, yyyy')}
                                </p>
                              )}
                            </div>
                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEventClick({
                                  event: {
                                    ...event,
                                    date: new Date(event.date).toISOString()
                                  }
                                })}
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              {showMarkButton && (
                                completed ? (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-yellow-600 hover:text-yellow-700"
                                    onClick={() => event.isRepeated
                                      ? handleMarkOccurrenceAsIncomplete(event.id, event.date)
                                      : handleMarkAsIncomplete(event.id)}
                                  >
                                    <RotateCcw className="h-4 w-4" />
                                  </Button>
                                ) : (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-green-600 hover:text-green-700"
                                    onClick={() => event.isRepeated
                                      ? handleMarkOccurrenceAsCompleted(event.id, event.date)
                                      : handleMarkAsCompleted(event.id)}
                                  >
                                    <CheckCircle className="h-4 w-4" />
                                  </Button>
                                )
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-red-500 hover:text-red-700"
                                onClick={() => handleDeleteEvent(event.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                            {event.isRepeated && (
                              <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                                Repeats every {event.repeatDuration} days
                              </span>
                            )}
                          </div>
                        );
                      })}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>
                {editingEvent ? 'Edit Event' : 'Schedule Event'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit(handleSchedule)}>
              <div className="grid gap-4 py-4">
                <Tabs defaultValue={isInjection ? "injection" : "note"} className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger 
                      value="injection"
                      onClick={() => setIsInjection(true)}
                    >
                      Injection
                    </TabsTrigger>
                    <TabsTrigger 
                      value="note"
                      onClick={() => setIsInjection(false)}
                    >
                      Note
                    </TabsTrigger>
                  </TabsList>
                </Tabs>

                {isInjection && (
                  <div className="flex items-center gap-4">
                    <Checkbox
                      id="repeated"
                      checked={isRepeated}
                      onCheckedChange={() => setIsRepeated(!isRepeated)}
                    />
                    <Label htmlFor="repeated">Repeat Injection</Label>
                  </div>
                )}

                {isRepeated && (
                  <div className="grid gap-2">
                    <Label htmlFor="repeatDuration">Repeat Duration (days)</Label>
                    <Input
                      id="repeatDuration"
                      type="number"
                      min="1"
                      {...register("repeatDuration", { valueAsNumber: true })}
                      placeholder="Enter number of days"
                    />
                    {errors.repeatDuration && (
                      <p className="text-red-500 text-xs">{errors.repeatDuration.message}</p>
                    )}
                  </div>
                )}

                <div className="grid gap-2">
                  <Label>{isInjection ? 'Injection Notes' : 'Note'}</Label>
                  <Textarea
                    {...register("note")}
                    placeholder={isInjection ? 'Add injection details...' : 'Add your note...'}
                  />
                  {errors.note && (
                    <p className="text-red-500 text-xs">{errors.note.message}</p>
                  )}
                </div>

                <div className="flex justify-end gap-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => {
                      setIsDialogOpen(false);
                      setEditingEvent(null);
                      reset();
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit">
                    {editingEvent ? 'Update Event' : (isInjection ? 'Schedule Injection' : 'Add Note')}
                  </Button>
                </div>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <style jsx global>{`
        .fc-past-date {
          background-color: #f3f4f6 !important;
          opacity: 1 !important;
          pointer-events: none !important;
        }
        .fc-past-date .fc-daygrid-day-number {
          color: #4b5563 !important;
          font-weight: 500 !important;
        }
        .fc-event {
          border: none !important;
          background-color: transparent !important;
        }
        .fc-event-main {
          padding: 2px 4px !important;
        }
        .fc-event-main-frame {
          background-color: var(--fc-event-bg-color) !important;
          border-radius: 4px !important;
        }
        .fc-day-today {
          background-color: #e0f2fe !important;
        }
        .fc-day-today .fc-daygrid-day-number {
          background-color: #3b82f6 !important;
          color: white !important;
          border-radius: 50% !important;
          width: 24px !important;
          height: 24px !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          margin: 2px !important;
        }
        .fc-theme-standard td, .fc-theme-standard th {
          border-color: #e5e7eb !important;
        }
        .fc-theme-standard .fc-scrollgrid {
          border-color: #e5e7eb !important;
        }
        .fc-col-header-cell {
          background-color: #f8fafc !important;
          color: #1f2937 !important;
        }
        .fc-button-primary {
          background-color: #3b82f6 !important;
          border-color: #3b82f6 !important;
        }
        .fc-button-primary:hover {
          background-color: #2563eb !important;
          border-color: #2563eb !important;
        }
        .fc-button-primary:not(:disabled).fc-button-active {
          background-color: #2563eb !important;
          border-color: #2563eb !important;
        }
        .fc-daygrid-day {
          background-color: #ffffff !important;
        }
        .fc-daygrid-day-number {
          color: #1f2937 !important;
          font-weight: 500 !important;
        }
        .fc-toolbar-title {
          color: #1f2937 !important;
        }
        .fc-button {
          color: #ffffff !important;
        }
        .fc-event-title {
          color: #ffffff !important;
        }
        .fc-daygrid-day.fc-past-date:hover {
          background-color: #f3f4f6 !important;
        }
        .fc-daygrid-day.fc-past-date .fc-daygrid-day-frame {
          opacity: 1 !important;
        }
        .fc-daygrid-day.fc-past-date .fc-daygrid-day-events {
          opacity: 0.7 !important;
        }
        .completed-event {
          opacity: 0.8 !important;
        }
        .completed-event .fc-event-main-frame {
          border: 2px solid #22c55e !important;
        }
      `}</style>
    </MainLayout>
  );
};

export default CattleDetailsPage; 