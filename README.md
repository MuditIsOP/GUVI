# Agentic Honey-Pot API

AI-powered scam detection and engagement system for the GUVI HCL Hackathon.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env and add your GEMINI_API_KEY

# Start development server
npm run dev
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `GEMINI_API_KEY` | Google Gemini API key | ✅ |
| `API_KEY` | API authentication key | ✅ |
| `PORT` | Server port (default: 3000) | |

## 📡 API Endpoint

### POST /api/message
```bash
curl -X POST https://your-domain.com/api/message \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "conversation_id": "unique-id",
    "message": "scammer message",
    "timestamp": "2024-01-01T00:00:00Z"
  }'
```

**Response:**
```json
{
  "scam_detected": true,
  "confidence_score": 0.95,
  "agent_response": "Oh really? Tell me more...",
  "engagement_metrics": {
    "turn_number": 1,
    "engagement_duration_seconds": 5,
    "conversation_state": "active"
  },
  "extracted_intelligence": {
    "bank_accounts": [],
    "upi_ids": ["scammer@paytm"],
    "phone_numbers": ["+919876543210"],
    "phishing_urls": [],
    "email_addresses": []
  }
}
```

## 🚢 Deploy to Railway

1. Push to GitHub
2. Create new project on [railway.app](https://railway.app)
3. Add environment variables
4. Deploy

## 📊 Features

- ✅ AI scam detection (Gemini-powered)
- ✅ Indian scam patterns (KYC, UPI, job, loan)
- ✅ Autonomous engagement with human-like responses
- ✅ Intelligence extraction (UPI, bank, phone, URL, email)
- ✅ Multi-turn conversation support
- ✅ Rate limiting & retry logic
