# School Payment Management System

A comprehensive Next.js application for managing school fee payments with Supabase backend and NextAuth.js authentication.

## Features

### Core Features
- **Secure Authentication**: JWT token-based authentication with NextAuth.js
- **Student Management**: Add, edit, and manage student information
- **Payment Tracking**: Track monthly fee payments with automatic payment record creation
- **Dashboard Analytics**: Circular charts showing payment statistics with monthly/yearly views
- **Receipt Generation**: Professional receipt generation with PDF export and print capabilities
- **Late Fee Management**: Configurable late fees with automatic calculation
- **Missing Payment Tracking**: 
  - Current month missing payments
  - Past due payments with priority levels
- **Admin Settings**: Configure fee structures, late fee rates, and general settings

### Advanced Features
- **Grade-based Pricing**: Different fee structures for each grade (1-12)
- **Registration Fees**: Option for new student registration fees with waiver capability
- **Half-month Fees**: Support for mid-month enrollments
- **Responsive Design**: Beautiful UI/UX optimized for all devices
- **Real-time Updates**: Live payment status updates
- **Export Capabilities**: Receipt generation and reporting features

## Technology Stack

- **Frontend**: Next.js 15, React 18, TypeScript
- **Backend**: Supabase (PostgreSQL)
- **Authentication**: NextAuth.js with JWT
- **UI Framework**: Tailwind CSS, Headless UI
- **Charts**: Recharts
- **PDF Generation**: jsPDF, html2canvas
- **Icons**: Heroicons
- **Form Handling**: React Hook Form with Zod validation
- **Date Utilities**: date-fns

## Setup Instructions

### 1. Environment Setup

Copy the example environment file and configure your settings:

```bash
cp .env.local.example .env.local
```

Update `.env.local` with your actual values:

```env
# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secure-random-string-here

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
```

### 2. Supabase Setup

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Navigate to the SQL Editor in your Supabase dashboard
3. Run the database schema from `supabase-schema.sql`:

```sql
-- Copy and paste the entire content of supabase-schema.sql
-- This will create all necessary tables, triggers, and initial data
```

### 3. Authentication Setup

1. In your Supabase project, go to Authentication > Settings
2. Configure your site URL: `http://localhost:3000`
3. Add redirect URLs:
   - `http://localhost:3000/api/auth/callback/credentials`
   - `http://localhost:3000/dashboard`

### 4. Install Dependencies

```bash
npm install
```

### 5. Run the Application

```bash
npm run dev
```

The application will be available at `http://localhost:3000`

## Default Configuration

The system comes pre-configured with:

### Fee Settings (per grade)
- **Grades 1-6**: ฿1,500-1,700 monthly fee, ฿500 registration fee, ฿50 late fee
- **Grades 7-12**: ฿1,800 monthly fee, ฿500 registration fee, ฿100 late fee

### Payment Rules
- **Collection Day**: 18th of each month
- **Late Fee After**: 25th of each month
- **Currency**: Thai Baht (THB)

## Usage Guide

### First Time Setup
1. Access the application at `http://localhost:3000`
2. You'll be redirected to the login page
3. Create admin credentials in Supabase Auth
4. Log in to access the dashboard

### Managing Students
1. Navigate to "Students" page
2. Add new students with grade and subject information
3. Edit or delete existing student records
4. Search and filter by name or grade

### Processing Payments
1. Go to "Payments" page
2. Select the month you want to manage
3. Click "Mark Paid" for unpaid students
4. Configure payment details (amount, method, reference)
5. Generate receipts automatically after payment

### Monitoring Missing Payments
- **Missing This Month**: View current month unpaid fees
- **Past Due**: View overdue payments with priority levels
- Track payment history and late fees

### System Configuration
1. Navigate to "Settings"
2. **Fee Settings**: Adjust monthly fees, registration fees, and late fee rates per grade
3. **General Settings**: Configure collection days, late fee dates, and school information

### Receipt Generation
- **PDF Download**: Professional PDF receipts matching the demo design
- **Print**: Direct printing capability
- **Automatic Generation**: Receipts created upon payment confirmation

## Database Schema

### Key Tables
- `students`: Student information and grade details
- `payments`: Payment records with status tracking
- `fee_settings`: Grade-based fee configuration
- `admin_settings`: System configuration settings

### Security Features
- Row Level Security (RLS) enabled on all tables
- Authentication required for all operations
- JWT token-based session management

## Development

### Project Structure
```
src/
├── app/                    # Next.js App Router pages
│   ├── dashboard/         # Dashboard with analytics
│   ├── students/          # Student management
│   ├── payments/          # Payment processing
│   ├── missing-current/   # Current month missing payments
│   ├── missing-past/      # Past due payments
│   ├── settings/          # Admin configuration
│   └── login/             # Authentication
├── components/            # Reusable React components
├── lib/                   # Utility functions and configurations
│   ├── auth.ts           # NextAuth configuration
│   ├── supabase.ts       # Supabase client and types
│   ├── utils.ts          # Utility functions
│   └── receiptGenerator.tsx # Receipt generation logic
└── middleware.ts          # Route protection middleware
```

### Key Features Implementation
- **Authentication Middleware**: Protects all routes except login
- **Receipt Generation**: HTML-to-PDF conversion with Thai language support
- **Real-time Data**: Supabase real-time subscriptions for live updates
- **Responsive Design**: Mobile-first approach with Tailwind CSS

## Production Deployment

### Environment Variables
Ensure all environment variables are properly set for production:
- Use secure NEXTAUTH_SECRET
- Configure production Supabase URLs
- Set proper NEXTAUTH_URL for your domain

### Supabase Configuration
- Enable RLS policies for production security
- Configure proper authentication settings
- Set up production database backups

## Support

For issues and feature requests, please refer to the project documentation or create an issue in the project repository.

## Security Considerations

- All routes are protected by authentication middleware
- Database access is secured with Row Level Security
- JWT tokens are used for session management
- Input validation and sanitization implemented
- Secure password handling through Supabase Auth
