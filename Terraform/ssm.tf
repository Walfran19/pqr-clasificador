# Secretos y configuración sensible de la aplicación, leídos por la tarea de
# ECS al arrancar (ver iam.tf para los permisos de lectura del execution role).

locals {
  database_url = "postgresql://${var.db_username}:${var.db_password}@${aws_db_instance.main.address}:5432/${var.db_name}"
}

resource "aws_ssm_parameter" "database_url" {
  name  = "/${var.project_name}/${var.environment}/DATABASE_URL"
  type  = "SecureString"
  value = local.database_url

  tags = {
    Name = "${var.project_name}-database-url"
  }
}

resource "aws_ssm_parameter" "jwt_secret" {
  name  = "/${var.project_name}/${var.environment}/JWT_SECRET"
  type  = "SecureString"
  value = var.jwt_secret
}

resource "aws_ssm_parameter" "admin_email" {
  name  = "/${var.project_name}/${var.environment}/ADMIN_EMAIL"
  type  = "SecureString"
  value = var.admin_email
}

resource "aws_ssm_parameter" "admin_password" {
  name  = "/${var.project_name}/${var.environment}/ADMIN_PASSWORD"
  type  = "SecureString"
  value = var.admin_password
}

resource "aws_ssm_parameter" "openrouter_api_key" {
  name  = "/${var.project_name}/${var.environment}/OPENROUTER_API_KEY"
  type  = "SecureString"
  value = var.openrouter_api_key
}

resource "aws_ssm_parameter" "email_user" {
  name  = "/${var.project_name}/${var.environment}/EMAIL_USER"
  type  = "SecureString"
  value = var.email_user
}

resource "aws_ssm_parameter" "email_pass" {
  name  = "/${var.project_name}/${var.environment}/EMAIL_PASS"
  type  = "SecureString"
  value = var.email_pass
}

resource "aws_ssm_parameter" "telegram_bot_token" {
  name  = "/${var.project_name}/${var.environment}/TELEGRAM_BOT_TOKEN"
  type  = "SecureString"
  value = var.telegram_bot_token
}
