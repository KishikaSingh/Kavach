variable "resource_prefix" {
  description = "Prefix for all resource names (e.g. kavach-dev)."
  type        = string
}

variable "sms_type" {
  description = "Account-level default SMS message type. Transactional for highest delivery priority."
  type        = string
  default     = "Transactional"

  validation {
    condition     = contains(["Transactional", "Promotional"], var.sms_type)
    error_message = "sms_type must be Transactional or Promotional."
  }
}

variable "monthly_spend_limit_usd" {
  description = "Maximum monthly SNS SMS spend in USD. Set conservatively in non-production environments."
  type        = number
  default     = 1

  validation {
    condition     = var.monthly_spend_limit_usd > 0
    error_message = "monthly_spend_limit_usd must be greater than zero."
  }
}

variable "sender_id" {
  description = "Sender ID string shown on SMS (alphanumeric, max 11 chars). Not supported in all countries; leave empty to use carrier default. Not supported in the US."
  type        = string
  default     = ""
}

variable "usage_report_s3_bucket" {
  description = "Optional S3 bucket name to receive SNS SMS usage reports. Leave empty to disable."
  type        = string
  default     = ""
}

variable "operator_alert_emails" {
  description = "Email addresses to subscribe to the operator notification SNS topic. Separate from rider emergency contacts."
  type        = list(string)
  default     = []
}
