# Kokoro TTS Voice Assistant - Setup Guide

A voice-enabled AI assistant system built with n8n workflows, featuring speech-to-text transcription (Whisper), AI conversation (Google Gemini), text-to-speech synthesis (Kokoro TTS), and vector embeddings storage.

## Features

- **Voice Input**: Automatic speech recognition using OpenAI Whisper
- **AI Conversations**: Powered by Google Gemini 2.5 Pro with persistent memory
- **Voice Response**: High-quality text-to-speech using Kokoro TTS
- **Vector Storage**: Conversation embeddings stored in PostgreSQL
- **Session Management**: User-specific conversation tracking
- **Real-time Processing**: Webhook-based real-time voice interactions

## Architecture Overview

```
[Voice Input] → [n8n Webhook] → [Whisper STT] → [AI Agent] → [Kokoro TTS] → [Voice Response]
                                                     ↓
                                              [Vector Storage]
```

## Prerequisites

- Docker Desktop installed and running
- Google Cloud API key for Gemini
- Supabase account for PostgreSQL database
- Node.js (v16 or higher) for the UI

## Docker Setup

### 1. Create Docker Network

Open Docker Desktop terminal and create a custom Docker network:

```bash
docker network create kokoro-network
```

### 2. Install n8n

```bash
docker run -d --name n8n --network kokoro-network -p 5678:5678 -e N8N_BASIC_AUTH_ACTIVE=true -e N8N_BASIC_AUTH_USER=admin -e N8N_BASIC_AUTH_PASSWORD=your_secure_password -e WEBHOOK_URL=http://localhost:5678 -v n8n_data:/home/node/.n8n n8nio/n8n:latest
```

Access n8n at: `http://localhost:5678`

### 3. Install Whisper API

```bash
docker run -d --name whisper-api --network kokoro-network -p 9000:9000 onerahmet/openai-whisper-asr-webservice:latest
```

### 4. Install Kokoro TTS

```bash
docker pull ghcr.io/remsky/kokoro-fastapi-cpu:latest
docker run -d --name kokoro-tts --network kokoro-network -p 8880:8880 ghcr.io/remsky/kokoro-fastapi-cpu:latest
```

### 5. Verify All Containers

Check all containers are running and in the same network:

```bash
# Check running containers
docker ps

# Verify network
docker network inspect kokoro-network
```

You should see all three containers: `n8n`, `whisper-api`, and `kokoro-tts`.

## Supabase Database Schema

Execute the following SQL in your Supabase SQL editor:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
-- Create conversation_vectors table for storing embeddings
CREATE TABLE conversation_vectors (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(255) NOT NULL,
    user_email VARCHAR(255),
    user_name VARCHAR(255),
    user_input TEXT NOT NULL,
    ai_response TEXT NOT NULL,
    conversation_context TEXT NOT NULL,
    embedding vector(768),
    embedding_model VARCHAR(100) DEFAULT 'text-embedding-004',
    embedding_dimensions INTEGER DEFAULT 768,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## n8n Workflow Configuration

### 1. Import Workflow

1. Open n8n at `http://localhost:5678`
2. Create a new workflow
3. Import the provided JSON workflow file

### 2. Configure Credentials

#### Google Gemini API
- Go to Settings > Credentials
- Add "Google PaLM API" credential
- Enter your Google API key

#### PostgreSQL Database
- Add "Postgres" credential
- Enter your Supabase database details:
  - Host: `your-supabase-host`
  - Database: `postgres`
  - User: `postgres`
  - Password: `your-supabase-password`
  - Port: `5432`
  - SSL: Enable

### 3. Update Service URLs

In the workflow nodes, update the service URLs to use container names:
- Whisper API: `http://whisper-api:9000/asr`
- Kokoro TTS: `http://kokoro-tts:8880/v1/audio/speech`

### 4. Activate Workflow

Save and activate the workflow to enable the webhook endpoint.

## Running the System

### 1. Start All Docker Containers

In Docker Desktop terminal:

```bash
# Start containers (if not already running)
docker start whisper-api
docker start kokoro-tts  
docker start n8n

# Verify all containers are running
docker ps
```

### 2. Start the UI Application

Navigate to your UI project directory and run:

```bash
npm install
npm run dev
```

### 3. Check Container Logs

```bash
# Check n8n logs
docker logs n8n

# Check Whisper logs  
docker logs whisper-api

# Check Kokoro TTS logs
docker logs kokoro-tts
```

### 4. Test the System

Test individual services:

```bash
# Test Whisper (should return health status)
curl http://localhost:5005/health

# Test n8n (should return HTML page)
curl http://localhost:5678

# Access n8n web interface
# Open browser: http://localhost:5678
```

## Troubleshooting

### Common Issues

1. **Container Communication Issues**
   - Ensure all containers are in the same network
   - Use container names instead of localhost in service URLs

2. **Database Connection Issues**
   - Verify Supabase credentials
   - Check if database schema is properly created
   - Ensure SSL is enabled for Supabase connections

3. **Audio Processing Issues**
   - Check if Whisper model is loaded correctly
   - Test audio file formats (WAV recommended)

4. **TTS Issues**
   - Verify Kokoro TTS container is running
   - Check if the voice model is properly loaded

### Debug Commands

```bash
# Check container network
docker network inspect kokoro-network

# Check container logs in real-time
docker logs -f whisper-api
docker logs -f kokoro-tts
docker logs -f n8n

# Test individual services
curl http://localhost:5005/health  # Whisper health check
curl http://localhost:5678         # n8n web interface

# Restart containers if needed
docker restart whisper-api
docker restart kokoro-tts
docker restart n8n
```

## API Documentation

### Webhook Endpoint

**URL**: `POST /webhook/voice-chat`

**Headers**:
- `Content-Type: multipart/form-data`
- `x-user-email: user@example.com`
- `x-user-name: John Doe`

**Body**:
- `audio`: Audio file (WAV format recommended)
- `userEmail`: User's email address
- `userName`: User's display name

**Response**: Audio file (WAV format)

## Production Deployment

For production deployment, use the same Docker commands but with environment-specific configurations:

```bash
# Create production network
docker network create kokoro-production

# Deploy n8n with production settings
docker run -d \
  --name n8n-prod \
  --network kokoro-production \
  -p 5678:5678 \
  -e N8N_BASIC_AUTH_ACTIVE=true \
  -e N8N_BASIC_AUTH_USER=admin \
  -e N8N_BASIC_AUTH_PASSWORD=your_strong_password \
  -e WEBHOOK_URL=https://yourdomain.com \
  -v n8n_prod_data:/home/node/.n8n \
  n8nio/n8n:latest

# Deploy other containers similarly with production network
```

## Security Considerations

1. **API Keys**: Store all API keys securely using environment variables
2. **Authentication**: Implement proper user authentication
3. **Rate Limiting**: Add rate limiting to prevent abuse
4. **Data Privacy**: Ensure audio data is handled securely
5. **Network Security**: Use HTTPS in production

## Support

For issues and questions:
1. Check the troubleshooting section
2. Review container logs
3. Verify database connectivity
4. Test individual components

