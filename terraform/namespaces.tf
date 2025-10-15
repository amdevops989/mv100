resource "kubernetes_namespace" "kafka" {
  metadata {
    name = var.namespace_kafka
  }
}
resource "kubernetes_namespace" "databases" {
  metadata {
    name = var.namespace_databases
  }
}
resource "kubernetes_namespace" "debezium" {
  metadata {
    name = var.namespace_debezium
  }
}
