resource "kubernetes_manifest" "kafka_yaml" {
  manifest = yamldecode(file("${path.module}/kafka-statefulset.yaml"))
  # Ensure namespace exists first
  depends_on = [kubernetes_namespace.kafka]
}
