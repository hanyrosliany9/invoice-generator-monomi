# Dashboard Integration Documentation

## Overview
This document describes the integration between the dashboard frontend and the backend API for real-time data display.

## Architecture

### Frontend Components
- **DashboardPage.tsx**: Main dashboard page component
- **useDashboard.ts**: Custom hooks for data fetching
- **dashboard.ts**: Service functions for API calls
- **dashboard.ts**: TypeScript interfaces for API responses

### Backend Endpoints
- `GET /api/v1/quotations/stats` - Quotation statistics
- `GET /api/v1/quotations/recent` - Recent quotations
- `GET /api/v1/invoices/stats` - Invoice statistics  
- `GET /api/v1/invoices/recent` - Recent invoices
- `GET /api/v1/clients/stats` - Client statistics
- `GET /api/v1/projects/stats` - Project statistics

## Data Flow

### 1. Data Fetching
The dashboard uses TanStack Query for efficient data fetching:
- **Real-time updates**: Auto-refetch every 5 minutes
- **Caching**: 5-minute stale time for statistics, 2 minutes for recent data
- **Error handling**: Comprehensive error states and retry mechanisms
- **Loading states**: Spinner during initial load

### 2. API Service Layer
`dashboardService` provides:
- Individual stat endpoints
- Combined dashboard data fetching
- Error handling and response transformation

### 3. Custom Hooks
`useDashboardData()` hook provides:
- Automatic data fetching
- Loading states
- Error handling
- Refetch functionality

## Key Features

### Real-time Data Updates
- Auto-refresh every 5 minutes for statistics
- Auto-refresh every 2 minutes for recent data
- Manual refresh capability

### Indonesian Localization
- IDR currency formatting
- Indonesian date formatting
- Bahasa Indonesia translations
- Materai compliance indicators

### Error Handling
- Network error handling
- Authentication error handling
- Graceful degradation
- Retry mechanisms
- Error boundary protection

### Loading States
- Skeleton loading for initial data
- Loading indicators during refetch
- Progressive loading for different data sections

## Data Types

### Statistics
```typescript
interface DashboardStats {
  totalQuotations: number
  totalInvoices: number
  totalClients: number
  totalProjects: number
  totalRevenue: number
  pendingPayments: number
}
```

### Recent Data
```typescript
interface RecentQuotation {
  id: string
  quotationNumber: string
  client: { id: string; name: string; email: string }
  project: { id: string; name: string; description: string }
  amount: number
  status: 'draft' | 'sent' | 'approved' | 'declined'
  createdAt: string
  updatedAt: string
}
```

## Authentication
All API endpoints require JWT authentication:
- Bearer token in Authorization header
- Protected routes redirect to login if unauthorized
- Token validation on each request

## Performance Optimizations
- Query caching with TanStack Query
- Stale-while-revalidate strategy
- Efficient re-rendering with React.memo
- Optimistic updates for better UX

## Error Recovery
- Automatic retry on network errors
- Manual retry buttons
- Fallback to cached data when possible
- Error boundary for catastrophic failures

## Testing
- API endpoint testing
- Error state testing
- Loading state testing
- Authentication flow testing

## Future Enhancements
- WebSocket for real-time updates
- Offline capability
- Advanced filtering options
- Export capabilities
- Mobile responsiveness improvements