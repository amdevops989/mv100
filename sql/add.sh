# 1️⃣ Product 1
curl -X POST http://localhost:3001/products \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Wireless Noise-Canceling Headphones",
    "description": "High-quality over-ear headphones with active noise cancellation and 30-hour battery life.",
    "price": 249.99,
    "image_url": "https://images.unsplash.com/photo-1580894908361-967195033215?auto=format&fit=crop&w=800&q=80"
  }'

# 2️⃣ Product 2
curl -X POST http://localhost:3001/products \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Smartwatch Series X",
    "description": "A sleek smartwatch with heart rate monitoring, GPS, and customizable watch faces.",
    "price": 199.99,
    "image_url": "https://images.unsplash.com/photo-1598970434795-0c54fe7c0642?auto=format&fit=crop&w=800&q=80"
  }'

# 3️⃣ Product 3
curl -X POST http://localhost:3001/products \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Ergonomic Office Chair",
    "description": "Adjustable mesh office chair with lumbar support, perfect for long hours of work.",
    "price": 179.99,
    "image_url": "https://images.unsplash.com/photo-1579126046407-56cbf73f6c57?auto=format&fit=crop&w=800&q=80"
  }'
