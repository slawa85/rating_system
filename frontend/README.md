# Product Review System - Frontend

A modern React frontend application for a product review system, built with TypeScript, Tailwind CSS, and React Query.

## Why React?
In the requirments was stated to use the combination of Angluar + NodeJS. At the moment I don't have any experience with Angular, my goal was to deliver the project fast and flawless, because I have experience with React, I'm more confident in the code I delivered here, and could spot some issues of some architecture flaws.

## Features

- **Product Browsing**: View products with ratings, reviews, and detailed information
- **User Authentication**: Register, login, and logout functionality
- **Review Management**: Create and delete reviews (authenticated users only)
- **Responsive Design**: Mobile-first design with Tailwind CSS
- **Real-time Updates**: Optimistic updates with React Query
- **Type Safety**: Full TypeScript coverage

## Tech Stack

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **React Router v6** - Routing
- **TanStack React Query** - Server state management
- **date-fns** - Date formatting

## Prerequisites

- Node.js 18+ and npm
- Backend API running at `http://localhost:3000` (or update `VITE_API_URL` in `.env`)

## Getting Started

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Set up environment variables**:
   ```bash
   cp .env.example .env
   ```

   Update `.env` with your backend API URL:
   ```
   VITE_API_URL=http://localhost:3000
   VITE_APP_NAME=Product Reviews
   ```

3. **Start development server**:
   ```bash
   npm run dev
   ```

   The app will be available at `http://localhost:5173`

4. **Build for production**:
   ```bash
   npm run build
   ```

5. **Preview production build**:
   ```bash
   npm run preview
   ```

## Project Structure

```
src/
├── api/                    # API client and endpoints
│   ├── client.ts          # Fetch wrapper with auth
│   ├── endpoints/         # API endpoint functions
│   └── types/             # API types
├── features/              # Feature-based modules
│   ├── auth/             # Authentication
│   ├── products/         # Product browsing
│   └── reviews/          # Review management
├── shared/               # Shared components
│   ├── components/       # Reusable UI components
│   ├── hooks/           # Custom hooks
│   └── utils/           # Utility functions
├── pages/               # Route-level pages
├── router/              # Routing configuration
├── App.tsx             # Root component
└── main.tsx            # Entry point
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Lint code with ESLint

## Features by Phase

### Phase 1 ✅ - Core Browsing
- Product listing with pagination
- Product detail view
- Sorting (by rating, date, name)
- Responsive layout

### Phase 2 ✅ - Review Display
- Review list with pagination
- Star ratings
- Relative timestamps

### Phase 3 ✅ - Authentication
- Registration and login
- JWT token management
- Protected routes
- User session persistence

### Phase 4 ✅ - Review Creation
- Write reviews (authenticated users)
- Star rating input
- Delete own reviews
- Optimistic updates

## API Integration

The frontend expects the following API endpoints:

### Products
- `GET /products` - List products (with pagination and sorting)
- `GET /products/:id` - Get product details

### Reviews
- `GET /products/:productId/reviews` - List reviews for a product
- `POST /products/:productId/reviews` - Create a review (requires auth)
- `DELETE /reviews/:id` - Delete a review (requires auth)

### Authentication
- `POST /auth/register` - Register new user
- `POST /auth/login` - Login user
- `POST /auth/logout` - Logout user
- `GET /auth/me` - Get current user (requires auth)

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API URL | `http://localhost:3000` |
| `VITE_APP_NAME` | Application name | `Product Reviews` |

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT
