variable "aws_region" {
  description = "AWS region to deploy into"
  type        = string
  default     = "ap-south-1"
}

variable "ami_id" {
  description = "Ubuntu 22.04 LTS AMI ID for ap-south-1"
  type        = string
}

variable "public_key_path" {
  description = "Path to SSH public key"
  type        = string
  default     = "~/.ssh/expense-tracker-key.pub"
}

variable "my_ip" {
  description = "Your local machine IP for SSH access (x.x.x.x/32)"
  type        = string
}