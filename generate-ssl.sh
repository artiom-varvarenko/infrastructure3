#!/bin/bash

# Alternative approach using Docker Certbot
# For domain: infra3.artiom-varvarenko.com

DOMAIN="infra3.artiom-varvarenko.com"
EMAIL="your-email@example.com"  # Change this to your email

echo "================================================"
echo "Let's Encrypt SSL Certificate Setup (Docker)"
echo "Domain: $DOMAIN"
echo "================================================"

# Create directories for certbot
mkdir -p certbot/conf certbot/www

# Create a temporary nginx config for certificate generation
echo "Creating temporary nginx configuration..."
cat > nginx/nginx-temp.conf << 'EOF'
events {
    worker_connections 1024;
}

http {
    server {
        listen 80;
        server_name infra3.artiom-varvarenko.com;

        location /.well-known/acme-challenge/ {
            root /var/www/certbot;
        }

        location / {
            return 301 https://$host$request_uri;
        }
    }
}
EOF

# Update docker-compose.yml to include certbot service
cat > docker-compose-certbot.yml << 'EOF'
services:
  # Reverse Proxy with SSL
  jd-nginx:
    build: ./nginx
    container_name: jd-reverse-proxy
    ports:
      - "443:443"
      - "80:80"
    volumes:
      - ./certbot/conf:/etc/letsencrypt:ro
      - ./certbot/www:/var/www/certbot:ro
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
    networks:
      - jd-frontend-network
      - jd-backend-network
    depends_on:
      - jd-backend
      - jd-frontend
    environment:
      - NGINX_HOST=${NGINX_HOST:-localhost}
    command: "/bin/sh -c 'while :; do sleep 6h & wait $${!}; nginx -s reload; done & nginx -g \"daemon off;\"'"

  # Certbot service
  certbot:
    image: certbot/certbot
    container_name: jd-certbot
    volumes:
      - ./certbot/conf:/etc/letsencrypt
      - ./certbot/www:/var/www/certbot
    entrypoint: "/bin/sh -c 'trap exit TERM; while :; do certbot renew; sleep 12h & wait $${!}; done;'"

  # Frontend Application
  jd-frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
      args:
        - NODE_ENV=${NODE_ENV:-production}
    container_name: jd-frontend-app
    networks:
      - jd-frontend-network
    environment:
      - REACT_APP_API_URL=${API_URL:-https://localhost/api}
    volumes:
      - jd-frontend-static:/app/build

  # Backend API
  jd-backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
      target: production
    container_name: jd-backend-api
    networks:
      - jd-backend-network
      - jd-database-network
    environment:
      - NODE_ENV=${NODE_ENV:-production}
      - DB_HOST=jd-postgres
      - DB_PORT=5432
      - DB_NAME=${DB_NAME:-taskdb}
      - DB_USER=${DB_USER:-taskuser}
      - DB_PASSWORD=${DB_PASSWORD:-taskpass}
      - JWT_SECRET=${JWT_SECRET:-your-secret-key}
    depends_on:
      - jd-postgres
    volumes:
      - jd-backend-logs:/app/logs

  # PostgreSQL Database
  jd-postgres:
    image: postgres:15-alpine
    container_name: jd-database
    networks:
      - jd-database-network
    environment:
      - POSTGRES_DB=${DB_NAME:-taskdb}
      - POSTGRES_USER=${DB_USER:-taskuser}
      - POSTGRES_PASSWORD=${DB_PASSWORD:-taskpass}
    volumes:
      - jd-postgres-data:/var/lib/postgresql/data
      - ./database/init.sql:/docker-entrypoint-initdb.d/init.sql:ro

networks:
  jd-frontend-network:
    name: jd-frontend-net
    driver: bridge
  jd-backend-network:
    name: jd-backend-net
    driver: bridge
  jd-database-network:
    name: jd-database-net
    driver: bridge

volumes:
  jd-postgres-data:
    name: jd-postgres-volume
  jd-frontend-static:
    name: jd-frontend-volume
  jd-backend-logs:
    name: jd-backend-logs-volume
EOF

# First, use temporary nginx config
echo "Starting with temporary nginx configuration..."
cp nginx/nginx.conf nginx/nginx.conf.backup
cp nginx/nginx-temp.conf nginx/nginx.conf

# Start services
docker compose -f docker-compose-certbot.yml up -d

# Wait for nginx to start
echo "Waiting for nginx to start..."
sleep 5

# Get the certificate
echo "Obtaining SSL certificate..."
docker compose -f docker-compose-certbot.yml run --rm certbot certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    --email $EMAIL \
    --agree-tos \
    --no-eff-email \
    --force-renewal \
    -d $DOMAIN

# Check if successful
if [ $? -eq 0 ]; then
    echo "✅ Certificate obtained successfully!"

    # Update nginx config for SSL
    cat > nginx/nginx.conf << 'EOF'
events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    # SSL Configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Logging
    access_log /var/log/nginx/access.log;
    error_log /var/log/nginx/error.log;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;

    # Redirect HTTP to HTTPS
    server {
        listen 80;
        server_name infra3.artiom-varvarenko.com;

        location /.well-known/acme-challenge/ {
            root /var/www/certbot;
        }

        location / {
            return 301 https://$host$request_uri;
        }
    }

    # HTTPS Server
    server {
        listen 443 ssl http2;
        server_name infra3.artiom-varvarenko.com;

        # SSL Certificate (Let's Encrypt)
        ssl_certificate /etc/letsencrypt/live/infra3.artiom-varvarenko.com/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/infra3.artiom-varvarenko.com/privkey.pem;

        # Security headers
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

        # Path-based routing to backend API
        location /api {
            proxy_pass http://jd-backend:3000;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
        }

        # Path-based routing to frontend
        location / {
            proxy_pass http://jd-frontend:80;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
        }

        # Health check endpoint
        location /health {
            access_log off;
            return 200 "Healthy\n";
            add_header Content-Type text/plain;
        }
    }
}
EOF

    # Reload nginx
    docker compose -f docker-compose-certbot.yml exec jd-nginx nginx -s reload

    # Copy the new docker-compose file
    cp docker-compose-certbot.yml docker-compose.yml

    echo ""
    echo "================================================"
    echo "✅ SSL Setup Complete!"
    echo "================================================"
    echo "Your application is now available at:"
    echo "https://$DOMAIN"
    echo ""
    echo "Certificate will auto-renew via certbot container"
    echo "================================================"
else
    echo "❌ Failed to obtain certificate!"
    echo "Restoring original configuration..."
    cp nginx/nginx.conf.backup nginx/nginx.conf
    docker compose down
    exit 1
fi