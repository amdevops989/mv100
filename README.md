# mv100


curl -i -X POST -H "Accept:application/json" \                     
     -H "Content-Type:application/json" \
     localhost:8083/connectors/ \
     -d @pg-auth-catalog-orders.json 


how to list kafka topics : 
docker exec kafka kafka-topics.sh --bootstrap-server localhost:9092 --list


hot to list columns of table : 

\d table name

list of curls for products  : 

curl -X POST http://localhost:3001/products \ 
-H "Content-Type: application/json" \
-d '{
  "name": "Canon EOS R10 + RF-S 18-45mm",
  "description": "24.2MP APS-C mirrorless camera — body + RF-S 18-45mm kit lens",
  "price": 979.00,
  "image_url": "https://upload.wikimedia.org/wikipedia/commons/3/3d/Canon_EOS_R10%2BRF-S_18-45mm_f4.5-6.3_IS_STM.jpg"
}'

curl -X POST http://localhost:3001/products \ 
-H "Content-Type: application/json" \
-d '{
  "name": "Apple Watch Series 9 (sample display)",
  "description": "Apple Watch Series 9 display setup — use this as product image placeholder",
  "price": 399.00,
  "image_url": "https://upload.wikimedia.org/wikipedia/commons/3/39/Apple_Watch_Series_9_1_2023-11-14.jpg"
}'


curl -X POST http://localhost:3001/products \ 
-H "Content-Type: application/json" \
-d '{
  "name": "Sony WH-1000XM5",                      
  "description": "Premium wireless noise-cancelling over-ear headphones, ~30hr battery",      
  "price": 349.99,
  "image_url": "https://m.media-amazon.com/images/I/51aXvjzcukL._AC_SY300_SX300_QL70_ML2_.jpg"            
}'

curl -X POST http://localhost:3001/products \ 
-H "Content-Type: application/json" \
-d '{
  "name": "Samsung Galaxy S24 Ultra",             
  "description": "6.8-inch QHD+ AMOLED, Quad camera, flagship performance",                   
  "price": 1199.99,
  "image_url": "https://upload.wikimedia.org/wikipedia/commons/e/e7/SAMSUNG_Galaxy_S24_Ultra.jpg"         
}'

curl -X POST http://localhost:3001/products \ 
-H "Content-Type: application/json" \
-d '{
  "name": "Samsung Galaxy S24 Ultra",             
  "description": "6.8-inch QHD+ AMOLED, Quad camera, flagship performance",                   
  "price": 1199.99,
  "image_url": "https://upload.wikimedia.org/wikipedia/commons/e/e7/SAMSUNG_Galaxy_S24_Ultra.jpg"         
}'

curl -X POST http://localhost:3001/products \ 
-H "Content-Type: application/json" \
-d '{
  "name": "Apple MacBook Pro 14-inch (M3)",       
  "description": "14-inch Liquid Retina XDR display, Apple M3 chip, 16GB RAM (configurable), 512GB SSD — Space Gray",
  "price": 1699.00,
  "image_url": "https://upload.wikimedia.org/wikipedia/commons/5/58/M3_Macbook_Pro_14_inch_Space_Grey_model_%28cropped%29.jpg"
}'





## installing istio : 
curl -L https://istio.io/downloadIstio | ISTIO_VERSION=1.23.0 sh -
cd istio-1.23.0
export PATH=$PWD/bin:$PATH

istioctl install --set profile=default -y

kubectl create namespace mv100
kubectl label namespace mv100 istio-injection=enabled


kubectl get pods -n mv100 -o wide
