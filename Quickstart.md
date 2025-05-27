# Quick Start Guide

## 🚀 Get Running in 3 Minutes

### 1. Initial Setup (One Time)
```bash
# Make scripts executable
chmod +x setup.sh generate-ssl.sh

# Run setup (generates SSL certs and builds containers)
./setup.sh
```

### 2. Start Application
```bash
# Using Docker Compose
docker compose up -d

# OR using Make
make up
```

### 3. Access Application
Open your browser and go to: https://localhost

**Note**: You'll get a security warning about the self-signed certificate. This is normal for local development. Click "Advanced" and "Proceed to localhost".

## 🧪 Test the Application

### Test Frontend
1. Open https://localhost
2. Create a new task
3. Mark task as complete
4. Delete a task

### Test API Directly
```bash
# Health check
curl -k https://localhost/api/health

# Get all tasks
curl -k https://localhost/api/tasks

# Create a task
curl -k -X POST https://localhost/api/tasks \
  -H "Content-Type: application/json" \
  -d '{"title":"Test Task","description":"Testing the API"}'
```

## 📋 Common Commands

```bash
# View logs
docker compose logs -f

# Stop everything
docker compose down

# Restart services
docker compose restart

# Clean everything (including data)
docker compose down -v
```

## 🔧 Troubleshooting

### "Port already in use"
```bash
# Find what's using port 443
sudo lsof -i :443

# Stop the application
docker compose down
```

### "Cannot connect to API"
```bash
# Check if all containers are running
docker compose ps

# Check backend logs
docker compose logs jd-backend
```

### "SSL Certificate Error"
```bash
# Regenerate certificates
./generate-ssl.sh

# Restart nginx
docker compose restart jd-nginx
```

## 📝 Important Notes

1. **Replace 'jd' with your initials** in all files
2. **Test everything before submission**
3. **Include all files in your zip** (except node_modules and SSL certs)
4. **DNS should point to 127.0.0.1** for local testing

## ✅ Submission Ready?

Run this final check:
```bash
# Clean build
docker compose down -v
docker compose build --no-cache
docker compose up -d

# If everything works, create your submission!
```