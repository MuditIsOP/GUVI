#!/bin/bash

# Agentic Honey-Pot API Test Script
# Usage: bash tests/test_api.sh

API_URL="${API_URL:-http://localhost:3000}"
API_KEY="${API_KEY:-your-secure-api-key-change-this}"

echo "🧪 Testing Agentic Honey-Pot API..."
echo "📍 API URL: $API_URL"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
PASSED=0
FAILED=0

# Test 1: Health Check
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 Test 1: Health Check"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
RESPONSE=$(curl -s "$API_URL/health")
if echo "$RESPONSE" | grep -q '"status":"healthy"'; then
    echo -e "${GREEN}✅ PASSED${NC}"
    ((PASSED++))
else
    echo -e "${RED}❌ FAILED${NC}"
    ((FAILED++))
fi
echo "Response: $RESPONSE"
echo ""

# Test 2: Root Endpoint
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 Test 2: Root Endpoint"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
RESPONSE=$(curl -s "$API_URL/")
if echo "$RESPONSE" | grep -q '"service":"Agentic Honey-Pot API"'; then
    echo -e "${GREEN}✅ PASSED${NC}"
    ((PASSED++))
else
    echo -e "${RED}❌ FAILED${NC}"
    ((FAILED++))
fi
echo "Response: $RESPONSE"
echo ""

# Test 3: Unauthorized Request (No API Key)
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 Test 3: Unauthorized Request (No API Key)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
RESPONSE=$(curl -s -X POST "$API_URL/api/message" \
    -H "Content-Type: application/json" \
    -d '{"conversation_id":"test","message":"test","timestamp":"2024-01-01T00:00:00Z"}')
if echo "$RESPONSE" | grep -q '"error":"Unauthorized"'; then
    echo -e "${GREEN}✅ PASSED${NC}"
    ((PASSED++))
else
    echo -e "${RED}❌ FAILED${NC}"
    ((FAILED++))
fi
echo "Response: $RESPONSE"
echo ""

# Test 4: Invalid Request (Missing Fields)
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 Test 4: Validation Error (Missing Fields)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
RESPONSE=$(curl -s -X POST "$API_URL/api/message" \
    -H "Content-Type: application/json" \
    -H "x-api-key: $API_KEY" \
    -d '{}')
if echo "$RESPONSE" | grep -q '"error":"Validation Error"'; then
    echo -e "${GREEN}✅ PASSED${NC}"
    ((PASSED++))
else
    echo -e "${RED}❌ FAILED${NC}"
    ((FAILED++))
fi
echo "Response: $RESPONSE"
echo ""

# Test 5: Scam Message Processing
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 Test 5: Scam Message Processing (Lottery Scam)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
RESPONSE=$(curl -s -X POST "$API_URL/api/message" \
    -H "Content-Type: application/json" \
    -H "x-api-key: $API_KEY" \
    -d "{
        \"conversation_id\": \"test_lottery_001\",
        \"message\": \"Congratulations! You have won \$1,000,000 in the International Lottery! To claim your prize, please send your bank account details to claim@winning.com immediately.\",
        \"timestamp\": \"$TIMESTAMP\"
    }")
if echo "$RESPONSE" | grep -q '"scam_detected"'; then
    echo -e "${GREEN}✅ PASSED${NC}"
    ((PASSED++))
else
    echo -e "${RED}❌ FAILED${NC}"
    ((FAILED++))
fi
echo "Response:"
echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"
echo ""

# Test 6: Follow-up Message with Intelligence
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 Test 6: Follow-up Message (UPI & Phone Extraction)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
RESPONSE=$(curl -s -X POST "$API_URL/api/message" \
    -H "Content-Type: application/json" \
    -H "x-api-key: $API_KEY" \
    -d "{
        \"conversation_id\": \"test_lottery_001\",
        \"message\": \"Yes! To complete verification, transfer processing fee of Rs 5000 to my UPI: scammer@paytm. Contact me on WhatsApp: +91-9876543210 for faster processing!\",
        \"timestamp\": \"$TIMESTAMP\"
    }")
if echo "$RESPONSE" | grep -q '"upi_ids"'; then
    echo -e "${GREEN}✅ PASSED${NC}"
    ((PASSED++))
else
    echo -e "${RED}❌ FAILED${NC}"
    ((FAILED++))
fi
echo "Response:"
echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"
echo ""

# Test 7: Get Conversation Status
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 Test 7: Get Conversation Status"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
RESPONSE=$(curl -s "$API_URL/api/conversation/test_lottery_001" \
    -H "x-api-key: $API_KEY")
if echo "$RESPONSE" | grep -q '"conversation_id"'; then
    echo -e "${GREEN}✅ PASSED${NC}"
    ((PASSED++))
else
    echo -e "${RED}❌ FAILED${NC}"
    ((FAILED++))
fi
echo "Response:"
echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"
echo ""

# Test 8: Get Stats
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 Test 8: Get System Stats"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
RESPONSE=$(curl -s "$API_URL/api/stats" \
    -H "x-api-key: $API_KEY")
if echo "$RESPONSE" | grep -q '"active_conversations"'; then
    echo -e "${GREEN}✅ PASSED${NC}"
    ((PASSED++))
else
    echo -e "${RED}❌ FAILED${NC}"
    ((FAILED++))
fi
echo "Response:"
echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"
echo ""

# Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Test Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo "Total: $((PASSED + FAILED))"

if [ $FAILED -eq 0 ]; then
    echo ""
    echo -e "${GREEN}🎉 All tests passed!${NC}"
    exit 0
else
    echo ""
    echo -e "${YELLOW}⚠️  Some tests failed. Check the output above.${NC}"
    exit 1
fi
