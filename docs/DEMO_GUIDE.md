# Demo guide

Two ways to demo. Start with A (always works); add B if the hardware is ready.

## A. Demo mode: no hardware, no internet needed (Expo Go or the preview APK)

Tell the audience: "This is the app running on simulated helmet data. The same screens run on the real helmet in live mode."

1. **Home** (about 20 s): helmet *connected*, GPS *available*, last update time. Point out that anything unknown is shown as unavailable, never guessed.
2. **Contacts tab**: show the emergency contacts, add one (valid 10-digit number), show that a duplicate is rejected. Say that the helmet texts the numbers stored in the helmet.
3. Tap the **Demo** button (bottom-left) and choose **New accident alert**.
   - Home and Alerts turn red; Notifications has "Accident detected".
   - **Alerts** tab: open the alert. Show the SMS status and the location. Say that opening an alert does not resolve it.
   - Press **Mark as resolved**: the alert closes and the device returns to normal.
4. Demo button, **GPS unavailable**: **Location** tab shows no map marker and no coordinates ("never a fake position").
5. Demo button, **Helmet offline**: Home and Location show disconnected with the last update time.
6. Demo button, **Normal** to finish.

## B. Live demo with the helmet (needs the live setup)

Prepare before the audience arrives:
- Firebase project ready (SETUP.md), the app's anonymous user provisioned as owner, `frontend/.env` filled, app in live mode (Home shows "live"). Same `DEVICE_ID` as the firmware.
- Helmet (`firmware/KavachHelmet`) powered, joined to a phone hotspot, Serial Monitor open (115200), provisioned once with the custom token. The SIM has SMS balance and 2G coverage.
- A phone that will receive the SMS (its number is `SMS_RECIPIENT_E164` in the helmet's `config.h`).

Steps:
1. Show Home updating from the real helmet (about every 10 s; lift or tilt it and the impact value in the Serial Monitor changes).
2. **Alert path**: tap the helmet firmly on the bench (a safe, repeatable tap, never with the helmet on a person) until the Serial Monitor prints an alert. The SMS goes out and the alert is created in Firebase.
3. Show the SMS arriving on the phone with the Google Maps link.
4. In the app: the alert appears in **Alerts** and a notification arrives (push needs the APK). `smsStatus` shows *unknown*, because the modem confirms submission, not delivery.
5. Open the alert, then mark it resolved.

