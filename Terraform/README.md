# Infraestructura AWS con Terraform

Provisiona toda la infraestructura para desplegar el sistema PQR en AWS:

- **VPC** con subredes públicas (ALB, NAT) y privadas (ECS, RDS) en 2 AZs.
- **RDS PostgreSQL** (privado, accesible solo desde ECS).
- **ECR** para la imagen Docker del backend.
- **ECS Fargate** (1 tarea) ejecutando la API + bots de WhatsApp/Telegram, detrás de un **ALB**.
- **EFS** para persistir la sesión de WhatsApp (`wa-auth/`) entre redespliegues.
- **SSM Parameter Store** (SecureString) para todos los secretos de la app.
- **S3 + CloudFront** sirviendo el frontend (build de Vite), con `/api/*` enrutado al ALB (mismo patrón que el proxy de Nginx usado en local).

## Requisitos previos

- [Terraform](https://developer.hashicorp.com/terraform/install) >= 1.5
- AWS CLI configurado con credenciales que tengan permisos para crear esta infraestructura (`aws configure`)
- Docker, para construir y subir la imagen del backend

## AWS Academy Learner Lab

Si despliegas en un **Learner Lab**, ten en cuenta:

- **Credenciales temporales**: en el Lab, abre `AWS Details` → `AWS CLI: Show` y copia el contenido a `~/.aws/credentials` (perfil `default`). Incluye `aws_access_key_id`, `aws_secret_access_key` **y** `aws_session_token` (las 3 son obligatorias).
- **Expiran cada ~3-4 horas** (al pausar/reiniciar el Lab). Si `terraform plan/apply` falla con `ExpiredToken` o `InvalidClientTokenId`, vuelve a copiar las credenciales y reintenta — el state no se pierde.
- **Región fija `us-east-1`**: ya es el default en `variables.tf`, no la cambies.
- **Sin permisos para crear roles/políticas IAM**: por eso `iam.tf` reutiliza el rol preexistente `LabRole` (vía `data "aws_iam_role"`) como execution y task role de ECS, en lugar de crear roles nuevos.

## 1. Configurar variables

```powershell
cd Terraform
copy terraform.tfvars.example terraform.tfvars
```

Edita `terraform.tfvars` y completa al menos: `db_password`, `jwt_secret`, `admin_email`, `admin_password`, `openrouter_api_key`. El resto de variables tienen valores por defecto razonables (ver `variables.tf`).

## 2. Inicializar y aplicar

```powershell
terraform init
terraform plan
terraform apply
```

La primera vez, `aws_ecs_service.backend` se crea pero las tareas fallarán hasta que exista una imagen en ECR (paso 3) — esto es normal, `apply` no falla por eso.

## 3. Construir y subir la imagen del backend a ECR

```powershell
$ECR_URL = terraform output -raw ecr_repository_url
$REGION  = terraform output -raw alb_dns_name -replace ".*", "us-east-1"  # o usa tu región directamente

aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin $ECR_URL

cd ..\backend
docker build -t pqr-backend .
docker tag pqr-backend:latest "${ECR_URL}:latest"
docker push "${ECR_URL}:latest"
```

ECS desplegará la imagen automáticamente en la siguiente reconciliación, o puedes forzarlo:

```powershell
aws ecs update-service --cluster $(terraform output -raw ecs_cluster_name) --service $(terraform output -raw ecs_service_name) --force-new-deployment --region us-east-1
```

## 4. Vincular WhatsApp

```powershell
aws logs tail "/ecs/pqr-clasificador-backend" --follow --region us-east-1
```

Escanea el QR que aparece en los logs. La sesión queda guardada en EFS, por lo que persiste entre redespliegues (no es necesario reescanear cada vez).

## 5. Construir y subir el frontend

El frontend se sirve desde S3 + CloudFront, con `/api/*` enrutado al ALB del backend bajo el mismo dominio (igual que Nginx en local), por lo que `VITE_API_URL=/api`:

```powershell
cd ..\frontend
$env:VITE_API_URL = "/api"
npm run build

aws s3 sync dist/ "s3://$(terraform -chdir=..\Terraform output -raw frontend_bucket_name)" --delete

# Invalidar la caché de CloudFront para ver los cambios al instante
$DIST_ID = aws cloudfront list-distributions --query "DistributionList.Items[?Comment=='pqr-clasificador frontend'].Id | [0]" --output text
aws cloudfront create-invalidation --distribution-id $DIST_ID --paths "/*"
```

## 6. Verificar

```powershell
terraform output cloudfront_domain_name
```

Abre `https://<cloudfront_domain_name>` en el navegador.

---

## Notas y próximos pasos

- **HTTPS / dominio propio**: el ALB sirve HTTP en el puerto 80 (CloudFront lo expone como HTTPS al usuario final). Para usar un dominio propio en CloudFront, crea un certificado ACM en `us-east-1`, agrégalo a `viewer_certificate` en `cloudfront.tf` y configura `aliases` + un registro DNS.
- **Escalado**: el servicio ECS corre con `desired_count = 1` porque los bots de WhatsApp/Telegram mantienen una conexión persistente y no soportan múltiples instancias sin cambios adicionales (p. ej. separar los bots de la API en servicios distintos).
- **Costos principales**: NAT Gateway, RDS (`db.t4g.micro`), Fargate (0.5 vCPU / 1 GB), ALB, EFS y CloudFront. Para reducir costos en entornos de prueba, considera detener el servicio ECS (`desired_count = 0`) y la instancia RDS cuando no se use.
- **Estado remoto**: para trabajo en equipo, configura un backend S3 + DynamoDB para el `terraform.tfstate` (ver bloque comentado en `versions.tf`).

## Destruir la infraestructura

```powershell
terraform destroy
```

> Esto elimina la base de datos (`skip_final_snapshot = true`, sin snapshot final) y todos los datos en S3/EFS. Asegúrate de tener respaldos si los necesitas.
