# Food Ordering API

A simplified backend system for a food ordering platform, implemented in NestJS with TypeScript. This project demonstrates user management, authentication (JWT and OTP), product catalog with variants, cart functionality, order placement, and scalability features for handling high concurrency (e.g., 5 million parallel orders).

## Features

- **User Management**: Register and login with email/phone and password (hashed with bcrypt). Supports role-based access (user/admin) and manages user tokens (limit 5).
- **OTP Login**: Login without password using email/phone OTP (expires in 5 minutes, stored securely in Redis).
- **Product Catalog**: Manage products with variants (e.g., sizes/types).
- **Cart Management**: Add, remove, and update items with variants and quantity.
- **Order Placement**: Generates unique order ID, saves cart items, total, payment type, and status.
- **Async Processing**: Order processing via RabbitMQ for notifications/emails.
- **Security**: Protected endpoints with JWT middleware.
- **Bonus**: Swagger UI for API docs, Admin routes (protected) for product management, unit tests (Jest), rate limiting, request validation.

## Tech Stack

- **Backend**: NestJS (modular architecture)
- **Language**: TypeScript
- **Database**: PostgreSQL (with TypeORM for ORM and migrations)
- **Authentication**: JWT, bcrypt, Redis for OTP
- **Caching**: Redis
- **Queues**: RabbitMQ (for async tasks)
- **Other**: Docker for local setup, Swagger for docs, class-validator for DTOs, @nestjs/throttler for rate limiting

## Setup Instructions

### 1. Clone the repository
```bash
git clone https://github.com/OsamaSafdar/food-ordering-api.git
cd food-ordering-api
```

### 2. Install dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Create a `.env` file in the project root with the following keys:

```env
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USERNAME=postgres
DATABASE_PASSWORD=password
DATABASE_NAME=food_db

JWT_SECRET=jwt_secret_key_

REDIS_HOST=localhost
REDIS_PORT=6379

PORT=3000

RABBITMQ_URL=amqp://localhost:5672
```

### 4. Start services with Docker
This spins up PostgreSQL, Redis, and RabbitMQ:
```bash
docker-compose up -d
```

### 5. Run the application
```bash
npm run start:dev
```

### 6. Run the background worker
Open a separate terminal to run the worker:
```bash
npm run worker
```
*(Ensure `"worker": "nest start --entryFile src/orders/orders.worker"` is in your package.json scripts)*

### 7. Access the API
- **Swagger Docs**: [http://localhost:3000/api](http://localhost:3000/api)
- Test endpoints with Postman or Swagger (e.g., register user, add to cart, place order).

## Architecture

The system follows a **Modular Monolith** architecture in NestJS, promoting separation of concerns:

- **Modules**: 
  - `AuthModule`: User/auth logic.
  - `ProductsModule`: Catalog management.
  - `CartModule`: Cart operations.
  - `OrdersModule`: Orders and async processing.

- **Layers**:
  - **Controllers**: Handle HTTP requests, validation (DTOs with class-validator), and routing.
  - **Services**: Core business logic (e.g., hashing, token generation, cart calculations).
  - **Entities**: TypeORM models for DB schemas (users, products, carts, orders).
  - **Middlewares/Guards**: JWT auth guard for protected routes, throttler for rate limiting.

- **External Services**:
  - **PostgreSQL**: Persistent storage with indexes for performance.
  - **Redis**: OTP storage (TTL) and caching (products).
  - **RabbitMQ**: Message queue for async tasks (e.g., order notifications).

- **Data Flow**: Request → Controller → Service → DB/Queue → Response. Async tasks are handled by a separate consumer.

## Application Flow

1.  **User Registration/Login**: `POST /auth/register` or `/auth/login` → creates/hashes user → issues JWT.
2.  **OTP Login**: 
    - `POST /auth/otp/send` → generates/hashes OTP → stores in Redis.
    - `POST /auth/otp/verify` → validates → issues JWT.
3.  **Product Management** (Admin): Protected `POST/PUT/DELETE /products` → CRUD with caching invalidation.
4.  **Catalog View**: `GET /products` → serves from Redis cache or DB.
5.  **Cart Operations**: Protected `POST /cart/add`, `PUT /cart/update`, `DELETE /cart/remove` → updates user's cart in DB, recalculates total.
6.  **Order Placement**: Protected `POST /orders/place` → validates cart → **transactionally** saves order and clears cart → emits event to RabbitMQ queue.
7.  **Async Processing**: RabbitMQ consumer listens to `process_order` → handles notifications (e.g., email/SMS simulation) → ACKs message.
8.  **Order View**: `GET /orders` → fetches user's orders from DB.

## Scaling Description

Designed for high concurrency (e.g., **5 million parallel orders**):

- **Horizontal Scaling**: Deploy multiple API instances via Docker/Kubernetes. Use PM2 for Node.js clustering: `pm2 start npm -- run start -- -c cluster`.
- **Database Optimizations**: Indexes on key fields (`user_id`, `status`, `created_at`) for fast queries. Use read replicas for reads (catalog/orders) and sharding for large datasets.
- **Caching**: Redis offloads DB reads for products and sessions, reducing latency.
- **Async Queues**: RabbitMQ decouples order placement from processing (e.g., notifications). Scale by adding more consumers: `docker-compose up --scale worker=5`.
- **Rate Limiting**: Prevents abuse with `@nestjs/throttler` (configurable limits).
- **Transactions**: Ensures data integrity (e.g., order save + cart clear are atomic).
- **Monitoring**: Add Prometheus/Grafana (not implemented) for metrics. Load test with tools like Artillery to simulate concurrency.

## Testing

Run unit/integration tests:
```bash
npm run test
```
Covers major APIs (auth, products, cart, orders).

For production, disable `synchronize: true` and use migrations:
```bash
npm run typeorm migration:generate -n Initial
npm run typeorm migration:run
```

---
<img width="1600" height="1000" alt="image" src="https://github.com/user-attachments/assets/d8645eb2-d516-4b5b-afff-998dadf7e2e7" />
<img width="1600" height="755" alt="image" src="https://github.com/user-attachments/assets/fc7e81da-0f95-4372-8b63-b2422b9039e0" />
<img width="1600" height="1312" alt="image" src="https://github.com/user-attachments/assets/ae58fc86-ab15-42f7-a948-2fc192e07e9f" />



<img width="1600" height="1493" alt="image" src="https://github.com/user-attachments/assets/dba59439-ff0a-41f4-83f1-513b951d58f0" />
<img width="1600" height="1493" alt="image" src="https://github.com/user-attachments/assets/976046d8-7f97-4616-a146-2f69af1b0827" />


<img width="733" height="774" alt="image" src="https://github.com/user-attachments/assets/dddbf828-ef69-4d88-80ea-dbf628381fd1" />

<img width="1600" height="1312" alt="image" src="https://github.com/user-attachments/assets/763b3ea8-01a2-47ef-8874-a63936f56f47" />



<img width="1600" height="1312" alt="image" src="https://github.com/user-attachments/assets/ab45fd19-9b63-497c-9c40-f34b0973e272" />
