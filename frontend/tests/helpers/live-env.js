// Import this FIRST in a test file: it switches the app to live mode before any app code is loaded.
process.env.EXPO_PUBLIC_DATA_SOURCE = 'live';
process.env.EXPO_PUBLIC_DEVICE_ID = 'HELMET_001';
process.env.EXPO_PUBLIC_FIREBASE_API_KEY = 'test-key';
process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL = 'https://test.firebaseio.com';
process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID = 'test-project';
