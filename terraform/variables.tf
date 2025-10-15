variable "kubeconfig_path" {
  type    = string
  default = "~/.kube/config"
  description = "Path to kubeconfig used by providers"
}

variable "namespace_kafka" {
  type    = string
  default = "kafka"
}
variable "namespace_databases" {
  type    = string
  default = "databases"
}
variable "namespace_debezium" {
  type    = string
  default = "debezium"
}
