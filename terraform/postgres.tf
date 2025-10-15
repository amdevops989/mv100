resource "helm_release" "postgres" {
  name       = "postgres"
  repository = "https://charts.bitnami.com/bitnami"
  chart      = "postgresql"
  namespace  = kubernetes_namespace.databases.metadata[0].name
  version    = "12.1.9" # optional pin

  set {
    name  = "auth.postgresPassword"
    value = random_password.postgres_password.result
  }

  set {
    name  = "primary.persistence.size"
    value = "5Gi"
  }

  depends_on = [kubernetes_namespace.databases, kubernetes_secret.postgres]
}
