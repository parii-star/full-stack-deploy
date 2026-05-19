# Build + runtime image for Coolify (Express + Postgres + built Vite frontend)

FROM node:20-alpine AS build
WORKDIR /app

# Install deps (cached)
COPY web/package.json web/package-lock.json* web/
COPY backend/package.json backend/package-lock.json* backend/

RUN if [ -f web/package-lock.json ]; then npm --prefix web ci; else npm --prefix web install; fi
RUN if [ -f backend/package-lock.json ]; then npm --prefix backend ci; else npm --prefix backend install; fi

# Build frontend
COPY web/ web/
RUN npm --prefix web run build

# Build backend (TypeScript -> dist)
COPY backend/ backend/
RUN npm --prefix backend run build

# Runtime
FROM node:20-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app

# Backend runtime deps
COPY --from=build /app/backend/package.json /app/backend/package.json
COPY --from=build /app/backend/package-lock.json* /app/backend/
COPY --from=build /app/backend/node_modules /app/backend/node_modules
COPY --from=build /app/backend/dist /app/backend/dist

# Frontend built assets
COPY --from=build /app/web/dist /app/web/dist

WORKDIR /app/backend
ENV WEB_DIST_DIR=../web/dist
EXPOSE 8787

# Runs migrations (prestart) then starts server
CMD ["npm", "start"]
