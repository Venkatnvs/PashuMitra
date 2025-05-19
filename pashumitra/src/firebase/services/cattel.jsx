import { ref, set, push, get, update, remove, onValue } from 'firebase/database';
import { database } from '../firebaseConfig';

// Create a new cattle record
export const createCattle = async (cattleData) => {
  try {
    const cattleRef = ref(database, 'cattles');
    const newCattleRef = push(cattleRef);
    await set(newCattleRef, {
      ...cattleData,
      createdAt: Date.now(),
      nextInjection: null
    });
    return { id: newCattleRef.key, ...cattleData };
  } catch (error) {
    console.error('Error creating cattle:', error);
    throw error;
  }
};

// Get all cattle
export const getAllCattle = (callback) => {
  const cattleRef = ref(database, 'cattles');
  return onValue(cattleRef, (snapshot) => {
    const data = snapshot.val() || {};
    const cattleList = Object.keys(data).map(key => ({
      id: key,
      ...data[key]
    }));
    callback(cattleList);
  });
};

// Get a single cattle by ID
export const getCattleById = async (id) => {
  try {
    const cattleRef = ref(database, `cattles/${id}`);
    const snapshot = await get(cattleRef);
    if (snapshot.exists()) {
      return { id, ...snapshot.val() };
    }
    return null;
  } catch (error) {
    console.error('Error fetching cattle:', error);
    throw error;
  }
};

// Update a cattle record
export const updateCattle = async (id, updates) => {
  try {
    const cattleRef = ref(database, `cattles/${id}`);
    await update(cattleRef, updates);
    return { id, ...updates };
  } catch (error) {
    console.error('Error updating cattle:', error);
    throw error;
  }
};

// Delete a cattle record
export const deleteCattle = async (id) => {
  try {
    const cattleRef = ref(database, `cattles/${id}`);
    await remove(cattleRef);
    return id;
  } catch (error) {
    console.error('Error deleting cattle:', error);
    throw error;
  }
};

// Update next injection date
export const updateNextInjection = async (id, date) => {
  try {
    const cattleRef = ref(database, `cattles/${id}`);
    await update(cattleRef, { nextInjection: date });
    return { id, nextInjection: date };
  } catch (error) {
    console.error('Error updating next injection date:', error);
    throw error;
  }
};
