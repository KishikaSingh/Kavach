# ==============================================================================
# Kavach Smart Helmet — Root Terraform Outputs
#
# Note on credentials:
#   AWS access keys are NOT managed by Terraform and therefore never exposed in
#   state or outputs. Manage credentials directly via AWS Console/CLI and configure
#   them as Firebase Cloud Functions environment secrets.
# ==============================================================================

output "aws_region" {
  description = "Configured AWS region for SMS dispatch and telemetry infrastructure."
  value       = var.aws_region
}

output "operator_topic_arn" {
  description = "ARN of the Amazon SNS topic for operator/admin email notifications (NOT used for mobile app emergency contact direct-to-phone SMS)."
  value       = module.sns.operator_topic_arn
}

output "iam_policy_name" {
  description = "Name of the IAM policy granting sns:Publish for direct-to-phone SMS dispatch attached to the dispatcher user."
  value       = module.security.iam_policy_name
}

output "iam_user_arn" {
  description = "ARN of the IAM user configured for Firebase Cloud Functions dispatch."
  value       = module.security.iam_user_arn
}

output "sms_dispatch_log_group_name" {
  description = "CloudWatch log group name for SMS dispatch observability."
  value       = module.observability.sms_dispatch_log_group_name
}

output "sms_dispatch_log_group_arn" {
  description = "CloudWatch log group ARN for SMS dispatch observability."
  value       = module.observability.sms_dispatch_log_group_arn
}
