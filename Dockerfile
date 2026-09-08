FROM node:24-alpine AS development-dependencies-env
COPY . /app
WORKDIR /app
RUN npm install -g bun && bun install --frozen-lockfile

FROM node:24-alpine AS production-dependencies-env
COPY ./package.json bun.lock /app/
WORKDIR /app
RUN npm install -g bun && bun install --frozen-lockfile --production

FROM node:24-alpine AS build-env
COPY . /app/
COPY --from=development-dependencies-env /app/node_modules /app/node_modules
WORKDIR /app
RUN npm run build

FROM node:24-alpine
COPY ./package.json bun.lock /app/
COPY --from=production-dependencies-env /app/node_modules /app/node_modules
COPY --from=build-env /app/build /app/build
WORKDIR /app
CMD ["npm", "run", "start"]
