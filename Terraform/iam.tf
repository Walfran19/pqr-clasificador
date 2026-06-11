# AWS Academy Learner Lab no permite crear roles ni políticas IAM nuevas
# (iam:CreateRole, iam:CreatePolicy, iam:PutRolePolicy, etc. están denegados).
# En su lugar se reutiliza el rol "LabRole" preexistente en la cuenta, que
# ya tiene permisos suficientes (ECR pull, CloudWatch Logs, SSM, EFS) tanto
# para el execution role como para el task role de ECS.

data "aws_iam_role" "lab_role" {
  name = "LabRole"
}
