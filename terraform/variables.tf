variable "aws_region" {
  description = "AWS region for Amazon SNS (default ap-south-1 for Mumbai, India)"
  type        = string
  default     = "ap-south-1"
}

variable "iam_user_name" {
  description = "IAM user name for the Firebase to AWS SNS integration"
  type        = string
  default     = "kavach-firebase-sns-dispatcher"
}

variable "emergency_emails" {
  description = "List of email addresses to receive emergency accident alerts"
  type        = list(string)
  default     = []
}
