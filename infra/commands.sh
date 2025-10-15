## creating configmap : for sql 

kubectl create configmap postgres-init-sql \
  --from-file=init-db.sql=./sql/init-db.sql \
  -n kafka

helm install my-postgres bitnami/postgresql \
  -f ./values/values-postgres.yml \
  --namespace kafka \
  --create-namespace

  exec to pod :

psql -U postgres -d mv100db

kubectl exec -i my-postgres-postgresql-0 -n my-namespace -- psql -U postgres -d mv100db -c "SELECT * FROM my_table;"

## installing kafka ui : 

## adding ui : 
helm repo add kafka-ui https://provectus.github.io/kafka-ui-charts
helm repo update
 helm install kafka-ui kafka-ui/kafka-ui \
  --namespace kafka --create-namespace \
  -f values/values-kafka-ui.yml





## installing debezium : 
with mannifest also 

## installing kafka with statefullset 


## connect ! 

curl -X POST \                     
  -H "Content-Type: application/json" \
  --data @pg-connector.json \
  http://192.168.49.2:30083/connectors

## update config 

curl -X PUT \
  -H "Content-Type: application/json" \
  --data @pg-connector.json \
  http://192.168.49.2:30083/connectors/pg-auth-catalog-orders/config


## restart : 
curl -X POST http://192.168.49.2:30083/connectors/pg-auth-catalog-orders/restart

curl -X DELETE http://192.168.49.2:30083/connectors/pg-auth-catalog-orders

curl http://192.168.49.2:30083/connectors/pg-auth-catalog-orders/status




