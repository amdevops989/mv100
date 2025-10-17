## creating configmap : for sql 

🚀 TL;DR Summary
Goal	Command
Use Minikube’s Docker directly	eval $(minikube docker-env)
Load host image into Minikube	minikube image load my-app:latest
Go back to local Docker	eval $(minikube docker-env -u)
Use a shared local registry	docker run -d -p 5000:5000 registry:2

kubectl create configmap postgres-init-sql \
  --from-file=init-db.sql=./sql/init-db.sql \
  -n kafka

helm install postgres bitnami/postgresql \
  -f ./values/values-postgres.yml \
  --namespace kafka \
  --create-namespace



  exec to pod :

psql -U postgres -d mv100db

\connect mv100db

-- Insert 5 products with real image URLs
INSERT INTO public.products (name, description, price, image_url)
VALUES
  ('Apple iPhone 15', 'Latest Apple iPhone with amazing features', 999.99, 'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-15-pro-max-gold-select?wid=940&hei=1112&fmt=png-alpha&.v=1691676633450')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.products (name, description, price, image_url)
VALUES
  ('Samsung Galaxy S23', 'High-end Samsung smartphone with stunning display', 899.99, 'https://images.samsung.com/is/image/samsung/p6pim/levant/galaxy-s23/gallery/levant-galaxy-s23-ultra-s918-sm-s918bzkgmea-534679535?$720_576_PNG$')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.products (name, description, price, image_url)
VALUES
  ('Sony WH-1000XM5', 'Industry-leading noise canceling headphones', 399.99, 'https://cdn.sony.com/medias/WH-1000XM5-product-image-1.png')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.products (name, description, price, image_url)
VALUES
  ('Nintendo Switch OLED', 'Portable gaming console with vibrant OLED screen', 349.99, 'https://assets.nintendo.com/image/upload/f_auto/q_auto/dpr_1.0/c_scale/ncom/en_US/switch/system/hero/switch-oled-model-hero')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.products (name, description, price, image_url)
VALUES
  ('Dell XPS 13', 'Compact and powerful laptop with Intel i7', 1199.99, 'https://i.dell.com/sites/imagecontent/products/PublishingImages/xps-13-9310-laptop/xps-13-9310-laptop-pdp-mod-01.jpg')
ON CONFLICT (name) DO NOTHING;


kubectl exec -i my-postgres-postgresql-0 -n my-namespace -- psql -U postgres -d mv100db -c "SELECT * FROM my_table;"

## installing kafka ui : 

## adding ui : 
helm repo add kafka-ui https://provectus.github.io/kafka-ui-charts
helm repo update
 helm install kafka-ui kafka-ui/kafka-ui \
  --namespace kafka --create-namespace \
  -f values/values-kafka-ui.yml


## installing redis  : 

helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo update


helm install redis bitnami/redis \
  --namespace kafka \
  --create-namespace \
  -f /values/values-redis.yml






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




## debezium : 
 curl -X POST \
  -H "Content-Type: application/json" \
  --data @pg-connector.json \
  http://192.168.49.2:30083/connectors