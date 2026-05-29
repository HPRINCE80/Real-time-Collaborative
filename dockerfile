FROM node:20-alpine AS frontend-build

WORKDIR /app

# Install frontend dependencies and build static assets
COPY Fronted/package*.json ./
RUN npm install
COPY Fronted ./
RUN npm run build

FROM node:20-alpine AS backend

WORKDIR /app

# Install backend dependencies
COPY Backend/package*.json ./
RUN npm install --production

# Copy backend source and frontend build output
COPY Backend ./
COPY --from=frontend-build /app/dist ./public

EXPOSE 3000
CMD ["node", "server.js"]