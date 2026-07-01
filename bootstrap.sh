#!/bin/bash
set -e

echo "🚀 Launching CRM Platform Core System..."

# 1. Spin up base services
cd infra


docker-compose up -d
cd ..

echo "⏳ Simulating systems configuration cooldown delay..."
sleep 5

# 2. Package installation checklist loop
echo "📥 Validating dependencies updates across systems mesh..."
(cd services/identity-service && npm install)
(cd services/catalog-service && npm install)
(cd services/order-service && npm install)
(cd services/api-gateway && npm install)

# 3. Dynamic schema provisioning mapping
echo "🗄️ Executing SQL migration sync states..."
(cd services/order-service && npx prisma db push)

# 4. Multi-Service Run Execution Matrix
echo "🟢 Connecting services via internal process grid..."
npx concurrently \
  --prefix "[{name}]" --names "GATEWAY,IDENTITY,CATALOG,ORDER" \
  --prefix-colors "magenta.bold,yellow.bold,blue.bold,green.bold" \
  "cd services/api-gateway && node src/index.js" \
  "cd services/identity-service && node src/index.js" \
  "cd services/catalog-service && node src/index.js" \
  "cd services/order-service && node src/index.js"