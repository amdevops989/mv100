output "namespace" {
  value       = kubernetes_namespace.mv100.metadata[0].name
  description = "Namespace where all resources are deployed"
}

output "kafka_ui_url" {
  value       = "http://$(minikube ip):30080"
  description = "Kafka UI endpoint accessible via Minikube IP"
}
