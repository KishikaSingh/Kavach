# AWS SNS SMS Infrastructure for Kavach

This Terraform configuration provisions the AWS resources needed for the Kavach backend (Firebase Cloud Functions) to dispatch emergency SMS via Amazon SNS.

## Resources Created

1. **IAM User**: `kavach-firebase-sns-dispatcher`
2. **IAM Policy**: Least-privilege policy with `sns:Publish` and SMS attribute access.
3. **Access Keys**: Programmatic API keys for Firebase Functions.
4. **SNS SMS Preferences**: Defaults to `Transactional` SMS for high-priority delivery.

## Prerequisites

1. An AWS Account.
2. Terraform CLI installed (`>= 1.0`).
3. AWS CLI configured (`aws configure`) or environment variables `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` set with permissions to manage IAM.

## Usage

```bash
cd terraform
terraform init
terraform plan
terraform apply
```

To view the generated secret key:
```bash
terraform output -raw aws_secret_access_key
```

## Critical AWS Console Setup (Manual Step)

By default, all new AWS accounts have Amazon SNS in **SMS Sandbox mode**:
1. Open the [AWS SNS Console](https://console.aws.amazon.com/sns/v3/home).
2. Ensure you are in the **Mumbai region (`ap-south-1`)** or your target region.
3. In the left navigation, click **Text messaging (SMS)**.
4. Scroll down to **Sandbox destination phone numbers**.
5. Click **Add phone number**, enter the emergency contact number (e.g. `+91XXXXXXXXXX`), and enter the one-time verification code received on that phone.
*(Note: Verified sandbox numbers allow instant SMS delivery without needing production approval or DLT registration).*
