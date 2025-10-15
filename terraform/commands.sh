helm install kafka bitnami/kafka --version 32.4.3 \
  --namespace mv100 \
  --create-namespace \
  -f values-kafka.yaml


helm search repo bitnami

helm search repo bitnami/kafka --versions

