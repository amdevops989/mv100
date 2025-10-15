# MV100 Microservices Infra (Terraform + Helm + Minikube)

This project sets up a full local microservice infrastructure on Minikube using Terraform and Helm.

## 🧱 Components
- PostgreSQL (Bitnami)
- Kafka + Zookeeper (Bitnami)
- Redis (Bitnami)
- Kafka UI (Provectus)
- Debezium Connect (custom)
- Namespace: `mv100`
- PostgreSQL initialized via ConfigMap (`sql/init-db.sql`)

## 🚀 Setup Steps

1. **Start Minikube**
   ```bash
   minikube start --cpus=4 --memory=8192
