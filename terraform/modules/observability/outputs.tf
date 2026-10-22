output "sms_dispatch_log_group_name" {
  description = "Name of the CloudWatch log group for SMS dispatch monitoring."
  value       = aws_cloudwatch_log_group.sms_dispatch.name
}

output "sms_dispatch_log_group_arn" {
  description = "ARN of the CloudWatch log group."
  value       = aws_cloudwatch_log_group.sms_dispatch.arn
}
