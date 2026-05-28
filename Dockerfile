FROM node:20-alpine
RUN apk add --no-cache openssl

WORKDIR /app
EXPOSE 3000

# Install all dependencies (incl. dev) so the production build can run.
COPY package.json package-lock.json ./
RUN npm ci && npm cache clean --force

COPY . .

# Generate the Prisma client and build the React Router server bundle.
RUN npx prisma generate && npm run build

# Runtime: apply migrations then start the server (see "docker-start").
ENV NODE_ENV=production
CMD ["npm", "run", "docker-start"]
