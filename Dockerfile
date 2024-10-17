# Stage 1: Python environment setup
FROM python:3.10 AS python-base

WORKDIR /app

COPY ./main.py /app
COPY ./requirements.txt /app
COPY ./getPrice/ /app/getPrice
COPY ./getLiquidityFromMint/ /app/getLiquidityFromMint
COPY ./logs /app/logs

# Install Python dependencies and verify installation
RUN pip install -r requirements.txt && \
    pip freeze && \
    rm -rf /root/.cache/pip

# Stage 2: Node.js environment setup
FROM node:20 AS node-base

WORKDIR /app

# Copy the application files
COPY --from=python-base /app /app

# Install npm dependencies for getPrice and getLiquidityFromMint
WORKDIR /app/getPrice
RUN npm install --legacy-peer-deps

WORKDIR /app/getLiquidityFromMint
RUN npm install --legacy-peer-deps

# Stage 3: Final stage combining both environments
FROM python:3.10

WORKDIR /app

# Copy everything from the previous stages
COPY --from=python-base /app /app
COPY --from=node-base /app/getPrice /app/getPrice
COPY --from=node-base /app/getLiquidityFromMint /app/getLiquidityFromMint

# Expose the port
EXPOSE 6789

# Run the main Python script
CMD ["python", "main.py"]

