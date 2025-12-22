# Quick Start Guide 🚀

## Get Up and Running in 5 Minutes

### Prerequisites Check
- [ ] Python 3.12+ installed
- [ ] Node.js 18+ installed
- [ ] MongoDB running (or connection string ready)
- [ ] WhatsApp Business API credentials

### Step 1: Clone & Setup Backend (2 minutes)

```bash
# Navigate to backend
cd Backend

# Create & activate virtual environment
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
cat > .env << 'EOF'
WHATSAPP_ACCESS_TOKEN=your_token_here
WHATSAPP_PHONE_NUMBER_ID=your_phone_id_here
WHATSAPP_WABA_ID=your_waba_id_here
WHATSAPP_API_VERSION=v20.0
VERIFY_TOKEN=your_verify_token
FRONTEND_ORIGIN=http://localhost:3000
META_BUSINESS_ID=your_business_id
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB_NAME=swalay
JWT_SECRET_KEY=your-secret-key-change-this
JWT_ALGORITHM=HS256
JWT_EXPIRES_IN_MINUTES=60
COOKIE_SECURE=False
COOKIE_SAMESITE=lax
EOF

# Start backend with WebSocket support
uvicorn main:socket_app --reload --host 0.0.0.0 --port 8000
```

⚠️ **CRITICAL**: Use `main:socket_app` not `main:app`!

### Step 2: Setup Frontend (2 minutes)

```bash
# Open new terminal
cd Frontend

# Install dependencies
npm install

# Create .env.local file
echo "NEXT_PUBLIC_BACKEND_URL=http://localhost:8000" > .env.local

# Start development server
npm run dev
```

### Step 3: Test It! (1 minute)

1. Open http://localhost:3000
2. Login/signup
3. Open a chat
4. Send a message
5. Watch the status change: ⏳ → ✓ → ✓✓ → 🔵✓✓

## Verify WebSocket Connection

### In Backend Terminal
Look for:
```
🔌 Client connected: xyz123
✅ Registered user abc456 with socket xyz123
```

### In Browser Console (F12)
Look for:
```
🔌 Socket connected: xyz123
✅ Registered with server: {userId: "abc456"}
```

## Quick Test Script

```bash
# Test backend health
curl http://localhost:8000/health

# Test frontend
curl http://localhost:3000

# Both should respond!
```

## Common Issues & Fixes

### Backend won't start
```bash
# Check Python version
python --version  # Should be 3.12+

# Check if dependencies installed
pip list | grep socketio

# Check if port 8000 is free
lsof -i :8000  # Linux/Mac
netstat -ano | findstr :8000  # Windows
```

### Frontend won't connect
```bash
# Check Node version
node --version  # Should be 18+

# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install

# Check if port 3000 is free
lsof -i :3000  # Linux/Mac
netstat -ano | findstr :3000  # Windows
```

### WebSocket not working
1. Make sure you started with `uvicorn main:socket_app` ✅
2. Check CORS settings in backend
3. Check `NEXT_PUBLIC_BACKEND_URL` in frontend
4. Look for errors in browser console

### MongoDB connection failed
```bash
# Check MongoDB is running
mongo --version  # or mongod --version

# Start MongoDB (if local)
mongod  # Linux/Mac
net start MongoDB  # Windows

# Or use MongoDB Atlas connection string
```

## Development Workflow

### Terminal 1: Backend
```bash
cd Backend
source .venv/bin/activate
uvicorn main:socket_app --reload
```

### Terminal 2: Frontend
```bash
cd Frontend
npm run dev
```

### Terminal 3: Logs (Optional)
```bash
# Watch backend logs
tail -f Backend/logs/app.log

# Or use pm2 for process management
```

## Next Steps

Once running:
1. ✅ Send a test message
2. ✅ Check status updates work
3. ✅ Test auto-reconnection (refresh page)
4. ✅ Configure WhatsApp webhook
5. ✅ Add your contacts
6. ✅ Start chatting!

## Need Help?

Check these files:
- [WEBSOCKET_IMPLEMENTATION.md](WEBSOCKET_IMPLEMENTATION.md) - Full implementation details
- [README_WEBSOCKET.md](README_WEBSOCKET.md) - Complete setup guide
- [MESSAGE_FLOW_DIAGRAM.md](MESSAGE_FLOW_DIAGRAM.md) - Visual flow diagrams

## Configuration Checklist

Backend `.env`:
- [ ] WHATSAPP_ACCESS_TOKEN set
- [ ] WHATSAPP_PHONE_NUMBER_ID set
- [ ] MONGODB_URI correct
- [ ] JWT_SECRET_KEY changed from default
- [ ] FRONTEND_ORIGIN matches your frontend URL

Frontend `.env.local`:
- [ ] NEXT_PUBLIC_BACKEND_URL points to backend

## Success Indicators

✅ Backend running: http://localhost:8000/health returns `{"status":"ok"}`
✅ Frontend running: http://localhost:3000 loads
✅ WebSocket connected: See logs in both terminals
✅ Login works: Can create account and login
✅ Chat works: Can select contact and see chat
✅ Messages send: Can type and send
✅ Status updates: Icons change (✓ → ✓✓ → 🔵✓✓)

## Ready to Deploy?

See deployment guides:
- Backend: Deploy to Heroku/Railway/DigitalOcean
- Frontend: Deploy to Vercel/Netlify
- Database: Use MongoDB Atlas

---

**You're all set! Start chatting in real-time! 🎉**
