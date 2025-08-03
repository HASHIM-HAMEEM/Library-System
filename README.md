# Private Library Access App - Admin Dashboard

A comprehensive React-based admin web application for managing private library access with QR code scanning, subscription management, and attendance tracking.

**Note**: This React app is exclusively for admin users. Students use a separate Flutter mobile application for registration, login, and library access.

## 🚀 Features

### Admin Dashboard Features
- **Admin Authentication**: Secure admin login with Firebase Auth
- **Student Management**: View and manage all student profiles from Flutter app
- **Student Verification**: Approve/reject student registrations from Flutter app
- **QR Code Scanning**: Admin-controlled entry/exit tracking for students
- **Subscription Control**: Update student subscription status and types
- **Attendance Analytics**: Real-time attendance monitoring and statistics
- **Data Export**: Export attendance data to CSV format
- **Admin Management**: Create and manage other admin users
- **Dashboard**: Comprehensive overview with key metrics and analytics

## 🛠️ Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS
- **Backend**: Firebase (Authentication, Firestore Database)
- **State Management**: Zustand
- **Routing**: React Router DOM
- **QR Code Scanning**: html5-qrcode
- **Charts**: Recharts
- **Icons**: Lucide React
- **Notifications**: Sonner
- **Date Handling**: date-fns

## 📋 Prerequisites

- Node.js (v18 or higher)
- npm or pnpm
- Firebase account and project
- Flutter app for student users (separate repository)

## 🔧 Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd private-library-access-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   pnpm install
   ```

3. **Set up Supabase**
   - Create a new Supabase project
   - Copy your project URL and anon key
   - Update the configuration in `src/lib/supabase.ts`

4. **Set up the database**
   - Run the SQL commands from `database_schema.sql` in your Supabase SQL editor
   - This will create all necessary tables, indexes, and security policies

5. **Start the development server**
   ```bash
   npm run dev
   # or
   pnpm dev
   ```

6. **Open the application**
   - Navigate to `http://localhost:5173`

## 🗄️ Database Schema

The application uses the following main tables:

### `user_profiles`
- User information and subscription details
- Links to Supabase Auth users
- Stores role (student/admin), subscription status, and personal details

### `attendance_logs`
- Entry/exit records for library access
- Tracks duration and timestamps
- Links to user profiles

### `subscriptions`
- Subscription history and payment records
- Tracks plan types, amounts, and status
- Links to user profiles

## 🔐 Authentication & Security

- **Supabase Auth**: Handles user registration, login, and session management
- **Row Level Security (RLS)**: Database-level security policies
- **Role-based Access**: Different permissions for students and admins
- **Secure API**: All database operations go through Supabase's secure API

## 📱 QR Code System

The QR code system uses the following format:
- **Entry QR**: `LIBRARY_ACCESS|ENTRY`
- **Exit QR**: `LIBRARY_ACCESS|EXIT`

Students scan these codes to:
1. Record library entry (creates new attendance log)
2. Record library exit (updates attendance log with exit time and duration)

## 💳 Subscription Plans

### Daily Pass - $5
- Full day access
- All library facilities
- Wi-Fi access
- Study rooms (subject to availability)

### Weekly Pass - $30 (Most Popular)
- 7 days unlimited access
- All library facilities
- Wi-Fi access
- Priority study room booking
- Extended hours access

### Monthly Pass - $100
- 30 days unlimited access
- All library facilities
- Wi-Fi access
- Priority study room booking
- Extended hours access
- Guest pass (2 per month)
- Premium support

## 📊 Analytics & Reporting

### Student Analytics
- Total visits and hours
- Average session duration
- Weekly and monthly statistics
- Visual charts and graphs

### Admin Analytics
- Real-time attendance monitoring
- Student subscription status
- Revenue tracking
- Usage patterns and trends

## 🎨 UI/UX Features

- **Responsive Design**: Works on desktop, tablet, and mobile
- **Modern Interface**: Clean, professional design with Tailwind CSS
- **Real-time Updates**: Live data updates using Supabase real-time
- **Loading States**: Smooth loading indicators and transitions
- **Error Handling**: User-friendly error messages and validation
- **Accessibility**: Keyboard navigation and screen reader support

## 🔄 Development Workflow

### Available Scripts

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run linting
npm run lint

# Type checking
npm run type-check
```

### Project Structure

```
src/
├── components/          # Reusable UI components
│   └── LoadingSpinner.tsx
├── hooks/              # Custom React hooks
├── lib/                # Configuration and utilities
│   └── supabase.ts     # Supabase client configuration
├── pages/              # Page components
│   ├── AdminDashboard.tsx
│   ├── AttendanceHistoryPage.tsx
│   ├── LoginPage.tsx
│   ├── ProfilePage.tsx
│   ├── QRScannerPage.tsx
│   ├── StudentDashboard.tsx
│   └── SubscriptionPage.tsx
├── stores/             # Zustand state stores
│   └── authStore.ts    # Authentication state
├── utils/              # Utility functions
├── App.tsx             # Main app component with routing
└── main.tsx           # App entry point
```

## 🚀 Deployment

### Vercel (Recommended)

1. Connect your repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Netlify

1. Connect your repository to Netlify
2. Set build command: `npm run build`
3. Set publish directory: `dist`
4. Set environment variables

### Manual Deployment

1. Build the project: `npm run build`
2. Upload the `dist` folder to your hosting provider
3. Configure your web server to serve the SPA

## 🔧 Configuration

### Environment Variables

Create a `.env.local` file (optional, as credentials are in the code for demo):

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Supabase Configuration

Update `src/lib/supabase.ts` with your Supabase credentials:

```typescript
const supabaseUrl = 'your_supabase_url'
const supabaseKey = 'your_supabase_anon_key'
```

## 🐛 Troubleshooting

### Common Issues

1. **QR Scanner not working**
   - Ensure HTTPS is enabled (required for camera access)
   - Check browser permissions for camera access
   - Verify QR code format matches expected pattern

2. **Authentication errors**
   - Check Supabase configuration
   - Verify RLS policies are set up correctly
   - Ensure user profiles are created automatically

3. **Database connection issues**
   - Verify Supabase URL and API key
   - Check network connectivity
   - Ensure database schema is set up correctly

### Debug Mode

Enable debug logging by adding to your browser console:

```javascript
localStorage.setItem('debug', 'true')
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-feature`
3. Commit your changes: `git commit -am 'Add new feature'`
4. Push to the branch: `git push origin feature/new-feature`
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- [Supabase](https://supabase.com) for the backend infrastructure
- [Tailwind CSS](https://tailwindcss.com) for the styling framework
- [Lucide](https://lucide.dev) for the beautiful icons
- [Recharts](https://recharts.org) for the charting library
- [html5-qrcode](https://github.com/mebjas/html5-qrcode) for QR code scanning

## 📞 Support

For support and questions:
- Create an issue in the repository
- Contact the development team
- Check the documentation and troubleshooting guide

---

**Built with ❤️ using React, TypeScript, and Supabase**