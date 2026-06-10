resource "aws_ecs_cluster" "main" {
  name = "${var.project_name}-cluster"

  setting {
    name  = "containerInsights"
    value = "disabled"
  }
}

resource "aws_cloudwatch_log_group" "backend" {
  name              = "/ecs/${var.project_name}-backend"
  retention_in_days = 14
}

resource "aws_ecs_task_definition" "backend" {
  family                   = "${var.project_name}-backend"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = "512"
  memory                   = "1024"
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

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
      name      = "backend"
      image     = "${aws_ecr_repository.backend.repository_url}:${var.backend_image_tag}"
      essential = true

      portMappings = [
        {
          containerPort = var.container_port
          protocol      = "tcp"
        }
      ]

      mountPoints = [
        {
          sourceVolume  = "wa-auth"
          containerPath = "/app/wa-auth"
        }
      ]

      environment = [
        { name = "PORT", value = tostring(var.container_port) },
        { name = "NODE_ENV", value = "production" },
        { name = "WHATSAPP_ENABLED", value = tostring(var.whatsapp_enabled) },
        { name = "TELEGRAM_ENABLED", value = tostring(var.telegram_enabled) },
        { name = "EMAIL_HOST", value = var.email_host },
        { name = "EMAIL_PORT", value = var.email_port },
        { name = "EMAIL_FROM", value = var.email_from },
        { name = "FRONTEND_URL", value = "https://${aws_cloudfront_distribution.frontend.domain_name}" },
        { name = "APP_URL", value = "https://${aws_cloudfront_distribution.frontend.domain_name}" },
      ]

      secrets = [
        { name = "DATABASE_URL", valueFrom = aws_ssm_parameter.database_url.arn },
        { name = "JWT_SECRET", valueFrom = aws_ssm_parameter.jwt_secret.arn },
        { name = "ADMIN_EMAIL", valueFrom = aws_ssm_parameter.admin_email.arn },
        { name = "ADMIN_PASSWORD", valueFrom = aws_ssm_parameter.admin_password.arn },
        { name = "OPENROUTER_API_KEY", valueFrom = aws_ssm_parameter.openrouter_api_key.arn },
        { name = "EMAIL_USER", valueFrom = aws_ssm_parameter.email_user.arn },
        { name = "EMAIL_PASS", valueFrom = aws_ssm_parameter.email_pass.arn },
        { name = "TELEGRAM_BOT_TOKEN", valueFrom = aws_ssm_parameter.telegram_bot_token.arn },
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.backend.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "backend"
        }
      }
    }
  ])

  tags = {
    Name = "${var.project_name}-backend-task"
  }
}

resource "aws_ecs_service" "backend" {
  name            = "${var.project_name}-backend"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.backend.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = aws_subnet.private[*].id
    security_groups  = [aws_security_group.ecs.id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.backend.arn
    container_name   = "backend"
    container_port   = var.container_port
  }

  # Una sola tarea: los bots de WhatsApp/Telegram mantienen una sesión
  # persistente (socket/polling), por lo que no se debe escalar
  # horizontalmente sin cambios adicionales en la arquitectura.
  deployment_minimum_healthy_percent = 0
  deployment_maximum_percent         = 200

  depends_on = [aws_lb_listener.http]
}
