# Expense Management System

A comprehensive expense management system built with MERN stack (MongoDB, Express.js, React, Node.js) that allows companies to manage employee expenses with approval workflows, OCR receipt scanning, and multi-currency support.

## Features

### Core Functionality
- **User Management**: Role-based authentication (Admin, Manager, Employee)
- **Expense Submission**: Submit expenses with receipt upload and OCR scanning
- **Approval Workflows**: Multi-level approval system with flexible rules
- **Currency Support**: Multi-currency expenses with automatic conversion
- **Receipt OCR**: Automatic data extraction from receipt images
- **Real-time Updates**: Live status updates and notifications

### User Roles
- **Admin**: Full system access, user management, company settings
- **Manager**: Approve expenses, view team expenses, manage team members
- **Employee**: Submit expenses, view own expense history

### Approval System
- **Sequential Approval**: Step-by-step approval process
- **Parallel Approval**: Multiple approvers can approve simultaneously
- **Percentage-based**: Approval based on percentage of approvers
- **Specific Approver**: Designated approver can auto-approve
- **Hybrid Rules**: Combination of multiple approval types

## Technology Stack

### Backend
- **Node.js** with Express.js
- **MongoDB** with Mongoose ODM
- **JWT** for authentication
- **Multer** for file uploads
- **Tesseract.js** for OCR
- **Axios** for external API calls
- **Bcryptjs** for password hashing

### Frontend
- **React 18** with functional components and hooks
- **React Router** for navigation
- **React Query** for data fetching and caching
- **Tailwind CSS** for styling
- **React Hook Form** for form management
- **React Hot Toast** for notifications
- **Lucide React** for icons

### External APIs
- **Rest Countries API**: For country and currency data
- **Exchange Rate API**: For currency conversion

## Installation

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (v4.4 or higher)
- npm or yarn

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create environment file:
```bash
cp config.env.example config.env
```

4. Update the `config.env` file with your configuration:
```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/expense_management
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRE=7d

# External APIs
REST_COUNTRIES_API=https://restcountries.com/v3.1/all?fields=name,currencies
EXCHANGE_RATE_API=https://api.exchangerate-api.com/v4/latest

# File upload settings
MAX_FILE_SIZE=5242880
UPLOAD_PATH=./uploads
```

5. Start the backend server:
```bash
npm run dev
```

The backend will be running on `http://localhost:5000`

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Create environment file:
```bash
cp .env.example .env
```

4. Update the `.env` file:
```env
REACT_APP_API_URL=http://localhost:5000/api
```

5. Start the frontend development server:
```bash
npm start
```

The frontend will be running on `http://localhost:3000`

## Usage

### Getting Started

1. **First User Registration**: The first user to register becomes the admin and creates the company
2. **Admin Setup**: Admin can create users, set up approval rules, and configure company settings
3. **Employee Usage**: Employees can submit expenses with receipt upload and OCR scanning
4. **Manager Approval**: Managers can approve/reject expenses based on company rules

### Key Features

#### Expense Submission
- Upload receipt images for automatic data extraction
- Support for multiple currencies with automatic conversion
- Categorize expenses for better tracking
- Add detailed descriptions and dates

#### Approval Workflow
- Automatic routing based on amount thresholds
- Multi-level approval chains
- Real-time status updates
- Approval history tracking

#### OCR Receipt Scanning
- Automatic extraction of amount, date, merchant, and category
- Support for various image formats (PNG, JPG, GIF, etc.)
- Confidence scoring for extracted data
- Manual verification and correction

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/profile` - Update profile
- `PUT /api/auth/change-password` - Change password

### Users
- `GET /api/users` - Get all users (Admin)
- `POST /api/users` - Create user (Admin)
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user (Admin)
- `GET /api/users/team` - Get team members
- `GET /api/users/managers` - Get managers

### Expenses
- `GET /api/expenses` - Get expenses
- `POST /api/expenses` - Create expense
- `GET /api/expenses/:id` - Get expense details
- `PUT /api/expenses/:id` - Update expense
- `DELETE /api/expenses/:id` - Delete expense
- `GET /api/expenses/stats` - Get expense statistics

### Approvals
- `GET /api/approvals/pending` - Get pending approvals
- `PUT /api/approvals/:id` - Process approval
- `GET /api/approvals/:id/history` - Get approval history
- `PUT /api/approvals/:id/override` - Override approval (Admin)

### Currency
- `GET /api/currencies/countries` - Get countries and currencies
- `GET /api/currencies/popular` - Get popular currencies
- `POST /api/currencies/convert` - Convert currency
- `GET /api/currencies/rate/:from/:to` - Get exchange rate

### OCR
- `POST /api/ocr/extract` - Extract text from image
- `POST /api/ocr/expense` - Extract expense data from receipt

## Database Schema

### User Model
- Personal information (name, email, password)
- Role and permissions
- Company association
- Manager relationship
- Approval capabilities

### Company Model
- Company information (name, country, currency)
- Settings and configuration
- Admin user reference

### Expense Model
- Expense details (amount, currency, category, description)
- Receipt information
- Approval workflow tracking
- Status and history

### Approval Rule Model
- Approval conditions and thresholds
- Approver assignments
- Approval type configuration

## Security Features

- JWT-based authentication
- Password hashing with bcrypt
- Role-based access control
- Input validation and sanitization
- File upload restrictions
- Rate limiting
- CORS configuration

## Deployment

### Backend Deployment
1. Set up MongoDB Atlas or local MongoDB instance
2. Configure environment variables for production
3. Deploy to platforms like Heroku, AWS, or DigitalOcean
4. Set up file storage for receipts (AWS S3, Cloudinary, etc.)

### Frontend Deployment
1. Build the React application: `npm run build`
2. Deploy to platforms like Netlify, Vercel, or AWS S3
3. Configure environment variables
4. Update API URLs for production

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support and questions, please open an issue in the GitHub repository.
