# Gatsby Dating App 🎉

**Real-time venue-specific matchmaking platform** - The ultimate in-person dating experience for parties, clubs, and events.

## 🌟 Overview

Gatsby solves the friction in real-time social discovery. Users arrive at a venue, scan a QR code, create a frictionless profile, and match with people physically present **right now**. No more match-to-meetup gap.

### Core Features

- ✅ **Multi-venue support** - Unlimited concurrent venues with isolated user pools
- ✅ **Multi-provider auth** - Instagram OAuth2, SMS/phone verification
- ✅ **QR code onboarding** - Scan and join in seconds
- ✅ **Swipe matching** - Tinder-style cards with smooth animations
- ✅ **Real-time chat** - WebSocket-powered instant messaging
- ✅ **Contact exchange** - Share Instagram/phone seamlessly
- ✅ **Admin dashboard** - Multi-venue analytics and management
- ✅ **Session-based** - Auto-expire at event end, clean slate each time

### Tech Stack

**Backend:**
- Node.js + Express.js
- PostgreSQL + Prisma ORM
- Socket.IO (real-time)
- JWT authentication
- Instagram OAuth2
- Twilio SMS
- QR code generation

**Frontend:**
- Next.js 14 (React 18)
- TypeScript
- Tailwind CSS (Gatsby luxe theme)
- Zustand (state management)
- Socket.IO client
- Framer Motion (animations)

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL 14+ (or SQLite for dev)
- Twilio account (for SMS auth)
- Instagram Developer account (for OAuth)

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd Gatsby

# Install dependencies
npm install
cd backend && npm install
cd ../frontend && npm install
```

### 2. Setup Environment Variables

**Backend** (`backend/.env`):

```env
# Server
NODE_ENV=development
PORT=5000
FRONTEND_URL=http://localhost:3000

# Database (PostgreSQL)
DATABASE_URL=postgresql://user:password@localhost:5432/gatsby_db

# Or SQLite for dev:
# DATABASE_URL=file:./dev.db

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Instagram OAuth
INSTAGRAM_CLIENT_ID=your_instagram_client_id
INSTAGRAM_CLIENT_SECRET=your_instagram_client_secret
INSTAGRAM_REDIRECT_URI=http://localhost:5000/api/auth/instagram/callback

# Twilio SMS
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=+1234567890

# Admin
ADMIN_SECRET=your-admin-secret-key
```

**Frontend** (`frontend/.env.local`):

```env
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_SOCKET_URL=http://localhost:5000
```

### 3. Setup Database

```bash
cd backend

# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev --name init

# Optional: Seed test data
npm run seed
```

### 4. Start Development Servers

From the root directory:

```bash
# Start both backend and frontend
npm run dev

# Or separately:
# Terminal 1 - Backend
cd backend && npm run dev

# Terminal 2 - Frontend
cd frontend && npm run dev
```

**App URLs:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000
- Prisma Studio: `npx prisma studio` (in backend folder)

---

## 📱 Instagram OAuth Setup

1. Go to [Facebook Developers](https://developers.facebook.com/apps/)
2. Create new app → "Consumer" type
3. Add "Instagram Basic Display" product
4. Configure OAuth redirect URI: `http://localhost:5000/api/auth/instagram/callback`
5. Copy Client ID and Client Secret to `.env`

**Note:** Instagram Basic Display API has limited data access. For production with follower counts and verified badges, you'll need Instagram Business API.

---

## 📞 Twilio SMS Setup

1. Sign up at [Twilio](https://www.twilio.com/try-twilio)
2. Get a phone number (with SMS capability)
3. Copy Account SID, Auth Token, and Phone Number to `.env`

**Dev Mode:** If credentials are missing, SMS is mocked in console logs.

---

## 🏢 Creating Venues & Sessions

### Admin API (requires `ADMIN_SECRET` header)

**1. Create a Venue:**

```bash
curl -X POST http://localhost:5000/api/admin/venues \
  -H "Content-Type: application/json" \
  -H "x-admin-secret: your-admin-secret-key" \
  -d '{
    "name": "GlamHospitality Rooftop",
    "city": "New York",
    "address": "123 Park Ave",
    "capacity": 4000,
    "timezone": "America/New_York"
  }'
```

**2. Create a Session:**

```bash
curl -X POST http://localhost:5000/api/admin/venues/{venueId}/sessions \
  -H "Content-Type: application/json" \
  -H "x-admin-secret: your-admin-secret-key" \
  -d '{
    "eventName": "GlamHospitality Launch Party",
    "startTime": "2025-11-08T22:00:00Z",
    "endTime": "2025-11-09T04:00:00Z"
  }'
```

**Response includes:**
- `session.uuid` - Use this for QR code
- `qrCodeImage` - Base64 encoded QR code image

**3. Generate QR Codes:**

```bash
curl -X POST http://localhost:5000/api/admin/sessions/{sessionId}/qr-codes \
  -H "x-admin-secret: your-admin-secret-key" \
  -d '{"location": "entrance", "count": 1}'
```

Print these QR codes and place them at your venue entrance, bar, dance floor, etc.

---

## 👤 User Flow

### 1. **Scan QR Code**
- User scans QR at venue
- Redirects to: `https://gatsby.app/join/{sessionUuid}`

### 2. **Authentication**
- **Option A:** Instagram OAuth (1-click)
- **Option B:** Phone number + SMS code

### 3. **Profile Setup**
- Enter age (slider)
- Upload photo (if SMS auth)
- Select 3 vibe tags

### 4. **Start Swiping**
- Swipe right = Like
- Swipe left = Pass
- Instant match notifications

### 5. **Chat & Connect**
- Real-time messaging
- Share Instagram/phone
- Meet at the venue!

---

## 📊 Admin Dashboard

Access analytics at: `http://localhost:3000/admin` (with admin secret)

**Multi-Venue Overview:**
- Active sessions
- Real-time user counts
- Swipes, matches, messages per venue
- Match rates and conversion metrics

**Per-Session Analytics:**
- Timeline (hourly breakdown)
- Top profiles (most swiped)
- QR code scan tracking
- Contact exchange rate

---

## 🗂️ Project Structure

```
Gatsby/
├── backend/
│   ├── src/
│   │   ├── config/          # Database, env config
│   │   ├── controllers/     # Request handlers
│   │   ├── middleware/      # Auth, validation
│   │   ├── models/          # Prisma models
│   │   ├── routes/          # API routes
│   │   ├── services/        # Socket.IO, SMS, Instagram
│   │   ├── utils/           # JWT, helpers
│   │   └── server.js        # Main entry point
│   ├── prisma/
│   │   └── schema.prisma    # Database schema
│   ├── package.json
│   └── .env.example
│
├── frontend/
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── pages/           # Next.js pages
│   │   ├── hooks/           # Custom hooks
│   │   ├── services/        # API, Socket.IO clients
│   │   ├── store/           # Zustand state
│   │   ├── styles/          # Global CSS, Tailwind
│   │   └── utils/           # Helpers
│   ├── public/              # Static assets
│   ├── package.json
│   └── tailwind.config.js   # Gatsby theme
│
├── package.json             # Root workspace
└── README.md                # This file
```

---

## 🎨 Design System

### Color Palette

```css
--gatsby-gold: #D4AF37        /* Primary, buttons, accents */
--gatsby-gold-light: #F0E68C  /* Hover states */
--gatsby-black: #0A0E27       /* Background */
--gatsby-charcoal: #1A1F3A    /* Cards, surfaces */
--gatsby-gray: #A0A0A0        /* Secondary text */
--gatsby-red: #FF4757         /* Errors, pass */
--gatsby-green: #2ED573       /* Success, matches */
```

### Typography

- **Headers:** Playfair Display (serif, elegant)
- **Body:** Inter (sans-serif, clean)

### Components

- `btn-primary` - Gold button
- `btn-secondary` - Gray button
- `card` - Charcoal card with rounded corners
- `input-field` - Styled input
- `swipe-card` - Draggable profile card

---

## 🧪 Testing

### Test User Flow Locally

1. Create a test venue and session (see Admin API above)
2. Open frontend: `http://localhost:3000`
3. Click "Demo Mode" or visit: `http://localhost:3000/join/{sessionUuid}`
4. Choose authentication method
5. Complete profile setup
6. Start swiping!

### Multi-User Testing

- Open multiple browser windows/profiles
- Create different users
- Swipe on each other
- Test matching and chat

---

## 🚢 Deployment

### Backend (AWS EC2 / DigitalOcean)

1. **Setup server:**
```bash
# Install Node.js, PostgreSQL
sudo apt update
sudo apt install nodejs npm postgresql

# Clone repo
git clone <repo-url>
cd Gatsby/backend
npm install
```

2. **Configure environment:**
```bash
# Copy .env.example to .env
# Update DATABASE_URL to production PostgreSQL
# Set NODE_ENV=production
# Use strong JWT_SECRET
```

3. **Run migrations:**
```bash
npx prisma migrate deploy
npx prisma generate
```

4. **Start with PM2:**
```bash
npm install -g pm2
pm2 start src/server.js --name gatsby-backend
pm2 save
pm2 startup
```

5. **Setup Nginx reverse proxy:**
```nginx
server {
    listen 80;
    server_name api.gatsby.app;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
    }
}
```

### Frontend (Vercel / Netlify)

**Vercel (recommended):**

1. Push to GitHub
2. Import project in Vercel
3. Set environment variables:
   - `NEXT_PUBLIC_API_URL=https://api.gatsby.app`
   - `NEXT_PUBLIC_SOCKET_URL=https://api.gatsby.app`
4. Deploy!

**Or build manually:**
```bash
cd frontend
npm run build
npm start
```

---

## 📖 API Documentation

### Authentication

**Join Session**
```
POST /api/auth/join/{sessionUuid}
Response: { session: {...} }
```

**Send SMS Code**
```
POST /api/auth/sms/send-code
Body: { phoneNumber, sessionUuid }
Response: { verificationId }
```

**Verify SMS Code**
```
POST /api/auth/sms/verify-code
Body: { verificationId, code }
Response: { token, user }
```

**Complete Profile**
```
POST /api/auth/complete-profile
Headers: Authorization: Bearer {token}
Body: { name, age, vibeTags, profilePhotoUrl }
```

### Users

**Get Swipe Stack**
```
GET /api/users/session/{sessionId}/swipe-stack
Headers: Authorization: Bearer {token}
Response: { users: [...] }
```

**Update Profile**
```
PUT /api/users/me
Body: { name, age, bio, vibeTags }
```

### Matches

**Get Matches**
```
GET /api/matches
Response: { matches: [...] }
```

### Messages

**Get Messages**
```
GET /api/messages/match/{matchId}
Response: { messages: [...] }
```

**Send Message** (use Socket.IO for real-time)
```
socket.emit('send_message', { matchId, receiverId, content })
```

### Contacts

**Share Contact**
```
POST /api/contacts
Body: { matchId, phone, instagram }
```

---

## 🐛 Troubleshooting

### Database Connection Failed
- Check PostgreSQL is running: `sudo systemctl status postgresql`
- Verify `DATABASE_URL` in `.env`
- Test connection: `psql $DATABASE_URL`

### Socket.IO Not Connecting
- Check CORS settings in `backend/src/server.js`
- Verify `FRONTEND_URL` matches your frontend URL
- Check firewall allows WebSocket connections

### Instagram OAuth Not Working
- Verify redirect URI matches exactly in Facebook Developer Console
- Check `INSTAGRAM_CLIENT_ID` and `INSTAGRAM_CLIENT_SECRET`
- Instagram Basic Display has limited data access

### SMS Not Sending
- Check Twilio credentials
- Verify phone number format (E.164: +1234567890)
- Check Twilio console for errors

---

## 🛣️ Roadmap

### MVP (Current)
- ✅ Multi-venue sessions
- ✅ Instagram + SMS auth
- ✅ Swipe matching
- ✅ Real-time chat
- ✅ Contact exchange
- ✅ Admin dashboard

### Post-MVP
- 🔲 Stripe payment integration
- 🔲 Gender/sexuality preference filters
- 🔲 Photo carousel (multiple photos)
- 🔲 Push notifications
- 🔲 Advanced matching algorithm (vibe compatibility)
- 🔲 Venue beacon/geofencing verification
- 🔲 User retention across events
- 🔲 Social features (friends, group chats)

---

## 📄 License

MIT License - See LICENSE file for details

---

## 🙋 Support

For questions or issues:
- Email: support@gatsby.app
- GitHub Issues: [Link to repo issues]

---

**Built with ❤️ for real-world connections**

*Gatsby - Who's here?*
