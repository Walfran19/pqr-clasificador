# Backend HTTP (Express via serverless-http) empaquetado como imagen de
# contenedor. Requiere que la imagen ya exista en ECR (ver ecr.tf) antes
# de poder crear/actualizar la funcion.
resource "aws_lambda_function" "backend_api" {
  function_name = "${var.project_name}-v2-backend-api"
  role          = data.aws_iam_role.lab_role.arn

  package_type = "Image"
  image_uri    = "${aws_ecr_repository.this["backend_api"].repository_url}:latest"

  timeout     = 30
  memory_size = 512

  vpc_config {
    subnet_ids         = aws_subnet.private[*].id
    security_group_ids = [aws_security_group.lambda.id]
  }

  environment {
    variables = {
      NODE_ENV           = "production"
      WHATSAPP_ENABLED   = "false"
      TELEGRAM_ENABLED   = "false"
      DATABASE_URL       = local.database_url
      JWT_SECRET         = var.jwt_secret
      ADMIN_EMAIL        = var.admin_email
      ADMIN_PASSWORD     = var.admin_password
      OPENROUTER_API_KEY = var.openrouter_api_key
      EMAIL_HOST         = var.email_host
      EMAIL_PORT         = var.email_port
      EMAIL_USER         = var.email_user
      EMAIL_PASS         = var.email_pass
      EMAIL_FROM         = var.email_from
      NOTIFY_QUEUE_URL   = aws_sqs_queue.notifications.url
    }
  }

  tags = {
    Name = "${var.project_name}-v2-backend-api"
  }
}

resource "aws_cloudwatch_log_group" "backend_api" {
  name              = "/aws/lambda/${aws_lambda_function.backend_api.function_name}"
  retention_in_days = 14
}
