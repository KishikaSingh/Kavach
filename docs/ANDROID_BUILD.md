# Kavach Android Production Build & EAS Packaging Manual

*Authoritative guide to compiling standalone Android APK artifacts and distribution bundles using Expo Application Services (EAS).*

---

## Table of Contents

- [Architectural Scope & Build Profiles](#architectural-scope--build-profiles)
- [Prerequisites & Account Initialization](#prerequisites--account-initialization)
- [Project Configuration & Dynamic Mapping](#project-configuration--dynamic-mapping)
- [Compiling Standalone Demo APK](#compiling-standalone-demo-apk)
- [Compiling Production Live APK (Supabase Backend)](#compiling-production-live-apk-supabase-backend)
- [Device Sideloading & Installation](#device-sideloading--installation)
- [Troubleshooting Cloud Build Pipeline](#troubleshooting-cloud-build-pipeline)

---

## Architectural Scope & Build Profiles

Compiling a standalone Android APK enables evaluators and field testers to run the Kavach mobile client on physical smartphones without installing Expo Go or maintaining a local Node.js development server.

Build targets are defined in `frontend/eas.json`:

| Build Profile | Artifact Format | Target Environment | Primary Use Case |
| :--- | :--- | :--- | :--- |
| **`preview`** | Standalone `.apk` | In-Memory Demo Mode | Offline presentations and zero-hardware evaluations |
| **`preview-live`** | Standalone `.apk` | Live Supabase Cloud | Real hardware field testing and bench evaluation |
| **`production`** | Optimized `.aab` | Google Play Store | Production application store distribution |

---

## Prerequisites & Account Initialization

1. **Expo Account:** Register a free developer account at [expo.dev](https://expo.dev/signup).
2. **EAS CLI Installation:** Install the cloud builder CLI globally:
   ```bash
   npm install -g eas-cli
   ```
3. **Authentication:** Log in to your Expo account via the terminal:
   ```bash
   eas login
   ```

---

## Project Configuration & Dynamic Mapping

1. Link the local project to EAS:
   ```bash
   cd frontend
   eas init
   ```
2. Note the generated **Project ID** (*UUID format*).
3. Record this identifier in the repository root `.env` file:
   ```properties
   EXPO_PUBLIC_EAS_PROJECT_ID=your-eas-project-id
   ```
4. *Important Invariant:* The main configuration file must remain named `app.json` strictly in lowercase. Linux cloud builders reject uppercase filenames (`App.json`).

---

## Compiling Standalone Demo APK

To produce a self-contained APK running the 10-scenario simulation engine:

```bash
cd frontend

# Verify test suites pass cleanly before launching cloud build
npm test

# Trigger the remote cloud build
eas build -p android --profile preview
```

The cloud worker will compile the Android bundle in Expo's infrastructure. Upon completion, the terminal outputs a direct download URL and terminal QR code.

---

## Compiling Production Live APK (Supabase Backend)

For a live build connected to the Supabase cloud infrastructure:

1. Configure production environment secrets within EAS:
   ```bash
   eas env:create --environment preview --name EXPO_PUBLIC_SUPABASE_URL --value https://your-project.supabase.co --visibility sensitive
   eas env:create --environment preview --name EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY --value your-anon-key --visibility sensitive
   eas env:create --environment preview --name EXPO_PUBLIC_DATA_SOURCE --value live --visibility plain
   eas env:create --environment preview --name EXPO_PUBLIC_DEVICE_ID --value HELMET_001 --visibility plain
   ```
2. Execute the production preview build:
   ```bash
   eas build -p android --profile preview-live
   ```

---

## Device Sideloading & Installation

### Method A: Direct Browser Download
1. Open the generated download link on the target Android device.
2. When prompted by Android security, enable **Install unknown apps** for the web browser.
3. Complete installation and open **Smart Helmet**.

### Method B: ADB Sideloading via USB
Connect the Android device with USB Debugging enabled:

```bash
adb install path/to/kavach-build.apk
```

---

## Troubleshooting Cloud Build Pipeline

- **Issue: Cloud build fails during gradle compilation.**
  *Resolution:* Ensure that `app.json` has valid `android.package` identifiers (*e.g., `com.kavach.smarthelmet`*) and that SDK dependencies conform to Expo SDK 57 release requirements (`npx expo-doctor`).
- **Issue: Live APK crashes on launch.**
  *Resolution:* Verify that `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` were correctly provisioned in EAS environment variables prior to triggering the build.
