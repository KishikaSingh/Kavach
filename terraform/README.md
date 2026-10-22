# AWS Infrastructure for Kavach Smart Helmet (Modular Terraform)

This directory contains modular Terraform configuration provisioning the AWS resources needed for the Kavach backend (Firebase Cloud Functions) to dispatch emergency accident-alert SMS messages via Amazon Simple Notification Service (SNS).

---

## Architecture Overview

```
                                      +------------------------------------+
                                      | AWS Account (Region: ap-south-1)   |
                                      |                                    |
[ Firebase Cloud Function ]           |   [ IAM User: kavach ]             |
  (onAccidentAlertCreated)            |       |                            |
          |                           |       v (Policy attached)          |
          | AWS SDK v3 Direct Publish |   [ Policy: AllowDirectSmsPublish ]|
          +-------------------------->|       |                            |
            PublishCommand {          |       v                            |
              PhoneNumber: +91...     |   [ AWS SNS Direct SMS Engine ]    |
              Message: ...            |       |                            |
            }                         |       +--> [ Telecom Carriers ]    |
                                      |            |                       |
                                      |            v                       |
                                      |          [ Rider Contacts ]        |
                                      |                                    |
                                      |   [ SNS Preferences: Transactional]|
                                      |   [ CloudWatch Log Groups ]        |
                                      |   [ Operator Alert Topic (Opt) ]   |
                                      +------------------------------------+
```

### Module Structure

- **`modules/sns`**: Configures account-wide SMS preferences (sets type to `Transactional`, configures monthly spend limit and default sender ID) and an optional operator SNS topic with email subscriptions.
- **`modules/security`**: Creates and attaches the least-privilege IAM policy to the existing IAM dispatcher user (`kavach`). Explicitly restricts action to `sns:Publish` within `var.aws_region`.
- **`modules/observability`**: Provisions CloudWatch log groups for SMS dispatch metrics and optional CloudWatch alarms triggering on delivery failure thresholds.

---

## Security Rationale

1. **Direct SMS Permission (`Resource = "*"`):**
   AWS SNS direct SMS publishing (`PublishCommand` with `PhoneNumber`) does NOT support resource-level ARN restrictions (unlike publishing to an SNS topic). To publish directly to phone numbers, AWS requires `Resource = "*"`. We mitigate blast radius by scoping the policy with a condition (`aws:RequestedRegion = var.aws_region`) and setting account-level monthly spend limits.

2. **No Access Keys in Terraform State:**
   In compliance with security best practices, access keys are **never** managed or created by Terraform. Generating access keys in Terraform places the secret in plaintext inside `terraform.tfstate`. Access keys should be created via the AWS CLI or Console, rotated independently, and configured as Firebase Cloud Functions environment secrets.

---

## Prerequisites

1. Terraform CLI (`>= 1.0`).
2. AWS CLI configured with administrator or IAM-delegated credentials:
   ```bash
   aws configure
   ```
3. An existing IAM user (default: `kavach`).

---

## Usage

### 1. Initialize
```bash
cd terraform
terraform init
```

### 2. Format & Validate
```bash
terraform fmt -check -recursive
terraform validate
```

### 3. Plan & Apply for an Environment
Copy the example tfvars for your target environment:
```bash
cp environments/dev.tfvars.example environments/dev.tfvars
terraform plan -var-file="environments/dev.tfvars"
terraform apply -var-file="environments/dev.tfvars"
```

Available environments:
- `environments/dev.tfvars.example`
- `environments/staging.tfvars.example`
- `environments/prod.tfvars.example`

---

## AWS SNS SMS Sandbox Setup (Critical Manual Step)

All new AWS accounts have Amazon SNS in **SMS Sandbox mode**:
1. Open the [AWS SNS Console](https://console.aws.amazon.com/sns/v3/home).
2. Ensure you are in the **Mumbai region (`ap-south-1`)**.
3. In the left navigation, click **Text messaging (SMS)**.
4. Scroll to **Sandbox destination phone numbers**.
5. Click **Add phone number**, enter the emergency contact number in E.164 format (e.g., `+919876543210`), and verify it with the OTP.
6. *(Verified sandbox numbers receive transactional emergency SMS immediately without waiting for DLT / production approvals).*
