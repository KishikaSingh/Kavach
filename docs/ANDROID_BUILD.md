# Build an Android APK (EAS Build)

An APK can be installed on any Android phone without Expo Go. `frontend/eas.json` is already in the repo. Run every command below from the `frontend/` folder:

| Profile | Result | Data |
|---|---|---|
| `preview` | installable APK | demo data (no Firebase needed) |
| `preview-live` | installable APK | real Firebase (needs the `EXPO_PUBLIC_*` values) |
| `production` | AAB for the Play Store | |

## One-time setup

0. The config file must be named `app.json` in lowercase (EAS runs on Linux). It is already correct on `integration`; a test guards it.

1. Create a free account at https://expo.dev/signup and verify the email.
2. Install the tool and log in (current Node.js LTS):
   ```bash
   npm install -g eas-cli
   eas login
   ```
3. Create the project and note its id (`eas init` prints it; also shown on expo.dev). The app reads it from the environment
   (`frontend/app.config.js`), so nothing is hard-coded in `app.json`:
   ```bash
   eas init
   ```
   Then set `EXPO_PUBLIC_EAS_PROJECT_ID=<that id>` for the build (in `frontend/.env.local` for local runs, and with `eas env:create` for EAS builds).

## Build the demo APK

```bash
npm install
npm test                                  # make sure everything is green first
eas build -p android --profile preview
```

The build runs in Expo's cloud (a free account may wait in a queue, typically 10 to 30 minutes).
When it finishes, the terminal and https://expo.dev show a download link and a QR code.

## Install on a phone

1. Open the link on the phone (or scan the QR code) and download the `.apk`.
2. When Android asks, allow "Install unknown apps" for the browser, then install.
3. Open **Smart Helmet**. In the preview profile it runs on demo data; use the **Demo** button (bottom-left).

Optional, with a USB cable and `adb`: `adb install path/to/app.apk`.

## Live APK (real Firebase)

Firebase values are baked into the app at build time, so set them before building:

```bash
eas env:create --environment preview --name EXPO_PUBLIC_FIREBASE_API_KEY --value <value> --visibility sensitive
# repeat for each EXPO_PUBLIC_FIREBASE_* name in .env.example, and EXPO_PUBLIC_DEVICE_ID
eas build -p android --profile preview-live
```

(`eas env:create --help` shows the exact options for your eas-cli version.) Do not commit these values.

## Push notifications

Person 2 already wired this: `expo-notifications` is in `app.json`, `App`/`AppNavigator` call `initPushNotifications`, and the Cloud Function sends the push.
It does not work in Expo Go; it needs a built APK. What is still left (see `backend/firebase/SETUP.md` for the details):

1. `EXPO_PUBLIC_EAS_PROJECT_ID` set (above), and an FCM credential uploaded with `eas credentials`
   (`google-services.json` for Android app `com.smarthelmet.app`, referenced from `app.json` as `expo.android.googleServicesFile`).
2. Live Firebase values in the build (`preview-live`), Cloud Functions deployed, and the phone's anonymous user provisioned as an owner
   of the helmet (`node scripts/provision-device.js HELMET_001 <uid>` in `backend/functions`).
3. Install the APK, allow notifications, then create an alert (helmet, or a manual write) and check that the push arrives and that tapping it opens Alert Details.
