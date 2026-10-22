variable "resource_prefix" {
  description = "Prefix for IAM resource names (e.g. kavach-dev)."
  type        = string
}

variable "iam_user_name" {
  description = "Name of the existing IAM user to attach the SNS publish policy to. This user must already exist — it is NOT created by Terraform."
  type        = string
}

variable "aws_region" {
  description = "AWS region to restrict IAM policy via condition. Limits SNS publish to this region only."
  type        = string
}
