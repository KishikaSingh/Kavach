# Kavach Smart Helmet

Expo mobile app and Firebase backend for a smart helmet accident-alert system.

- **Expo app:** `frontend/`
- **Firebase Realtime Database rules and Cloud Functions:** `backend/`
- **Firebase, anonymous-auth, EAS push, deployment, and device-provisioning setup:** [`backend/firebase/SETUP.md`](backend/firebase/SETUP.md)
- **Ownership and integration notes:** [`docs/INTEGRATION_NOTES.md`](docs/INTEGRATION_NOTES.md)

The app runs with simulated data by default. Live Firebase and remote push require project configuration and a native development build; do not deploy with open database rules or commit credentials.