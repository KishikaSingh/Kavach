# ==============================================================================
# Module: security
# Owns: IAM policy for the SNS-dispatching Firebase Cloud Function user.
#
# CRITICAL: This module does NOT create an IAM user or access keys.
#   - The IAM user must be created and managed outside Terraform (AWS Console/CLI).
#   - Access keys must never be stored in Terraform state.
#   - Rotating access keys requires no Terraform changes.
#
# Why Resource: "*" for sns:Publish?
#   AWS SNS does not support resource-level permissions for direct-to-phone SMS.
#   When publishing via PublishCommand{ PhoneNumber: "+91..." } (as awsSns.js does),
#   the resource ARN is always "*". This is documented AWS behavior:
#   https://docs.aws.amazon.com/sns/latest/dg/sns-using-identity-based-policies.html
#   The spend limit on aws_sns_sms_preferences provides a financial control,
#   and SNS sandbox verification provides a recipient control in non-production.
# ==============================================================================

data "aws_iam_user" "dispatcher" {
  user_name = var.iam_user_name
}

resource "aws_iam_user_policy" "sns_direct_sms_publish" {
  name = "${var.resource_prefix}-sns-direct-sms-publish"
  user = data.aws_iam_user.dispatcher.user_name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowDirectSmsPublish"
        Effect = "Allow"
        Action = ["sns:Publish"]
        # Resource "*" is required for direct-to-phone SMS.
        # SNS does not support phone-number-level resource ARNs.
        # See: https://docs.aws.amazon.com/sns/latest/dg/sns-using-identity-based-policies.html
        Resource = "*"
        Condition = {
          StringEquals = {
            "aws:RequestedRegion" = var.aws_region
          }
        }
      },
      {
        Sid    = "AllowSmsAttributeRead"
        Effect = "Allow"
        Action = [
          "sns:GetSMSAttributes",
          "sns:SetSMSAttributes"
        ]
        Resource = "*"
        Condition = {
          StringEquals = {
            "aws:RequestedRegion" = var.aws_region
          }
        }
      }
    ]
  })
}
