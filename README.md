# Cypherium Investment Platform

A modern cryptocurrency investment platform with real-time tracking and automated earnings processing.

## Features

- User authentication and authorization
- Investment plans with daily returns
- Real-time investment tracking
- Admin dashboard
- Automated daily earnings processing
- Tawk.to chat integration
- Responsive design

## Deployment Instructions

### Prerequisites

- Node.js (v14 or higher)
- MongoDB Atlas account
- PM2 (for production process management)

### Deployment Steps

1. Clone the repository:
```bash
git clone https://github.com/yourusername/cypherium.git
cd cypherium
```

2. Install dependencies:
```bash
# Install frontend dependencies
cd frontend
npm install

# Install backend dependencies
cd ../backend
npm install
```

3. Configure environment variables:
- Copy `.env.example` to `.env` in the backend directory
- Update the variables with your production values

4. Build the application:
```bash
# Build frontend
cd frontend
npm run build

# Build backend
cd ../backend
npm run build
```

5. Deploy to production:
```bash
# Install PM2 globally if not already installed
npm install -g pm2

# Start the application
pm2 start ecosystem.config.js
```

### Production Environment Variables

Required environment variables for production:

- `PORT`: Server port (default: 5000)
- `MONGODB_URI`: MongoDB Atlas connection string
- `JWT_SECRET`: Secret key for JWT token generation
- `NODE_ENV`: Set to 'production'
- `ADMIN_TOKEN`: Admin user JWT token

### Monitoring

The application uses PM2 for process management. Useful commands:

```bash
# View logs
pm2 logs

# Monitor processes
pm2 monit

# Restart application
pm2 restart all

# Stop application
pm2 stop all
```

## Development

### Running Locally

1. Start the backend:
```bash
cd backend
npm install
npm start
```

2. Start the frontend:
```bash
cd frontend
npm install
npm start
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

## Security Considerations

1. Always use HTTPS in production
2. Keep environment variables secure
3. Regularly update dependencies
4. Monitor server logs for suspicious activity
5. Implement rate limiting for API endpoints

## Support

For support, please contact:
- Email: support@cypherium.co
- Live Chat: Available through Tawk.to integration 