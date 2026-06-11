resource "aws_security_group" "alb" {
  name        = "${var.project_name}-alb-sg"
  description = "Trafico HTTP entrante hacia el ALB"
  vpc_id      = aws_vpc.main.id

  ingress {
    description = "HTTP desde internet"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project_name}-alb-sg"
  }
}

resource "aws_security_group" "frontend_ecs" {
  name        = "${var.project_name}-v2-frontend-ecs-sg"
  description = "Trafico hacia la tarea de ECS del frontend (nginx)"
  vpc_id      = aws_vpc.main.id

  ingress {
    description     = "Trafico desde el ALB"
    from_port       = 80
    to_port         = 80
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project_name}-v2-frontend-ecs-sg"
  }
}

resource "aws_security_group" "lambda" {
  name        = "${var.project_name}-v2-lambda-sg"
  description = "Trafico saliente de la funcion Lambda del backend"
  vpc_id      = aws_vpc.main.id

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project_name}-v2-lambda-sg"
  }
}

resource "aws_security_group" "bots_ecs" {
  name        = "${var.project_name}-v2-bots-ecs-sg"
  description = "Trafico saliente de la tarea de ECS de los bots WhatsApp/Telegram"
  vpc_id      = aws_vpc.main.id

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project_name}-v2-bots-ecs-sg"
  }
}

resource "aws_security_group" "rds" {
  name        = "${var.project_name}-v2-rds-sg"
  description = "Acceso a PostgreSQL desde la Lambda y los bots de ECS"
  vpc_id      = aws_vpc.main.id

  ingress {
    description     = "PostgreSQL desde Lambda"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.lambda.id]
  }

  ingress {
    description     = "PostgreSQL desde ECS bots"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.bots_ecs.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project_name}-v2-rds-sg"
  }
}

resource "aws_security_group" "efs" {
  name        = "${var.project_name}-v2-efs-sg"
  description = "Acceso NFS desde la tarea de ECS de los bots (sesion de WhatsApp persistente)"
  vpc_id      = aws_vpc.main.id

  ingress {
    description     = "NFS desde ECS bots"
    from_port       = 2049
    to_port         = 2049
    protocol        = "tcp"
    security_groups = [aws_security_group.bots_ecs.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project_name}-v2-efs-sg"
  }
}
