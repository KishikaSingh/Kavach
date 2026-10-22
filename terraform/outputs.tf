output "aws_region" {
  description = "Configured AWS region"
  value       = var.aws_region
}

output "sns_topic_arn" {
  description = "ARN of the Amazon SNS emergency alert topic"
  value       = aws_sns_topic.emergency_alerts.arn
}

output "aws_access_key_id" {
  description = "AWS Access Key ID for Firebase Cloud Functions"
  value       = aws_iam_access_key.firebase_sns_key.id
}

output "aws_secret_access_key" {
  description = "AWS Secret Access Key for Firebase Cloud Functions (sensitive)"
  value       = aws_iam_access_key.firebase_sns_key.secret
  sensitive   = true
}
