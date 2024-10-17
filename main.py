import os
from time import sleep
from pathlib import Path
from websocket_server import WebsocketServer
import signal
import asyncio
import json
import aiofiles
from asyncio import sleep

clients = []

def debug_print(message):
    if os.getenv("DEBUG", "false").lower() == "true":
        print(message)

def new_client(client, server):
    """
    Websocket function that handles whenever new clients join the session.
    Called for every client with which a handshake is performed.
    """
    debug_print(f"New client connected with ID: {client['id']}")
    clients.append(client)
    server.send_message_to_all(msg='Start.')

def client_left(client, server):
    """
    Function called for every client disconnecting from the session.
    """
    debug_print(f"Client with ID: {client['id']} has disconnected")

async def process_price(price):
    """
    :param price: full price http response from http request
    :return: price in float
    """
    debug_print(f"Processing price response: {price}")

    try:
        price = float(price.split('\n')[1].split(' ')[1])
        return price
    except:
        debug_print("Failed to process price from response. Returning default value -1.0")
        return -1.0

def exit_gracefully(something, something2):
    debug_print("SIGINT received. Shutting down server gracefully.")
    server.send_message_to_all(msg='Stop Completely.')
    exit(0)

def new_message(client, server, token):
    debug_print(f"Received new message from client ID: {client['id']}, Token: {token}")
    asyncio.run(process_token(token))

async def get_tokens_in_LP(data_LP):
    try:
        # Search for the "lpReserve" key in the string
        marker = 'lpReserve:'
        start_index = data_LP.find(marker)

        if start_index == -1:
            debug_print("'lpReserve' key not found in the liquidity pool data.")
            return None

        # Adjust start_index to the start of the numeric value
        start_index += len(marker)

        # Find the end of the number, which should end at a comma or newline
        end_index = data_LP.find(',', start_index)
        if end_index == -1:  # In case it's the last item in the object
            end_index = data_LP.find('}', start_index)

        # Extract the number string and convert it to float
        lp_reserve_value_str = data_LP[start_index:end_index].strip()
        return float(lp_reserve_value_str)
    except ValueError as e:
        debug_print(f"Error occurred while parsing lpReserve value: {e}")
        return None

async def calculate_total_value(token, curr_price):
    debug_print(f"Calculating total value for token: {token} with current price: {curr_price}")
    proc = await asyncio.create_subprocess_shell(
        f"node get-pools-by-token.js {token}",
        cwd='./getLiquidityFromMint',
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE
    )
    stdout, stderr = await proc.communicate()
    dataLP = stdout.decode('utf-8')
    tokens_in_LP = await get_tokens_in_LP(dataLP)

    debug_print(f"Liquidity pool tokens: {tokens_in_LP}, Current price: {curr_price}")

    try:
        return tokens_in_LP * curr_price
    except ValueError as e:
        debug_print(f"Error occurred while calculating total value: {e}")
        return None

async def process_token(token, time_to_wait_in_seconds=60, counter=0, max_retries=3):
    debug_print(f"Processing token: {token}")

    if token == 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v':
        debug_print("Received the expected token. Exiting process.")
        return

    dictionary_prices = {}
    dictionary_token = {}

    dictionary_token['mint'] = token

    loop = asyncio.get_running_loop()

    proc = await asyncio.create_subprocess_shell(
        f"npx tsx fetchPrices.ts {token}",
        cwd="./getPrice",
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE
    )
    stdout, stderr = await proc.communicate()
    start_time = float(loop.time())

    initial_price = stdout.decode('utf-8')
    stderr = stderr.decode('utf-8')

    try:
        if proc.returncode != 0:
            raise RuntimeError
        # Tries to process the initial price
        initial_price = await process_price(initial_price)
        dictionary_token['initial_price_LP'] = await calculate_total_value(token, initial_price)
        await sleep(3)
        if initial_price == -1.0:
            raise ValueError

    except ValueError:
        debug_print(f"Unable to fetch price or liquidity pool quantity for token: {token}. Retrying...")
        await sleep(3)
        if counter == max_retries:
            debug_print("Max retries reached for token: {token}. Exiting process.")
            return
        await process_token(token, time_to_wait_in_seconds=time_to_wait_in_seconds, counter=counter + 1,
                      max_retries=max_retries)
        return
    except RuntimeError:
        debug_print(f"Runtime error occurred while processing token: {token}. Exiting process.")
        return

    dictionary_prices[0.0] = initial_price

    price = 0.0
    while True:
        debug_print(f"Fetching current price for token: {token}")

        proc = await asyncio.create_subprocess_shell(
            f"npx tsx fetchPrices.ts {token}",
            cwd="./getPrice",
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        stdout, stderr = await proc.communicate()

        price = stdout.decode('utf-8')
        stderr = stderr.decode('utf-8')

        price = await process_price(price)

        current_time = float(loop.time())
        time_passed = current_time - start_time
        dictionary_prices[time_passed] = price

        debug_print(f"Time passed: {time_passed}s, Current price: {price}")

        if time_passed >= time_to_wait_in_seconds:
            break

    dictionary_token['final_price'] = await calculate_total_value(token, price)
    dictionary_token['prices'] = dictionary_prices

    debug_print(f"Final token data for {token}: {json.dumps(dictionary_token, indent=2)}")

    await async_append_to_json_file('./logs/data.json', dictionary_token)

async def async_append_to_json_file(file_path, new_data, retries=5, backoff_factor=1.0):
    attempt = 0
    while attempt < retries:
        try:
            # Check if the file exists and has content; if not, initialize with an empty list
            if not os.path.exists(file_path) or os.path.getsize(file_path) == 0:
                debug_print(f"File {file_path} does not exist or is empty. Initializing with an empty list.")
                async with aiofiles.open(file_path, 'w') as file:
                    await file.write(json.dumps([]))  # Initialize file with an empty list

            # Read the existing data from the file
            async with aiofiles.open(file_path, 'r') as file:
                try:
                    content = await file.read()
                    data = json.loads(content) if content else []
                except json.JSONDecodeError:
                    debug_print(f"File {file_path} is corrupt or improperly formatted. Reinitializing.")
                    data = []  # In case the file content is corrupt or improperly formatted

            # Append new data to the existing list
            data.append(new_data)

            # Write the updated data back to the file
            async with aiofiles.open(file_path, 'w') as file:
                await file.write(json.dumps(data, indent=4))  # Pretty print for better readability

            debug_print(f"Successfully appended new data to {file_path}")
            break  # Break the loop on success
        except OSError as e:
            attempt += 1
            if attempt < retries:
                wait_time = backoff_factor * (2 ** attempt)
                debug_print(f"Attempt {attempt}: Unable to access {file_path}. Retrying in {wait_time} seconds...")
                await sleep(wait_time)
            else:
                debug_print(f"Maximum retries reached. Failed to write to {file_path}")
                raise e

signal.signal(signal.SIGINT, exit_gracefully)

debug_print("Starting token processing...")
asyncio.run(process_token('7Gspm8KMkF7GauN4EWVgvMoAZ4zNSTU29AC96rUjpump'))

file_path = Path('./logs/data.json')

if not file_path.exists():
    debug_print(f"Creating log file at {file_path}")
    file_path.touch()
    with open('./logs/data.json', 'w') as file:
        file.write('[]')

PORT = 6789
HOST = ""
debug_print(f"Starting WebSocket server on {HOST}:{PORT}")
server = WebsocketServer(HOST, PORT)
server.set_fn_new_client(new_client)
server.set_fn_client_left(client_left)
server.set_fn_message_received(new_message)
server.run_forever()

