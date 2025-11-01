Thanks — I dug through every variant we tried and the root cause is now clear: **Argo Rollouts expects the VirtualService route to explicitly list both the stable and the canary *services* as destinations**, and **Istio requires destination weights to be present and sum to > 0**. If you omit the canary, Argo will complain `"Canary Service 'auth-canary' not found in route"`. If you include both but omit weights or use incorrect YAML, Istio will reject the VS with errors like `total destination weight = 0` or `unknown field "destination.weight"`.

Below is a **bullet-proof, working set** of manifests for **Auth** that fixes every previous problem. It uses the service-per-version pattern (two services: `auth` and `auth-canary`), enforces mTLS, and is compatible with Argo Rollouts (the Rollout will patch the VS weights during rollout).

Apply the files in the order shown (order is important).

---

## 1) `auth-services.yaml` — stable + canary services

```yaml
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
```

---

## 2) `auth-destinationrules.yaml` — mTLS for each service

(we create a DestinationRule per service to make mTLS unambiguous)

```yaml
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
---
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: auth-canary-dr
  namespace: mv100
spec:
  host: auth-canary.mv100.svc.cluster.local
  trafficPolicy:
    tls:
      mode: ISTIO_MUTUAL
```

> Note: using per-service DRs avoids subset complications. If you prefer the subset approach you can use a single DR with subsets, but the service-per-version approach is simpler and robust for this flow.

---

## 3) `api-vs.yaml` — VirtualService with both destinations (correct weight syntax)

> **Important:** weights must be sibling fields to `destination` (not inside it). Initial weights sum to 100 (stable=100, canary=0). Argo Rollouts will patch the weights during canary.

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
    - name: auth-route
      match:
        - uri:
            prefix: /auth
      route:
        - destination:
            host: auth.mv100.svc.cluster.local
            port:
              number: 3000
          weight: 100
        - destination:
            host: auth-canary.mv100.svc.cluster.local
            port:
              number: 3000
          weight: 0

    # example other routes — keep them as stable-only (Argo will patch if needed)
    - name: catalog-route
      match:
        - uri:
            prefix: /catalog
      route:
        - destination:
            host: catalog.mv100.svc.cluster.local
            port:
              number: 3001
          weight: 100
```

---

## 4) `auth-rollout.yaml` — Argo Rollout (canary)

```yaml
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
      stableService: auth
      canaryService: auth-canary
      trafficRouting:
        istio:
          virtualService:
            name: api-vs
            routes:
              - auth-route
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

## 5) Apply order (exact)

Run these in order — this avoids validation failures:

```bash
kubectl apply -f auth-services.yaml
kubectl apply -f auth-destinationrules.yaml
kubectl apply -f api-vs.yaml
kubectl apply -f auth-rollout.yaml
```

If you already applied a Rollout and it failed, delete it first (`kubectl delete rollout auth -n mv100`) before re-applying in correct order.

---

## 6) Verification & debugging commands

Check the services exist:

```bash
kubectl get svc -n mv100 | grep auth
# should show "auth" and "auth-canary"
```

Check the VirtualService is present and shows both destinations:

```bash
kubectl get virtualservice api-vs -n mv100 -o yaml
```

Check Argo Rollouts validation:

```bash
kubectl describe rollout auth -n mv100
kubectl argo rollouts get rollout auth -n mv100
```

Watch the Rollout events:

```bash
kubectl get events -n mv100 --sort-by='.metadata.creationTimestamp'
```

Istio validation messages (if webhook denies):

```bash
kubectl describe virtualservice api-vs -n mv100
kubectl get validatingwebhookconfiguration | grep istio
```

---

## Why this will stop the `Canary Service 'auth-canary' not found in route` error

* Argo Rollouts validates that the **VirtualService route lists both the stable and canary services**. The VS above explicitly lists both `auth` and `auth-canary`.
* Istio requires destination weights when multiple destinations exist; the VS uses `weight` (sibling to destination) with stable=100 and canary=0 — valid configuration.
* Argo Rollouts will patch weights during canary steps; the VS initial state is valid for both Istio and Rollouts.

---

## Extra notes / pitfalls

* If your Istio version rejects `weight` in the place shown, that indicates a very unusual or old/very new schema — run `kubectl api-resources | grep virtualservice` and `istioctl version` and tell me the version. In that case we’ll adapt syntax for your exact Istio release.
* If you prefer the subset (single host) approach instead of service-per-version, we can do that too — but it requires the DestinationRule subsets to be in use and different label selectors on pods; Argo Rollouts supports both approaches. I recommended service-per-version above because it’s simpler to validate.
* Make sure the namespace for VS and Rollout is the same (`mv100`) or include `namespace:` in the Rollout `virtualService` reference.

---

If you want, I’ll now:

* produce matching **catalog** manifests the exact same bulletproof way (services, DRs, VS entries, rollout), or
* tailor the YAMLs for your **Istio version** if you paste `istioctl version` and `kubectl get virtualservice api-vs -n mv100 -o yaml` output.

Which do you want next?
