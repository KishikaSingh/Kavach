terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# 1. Amazon SNS Topic for Emergency Alerts
resource "aws_sns_topic" "emergency_alerts" {
  name         = "kavach-emergency-alerts"
  display_name = "Kavach Alert"

  tags = {
    Project     = "Kavach"
    Environment = "production"
    ManagedBy   = "Terraform"
  }
}

# 2. Subscribe emergency email addresses to the SNS Topic
resource "aws_sns_topic_subscription" "email_sub" {
  for_each  = toset(var.emergency_emails)
  topic_arn = aws_sns_topic.emergency_alerts.arn
  protocol  = "email"
  endpoint  = each.value
}

# 3. IAM User dedicated to Firebase Cloud Function SNS dispatch
resource "aws_iam_user" "firebase_sns_user" {
  name = var.iam_user_name

  tags = {
    Project     = "Kavach"
    Environment = "production"
    ManagedBy   = "Terraform"
  }
}

# 4. Strict least-privilege policy: allow publishing to this SNS Topic
resource "aws_iam_user_policy" "sns_publish_policy" {
  name = "KavachEmergencySnsPublishPolicy"
  user = aws_iam_user.firebase_sns_user.name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowPublishToKavachTopic"
        Effect = "Allow"
        Action = [
          "sns:Publish"
        ]
        Resource = aws_sns_topic.emergency_alerts.arn
      }
    ]
  })
}

# 5. Create access key pair for Firebase to authenticate with AWS
resource "aws_iam_access_key" "firebase_sns_key" {
  user = aws_iam_user.firebase_sns_user.name
}
