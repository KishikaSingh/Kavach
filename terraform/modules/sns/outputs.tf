output "operator_topic_arn" {
  description = "ARN of the operator notification SNS topic. NOT used by Firebase Cloud Function SMS dispatch."
  value       = aws_sns_topic.operator_alerts.arn
}
