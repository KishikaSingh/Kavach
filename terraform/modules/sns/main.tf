# ==============================================================================
# Module: sns
# Owns: SNS SMS account preferences and the optional emergency operator topic.
#
# Architecture note:
#   Firebase Cloud Functions publish emergency SMS DIRECTLY to phone numbers
#   (PublishCommand{ PhoneNumber: "+91..." }) — they do NOT publish to the SNS
#   topic created here. The topic is used only for optional operator email
#   subscriptions. Direct-to-phone SMS is the primary dispatch channel.
# ==============================================================================

# -----------------------------------------------------------------------------
# Account-level SMS defaults
# -----------------------------------------------------------------------------
# Sets the account default SMS type to Transactional (highest carrier priority).
# awsSns.js also sets this per-message; this ensures the account default matches.
resource "aws_sns_sms_preferences" "defaults" {
  default_sms_type       = var.sms_type
  monthly_spend_limit    = var.monthly_spend_limit_usd
  default_sender_id      = var.sender_id == "" ? null : var.sender_id
  usage_report_s3_bucket = var.usage_report_s3_bucket == "" ? null : var.usage_report_s3_bucket
}

# -----------------------------------------------------------------------------
# Operator notification topic (optional — not used by Firebase CF dispatch)
# -----------------------------------------------------------------------------
# This topic is for operator/admin email notifications only.
# It is NOT the dispatch channel for emergency contacts in the mobile app.
resource "aws_sns_topic" "operator_alerts" {
  name         = "${var.resource_prefix}-operator-alerts"
  display_name = "Kavach Operator Alerts"
}

resource "aws_sns_topic_subscription" "operator_email" {
  for_each  = toset(var.operator_alert_emails)
  topic_arn = aws_sns_topic.operator_alerts.arn
  protocol  = "email"
  endpoint  = each.value
}
