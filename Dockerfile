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

FROM python:3.10

WORKDIR /app

COPY ./main.py /app
COPY ./requirements.txt /app
COPY ./getPrice/ /app/getPrice
COPY ./getLiquidityFromMint/ /app/getLiquidityFromMint
COPY ./logs /app/logs

EXPOSE 6789

RUN pip install -r requirements.txt \
    pip cache purge
RUN curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.0/install.sh | bash \
    && export NVM_DIR="$HOME/.nvm" \
    && [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" \
    && nvm install 20 \
    && nvm use 20 \
    && node -v \
    && npm -v

CMD ["python", "main.py"]
