# Cola de notificaciones: la Lambda del backend publica eventos de
# cambio de estado / respuesta, y la tarea de ECS "bots" los consume
# para enviarlos por WhatsApp y Telegram (sesiones persistentes).
resource "aws_sqs_queue" "notifications" {
  name                       = "${var.project_name}-v2-notify"
  visibility_timeout_seconds = 60
  message_retention_seconds  = 86400

  tags = {
    Name = "${var.project_name}-v2-notify"
  }
}
