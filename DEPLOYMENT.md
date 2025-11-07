# Gatsby Dating App - AWS Deployment Guide

Complete guide to deploying Gatsby to AWS for production use at live events.

---

## Architecture Overview

```
┌─────────────────────────────────────────┐
│  Cloudflare (DNS + SSL)                 │
│  gatsby.app                             │
└──────────────┬──────────────────────────┘
               │
    ┌──────────┴──────────┐
    │                     │
┌───▼────────────┐  ┌────▼──────────────┐
│  Vercel         │  │  AWS EC2          │
│  (Frontend)     │  │  (Backend API)    │
│  gatsby.app     │  │  api.gatsby.app   │
└─────────────────┘  └──────┬────────────┘
                            │
                     ┌──────▼────────┐
                     │  AWS RDS      │
                     │  (PostgreSQL) │
                     └───────────────┘
```

---

## Part 1: AWS Backend Deployment

### Prerequisites

- AWS Account
- Domain name (e.g., gatsby.app)
- SSH key pair

### Step 1: Launch EC2 Instance

1. **Go to EC2 Dashboard**
   - Click "Launch Instance"

2. **Configure Instance:**
   - **Name:** gatsby-backend-prod
   - **AMI:** Ubuntu Server 22.04 LTS
   - **Instance Type:** t3.small (2 vCPU, 2 GB RAM) for testing
     - Upgrade to t3.medium for 1000+ concurrent users
   - **Key pair:** Create or select existing
   - **Security Group:** Create new with:
     - SSH (22) - Your IP only
     - HTTP (80) - 0.0.0.0/0
     - HTTPS (443) - 0.0.0.0/0
     - Custom TCP (5000) - 0.0.0.0/0 (for WebSocket)

3. **Launch and note public IP**

### Step 2: Setup PostgreSQL (AWS RDS)

1. **Go to RDS Dashboard**
   - Click "Create database"

2. **Configure:**
   - **Engine:** PostgreSQL 14.x
   - **Template:** Free tier (for testing) or Production
   - **DB instance identifier:** gatsby-db-prod
   - **Master username:** gatsbyuser
   - **Master password:** [Save this securely]
   - **Instance class:** db.t3.micro (free tier) or db.t3.small
   - **Storage:** 20 GB GP2
   - **VPC:** Same as EC2
   - **Public access:** No
   - **VPC security group:** Allow PostgreSQL (5432) from EC2 security group

3. **Note endpoint:** `gatsby-db-prod.xxxxx.us-east-1.rds.amazonaws.com`

### Step 3: Connect to EC2 and Install Dependencies

```bash
# SSH into instance
ssh -i your-key.pem ubuntu@<EC2_PUBLIC_IP>

# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install Git
sudo apt install -y git

# Install Nginx
sudo apt install -y nginx

# Install PM2 (process manager)
sudo npm install -g pm2
```

### Step 4: Clone and Setup Backend

```bash
# Clone repository
git clone https://github.com/your-username/Gatsby.git
cd Gatsby/backend

# Install dependencies
npm install

# Install Prisma CLI
npm install -g prisma
```

### Step 5: Configure Environment

```bash
# Create .env file
nano .env
```

Paste production environment variables:

```env
NODE_ENV=production
PORT=5000
FRONTEND_URL=https://gatsby.app

# PostgreSQL (RDS endpoint)
DATABASE_URL=postgresql://gatsbyuser:YOUR_PASSWORD@gatsby-db-prod.xxxxx.us-east-1.rds.amazonaws.com:5432/gatsby_prod

# JWT (generate strong secrets)
JWT_SECRET=<Generate-with: openssl rand -base64 64>
JWT_REFRESH_SECRET=<Generate-with: openssl rand -base64 64>

# Instagram OAuth
INSTAGRAM_CLIENT_ID=your_production_client_id
INSTAGRAM_CLIENT_SECRET=your_production_client_secret
INSTAGRAM_REDIRECT_URI=https://api.gatsby.app/api/auth/instagram/callback

# Twilio SMS
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=+1234567890

# Admin
ADMIN_SECRET=<Generate-with: openssl rand -base64 32>

# Socket.IO
SOCKET_IO_CORS_ORIGIN=https://gatsby.app
```

### Step 6: Setup Database

```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate deploy
```

### Step 7: Start Backend with PM2

```bash
# Start backend
pm2 start src/server.js --name gatsby-backend

# Save PM2 config
pm2 save

# Setup PM2 to start on reboot
pm2 startup
# Run the command it outputs
```

### Step 8: Configure Nginx Reverse Proxy

```bash
# Create Nginx config
sudo nano /etc/nginx/sites-available/gatsby-api
```

Paste configuration:

```nginx
server {
    listen 80;
    server_name api.gatsby.app;

    # WebSocket support
    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable site:
```bash
sudo ln -s /etc/nginx/sites-available/gatsby-api /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### Step 9: Setup SSL with Let's Encrypt

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d api.gatsby.app

# Auto-renewal is setup automatically
```

### Step 10: Configure DNS

In your domain registrar (Cloudflare, Route53, etc.):

```
Type: A
Name: api
Value: <EC2_PUBLIC_IP>
TTL: Auto
```

Wait for DNS propagation (5-60 minutes).

### Step 11: Test Backend

```bash
# Test health endpoint
curl https://api.gatsby.app/health

# Should return:
# {"status":"ok","timestamp":"...","uptime":...}
```

---

## Part 2: Frontend Deployment (Vercel)

### Step 1: Push to GitHub

```bash
# Make sure code is committed
cd Gatsby
git add .
git commit -m "Ready for production"
git push origin main
```

### Step 2: Deploy to Vercel

1. **Go to [Vercel](https://vercel.com)**
2. Click "New Project"
3. Import your GitHub repository
4. Configure:
   - **Framework Preset:** Next.js
   - **Root Directory:** `frontend`
   - **Build Command:** `npm run build`
   - **Output Directory:** `.next`

5. **Environment Variables:**

```
NEXT_PUBLIC_API_URL=https://api.gatsby.app
NEXT_PUBLIC_SOCKET_URL=https://api.gatsby.app
```

6. Click "Deploy"

7. **Custom Domain:**
   - In Vercel dashboard → Settings → Domains
   - Add `gatsby.app` and `www.gatsby.app`
   - Follow DNS instructions

### Step 3: Update Instagram OAuth Redirect

In Facebook Developer Console:
- Update redirect URI to: `https://api.gatsby.app/api/auth/instagram/callback`
- Add `https://gatsby.app` to allowed domains

---

## Part 3: Testing Production Deployment

### 1. Create First Venue & Session

```bash
# Use your admin secret from .env
curl -X POST https://api.gatsby.app/api/admin/venues \
  -H "Content-Type: application/json" \
  -H "x-admin-secret: YOUR_ADMIN_SECRET" \
  -d '{
    "name": "GlamHospitality Rooftop",
    "city": "New York",
    "address": "123 Park Ave, NYC",
    "capacity": 4000
  }'

# Save venueId

curl -X POST https://api.gatsby.app/api/admin/venues/{venueId}/sessions \
  -H "Content-Type: application/json" \
  -H "x-admin-secret: YOUR_ADMIN_SECRET" \
  -d '{
    "eventName": "Launch Party",
    "startTime": "2025-11-08T22:00:00Z",
    "endTime": "2025-11-09T04:00:00Z"
  }'
```

### 2. Generate QR Codes

```bash
curl -X POST https://api.gatsby.app/api/admin/sessions/{sessionId}/qr-codes \
  -H "x-admin-secret: YOUR_ADMIN_SECRET" \
  -d '{"location": "entrance", "count": 5}'
```

Download QR codes and print them for your venue.

### 3. Test User Flow

1. Visit: `https://gatsby.app/join/{session-uuid}`
2. Complete authentication (Instagram or SMS)
3. Setup profile
4. Start swiping!

---

## Part 4: Monitoring & Scaling

### CloudWatch Monitoring (EC2)

1. **Enable detailed monitoring** in EC2 dashboard
2. **Create alarms:**
   - CPU > 80%
   - Memory > 80%
   - Disk > 80%

### Application Monitoring

```bash
# On EC2 instance
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 50M
pm2 set pm2-logrotate:retain 7

# View logs
pm2 logs gatsby-backend
pm2 monit
```

### Database Backups (RDS)

1. **Enable automated backups:**
   - RDS Dashboard → Your DB → Modify
   - Backup retention: 7 days
   - Enable automatic minor version upgrades

2. **Take manual snapshot before big events**

### Scaling for High Traffic

**For 1000+ concurrent users:**

1. **Upgrade EC2:**
   - t3.medium → t3.large (4 vCPU, 8 GB)
   - Or use multiple t3.small instances with load balancer

2. **Upgrade RDS:**
   - db.t3.micro → db.t3.small or db.t3.medium
   - Enable read replicas for heavy read loads

3. **Add Redis for session storage:**
   - AWS ElastiCache (Redis)
   - Use for SMS verification codes
   - Cache user data

4. **Load Balancer (ALB):**
   - Route traffic to multiple EC2 instances
   - Enable sticky sessions for WebSocket

---

## Part 5: Security Checklist

- [ ] SSH access limited to your IP only
- [ ] Database not publicly accessible
- [ ] Strong JWT secrets (64+ characters)
- [ ] HTTPS enabled (SSL certificates)
- [ ] CORS configured correctly
- [ ] Rate limiting enabled
- [ ] Admin secret is strong and secret
- [ ] Environment variables not in code
- [ ] Regular security updates: `sudo apt update && sudo apt upgrade`
- [ ] PM2 logs rotated
- [ ] Database backups enabled

---

## Part 6: Cost Estimation

**Monthly costs for MVP (100-500 users/night):**

| Service | Spec | Cost |
|---------|------|------|
| EC2 (t3.small) | 2 vCPU, 2 GB RAM | $15/month |
| RDS (db.t3.micro) | 1 vCPU, 1 GB RAM | $15/month |
| Vercel | Pro plan (optional) | $20/month |
| Domain | .app domain | $12/year |
| SSL | Let's Encrypt | FREE |
| **Total** | | **~$50-70/month** |

**Scaling for 1000+ users:**
- EC2: t3.large = $60/month
- RDS: db.t3.small = $30/month
- ElastiCache (optional): $15/month
- **Total: ~$120-150/month**

---

## Troubleshooting Production Issues

### Backend not responding
```bash
# Check PM2 status
pm2 status
pm2 logs gatsby-backend --lines 100

# Restart if needed
pm2 restart gatsby-backend

# Check Nginx
sudo nginx -t
sudo systemctl status nginx
```

### Database connection issues
```bash
# Test connection from EC2
psql "postgresql://gatsbyuser:PASSWORD@RDS_ENDPOINT:5432/gatsby_prod"

# Check security groups allow EC2 → RDS
```

### WebSocket not connecting
- Verify Nginx WebSocket config
- Check CORS settings in backend
- Ensure Socket.IO transport is set to `['websocket', 'polling']`

### High CPU/Memory
```bash
# Monitor resources
pm2 monit
htop

# Check database queries
# Optimize slow queries with indexes
```

---

## Next Steps

1. **Pre-event testing:**
   - Test with 10-20 friends
   - Verify all flows work
   - Check analytics dashboard

2. **Event night:**
   - Monitor PM2 logs
   - Watch CloudWatch metrics
   - Have backup plan

3. **Post-event:**
   - Review analytics
   - Collect user feedback
   - Plan improvements

---

**Your production Gatsby app is ready! 🚀**
