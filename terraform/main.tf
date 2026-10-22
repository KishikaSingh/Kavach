# ==============================================================================
# Kavach Smart Helmet — Root Terraform Configuration
#
# Architecture: Firebase Cloud Function → AWS SNS → Emergency contact phones
#
# Resource ownership by module:
#   module.sns         — SNS SMS account preferences + operator notification topic
#   module.security    — IAM policy for the existing SNS dispatcher IAM user
#   module.observability — CloudWatch log groups + optional failure alarms
#
# What this configuration does NOT manage:
#   - IAM user creation (user "kavach" exists; created outside Terraform).
#   - IAM access keys (never stored in Terraform state — rotate via AWS Console/CLI).
#   - Firebase project (managed via Firebase Console and firebase-tools CLI).
#   - ESP32 firmware config.h (provisioned per-device, gitignored).
# ==============================================================================

module "sns" {
  source = "./modules/sns"

  resource_prefix         = local.resource_prefix
  sms_type                = var.sns_sms_type
  monthly_spend_limit_usd = var.sns_monthly_spend_limit_usd
  operator_alert_emails   = var.emergency_alert_emails
}

module "security" {
  source = "./modules/security"

  resource_prefix = local.resource_prefix
  iam_user_name   = var.iam_user_name
  aws_region      = var.aws_region
}

module "observability" {
  source = "./modules/observability"

  resource_prefix             = local.resource_prefix
  log_retention_days          = var.log_retention_days
  enable_alarms               = var.enable_cloudwatch_alarms
  sms_failure_alarm_threshold = 3
  alarm_topic_arn             = module.sns.operator_topic_arn
}
