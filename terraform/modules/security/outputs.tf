output "iam_policy_name" {
  description = "Name of the IAM inline policy attached to the dispatcher user."
  value       = aws_iam_user_policy.sns_direct_sms_publish.name
}

output "iam_user_arn" {
  description = "ARN of the existing IAM user the policy was attached to."
  value       = data.aws_iam_user.dispatcher.arn
}
