# Aurevo Fashion - Backend API

Node.js backend for Aurevo Fashion e-commerce platform using **Modular MVC Architecture**.

## 🏗️ Architecture

This project follows the **Modular MVC (Model-View-Controller)** pattern with feature-based organization.

```
backend/
├── prisma/
│   └── schema.prisma          # Database schema (Prisma ORM)
├── src/
│   ├── app/
│   │   ├── config/            # ⚙️ Configuration
│   │   │   ├── index.ts       # Environment variables
│   │   │   ├── database.ts    # Prisma client
│   │   │   └── swagger.ts     # API documentation
│   │   ├── errors/            # 🚨 Custom error classes
│   │   │   └── AppError.ts    # AppError, NotFoundError, etc.
│   │   ├── interfaces/        # 📝 Global TypeScript interfaces
│   │   ├── middlewares/       # 🛡️ Express middlewares
│   │   │   ├── auth.ts        # JWT authentication
│   │   │   ├── validateRequest.ts
│   │   │   └── globalErrorHandler.ts
│   │   ├── utils/             # 🔧 Utility functions
│   │   └── modules/           # 📦 Feature Modules
│   │       ├── auth/
│   │       │   ├── auth.interface.ts
│   │       │   ├── auth.validation.ts
│   │       │   ├── auth.service.ts    # Business logic
│   │       │   ├── auth.controller.ts # Request handlers
│   │       │   └── auth.route.ts      # Route definitions
│   │       ├── product/
│   │       ├── category/
│   │       ├── brand/
│   │       ├── cart/
│   │       └── order/
│   ├── routes/
│   │   └── index.ts           # Central route aggregator
│   ├── app.ts                 # Express app setup
│   └── server.ts              # Server entry point
├── package.json
└── tsconfig.json
```

## 🛠️ Tech Stack

- **Runtime**: Node.js 20+
- **Framework**: Express.js
- **Language**: TypeScript
- **ORM**: Prisma
- **Database**: PostgreSQL
- **Authentication**: JWT
- **Validation**: Zod
- **Documentation**: Swagger/OpenAPI

## 🔄 Request Flow

```
Request → Route → Controller → Service → Prisma → Database
                      ↓            ↓
               Validation    Business Logic
```

| Layer          | File              | Responsibility                      |
| -------------- | ----------------- | ----------------------------------- |
| **Route**      | `*.route.ts`      | Define endpoints, apply middleware  |
| **Controller** | `*.controller.ts` | Handle HTTP req/res, call service   |
| **Service**    | `*.service.ts`    | Business logic, database operations |
| **Validation** | `*.validation.ts` | Zod schemas for input validation    |
| **Interface**  | `*.interface.ts`  | TypeScript types for the module     |

## 🚀 Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL database

### Installation

1. **Install dependencies**

   ```bash
   cd backend
   npm install
   ```

2. **Set up environment variables**

   ```bash
   cp env.example .env
   # Edit .env with your database credentials
   ```

3. **Set up database**

   ```bash
   # Generate Prisma client
   npm run db:generate

   # Push schema to database
   npm run db:push
   ```

4. **Start development server**

   ```bash
   npm run dev
   ```

   Server will start at `http://localhost:3001`

## 📡 API Endpoints

### Authentication

| Method | Endpoint                  | Description          |
| ------ | ------------------------- | -------------------- |
| POST   | `/api/auth/register`      | Register new user    |
| POST   | `/api/auth/login`         | Login user           |
| GET    | `/api/auth/me`            | Get current user     |
| POST   | `/api/auth/guest-session` | Create guest session |

### Products

| Method | Endpoint            | Description               |
| ------ | ------------------- | ------------------------- |
| GET    | `/api/products`     | List products (paginated) |
| GET    | `/api/products/:id` | Get single product        |
| POST   | `/api/products`     | Create product (admin)    |
| PUT    | `/api/products/:id` | Update product (admin)    |
| DELETE | `/api/products/:id` | Delete product (admin)    |

### Categories

| Method | Endpoint              | Description             |
| ------ | --------------------- | ----------------------- |
| GET    | `/api/categories`     | List categories         |
| GET    | `/api/categories/:id` | Get single category     |
| POST   | `/api/categories`     | Create category (admin) |

### Brands

| Method | Endpoint          | Description          |
| ------ | ----------------- | -------------------- |
| GET    | `/api/brands`     | List brands          |
| GET    | `/api/brands/:id` | Get single brand     |
| POST   | `/api/brands`     | Create brand (admin) |

### Cart

| Method | Endpoint              | Description      |
| ------ | --------------------- | ---------------- |
| GET    | `/api/cart`           | Get user's cart  |
| POST   | `/api/cart/items`     | Add item to cart |
| PUT    | `/api/cart/items/:id` | Update cart item |
| DELETE | `/api/cart/items/:id` | Remove from cart |
| DELETE | `/api/cart`           | Clear cart       |

### Orders

| Method | Endpoint                 | Description                 |
| ------ | ------------------------ | --------------------------- |
| GET    | `/api/orders`            | Get user's orders           |
| GET    | `/api/orders/:id`        | Get order details           |
| POST   | `/api/orders`            | Create order                |
| PUT    | `/api/orders/:id/status` | Update order status (admin) |

## 🔐 Authentication

### Headers

- **Authorization**: `Bearer <token>` - For authenticated requests
- **X-Guest-Session**: `<session-id>` - For guest cart/checkout

### User Roles

- `USER` - Regular customer
- `ADMIN` - Store administrator

## 📝 Scripts

```bash
# Development
npm run dev          # Start dev server with hot reload

# Build
npm run build        # Build for production
npm start            # Start production server

# Database
npm run db:generate  # Generate Prisma client
npm run db:push      # Push schema to database
npm run db:migrate   # Run migrations
npm run db:studio    # Open Prisma Studio

# Code Quality
npm run lint         # Run ESLint
npm run format       # Format with Prettier
```

## 🔧 Environment Variables

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/aurevo_db

# Server
PORT=3001
NODE_ENV=development

# JWT
JWT_SECRET=your-secret-key

# Auth0 (optional)
AUTH0_DOMAIN=your-tenant.auth0.com
AUTH0_CLIENT_ID=your-client-id
AUTH0_CLIENT_SECRET=your-client-secret
AUTH0_AUDIENCE=https://api.aurevofashion.store

# Frontend
FRONTEND_URL=http://localhost:5173
```

## 📄 License

MIT
