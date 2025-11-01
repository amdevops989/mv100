

curl -s http://api.localdev.me/catalog/products | jq '. | length'


for id in $(curl -s http://api.localdev.me/catalog/products | jq -r '.[].id'); do
  curl -s -X DELETE http://api.localdev.me/catalog/products/$id
done


# Product 1 - Sony Headphones
curl -X POST http://api.localdev.me/catalog/products \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Sony WH‑1000XM5 Headphones",
    "description": "Industry‑leading noise‑canceling wireless headphones.",
    "price": 399.99,
    "image_url": "https://m.media-amazon.com/images/I/71o8Q5XJS5L._AC_SL1500_.jpg"
  }'

# Product 2 - Nintendo Switch OLED
curl -X POST http://api.localdev.me/catalog/products \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Nintendo Switch OLED",
    "description": "Handheld gaming console with OLED screen.",
    "price": 349.99,
    "image_url": "https://cdn.cloudflare.steamstatic.com/steam/apps/1627270/header.jpg"
  }'
