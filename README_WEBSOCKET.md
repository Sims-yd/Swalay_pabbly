# WhatsApp Chat Application - WebSocket Implementation

## 🚀 Real-Time Event-Driven Architecture

This application implements a real-time, event-driven message status update system using WebSockets (Socket.IO), following best practices with **zero polling**.

## 📋 Prerequisites

- Python 3.12+
- Node.js 18+
- MongoDB (local or Atlas)
- WhatsApp Business API credentials

## 🔧 Setup Instructions

### Backend Setup

1. **Navigate to Backend directory**
   ```bash
   cd Backend
   ```

2. **Create virtual environment**
   ```bash
   python -m venv .venv
   ```

3. **Activate virtual environment**
   - Linux/Mac:
     ```bash
     source .venv/bin/activate
     ```
   - Windows:
     ```bash
     .venv\Scripts\activate
     ```

4. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

5. **Configure environment variables**
   
   Create a `.env` file in the Backend directory:
   ```env
   WHATSAPP_ACCESS_TOKEN=your_access_token
   WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
   WHATSAPP_WABA_ID=your_waba_id
   WHATSAPP_API_VERSION=v20.0
   VERIFY_TOKEN=your_verify_token
   FRONTEND_ORIGIN=http://localhost:3000
   META_BUSINESS_ID=your_business_id
   MONGODB_URI=mongodb://localhost:27017
   MONGODB_DB_NAME=swalay
   JWT_SECRET_KEY=your_secret_key_here
   JWT_ALGORITHM=HS256
   JWT_EXPIRES_IN_MINUTES=60
   COOKIE_SECURE=False
   COOKIE_SAMESITE=lax
   ```

6. **Run the backend server** ⚠️ **IMPORTANT**
   ```bash
   uvicorn main:socket_app --reload --host 0.0.0.0 --port 8000
   ```
   
   **Note**: Use `main:socket_app` (NOT `main:app`) to enable WebSocket support!

### Frontend Setup

1. **Navigate to Frontend directory**
   ```bash
   cd Frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   
   Create a `.env.local` file in the Frontend directory:
   ```env
   NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Access the application**
   
   Open http://localhost:3000 in your browser

## 🏗️ Architecture Overview

### Backend (Python/FastAPI)

- **Socket.IO Server**: Manages WebSocket connections
- **MongoDB**: Stores messages (source of truth)
- **FastAPI REST APIs**: Initial data load only
- **WhatsApp Webhook**: Receives status updates
- **Event-Driven Flow**: All updates via WebSocket events

### Frontend (React/Next.js)

- **Socket.IO Client**: Maintains persistent WebSocket connection
- **React Hooks**: Manage WebSocket lifecycle
- **Real-Time UI**: Updates instantly on events
- **No Polling**: Zero API polling after initial load

## 📨 Message Flow

### Sending Messages

1. User types message → ChatBox component
2. Frontend calls POST `/send-message`
3. Backend saves to MongoDB with "sent" status
4. Backend sends to WhatsApp API
5. Backend emits `new_message` WebSocket event
6. Frontend receives event → Updates UI

### Status Updates

1. WhatsApp sends webhook with status (delivered/read)
2. Backend receives POST `/webhook`
3. Backend updates MongoDB
4. Backend emits `message_status_update` event
5. Frontend receives event → Updates status icon

### Receiving Messages

1. WhatsApp sends webhook with incoming message
2. Backend receives POST `/webhook`
3. Backend saves to MongoDB
4. Backend emits `new_message` event to users
5. Frontend receives event → Displays message

## 🎯 Key Features

✅ **Real-Time Updates**: Instant message delivery and status changes
✅ **Event-Driven**: No database or API polling
✅ **Status Icons**: 
   - ⏳ Sending (grey check)
   - ✓ Sent (single check)
   - ✓✓ Delivered (double check)
   - ✓✓ Read (blue double check)
   - ! Failed (red exclamation)
✅ **Auto-Reconnection**: WebSocket reconnects automatically
✅ **Database as Source of Truth**: All data persisted
✅ **User-Socket Mapping**: Targeted message delivery

## 📁 Key Files

### Backend
- [`main.py`](Backend/main.py) - FastAPI app with Socket.IO
- [`models.py`](Backend/models.py) - Message model with status
- [`requirements.txt`](Backend/requirements.txt) - Python dependencies

### Frontend
- [`socketService.ts`](Frontend/src/lib/socketService.ts) - WebSocket client
- [`useWebSocketMessages.ts`](Frontend/src/hooks/useWebSocketMessages.ts) - React hook
- [`ChatBox.tsx`](Frontend/src/components/ui/ChatBox.tsx) - Real-time chat UI
- [`messages.ts`](Frontend/src/api/messages.ts) - Message API

## 🧪 Testing

1. **Start both servers** (backend and frontend)
2. **Login** to the application
3. **Open a chat** with a contact
4. **Send a message**
5. **Watch the status change**:
   - Immediately shows "sending"
   - Changes to "sent" after API response
   - Changes to "delivered" when webhook arrives
   - Changes to "read" when recipient reads

## 🔍 Debugging

### Backend Logs
```bash
cd Backend
source .venv/bin/activate
uvicorn main:socket_app --reload --log-level debug
```

Look for:
- `🔌 Client connected: <socket_id>`
- `✅ Registered user <user_id> with socket <socket_id>`
- `📨 Emitted new_message to sender <user_id>`
- `✅ Emitted status update to user <user_id>: <status>`

### Frontend Console

Open browser DevTools and check for:
- `🔌 Socket connected: <socket_id>`
- `✅ Registered with server: {userId: ...}`
- `📨 Received new message: {...}`
- `✅ Received status update: {...}`

## 🐛 Common Issues

### Backend won't start with WebSocket
**Problem**: Running `uvicorn main:app` instead of `main:socket_app`
**Solution**: Use `uvicorn main:socket_app --reload`

### WebSocket not connecting
**Problem**: CORS or wrong URL
**Solution**: Check `FRONTEND_ORIGIN` in backend `.env` and `NEXT_PUBLIC_BACKEND_URL` in frontend

### Status updates not working
**Problem**: WhatsApp webhook not configured
**Solution**: Configure webhook in Meta Developer Console to point to your backend URL

### Messages not persisting
**Problem**: MongoDB not running or wrong connection string
**Solution**: Check `MONGODB_URI` in backend `.env`

## 📚 Documentation

- [WEBSOCKET_IMPLEMENTATION.md](WEBSOCKET_IMPLEMENTATION.md) - Detailed implementation guide
- [Backend API Docs](http://localhost:8000/docs) - FastAPI Swagger UI (when running)

## 🚫 What NOT to Do

❌ Don't use `main:app` - use `main:socket_app`
❌ Don't poll the database from WebSocket handlers
❌ Don't poll APIs from frontend after initial load
❌ Don't create sub-shells in webhook handlers
❌ Don't ignore WebSocket connection status

## 📞 Support

For issues or questions, check:
1. Backend logs
2. Frontend console
3. MongoDB connection
4. WhatsApp webhook configuration

## 📄 License

[Your License Here]
