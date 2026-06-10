# ─── General ──────────────────────────────────────────────────────────────────

variable "aws_region" {
  description = "Región de AWS donde se despliega la infraestructura"
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Nombre del proyecto, usado como prefijo para los recursos"
  type        = string
  default     = "pqr-clasificador"
}

variable "environment" {
  description = "Nombre del entorno (prod, staging, etc.)"
  type        = string
  default     = "prod"
}

variable "vpc_cidr" {
  description = "Bloque CIDR de la VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "container_port" {
  description = "Puerto en el que escucha el backend dentro del contenedor"
  type        = number
  default     = 3001
}

# ─── Base de datos (RDS PostgreSQL) ─────────────────────────────────────────────

variable "db_name" {
  description = "Nombre de la base de datos PostgreSQL"
  type        = string
  default     = "pqr"
}

variable "db_username" {
  description = "Usuario administrador de la base de datos"
  type        = string
  default     = "pqr_admin"
}

variable "db_password" {
  description = "Contraseña del usuario administrador de la base de datos"
  type        = string
  sensitive   = true
}

variable "db_instance_class" {
  description = "Clase de instancia de RDS"
  type        = string
  default     = "db.t4g.micro"
}

variable "db_allocated_storage" {
  description = "Almacenamiento asignado a RDS (GB)"
  type        = number
  default     = 20
}

# ─── Secretos y configuración de la aplicación ──────────────────────────────────

variable "jwt_secret" {
  description = "Clave secreta para firmar tokens JWT"
  type        = string
  sensitive   = true
}

variable "admin_email" {
  description = "Email del administrador inicial"
  type        = string
  default     = "admin@pqr.edu.co"
}

variable "admin_password" {
  description = "Contraseña del administrador inicial"
  type        = string
  sensitive   = true
}

variable "openrouter_api_key" {
  description = "API key de OpenRouter para clasificación con IA"
  type        = string
  sensitive   = true
  default     = ""
}

variable "email_host" {
  description = "Host SMTP para envío de correos"
  type        = string
  default     = "smtp.gmail.com"
}

variable "email_port" {
  description = "Puerto SMTP"
  type        = string
  default     = "587"
}

variable "email_user" {
  description = "Usuario SMTP"
  type        = string
  sensitive   = true
  default     = ""
}

variable "email_pass" {
  description = "Contraseña / app password SMTP"
  type        = string
  sensitive   = true
  default     = ""
}

variable "email_from" {
  description = "Remitente de los correos del sistema"
  type        = string
  default     = "\"Sistema PQR\" <no-reply@pqr.edu.co>"
}

variable "telegram_bot_token" {
  description = "Token del bot de Telegram"
  type        = string
  sensitive   = true
  default     = ""
}

variable "whatsapp_enabled" {
  description = "Habilitar el bot de WhatsApp en el backend"
  type        = bool
  default     = true
}

variable "telegram_enabled" {
  description = "Habilitar el bot de Telegram en el backend"
  type        = bool
  default     = true
}

# ─── Imagen del backend ──────────────────────────────────────────────────────

variable "backend_image_tag" {
  description = "Tag de la imagen del backend en ECR a desplegar"
  type        = string
  default     = "latest"
}
