output "jenkins_public_ip" {
  description = "Jenkins server public IP"
  value       = aws_instance.jenkins.public_ip
}

output "jenkins_private_ip" {
  description = "Jenkins server private IP"
  value       = aws_instance.jenkins.private_ip
}

output "k8s_master_public_ip" {
  description = "Kubernetes master public IP"
  value       = aws_instance.k8s_master.public_ip
}

output "k8s_master_private_ip" {
  description = "Kubernetes master private IP"
  value       = aws_instance.k8s_master.private_ip
}

output "k8s_worker_public_ips" {
  description = "Kubernetes worker public IPs"
  value       = aws_instance.k8s_worker[*].public_ip
}

output "k8s_worker_private_ips" {
  description = "Kubernetes worker private IPs"
  value       = aws_instance.k8s_worker[*].private_ip
}

output "ssh_command_jenkins" {
  description = "SSH command to connect to Jenkins"
  value       = "ssh -i ~/.ssh/expense-tracker-key ubuntu@${aws_instance.jenkins.public_ip}"
}

output "ssh_command_master" {
  description = "SSH command to connect to K8s master"
  value       = "ssh -i ~/.ssh/expense-tracker-key ubuntu@${aws_instance.k8s_master.public_ip}"
}