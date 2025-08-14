import { ref, set, push, get, remove, onValue, query, orderByChild } from 'firebase/database';
import { database } from '../firebaseConfig';

// Create a new disease detection record
export const createDiseaseDetection = async (detectionData) => {
  try {
    const diseaseRef = ref(database, 'diseaseDetections');
    const newDetectionRef = push(diseaseRef);
    await set(newDetectionRef, {
      ...detectionData,
      createdAt: Date.now(),
      id: newDetectionRef.key
    });
    return { id: newDetectionRef.key, ...detectionData };
  } catch (error) {
    console.error('Error creating disease detection:', error);
    throw error;
  }
};

// Get all disease detections
export const getAllDiseaseDetections = (callback) => {
  const diseaseRef = ref(database, 'diseaseDetections');
  const diseaseQuery = query(diseaseRef, orderByChild('createdAt'));
  return onValue(diseaseQuery, (snapshot) => {
    const data = snapshot.val() || {};
    const detectionList = Object.keys(data).map(key => ({
      id: key,
      ...data[key]
    })).reverse(); // Most recent first
    callback(detectionList);
  });
};

// Get a single disease detection by ID
export const getDiseaseDetectionById = async (id) => {
  try {
    const detectionRef = ref(database, `diseaseDetections/${id}`);
    const snapshot = await get(detectionRef);
    if (snapshot.exists()) {
      return { id, ...snapshot.val() };
    }
    return null;
  } catch (error) {
    console.error('Error fetching disease detection:', error);
    throw error;
  }
};

// Delete a disease detection record
export const deleteDiseaseDetection = async (id) => {
  try {
    const detectionRef = ref(database, `diseaseDetections/${id}`);
    await remove(detectionRef);
    return id;
  } catch (error) {
    console.error('Error deleting disease detection:', error);
    throw error;
  }
};

// Get disease detections by cattle ID
export const getDiseaseDetectionsByCattleId = (cattleId, callback) => {
  const diseaseRef = ref(database, 'diseaseDetections');
  const diseaseQuery = query(diseaseRef, orderByChild('cattleId'));
  return onValue(diseaseQuery, (snapshot) => {
    const data = snapshot.val() || {};
    const detectionList = Object.keys(data)
      .map(key => ({ id: key, ...data[key] }))
      .filter(detection => detection.cattleId === cattleId)
      .reverse(); // Most recent first
    callback(detectionList);
  });
};
