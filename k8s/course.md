Excellent — this is exactly the right point to clarify 👇

You now have **one central API Gateway (`api.localdev.me`)**, and the **frontend** talks to *all* your backend microservices **through that gateway** — not directly to individual service DNS names.

Let’s walk through *exactly* how to wire everything up.

---

## 🧭 Step 1 — The Big Picture

* Your **Frontend (Nginx/React)** runs at:
  👉 `http://frontend.localdev.me`

* It calls the **API Gateway**:
  👉 `http://api.localdev.me/{service}`
  (e.g., `/auth`, `/catalog`, `/orders`, etc.)

* The **API Gateway (Istio Gateway + VirtualService)** then forwards each prefix (`/auth`, `/catalog`, …) to the **right backend service** inside the cluster.

---

## 🧩 Step 2 — API Gateway Config

You already have this Gateway:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: Gateway
metadata:
  name: api-gateway
  namespace: mv100
spec:
  selector:
    istio: ingressgateway
  servers:
    - port:
        number: 80
        name: http
        protocol: HTTP
      hosts:
        - "api.localdev.me"
```

Perfect ✅ — it exposes one **public entry point** for all backend APIs.

---

## 🧩 Step 3 — API VirtualService

Now, you define a single `VirtualService` that *routes prefixes to services* inside the cluster:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: api-vs
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
    - match:
        - uri:
            prefix: /catalog
      route:
        - destination:
            host: catalog.mv100.svc.cluster.local
            port:
              number: 3001
    - match:
        - uri:
            prefix: /cart
      route:
        - destination:
            host: cart.mv100.svc.cluster.local
            port:
              number: 3002
    - match:
        - uri:
            prefix: /orders
      route:
        - destination:
            host: orders.mv100.svc.cluster.local
            port:
              number: 3003
    - match:
        - uri:
            prefix: /payments
      route:
        - destination:
            host: payments.mv100.svc.cluster.local
            port:
              number: 3004
```

This means:

* Any request like `http://api.localdev.me/auth/signup` → goes to the **Auth** service
* Any request like `http://api.localdev.me/catalog/items` → goes to the **Catalog** service

---

## 🧩 Step 4 — Frontend Environment

Your **frontend container** should have environment variables like:

```env
VITE_API_AUTH=http://api.localdev.me/auth
VITE_API_CATALOG=http://api.localdev.me/catalog
VITE_API_CART=http://api.localdev.me/cart
VITE_API_ORDERS=http://api.localdev.me/orders
VITE_API_PAYMENTS=http://api.localdev.me/payments
```

These are baked into your frontend React build (or passed as runtime envs if you’re using Nginx + `envsubst` pattern).

So when the frontend makes an HTTP request like:

```js
fetch(import.meta.env.VITE_API_AUTH + '/signup', ...)
```

→ it actually calls `http://api.localdev.me/auth/signup`
→ which Istio routes to `auth.mv100.svc.cluster.local:3000`

---

## 🧩 Step 5 — DestinationRules for mTLS

To ensure secure communication **between microservices** (not from the browser), you add this once for the namespace:

```yaml
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: default
  namespace: mv100
spec:
  mtls:
    mode: STRICT
```

And for each service (example for catalog):

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: catalog-dr
  namespace: mv100
spec:
  host: catalog.mv100.svc.cluster.local
  trafficPolicy:
    tls:
      mode: ISTIO_MUTUAL
```

This ensures **catalog** only communicates via mTLS inside the service mesh.

---

## ✅ Final Result (Flow)

```
Browser (frontend.localdev.me)
     ↓
   HTTP → api.localdev.me/auth/...      [Istio Gateway + VirtualService]
     ↓
   Auth service (auth.mv100.svc.cluster.local:3000)
     ↓
   DB / Redis / Kafka
```

Everything else (catalog, orders, etc.) follows the same pattern.

---

Would you like me to now add the **mTLS DestinationRules + PeerAuthentication** YAMLs for all backend services so your whole mesh is secured end-to-end?


---------------------
Perfect 🔥 — this is the **production-grade setup** we want:
→ One `Gateway` + `VirtualService` for all APIs
→ Each microservice has its own:

* **Argo Rollout** (for canary deployment)
* **Service** (ClusterIP, internal)
* **DestinationRule** (for mTLS + subset routing)
* **Prometheus annotations**

Let’s build this **step by step**, crystal clear 👇

---

# 🧩 **1. Gateway + API VirtualService**

(you already have these)

```yaml
# api-gateway.yaml
apiVersion: networking.istio.io/v1beta1
kind: Gateway
metadata:
  name: api-gateway
  namespace: mv100
spec:
  selector:
    istio: ingressgateway
  servers:
    - port:
        number: 80
        name: http
        protocol: HTTP
      hosts:
        - "api.localdev.me"
---
# api-virtualservice.yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: api-vs
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
            subset: stable
            port:
              number: 3000
    - match:
        - uri:
            prefix: /catalog
      route:
        - destination:
            host: catalog.mv100.svc.cluster.local
            subset: stable
            port:
              number: 3001
    - match:
        - uri:
            prefix: /cart
      route:
        - destination:
            host: cart.mv100.svc.cluster.local
            subset: stable
            port:
              number: 3002
    - match:
        - uri:
            prefix: /orders
      route:
        - destination:
            host: orders.mv100.svc.cluster.local
            subset: stable
            port:
              number: 3003
    - match:
        - uri:
            prefix: /payments
      route:
        - destination:
            host: payments.mv100.svc.cluster.local
            subset: stable
            port:
              number: 3004
```

💡 **Explanation:**

* Each path `/auth`, `/catalog`, etc. is routed to its respective service.
* The `subset: stable` is important — it tells Istio to route to the **stable** version in your canary rollout.

---

# 🧩 **2. Peer Authentication (for mTLS)**

This enforces mutual TLS inside the namespace.

```yaml
# istio-mtls.yaml
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: default
  namespace: mv100
spec:
  mtls:
    mode: STRICT
```

---

# 🧩 **3. Auth Microservice Example**

Let’s use your latest image and env.

```yaml
# auth-rollout.yaml
apiVersion: argoproj.io/v1alpha1
kind: Rollout
metadata:
  name: auth
  namespace: mv100
spec:
  replicas: 2
  selector:
    matchLabels:
      app: auth
  strategy:
    canary:
      canaryService: auth-canary
      stableService: auth
      trafficRouting:
        istio:
          virtualService:
            name: api-vs
            routes:
              - http
      steps:
        - setWeight: 20
        - pause: { duration: 30 }
        - setWeight: 50
        - pause: { duration: 60 }
        - setWeight: 100
  template:
    metadata:
      labels:
        app: auth
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "3000"
        prometheus.io/path: "/metrics"
    spec:
      containers:
        - name: auth
          image: devopsflow999/auth:main-v0.1.4
          imagePullPolicy: IfNotPresent
          ports:
            - containerPort: 3000
          env:
            - name: PGUSER
              value: appuser
            - name: PGPASSWORD
              value: appuser
            - name: PGDATABASE
              value: mv100db
            - name: PGHOST
              value: postgres-postgresql.kafka.svc.cluster.local
            - name: PGPORT
              value: "5432"
            - name: REDIS_URL
              value: redis://redis-master.kafka.svc.cluster.local:6379
            - name: KAFKA_BROKERS
              value: kafka.kafka.svc.cluster.local:9092
            - name: JWT_SECRET
              value: supersecretkey
            - name: PORT
              value: "3000"
```

---

# 🧩 **4. Auth Services (Stable + Canary)**

```yaml
# auth-services.yaml
apiVersion: v1
kind: Service
metadata:
  name: auth
  namespace: mv100
spec:
  selector:
    app: auth
  ports:
    - port: 3000
      targetPort: 3000
      protocol: TCP
---
apiVersion: v1
kind: Service
metadata:
  name: auth-canary
  namespace: mv100
spec:
  selector:
    app: auth
  ports:
    - port: 3000
      targetPort: 3000
      protocol: TCP
```

> 🧠 These two services are required by Argo Rollouts:
>
> * `auth` = stable traffic
> * `auth-canary` = canary traffic

---

# 🧩 **5. Auth DestinationRule**

```yaml
# auth-destinationrule.yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: auth-dr
  namespace: mv100
spec:
  host: auth.mv100.svc.cluster.local
  trafficPolicy:
    tls:
      mode: ISTIO_MUTUAL
  subsets:
    - name: stable
      labels:
        app: auth
    - name: canary
      labels:
        app: auth
```

---

# 🧩 **6. Repeat for other microservices**

For each of the others (`catalog`, `cart`, `orders`, `payments`):

* Copy the 3 YAMLs (`rollout`, `service`, `destinationrule`)
* Change:

  * `name`
  * `port`
  * `image`
  * env vars

💡 The VirtualService (`api-vs`) already routes all of them by path, so **no change there**.

---

# ✅ **Result Summary**

| Component                       | Purpose                                               |
| ------------------------------- | ----------------------------------------------------- |
| `api-gateway`                   | Exposes `api.localdev.me` to the world                |
| `api-vs`                        | Routes `/auth`, `/catalog`, etc. to internal services |
| `PeerAuthentication`            | Enforces mTLS inside namespace                        |
| `auth Rollout`                  | Canary deployment managed by Argo                     |
| `auth` & `auth-canary` Services | Separate endpoints for traffic splitting              |
| `auth DestinationRule`          | Defines stable/canary subsets for Istio               |
| `Prometheus annotations`        | Auto-scraping metrics for monitoring                  |

---

Would you like me to show the **same setup for the Catalog microservice next** (with canary, metrics, mTLS) so you can see the full working pattern repeated once?
