data "aws_iam_policy_document" "ecs_assume_role" {
  statement {
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["ecs-tasks.amazonaws.com"]
    }
  }
}

# ─── Execution role: usado por ECS para arrancar la tarea ──────────────────────
# (pull de imagen desde ECR, escritura de logs, lectura de secretos SSM)

resource "aws_iam_role" "ecs_execution" {
  name               = "${var.project_name}-ecs-execution-role"
  assume_role_policy = data.aws_iam_policy_document.ecs_assume_role.json
}

resource "aws_iam_role_policy_attachment" "ecs_execution_managed" {
  role       = aws_iam_role.ecs_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

data "aws_iam_policy_document" "ecs_ssm_access" {
  statement {
    actions = ["ssm:GetParameters"]

    resources = [
      aws_ssm_parameter.database_url.arn,
      aws_ssm_parameter.jwt_secret.arn,
      aws_ssm_parameter.admin_email.arn,
      aws_ssm_parameter.admin_password.arn,
      aws_ssm_parameter.openrouter_api_key.arn,
      aws_ssm_parameter.email_user.arn,
      aws_ssm_parameter.email_pass.arn,
      aws_ssm_parameter.telegram_bot_token.arn,
    ]
  }
}

resource "aws_iam_role_policy" "ecs_ssm_access" {
  name   = "${var.project_name}-ecs-ssm-access"
  role   = aws_iam_role.ecs_execution.id
  policy = data.aws_iam_policy_document.ecs_ssm_access.json
}

# ─── Task role: usado por el contenedor en ejecución ────────────────────────────
# (acceso al punto de montaje EFS para la sesión de WhatsApp)

resource "aws_iam_role" "ecs_task" {
  name               = "${var.project_name}-ecs-task-role"
  assume_role_policy = data.aws_iam_policy_document.ecs_assume_role.json
}

data "aws_iam_policy_document" "ecs_task_efs_access" {
  statement {
    actions = [
      "elasticfilesystem:ClientMount",
      "elasticfilesystem:ClientWrite",
      "elasticfilesystem:ClientRootAccess",
    ]
    resources = [aws_efs_file_system.wa_auth.arn]

    condition {
      test     = "StringEquals"
      variable = "elasticfilesystem:AccessPointArn"
      values   = [aws_efs_access_point.wa_auth.arn]
    }
  }
}

resource "aws_iam_role_policy" "ecs_task_efs_access" {
  name   = "${var.project_name}-ecs-task-efs-access"
  role   = aws_iam_role.ecs_task.id
  policy = data.aws_iam_policy_document.ecs_task_efs_access.json
}
