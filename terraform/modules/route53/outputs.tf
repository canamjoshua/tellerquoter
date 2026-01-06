output "fqdn" {
  description = "Fully qualified domain name"
  value       = aws_route53_record.app.fqdn
}

output "record_name" {
  description = "DNS record name"
  value       = aws_route53_record.app.name
}
