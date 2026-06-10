terraform {
  required_version = ">= 1.5"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # Backend remoto recomendado para trabajo en equipo (descomenta y configura):
  # backend "s3" {
  #   bucket         = "tu-bucket-de-estado-terraform"
  #   key            = "pqr-clasificador/terraform.tfstate"
  #   region         = "us-east-1"
  #   dynamodb_table = "terraform-locks"
  #   encrypt        = true
  # }
}

provider "aws" {
  region = var.aws_region
}

data "aws_caller_identity" "current" {}

data "aws_availability_zones" "available" {
  state = "available"
}

locals {
  az_count           = 2
  availability_zones = slice(data.aws_availability_zones.available.names, 0, local.az_count)
}
