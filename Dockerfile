FROM python:3.10

WORKDIR /app

COPY ./main.py /app
COPY ./requirements.txt /app
COPY ./getPrice/ /app/getPrice
COPY ./getLiquidityFromMint/ /app/getLiquidityFromMint
COPY ./logs /app/logs

EXPOSE 6789

RUN pip install -r requirements.txt && \
    pip cache purge && \
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.0/install.sh | bash && \
    export NVM_DIR="$HOME/.nvm" && \
    [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" && \
    nvm install 20 && \
    nvm use 20 && \
    node -v && \
    npm -v && \
    npm cache clean --force && \
    rm -rf /root/.cache/pip && \
    rm -rf $NVM_DIR/.cache && \
    rm -rf /var/lib/apt/lists/*

# Install npm dependencies in getPrice
RUN cd getPrice && npm install --legacy-peer-deps

# Install npm dependencies in getLiquidityFromMint
RUN cd getLiquidityFromMint && npm install --legacy-peer-deps

CMD ["python", "main.py"]
