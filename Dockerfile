# Tahap 1: Build aplikasi React/Vite
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Salin file dependencies
COPY package*.json ./

# Install dependencies
RUN npm install

# Salin seluruh kode sumber
COPY . .

# Build aplikasi untuk production (hasilnya akan ada di folder /dist)
RUN npm run build

# Tahap 2: Menjalankan aplikasi dengan web server yang ringan
FROM node:18-alpine

WORKDIR /app

# Install 'serve', sebuah static web server berbasis Node.js yang ringan
RUN npm install -g serve

# Salin hasil build dari tahap 1
COPY --from=builder /app/dist ./dist

# Google Cloud Run akan memberikan port dinamis melalui environment variable $PORT
# Secara default Cloud Run menggunakan port 8080
ENV PORT=8080

# Jalankan server untuk menyajikan folder dist
# Parameter -s (single) memastikan routing SPA berjalan dengan baik (selalu mengarah ke index.html)
CMD ["sh", "-c", "serve -s dist -l ${PORT}"]
