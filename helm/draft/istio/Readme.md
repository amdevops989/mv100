Perfect — we can do this **step by step, service by service**, starting from `auth`, then `catalog`, `cart`, `orders`, and `payments`, building each one properly with **Istio, mTLS, Argo Rollouts, Canary, and Prometheus metrics**.

I’ll structure it in **phases** so it’s easy to follow and reproducible in Minikube.

---

# **Step 1: Enable Istio mTLS for the namespace**

First, ensure all your microservices can communicate **securely**.

```bash
# Enable STRICT mTLS for the mv100 namespace
cat <<EOF | kubectl apply -f -
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: mv100-mtls
  namespace: mv100
spec:
  mtls:
    mode: STRICT
EOF
```

✅ This ensures **all pods in mv100 only accept mTLS traffic**.

---

# **Step 2: Deploy `auth` microservice**

1. Use the **microservice Helm chart** we created (`values-auth.yaml`).

```bash
helm install auth ./microservice-chart -f values-auth.yaml -n mv100
```

2. Confirm pods & service:

```bash
kubectl get pods,svc -n mv100 | grep auth
```

3. Optional: expose it via **Istio VirtualService** for browser testing:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: auth-vs
  namespace: mv100
spec:
  hosts:
    - "api.localdev.me"
  gateways:
    - api-gateway
  http:
    - match:
        - uri:
            prefix: /auth
      route:
        - destination:
            host: auth.mv100.svc.cluster.local
            port:
              number: 3000
```

---

# **Step 3: Deploy `catalog` microservice**

```bash
helm install catalog ./microservice-chart -f values-catalog.yaml -n mv100
```

* ClusterIP service only (frontend calls via `api.localdev.me/catalog`).
* Add to **API Gateway VirtualService**:

```yaml
- match:
    - uri:
        prefix: /catalog
  route:
    - destination:
        host: catalog.mv100.svc.cluster.local
        port:
          number: 3001
```

---

# **Step 4: Deploy `cart` microservice**

```bash
helm install cart ./microservice-chart -f values-cart.yaml -n mv100
```

* Expose via `/cart` in the API Gateway VirtualService.

---

# **Step 5: Deploy `orders` microservice with Argo Rollouts Canary**

1. Install Argo Rollouts if not present:

```bash
kubectl create namespace argo-rollouts
kubectl apply -n argo-rollouts -f https://github.com/argoproj/argo-rollouts/releases/latest/download/install.yaml
```

2. Create `orders-rollout.yaml`:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Rollout
metadata:
  name: orders
  namespace: mv100
spec:
  replicas: 3
  strategy:
    canary:
      steps:
        - setWeight: 20
        - pause: {duration: 30s}
        - setWeight: 50
        - pause: {duration: 30s}
        - setWeight: 100
      trafficRouting:
        istio:
          virtualService:
            name: orders-vs
            routes:
              - name: http
  selector:
    matchLabels:
      app: orders
  template:
    metadata:
      labels:
        app: orders
    spec:
      containers:
        - name: orders
          image: devopsflow999/orders:test2
          ports:
            - containerPort: 3003
          env:
            - name: PGUSER
              value: appuser
            - name: PGPASSWORD
              value: appuser
            - name: PGDATABASE
              value: mv100db
            - name: PGHOST
              value: postgres
            - name: PGPORT
              value: "5432"
            - name: REDIS_URL
              value: redis://redis:6379
            - name: KAFKA_BROKERS
              value: kafka:9092
            - name: JWT_SECRET
              value: supersecretkey
            - name: PORT
              value: "3003"
```

3. Create Istio **VirtualService for Canary**:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: orders-vs
  namespace: mv100
spec:
  hosts:
    - "api.localdev.me"
  gateways:
    - api-gateway
  http:
    - match:
        - uri:
            prefix: /orders
      route:
        - destination:
            host: orders.mv100.svc.cluster.local
            subset: stable
            port:
              number: 3003
          weight: 80
        - destination:
            host: orders.mv100.svc.cluster.local
            subset: canary
            port:
              number: 3003
          weight: 20
```

---

# **Step 6: Deploy `payments` microservice**

```bash
helm install payments ./microservice-chart -f values-payments.yaml -n mv100
```

* Expose via `/payments` in the API Gateway VirtualService.

---

# **Step 7: Connect Frontend to API Gateway**

Update frontend Helm values:

```yaml
VITE_API_AUTH: "http://api.localdev.me/auth"
VITE_API_CATALOG: "http://api.localdev.me/catalog"
VITE_API_CART: "http://api.localdev.me/cart"
VITE_API_ORDERS: "http://api.localdev.me/orders"
VITE_API_PAYMENTS: "http://api.localdev.me/payments"
```

Then deploy frontend:

```bash
helm upgrade --install frontend ./frontend-chart -n mv100
```

---

# **Step 8: Test Canary + Prometheus metrics**

1. Ensure Prometheus is running:

```bash
kubectl get pods -n monitoring
```

2. Watch rollout status:

```bash
kubectl argo rollouts get rollout orders -n mv100 --watch
```

3. Trigger new version:

```bash
kubectl set image rollout/orders orders=devopsflow999/orders:test3 -n mv100
```

Argo Rollouts will **gradually shift traffic** to canary based on weights and Prometheus metrics.

---

✅ **Result:**

* All services are deployed securely (mTLS)
* Frontend calls backend via **API Gateway**
* `orders` service supports **canary rollouts** with **Prometheus metrics monitoring**
* All services are Helm-managed and reproducible

---

I can create a **diagram + Helm chart templates** for all these steps so you can deploy **everything in one go** — would you like me to do that next?
