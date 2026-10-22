variable "resource_prefix" {
  description = "Prefix for CloudWatch resource names."
  type        = string
}

variable "log_retention_days" {
  description = "Number of days to retain CloudWatch log groups."
  type        = number
  default     = 30
}

variable "enable_alarms" {
  description = "Whether to create CloudWatch alarms for SNS SMS failures."
  type        = bool
  default     = false
}

variable "sms_failure_alarm_threshold" {
  description = "Number of SNS SMS delivery failures in a 5-minute window before the alarm triggers."
  type        = number
  default     = 3

  validation {
    condition     = var.sms_failure_alarm_threshold > 0
    error_message = "sms_failure_alarm_threshold must be greater than zero."
  }
}

variable "alarm_topic_arn" {
  description = "SNS topic ARN to receive CloudWatch alarm notifications. Set to the operator_topic_arn output from the sns module. Leave empty to create alarms without actions."
  type        = string
  default     = ""
}
