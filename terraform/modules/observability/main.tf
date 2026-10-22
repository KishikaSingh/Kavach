# ==============================================================================
# Module: observability
# Owns: CloudWatch log groups and optional alarms for operational visibility.
#
# What is logged:
#   - Firebase Cloud Functions logs flow to Google Cloud Logging (not CloudWatch).
#   - This module creates a CloudWatch log group for any future Lambda/custom
#     metrics and an optional alarm on SNS SMS failure metrics.
#
# Privacy note:
#   Do not log full phone numbers, GPS coordinates, or message bodies in
#   operational metrics or alarms. Log counts and status codes only.
# ==============================================================================

resource "aws_cloudwatch_log_group" "sms_dispatch" {
  name              = "/kavach/${var.resource_prefix}/sms-dispatch"
  retention_in_days = var.log_retention_days
}

# ---------------------------------------------------------------------------
# Optional CloudWatch alarm: SNS SMS failures
# Alerts when SNS SMS delivery failures exceed the threshold within 5 minutes.
# Requires CloudWatch detailed monitoring to be enabled in your AWS account.
# ---------------------------------------------------------------------------
resource "aws_cloudwatch_metric_alarm" "sms_failures" {
  count = var.enable_alarms ? 1 : 0

  alarm_name          = "${var.resource_prefix}-sms-delivery-failures"
  alarm_description   = "Kavach: SNS SMS delivery failures exceeded threshold. Check /smsDispatches in Firebase RTDB."
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "NumberOfNotificationsFailed"
  namespace           = "AWS/SNS"
  period              = 300
  statistic           = "Sum"
  threshold           = var.sms_failure_alarm_threshold
  treat_missing_data  = "notBreaching"

  alarm_actions = var.alarm_topic_arn != "" ? [var.alarm_topic_arn] : []
  ok_actions    = var.alarm_topic_arn != "" ? [var.alarm_topic_arn] : []
}
