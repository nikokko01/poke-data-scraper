import { initializeApp, cert, getApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT 
  ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT) 
  : null;

if (serviceAccount && !getApps().length) {
  initializeApp({
    credential: cert(serviceAccount)
  });
}

export const db = serviceAccount ? getFirestore() : null;

export async function saveMarketData(collectionName: string, data: any) {
  if (!db) {
    console.warn('Firebase not initialized. Skipping save.');
    return;
  }
  
  const docRef = db.collection(collectionName).doc();
  await docRef.set({
    ...data,
    createdAt: new Date()
  });
}

export async function updateLatestPrice(cardName: string, data: any) {
  if (!db) return;
  
  // Update a 'latest' document for each card to easily fetch current price
  await db.collection('latest_prices').doc(cardName).set({
    ...data,
    updatedAt: new Date()
  });
}
