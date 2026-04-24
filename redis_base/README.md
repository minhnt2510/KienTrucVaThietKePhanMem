# Redis vs No Redis (TypeScript + MariaDB)

Code base nay de test nhanh tren Postman:

- Read nhe theo id
- Read nang theo danh sach lon
- Benchmark co Redis va khong Redis
- Write direct va write async qua Redis queue

## 1) Chay ha tang

```bash
docker compose up -d
```

## 2) Chay API

```bash
npm install
npm run dev
```

Neu can test write async, mo terminal khac:

```bash
npm run dev:worker
```

Base URL: http://localhost:3000

## 3) API can goi truoc

- POST /setup
- POST /seed
  Body:

```json
{
  "count": 10000
}
```

Y nghia:

- /setup: tao bang benchmark_items neu chua co.
- /seed: do du lieu mau vao MariaDB de benchmark va read co data.

## 4) API test nhanh

Read theo id:

- GET /items/1/no-redis
- GET /items/1/with-redis

Read danh sach lon (de thay chenh lech ro hon):

- GET /items/list/no-redis?limit=2000
- GET /items/list/with-redis?limit=2000

Benchmark:

- GET /benchmark/read/1?iterations=500
- GET /benchmark/list?limit=2000&iterations=120

Goi endpoint with-redis 2 lan lien tiep:

- Lan 1 thuong la mariadb(cache-miss)
- Lan 2 thuong la redis (cache hit)

## 5) Cach tat Redis de so sanh

Option 1:

- Sua .env: REDIS_ENABLED=false
- Restart API

Option 2:

```bash
docker stop redis_bench_cache
```

Sau do goi lai benchmark de so ket qua.
