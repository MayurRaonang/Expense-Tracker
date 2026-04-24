terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

resource "aws_key_pair" "expense_key" {
  key_name   = "expense-tracker-key"
  public_key = file(var.public_key_path)
}

resource "aws_instance" "jenkins" {
  ami                    = var.ami_id
  instance_type          = "m7i-flex.large"
  key_name               = aws_key_pair.expense_key.key_name
  vpc_security_group_ids = [aws_security_group.jenkins_sg.id]

  root_block_device {
    volume_size = 20
    volume_type = "gp3"
  }

  tags = {
    Name    = "expense-jenkins"
    Project = "expense-tracker"
    Role    = "jenkins"
  }
}

resource "aws_instance" "k8s_master" {
  ami                    = var.ami_id
  instance_type          = "m7i-flex.large"
  key_name               = aws_key_pair.expense_key.key_name
  vpc_security_group_ids = [aws_security_group.k8s_sg.id]

  root_block_device {
    volume_size = 20
    volume_type = "gp3"
  }

  tags = {
    Name    = "expense-k8s-master"
    Project = "expense-tracker"
    Role    = "k8s-master"
  }
}

resource "aws_instance" "k8s_worker" {
  count                  = 2
  ami                    = var.ami_id
  instance_type          = "m7i-flex.large"
  key_name               = aws_key_pair.expense_key.key_name
  vpc_security_group_ids = [aws_security_group.k8s_sg.id]

  root_block_device {
    volume_size = 20
    volume_type = "gp3"
  }

  tags = {
    Name    = "expense-k8s-worker-${count.index + 1}"
    Project = "expense-tracker"
    Role    = "k8s-worker"
  }
}