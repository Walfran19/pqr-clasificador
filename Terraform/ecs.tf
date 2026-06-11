resource "aws_ecs_cluster" "main" {
  name = "${var.project_name}-v2-cluster"

  setting {
    name  = "containerInsights"
    value = "disabled"
  }
}

# ─── Frontend (nginx) ────────────────────────────────────────────────────────
# Sirve los estáticos del SPA detrás del ALB. Las llamadas a la API van
# directo desde el navegador a API Gateway (ver apigateway.tf), inyectadas
# en runtime via /runtime-config.js (API_BASE_URL).

resource "aws_cloudwatch_log_group" "frontend" {
  name              = "/ecs/${var.project_name}-v2-frontend"
  retention_in_days = 14
}

resource "aws_ecs_task_definition" "frontend" {
  family                   = "${var.project_name}-v2-frontend"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = "256"
  memory                   = "512"
  execution_role_arn       = data.aws_iam_role.lab_role.arn
  task_role_arn            = data.aws_iam_role.lab_role.arn

  container_definitions = jsonencode([
    {
      name      = "frontend"
      image     = "${aws_ecr_repository.this["frontend"].repository_url}:latest"
      essential = true

      portMappings = [
        {
          containerPort = 80
          protocol      = "tcp"
        }
      ]

      environment = [
        { name = "API_BASE_URL", value = aws_apigatewayv2_stage.default.invoke_url },
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.frontend.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "frontend"
        }
      }
    }
  ])

  tags = {
    Name = "${var.project_name}-v2-frontend-task"
  }
}

resource "aws_ecs_service" "frontend" {
  name            = "${var.project_name}-v2-frontend"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.frontend.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = aws_subnet.public[*].id
    security_groups  = [aws_security_group.frontend_ecs.id]
    assign_public_ip = true
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.frontend.arn
    container_name   = "frontend"
    container_port   = 80
  }

  depends_on = [aws_lb_listener.http]
}

# ─── Bots (WhatsApp + Telegram + consumidor SQS) ────────────────────────────
# Proceso persistente: mantiene la sesión de WhatsApp (Baileys, EFS) y el
# polling de Telegram, además de un consumidor de la cola de notificaciones.

resource "aws_cloudwatch_log_group" "bots" {
  name              = "/ecs/${var.project_name}-v2-bots"
  retention_in_days = 14
}

resource "aws_ecs_task_definition" "bots" {
  family                   = "${var.project_name}-v2-bots"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = "512"
  memory                   = "1024"
  execution_role_arn       = data.aws_iam_role.lab_role.arn
  task_role_arn            = data.aws_iam_role.lab_role.arn

  volume {
    name = "wa-auth"

    efs_volume_configuration {
      file_system_id     = aws_efs_file_system.wa_auth.id
      transit_encryption = "ENABLED"

      authorization_config {
        access_point_id = aws_efs_access_point.wa_auth.id
        iam             = "ENABLED"
      }
    }
  }

  container_definitions = jsonencode([
    {
      name      = "bots"
      image     = "${aws_ecr_repository.this["backend_bot"].repository_url}:latest"
      essential = true

      mountPoints = [
        {
          sourceVolume  = "wa-auth"
          containerPath = "/app/wa-auth"
        }
      ]

      environment = [
        { name = "NODE_ENV", value = "production" },
        { name = "WHATSAPP_ENABLED", value = tostring(var.whatsapp_enabled) },
        { name = "TELEGRAM_ENABLED", value = tostring(var.telegram_enabled) },
        { name = "FRONTEND_URL", value = "http://${aws_lb.main.dns_name}" },
        { name = "APP_URL", value = "http://${aws_lb.main.dns_name}" },
        { name = "NOTIFY_QUEUE_URL", value = aws_sqs_queue.notifications.url },
      ]

      secrets = [
        { name = "DATABASE_URL", valueFrom = aws_ssm_parameter.database_url.arn },
        { name = "OPENROUTER_API_KEY", valueFrom = aws_ssm_parameter.openrouter_api_key.arn },
        { name = "TELEGRAM_BOT_TOKEN", valueFrom = aws_ssm_parameter.telegram_bot_token.arn },
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.bots.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "bots"
        }
      }
    }
  ])

  tags = {
    Name = "${var.project_name}-v2-bots-task"
  }
}

resource "aws_ecs_service" "bots" {
  name            = "${var.project_name}-v2-bots"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.bots.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = aws_subnet.private[*].id
    security_groups  = [aws_security_group.bots_ecs.id]
    assign_public_ip = false
  }

  # Una sola tarea: las sesiones de WhatsApp/Telegram son persistentes
  # (socket/polling), por lo que no se debe escalar horizontalmente sin
  # cambios adicionales en la arquitectura.
  deployment_minimum_healthy_percent = 0
  deployment_maximum_percent         = 200
}
