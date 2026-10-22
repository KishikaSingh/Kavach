# Accident Alert SMS Setup & Operation Guide

This guide describes the complete, end-to-end setup and operation for **Accident-Alert SMS Notifications** in the Kavach Smart Helmet ecosystem.

---

## 1. Dual-Channel Architecture

Kavach employs two independent, defense-in-depth SMS channels:

```
[ ESP32 Hardware: Helmet ]
   |
   +---> Channel 1: SIM800L / SIM900A Modem (Direct Hardware GSM)
   |     - No smartphone tethering required
   |     - No internet / cloud dependency
   |     - Dispatches directly to SMS_RECIPIENT_E164 configured in firmware/KavachHelmet/config.h
   |
   +---> Channel 2: WiFi / Cellular Telemetry to Firebase RTDB (/alerts/{deviceId}/{alertId})
         |
         v
     [ Firebase Cloud Function: onAccidentAlertCreated ]
         |
         +--> Claims idempotency lock at /pushDispatches/{deviceId}/{alertId}
         +--> Reads rider's emergency contacts from /users/{uid}/contacts
         +--> Dispatches SMS via AWS SNS direct publish (backend/functions/awsSns.js)
         +--> Writes status to /smsDispatches/{deviceId}/{alertId} and /alerts/{deviceId}/{alertId}/smsStatus
         +--> Dispatches Expo Push Notifications (expoPush.js)
```

---

## 2. AWS Setup & IAM Security

### Step 2.1: Create the IAM User (Outside Terraform)
To ensure access keys are never recorded in plaintext in Terraform state files, the IAM user and access keys are managed directly via AWS CLI or AWS Console:

```bash
# 1. Create the IAM user
aws iam create-user --user-name kavach

# 2. Create programmatic access keys
aws iam create-access-key --user-name kavach
```

**Output:**
```json
{
    "AccessKey": {
        "UserName": "kavach",
        "AccessKeyId": "AKIA...",
        "SecretAccessKey": "...",
        "Status": "Active"
    }
}
```
> [!IMPORTANT]
> Save the `AccessKeyId` and `SecretAccessKey` securely. You will store them as Firebase Functions secrets. Never commit them to Git or Terraform files.

---

## 3. Terraform Modular Infrastructure Deployment

The Terraform configuration attaches the least-privilege policy to user `kavach`, configures account-level Transactional SMS defaults, and sets up CloudWatch observability.

### Step 3.1: Initialize Terraform
```bash
cd terraform
terraform init
```

### Step 3.2: Configure Environment
Copy the example variables file:
```bash
cp environments/dev.tfvars.example environments/dev.tfvars
```
Adjust parameters in `environments/dev.tfvars` if necessary:
```hcl
project_name               = "kavach"
environment                = "dev"
aws_region                 = "ap-south-1"
iam_user_name              = "kavach"
sns_sms_type               = "Transactional"
sns_monthly_spend_limit_usd = 1
```

### Step 3.3: Validate & Apply
```bash
terraform validate
terraform plan -var-file="environments/dev.tfvars"
terraform apply -var-file="environments/dev.tfvars"
```

The applied policy permits:
- `sns:Publish` on `Resource: "*"` (required for direct-to-phone SMS).
- Scoped strictly to `aws:RequestedRegion = "ap-south-1"`.
- `sns:GetSMSAttributes` and `sns:SetSMSAttributes`.

---

## 4. AWS SNS SMS Sandbox Configuration (Critical Step)

By default, all new AWS accounts operate in **SMS Sandbox mode**. SMS cannot be sent to unverified numbers.

1. Open the [AWS SNS Console](https://console.aws.amazon.com/sns/v3/home).
2. Set your region to **Mumbai (`ap-south-1`)**.
3. Under **Text messaging (SMS)** in the left sidebar, scroll down to **Sandbox destination phone numbers**.
4. Click **Add phone number**.
5. Enter each emergency contact's phone number in E.164 format (e.g., `+919876543210`).
6. A one-time verification code (OTP) will be sent via SMS to that phone. Enter the code to verify.
7. Repeat for all numbers intended for testing.

> [!NOTE]
> When moving to production across India or globally, request an exit from the SMS Sandbox via AWS Support and register the required Principal Entity and Headers under Indian DLT regulations.

---

## 5. Firebase Cloud Functions Configuration

Configure your AWS credentials as secrets in Firebase Cloud Functions:

### Using Firebase CLI (Recommended)
```bash
cd backend/functions

# Set AWS secrets
firebase functions:secrets:set AWS_ACCESS_KEY_ID
# (Paste AKIA...)

firebase functions:secrets:set AWS_SECRET_ACCESS_KEY
# (Paste secret key...)

firebase functions:config:set aws.region="ap-south-1"
```

### Deploy Cloud Functions
```bash
firebase deploy --only functions
```

---

## 6. End-to-End Verification & Testing

### 6.1 Unit Tests (Local, No Cloud Dependency)
Run the backend test suite:
```bash
cd backend/functions
npm test
```
Validates:
- Phone number normalization (E.164 conversion, 10-digit Indian numbers -> `+91`).
- Emergency message format and GPS Google Maps link generation.
- Mocked SNS direct publish with Transactional message attributes.
- Contact iteration and aggregate status reporting.

### 6.2 Simulated Cloud Trigger (Using Firebase Admin SDK or Console)
You can trigger an alert directly in the Firebase RTDB Console to verify end-to-end SMS dispatch:
1. Navigate to `/alerts/HELMET_001/test_alert_001`.
2. Write:
   ```json
   {
     "deviceId": "HELMET_001",
     "timestamp": 1729640000000,
     "impactG": 4.8,
     "tiltDeg": 68.2,
     "severity": "CRITICAL",
     "gpsValid": true,
     "latitude": 19.0760,
     "longitude": 72.8777
   }
   ```
3. Check the function logs in the Firebase Console:
   - Verifies `onAccidentAlertCreated` claimed the dispatch lock.
   - Verifies contact lookup at `/users/{ownerUid}/contacts`.
   - Dispatches SNS message.
   - Check `/smsDispatches/HELMET_001/test_alert_001` in RTDB for `{ status: "sent", messageId: "..." }`.
   - Contact phone receives the SMS within 2–5 seconds.

---

## 7. Troubleshooting Guide

| Issue | Root Cause | Resolution |
|---|---|---|
| `AccessDenied: User ... is not authorized to perform: sns:Publish` | IAM policy scoped to Topic ARN rather than wildcard `*` | Apply the updated Terraform `security` module (`modules/security/main.tf`). Direct-to-phone SMS requires `Resource: "*"`. |
| `SMS Sandbox: Number not verified` | Recipient number not verified in AWS SNS console | Add and verify the phone number in the AWS SNS Sandbox console (see Section 4). |
| `status: "unconfigured"` in `/smsDispatches` | AWS credentials missing in Cloud Functions environment | Set `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` via `firebase functions:secrets:set` or `.env`. |
| Coordinates say "Location unavailable" | GPS module had no satellite lock (`gpsValid: false`) | Normal behavior when indoor. Outdoor bench test or simulated GPS required. |
| Duplicate SMS received | Idempotency key not claimed | Ensure device sends unique `{alertId}`. The Cloud Function's atomic `pushDispatches` transaction prevents duplicate cloud sends. |
