# Gatsby Dating App - Quick Setup Guide

## Prerequisites Checklist

- [ ] Node.js 18+ installed
- [ ] PostgreSQL 14+ installed (or use SQLite for dev)
- [ ] Git installed
- [ ] Twilio account (for SMS) - [Sign up](https://www.twilio.com/try-twilio)
- [ ] Instagram Developer account (optional) - [Facebook Developers](https://developers.facebook.com/apps/)

---

## Step-by-Step Setup (5 minutes)

### 1. Install Dependencies

```bash
# From root directory
npm install

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Setup Backend Environment

```bash
cd backend

# Copy example env file
cp .env.example .env

# Edit .env file with your credentials
nano .env  # or use your preferred editor
```

**Required environment variables:**

```env
# Minimum required for dev:
DATABASE_URL=file:./dev.db  # SQLite for quick start
JWT_SECRET=your-secret-key-at-least-32-chars-long
ADMIN_SECRET=your-admin-secret

# Optional (for full features):
INSTAGRAM_CLIENT_ID=your_instagram_client_id
INSTAGRAM_CLIENT_SECRET=your_instagram_client_secret
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
TWILIO_PHONE_NUMBER=+1234567890
```

### 3. Setup Database

```bash
# Still in backend directory

# Generate Prisma client
npx prisma generate

# Run migrations (creates tables)
npx prisma migrate dev --name init

# Optional: Seed with test data
npm run seed
```

### 4. Setup Frontend Environment

```bash
cd ../frontend

# Create .env.local file
cat > .env.local << EOF
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_SOCKET_URL=http://localhost:5000
EOF
```

### 5. Start Development Servers

**Option A: Start both servers together (from root):**
```bash
cd ..  # Back to root
npm run dev
```

**Option B: Start separately:**

Terminal 1 (Backend):
```bash
cd backend
npm run dev
```

Terminal 2 (Frontend):
```bash
cd frontend
npm run dev
```

### 6. Verify Setup

Open your browser:
- Frontend: http://localhost:3000
- Backend Health Check: http://localhost:5000/health

You should see the Gatsby landing page!

---

## Creating Your First Venue & Session

### Option 1: Using cURL (Command Line)

```bash
# 1. Create a venue
curl -X POST http://localhost:5000/api/admin/venues \
  -H "Content-Type: application/json" \
  -H "x-admin-secret: your-admin-secret" \
  -d '{
    "name": "Test Venue",
    "city": "New York",
    "address": "123 Test St"
  }'

# Save the venueId from the response

# 2. Create a session
curl -X POST http://localhost:5000/api/admin/venues/{venueId}/sessions \
  -H "Content-Type: application/json" \
  -H "x-admin-secret: your-admin-secret" \
  -d '{
    "eventName": "Test Party",
    "startTime": "2025-11-08T20:00:00Z",
    "endTime": "2025-11-09T04:00:00Z"
  }'

# Save the session.uuid from the response
```

### Option 2: Using Prisma Studio (Visual)

```bash
cd backend
npx prisma studio
```

This opens a GUI at http://localhost:5555 where you can:
1. Click "venues" → Add a venue record
2. Click "sessions" → Add a session record with the venue ID

### Option 3: Run Seed Script

```bash
cd backend
npm run seed  # Creates sample venue + session
```

---

## Testing the App

### 1. Join a Session

Visit: `http://localhost:3000/join/{session-uuid}`

Or click "Demo Mode" on the landing page.

### 2. Choose Auth Method

**SMS (Works immediately with mock mode):**
- Enter any phone number (format: +1234567890)
- Code will be logged to backend console
- Enter the 6-digit code

**Instagram (Requires OAuth setup):**
- See README.md for Instagram setup instructions

### 3. Complete Profile

- Set age (18-50)
- Select 3 vibe tags
- Click "Start Swiping"

### 4. Test Matching

Open a second browser window/profile:
- Join the same session
- Create a different user
- Swipe right on each other
- Watch the match notification appear!
- Start chatting in real-time

---

## Troubleshooting Quick Fixes

### "Database connection failed"
```bash
# Using SQLite? Make sure DATABASE_URL is:
DATABASE_URL=file:./dev.db

# Using PostgreSQL? Check it's running:
sudo systemctl status postgresql
```

### "Port 5000 already in use"
```bash
# Find and kill the process:
lsof -ti:5000 | xargs kill -9

# Or change the port in backend/.env:
PORT=5001
```

### "Module not found" errors
```bash
# Reinstall dependencies:
cd backend && rm -rf node_modules && npm install
cd ../frontend && rm -rf node_modules && npm install
```

### "Prisma client not generated"
```bash
cd backend
npx prisma generate
```

### SMS codes not showing up
- Check backend console logs (codes are printed there in dev mode)
- No Twilio needed for testing!

---

## What to Test

- [ ] Join a session via QR code/URL
- [ ] Create user with SMS auth
- [ ] Complete profile (age, tags)
- [ ] View swipe stack
- [ ] Swipe left/right on profiles
- [ ] Match with another user (open 2nd browser)
- [ ] Receive match notification
- [ ] Send messages in real-time
- [ ] See typing indicators
- [ ] Share contact info
- [ ] View matches list
- [ ] Edit profile
- [ ] Check admin dashboard

---

## Next Steps

Once setup is complete:

1. **Test Multi-User Matching**
   - Open 3-4 browser windows
   - Create different users
   - Swipe and match with each other

2. **Try Admin Dashboard**
   - Visit: http://localhost:3000/admin (when implemented)
   - View real-time analytics
   - See user counts, matches, swipes

3. **Deploy to Production**
   - See README.md "Deployment" section
   - Setup PostgreSQL
   - Configure Instagram OAuth
   - Setup Twilio for real SMS

4. **Customize for Your Event**
   - Update venue info
   - Create sessions for your dates/times
   - Print QR codes
   - Test at a real venue!

---

## Need Help?

- Check `README.md` for full documentation
- Review API docs in README
- Check backend console for error logs
- Try `npx prisma studio` to inspect database

---

**You're ready to match! 🎉**
