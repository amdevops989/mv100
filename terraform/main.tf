# =========================================================
#  MAIN INFRA FOR MV100 STACK ON MINIKUBE (Terraform + Helm)
# =========================================================

resource "kubernetes_namespace" "mv100" {
  metadata {
    name = var.namespace
  }
}

# # -----------------------------
# #  PostgreSQL Init SQL ConfigMap
# # -----------------------------
# resource "kubernetes_config_map" "postgres_init_sql" {
#   metadata {
#     name      = "postgres-init-sql"
#     namespace = kubernetes_namespace.mv100.metadata[0].name
#   }

#   data = {
#     "init-db.sql" = file("${path.module}/sql/init-db.sql")
#   }
# }

# -----------------------------
# Kafka + Zookeeper
# -----------------------------
# resource "helm_release" "kafka" {
#   name             = "my-kafka"
#   repository       = "https://charts.bitnami.com/bitnami"
#   chart            = "kafka"
#   version          = "32.4.3"
#   namespace  = kubernetes_namespace.mv100.metadata[0].name

#   values = [
#     file("${path.module}/values-kafka.yaml")
#   ]
# }

# # -----------------------------
# # Debezium Connect
# # -----------------------------
# resource "helm_release" "debezium_connect" {
#   name       = "debezium-connect"
#   repository = "https://debezium.io/charts/"
#   chart      = "debezium-connect"
#   version    = "0.2.1"
#   namespace  = kubernetes_namespace.mv100.metadata[0].name

#   values = [
#     file("${path.module}/values-debezium.yaml")
#   ]

#   depends_on = [
#     helm_release.kafka, helm_release.postgresql
#   ]
# }


# # -----------------------------
# #  PostgreSQL (Bitnami)
# # -----------------------------
# resource "helm_release" "postgresql" {
#   name       = "my-postgresql"
#   repository = "https://charts.bitnami.com/bitnami"
#   chart      = "postgresql"
#   version    = "18.0.15"
#   namespace  = kubernetes_namespace.mv100.metadata[0].name

#   values = [
#     file("${path.module}/values-postgres.yaml")
#   ]

#   depends_on = [
#     kubernetes_config_map.postgres_init_sql
#   ]
# }

# # -----------------------------
# #  Redis (Bitnami)
# # -----------------------------
# resource "helm_release" "redis" {
#   name       = "redis"
#   repository = "https://charts.bitnami.com/bitnami"
#   chart      = "redis"
#   namespace  = kubernetes_namespace.mv100.metadata[0].name

#   values = [
#     file("${path.module}/values-redis.yaml")
#   ]
# }

# # -----------------------------
# #  Kafka UI (Provectus)
# # -----------------------------
# resource "helm_release" "kafka_ui" {
#   name       = "kafka-ui"
#   repository = "https://provectus.github.io/kafka-ui-charts"
#   chart      = "kafka-ui"
#   namespace  = kubernetes_namespace.mv100.metadata[0].name

#   values = [
#     file("${path.module}/values-kafka-ui.yaml")
#   ]
#   depends_on = [ helm_release.kafka, helm_release.debezium_connect ]
# }

# # -----------------------------
# #  Debezium Connect (Custom Deployment)
# # -----------------------------
# locals {
#   namespace = var.namespace
# }

# resource "kubernetes_service" "debezium" {
#   metadata {
#     name      = "debezium-connect"
#     namespace = local.namespace
#     labels = {
#       app = "debezium-connect"
#     }
#   }

#   spec {
#     selector = {
#       app = "debezium-connect"
#     }

#     port {
#       port        = 8083
#       target_port = 8083
#       protocol    = "TCP"
#     }

#     type = "NodePort"
#   }
# }

# resource "kubernetes_deployment" "debezium" {
#   metadata {
#     name      = "debezium-connect"
#     namespace = local.namespace
#     labels = {
#       app = "debezium-connect"
#     }
#   }

#   spec {
#     replicas = 1

#     selector {
#       match_labels = {
#         app = "debezium-connect"
#       }
#     }

#     template {
#       metadata {
#         labels = {
#           app = "debezium-connect"
#         }
#       }

#       spec {
#         container {
#           name  = "debezium-connect"
#           image = "debezium/connect:2.7.1.Final"

#           env {
#             name  = "BOOTSTRAP_SERVERS"
#             value = "kafka:9092"
#           }
#           env {
#             name  = "GROUP_ID"
#             value = "1"
#           }
#           env {
#             name  = "CONFIG_STORAGE_TOPIC"
#             value = "connect-configs"
#           }
#           env {
#             name  = "OFFSET_STORAGE_TOPIC"
#             value = "connect-offsets"
#           }
#           env {
#             name  = "STATUS_STORAGE_TOPIC"
#             value = "connect-status"
#           }

#           port {
#             container_port = 8083
#           }

#           resources {
#             requests = {
#               cpu    = "200m"
#               memory = "256Mi"
#             }
#             limits = {
#               cpu    = "500m"
#               memory = "512Mi"
#             }
#           }
#         }
#       }
#     }
#   }
#   # depends_on = [ helm_release.kafka, helm_release.postgresql ]
# }
