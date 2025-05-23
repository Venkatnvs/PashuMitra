import { ref, set, push, get, update, remove } from 'firebase/database';
import { database } from '../firebaseConfig';

// Create a new event
export const createEvent = async (cattleId, eventData) => {
  try {
    const eventRef = push(ref(database, `cattles/${cattleId}/events`));
    await set(eventRef, eventData);
    return { id: eventRef.key, ...eventData };
  } catch (error) {
    console.error('Error creating event:', error);
    throw error;
  }
};

// Get all events for a cattle
export const getAllEvents = async (cattleId) => {
  try {
    const eventsRef = ref(database, `cattles/${cattleId}/events`);
    const snapshot = await get(eventsRef);
    if (snapshot.exists()) {
      const eventsData = snapshot.val();
      return Object.entries(eventsData).map(([key, value]) => ({ id: key, ...value }));
    }
    return [];
  } catch (error) {
    console.error('Error fetching events:', error);
    throw error;
  }
};

// Update an event
export const updateEvent = async (cattleId, eventId, updates) => {
  try {
    const eventRef = ref(database, `cattles/${cattleId}/events/${eventId}`);
    await update(eventRef, updates);
    return { id: eventId, ...updates };
  } catch (error) {
    console.error('Error updating event:', error);
    throw error;
  }
};

// Delete an event
export const deleteEvent = async (cattleId, eventId) => {
  try {
    const eventRef = ref(database, `cattles/${cattleId}/events/${eventId}`);
    await remove(eventRef);
    return eventId;
  } catch (error) {
    console.error('Error deleting event:', error);
    throw error;
  }
}; 