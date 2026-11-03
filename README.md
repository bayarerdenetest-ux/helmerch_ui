# Хэлмэрч — UI прототип (Kubernetes)

Монгол яриаг текст болгох, текстийг дуу болгох (OmniVoice), кодыг бичгээр болон дуугаар тайлбарлах вэб сайтын UI прототип.
Энэ хувилбар нь зөвхөн frontend прототип: тайлбар, дуу, нэвтрэлт жишээ өгөгдлөөр ажиллана, сервер холбогдоогүй.

## Файлууд

| Файл | Үүрэг |
|---|---|
| `helmerch.html` | Прототип сайт |
| `must-logo.webp` | ШУТИС-ийн лого |
| `Dockerfile` | nginx дээр суурилсан image бүтээнэ |
| `k8s.yaml` | Kubernetes Deployment (2 pod) ба Service (NodePort 30080) |

## Шаардлага

- Docker Desktop (Settings → Kubernetes → Enable Kubernetes асаасан), эсвэл minikube
- `kubectl get nodes` команд `Ready` гэж харуулж байх

## Ажиллуулах

Энэ хавтсанд терминал нээгээд:

```bash
docker build -t helmerch:0.1 .
kubectl apply -f k8s.yaml
kubectl get pods
```

Хоёр pod `Running` болсны дараа хөтчөөр нээнэ: **http://localhost:30080**

minikube ашиглаж байгаа бол `kubectl apply`-аас өмнө:

```bash
minikube image load helmerch:0.1
```

мөн сайтыг `minikube service helmerch-web` командаар нээнэ.

## Хуудсууд

- Нүүр: `http://localhost:30080/`
- Яриа → Текст: `http://localhost:30080/#yaria-tekst`
- Текст → Яриа: `http://localhost:30080/#tekst-yaria`
- Код тайлбарлах: `http://localhost:30080/#kod-tailbar`

## Унтраах

```bash
kubectl delete -f k8s.yaml
```

## Цаашдын бүтэц

Next.js frontend, Python (FastAPI) backend, Whisper (яриа таних), LLM (код тайлбар), OmniVoice (дуу үүсгэх) тус бүр тусдаа Deployment болж, Ingress-ээр нэг домэйн дор холбогдоно. PHP ашиглахгүй.

— Bayar-Erdene
