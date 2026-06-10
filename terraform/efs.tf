# Sistema de archivos para persistir la sesión de WhatsApp (Baileys, carpeta
# wa-auth/) entre reinicios/redespliegues de la tarea de ECS.

resource "aws_efs_file_system" "wa_auth" {
  creation_token = "${var.project_name}-wa-auth"
  encrypted      = true

  tags = {
    Name = "${var.project_name}-wa-auth"
  }
}

resource "aws_efs_mount_target" "wa_auth" {
  count           = length(aws_subnet.private)
  file_system_id  = aws_efs_file_system.wa_auth.id
  subnet_id       = aws_subnet.private[count.index].id
  security_groups = [aws_security_group.efs.id]
}

resource "aws_efs_access_point" "wa_auth" {
  file_system_id = aws_efs_file_system.wa_auth.id

  posix_user {
    gid = 1000
    uid = 1000
  }

  root_directory {
    path = "/wa-auth"

    creation_info {
      owner_gid   = 1000
      owner_uid   = 1000
      permissions = "755"
    }
  }

  tags = {
    Name = "${var.project_name}-wa-auth-ap"
  }
}
