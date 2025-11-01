for svc in auth catalog cart orders payments; do
  helm install $svc ./microservice-chart -f values-$svc.yaml -n mv100
done

helm install catalog ./microservice-chart -f values-catalog.yaml -n mv100
