#!/bin/bash

# Generate self-signed SSL certificate for local development
# Replace 'jd' with your initials

echo "Generating self-signed SSL certificate..."

# Create SSL directory if it doesn't exist
mkdir -p nginx/ssl

# Generate private key and certificate
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout nginx/ssl/key.pem \
    -out nginx/ssl/cert.pem \
    -subj "/C=BE/ST=Brussels/L=Brussels/O=JD-InfraProject/OU=Development/CN=localhost"

# Set appropriate permissions
chmod 644 nginx/ssl/cert.pem
chmod 600 nginx/ssl/key.pem

echo "SSL certificate generated successfully!"
echo "Certificate location: nginx/ssl/cert.pem"
echo "Private key location: nginx/ssl/key.pem"