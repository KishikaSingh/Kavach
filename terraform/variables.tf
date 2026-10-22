variable "project_name" {
  description = "Project name used as a prefix for all AWS resource names."
  type        = string
  default     = "kavach"

  validation {
    condition     = can(regex("^[a-z][a-z0-9-]{1,18}[a-z0-9]$", var.project_name))
    error_message = "project_name must be 3–20 lowercase alphanumeric characters or hyphens, and must start with a letter."
  }
}

variable "environment" {
  description = "Deployment environment. One of: dev, staging, prod."
  type        = string
  default     = "dev"

  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "environment must be one of: dev, staging, prod."
  }
}

variable "aws_region" {
  description = "AWS region for all resources. Default is ap-south-1 (Mumbai), chosen for low-latency SMS dispatch in India."
  type        = string
  default     = "ap-south-1"

  validation {
    condition     = can(regex("^[a-z]{2}-[a-z]+-[0-9]$", var.aws_region))
    error_message = "aws_region must be a valid AWS region identifier (e.g. ap-south-1)."
  }
}

variable "log_retention_days" {
  description = "Number of days to retain CloudWatch log groups. Must be a value supported by CloudWatch (7, 14, 30, 60, 90, 180, 365, etc.)."
  type        = number
  default     = 30

  validation {
    condition     = contains([1, 3, 5, 7, 14, 30, 60, 90, 120, 150, 180, 365, 400, 545, 731, 1096, 1827, 2192, 2557, 2922, 3288, 3653], var.log_retention_days)
    error_message = "log_retention_days must be a value accepted by CloudWatch Logs."
  }
}

variable "enable_cloudwatch_alarms" {
  description = "Whether to create CloudWatch alarms for SNS dispatch failures."
  type        = bool
  default     = false
}

variable "sns_monthly_spend_limit_usd" {
  description = "Maximum monthly spend limit for SNS SMS in USD. Set low in dev/staging to prevent accidental overspend."
  type        = number
  default     = 1

  validation {
    condition     = var.sns_monthly_spend_limit_usd > 0
    error_message = "sns_monthly_spend_limit_usd must be greater than zero."
  }
}

variable "sns_sms_type" {
  description = "SMS message type for account-level SNS defaults. Transactional ensures highest carrier priority for emergency alerts."
  type        = string
  default     = "Transactional"

  validation {
    condition     = contains(["Transactional", "Promotional"], var.sns_sms_type)
    error_message = "sns_sms_type must be Transactional or Promotional."
  }
}

variable "iam_user_name" {
  description = "Name of the IAM user whose credentials Firebase Cloud Functions use to publish SNS SMS. Manage this user and its access keys outside Terraform (see docs/ACCIDENT_SMS_SETUP.md)."
  type        = string
  default     = "kavach"
}

variable "emergency_alert_emails" {
  description = "Optional list of email addresses to subscribe to the emergency SNS topic for operator notifications. These are separate from the rider's app contacts."
  type        = list(string)
  default     = []
}

variable "tags" {
  description = "Additional tags to apply to all AWS resources alongside the default Project/Environment/ManagedBy tags."
  type        = map(string)
  default     = {}
}
