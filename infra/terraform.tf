#############################
# main.tf - all-in-one setup
#############################

terraform {
  required_providers {
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.18"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.9"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.4"
    }
  }

  required_version = ">= 1.4.0"
}

#############################
# Providers
#############################
variable "kubeconfig_path" {
  type        = string
  default     = "~/.kube/config"
  description = "Path to kubeconfig"
}

provider "kubernetes" {
  config_path = var.kubeconfig_path
}

provider "helm" {
  kubernetes {
    config_path = var.kubeconfig_path
  }
}

#############################
# Namespaces
#############################
resource "kubernetes_namespace" "kafka" {
  metadata {
    name = "kafka"
  }
}

resource "kubernetes_namespace" "databases" {
  metadata {
    name = "databases"
  }
}

resource "kubernetes_namespace" "debezium" {
  metadata {
    name = "debezium"
  }
}

#############################
# Kafka StatefulSet + Service
#############################
resource "kubernetes_manifest" "kafka_statefulset" {
  manifest = yamldecode(<<-YAML
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: kafka
  namespace: kafka
  labels:
    app: kafka-app
spec:
  serviceName: kafka-svc
  replicas: 3
  selector:
    matchLabels:
      app: kafka-app
  template:
    metadata:
      labels:
        app: kafka-app
    spec:
      containers:
        - name: kafka-container
          image: doughgle/kafka-kraft
          ports:
            - containerPort: 9092
            - containerPort: 9093
          env:
            - name: REPLICAS
              value: '3'
            - name: SERVICE
              value: kafka-svc
            - name: NAMESPACE
              value: kafka
            - name: SHARE_DIR
              value: /mnt/kafka
            - name: CLUSTER_ID
              value: bXktY2x1c3Rlci0xMjM0NQ==
            - name: DEFAULT_REPLICATION_FACTOR
              value: '3'
            - name: DEFAULT_MIN_INSYNC_REPLICAS
              value: '2'
          volumeMounts:
            - name: data
              mountPath: /mnt/kafka
  volumeClaimTemplates:
    - metadata:
        name: data
      spec:
        accessModes:
          - "ReadWriteOnce"
        resources:
          requests:
            storage: "1Gi"
YAML
  )
  depends_on = [
    kubernetes_namespace.kafka
  ]
}

resource "kubernetes_manifest" "kafka_service" {
  manifest = yamldecode(<<-YAML
apiVersion: v1
kind: Service
metadata:
  name: kafka-svc
  namespace: kafka
  labels:
    app: kafka-app
spec:
  type: NodePort
  ports:
    - name: '9092'
      port: 9092
      protocol: TCP
      targetPort: 9092
      nodePort: 30092
  selector:
    app: kafka-app
YAML
  )
  depends_on = [
    kubernetes_manifest.kafka_statefulset
  ]
}

#############################
# Secrets
#############################
resource "random_password" "redis_password" {
  length  = 20
  special = true
}


resource "random_password" "postgres_password" {
  length  = 20
  special = true
}

resource "kubernetes_secret" "redis" {
  metadata {
    name      = "redis-secret"
    namespace = kubernetes_namespace.databases.metadata[0].name
  }
  data = {
    "redis-password" = base64encode(random_password.redis_password.result)
  }
  type = "Opaque"
}

resource "kubernetes_secret" "postgres" {
  metadata {
    name      = "postgres-secret"
    namespace = kubernetes_namespace.databases.metadata[0].name
  }
  data = {
    "postgresql-password" = base64encode(random_password.postgres_password.result)
  }
  type = "Opaque"
}

#############################
# Redis (Bitnami Helm)
#############################
resource "helm_release" "redis" {
  name       = "redis"
  repository = "https://charts.bitnami.com/bitnami"
  chart      = "redis"
  namespace  = kubernetes_namespace.databases.metadata[0].name

  set {
    name  = "auth.enabled"
    value = "true"
  }

  set {
    name  = "auth.password"
    value = random_password.redis_password.result
  }

  set {
    name  = "replica.replicaCount"
    value = "1"
  }

  depends_on = [
    kubernetes_namespace.databases,
    kubernetes_secret.redis
  ]
}

#############################
# PostgreSQL (Bitnami Helm)
#############################
resource "helm_release" "postgres" {
  name       = "postgres"
  repository = "https://charts.bitnami.com/bitnami"
  chart      = "postgresql"
  namespace  = kubernetes_namespace.databases.metadata[0].name

  set {
    name  = "auth.postgresPassword"
    value = random_password.postgres_password.result
  }

  set {
    name  = "primary.persistence.size"
    value = "5Gi"
  }

  depends_on = [
    kubernetes_namespace.databases,
    kubernetes_secret.postgres
  ]
}


#############################
# Debezium Operator (Helm)
#############################
resource "helm_release" "debezium_connect" {
  name       = "debezium-connect"
  repository = "https://debezium.io/charts/"
  chart      = "debezium-connect"
  version    = "0.2.1"
  namespace  = kubernetes_namespace.debezium.metadata[0].name

  values = [
    <<-EOF
image:
  repository: debezium/debezium-operator
rbac:
  create: true
EOF
  ]

  depends_on = [
    kubernetes_namespace.debezium
  ]
}

#############################
# Outputs
#############################
output "redis_password" {
  value     = random_password.redis_password.result
  sensitive = true
}

output "postgres_password" {
  value     = random_password.postgres_password.result
  sensitive = true
}

output "kafka_internal_url" {
  value = "kafka-svc.kafka.svc.cluster.local:9092"
}

output "redis_internal_url" {
  value = "redis-redis-master.databases.svc.cluster.local:6379"
}

output "postgres_internal_url" {
  value = "postgres-postgresql.databases.svc.cluster.local:5432"
}

output "debezium_namespace" {
  value = kubernetes_namespace.debezium.metadata[0].name
}
