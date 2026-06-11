output "api_gateway_url" {
  description = "URL invocable del API Gateway (backend serverless)"
  value       = aws_apigatewayv2_stage.default.invoke_url
}

output "alb_dns_name" {
  description = "DNS del Application Load Balancer (frontend)"
  value       = aws_lb.main.dns_name
}

output "rds_endpoint" {
  description = "Endpoint (host) de la base de datos RDS"
  value       = aws_db_instance.main.address
}

output "ecr_backend_api_repository_url" {
  description = "URL del repositorio ECR de la imagen Lambda del backend"
  value       = aws_ecr_repository.this["backend_api"].repository_url
}

output "ecr_backend_bot_repository_url" {
  description = "URL del repositorio ECR de la imagen de los bots (ECS)"
  value       = aws_ecr_repository.this["backend_bot"].repository_url
}

output "ecr_frontend_repository_url" {
  description = "URL del repositorio ECR de la imagen del frontend (ECS)"
  value       = aws_ecr_repository.this["frontend"].repository_url
}

output "ecs_cluster_name" {
  description = "Nombre del cluster de ECS"
  value       = aws_ecs_cluster.main.name
}
