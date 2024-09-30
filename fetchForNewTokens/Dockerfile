# Use a base image
# FROM <base_image>

# Set working directory
# WORKDIR /path/to/your/app

# Copy local files to the container
# COPY . /path/to/your/app

# Install dependencies (if needed)
# RUN <install_command>

# Expose the application port (if needed)
# EXPOSE <port_number>

# Define environment variables (if needed)
# ENV <key>=<value>

# Run your application
# CMD ["executable", "arg1", "arg2"]

# Or for an entrypoint
# ENTRYPOINT ["executable", "arg1", "arg2"]

FROM node:20-alpine

WORKDIR /app

COPY . /app

RUN npm install typescript --save-dev \
    npm install \
    npm cache clean --force

EXPOSE 6789

CMD ["npx", "tsx", "fetchForTokens.ts"]
