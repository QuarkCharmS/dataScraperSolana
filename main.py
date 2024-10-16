from time import sleep
from pathlib import Path
from websocket_server import WebsocketServer
import signal
import asyncio
import json
import os
import aiofiles
from asyncio import sleep


clients = []

def new_client(client, server):
    """

    Websocket function that handles whenever new clients join the session.
    Called for every client with which a handshake is performed.
    """
    print(f"New client connected and was given id {client['id']}")
    clients.append(client)
    server.send_message_to_all(msg='Start.')
    #server.send_message_to_all("Hey all, a new client has joined us")

def client_left(client, server):
    """

    Function called for every client disconnecting from the session.
    """
    print(f"Client({client['id']}) disconnected")

async def process_price(price):
    """

    :param price: full price http response from http request
    :return: price in float
    """
    #price = price.stdout
    print(f'price : {price}')

    try:
        price = float(price.split('\n')[1].split(' ')[1])
        return price
    except:
        print("Couldn't process price")
        return -1.0


def exit_gracefully(something, something2):
    server.send_message_to_all(msg='Stop Completely.')
    exit(0)

def new_message(client, server, token):
    asyncio.run(process_token(token))

async def get_tokens_in_LP(data_LP):
    try:
        # Search for the "lpReserve" key in the string
        marker = 'lpReserve:'
        start_index = data_LP.find(marker)

        if start_index == -1:
            # Return None if "lpReserve" is not found
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
        # Handle any conversion errors
        print(f"An error occurred: {e}")
        return None


async def calculate_total_value(token, curr_price):
    proc = await asyncio.create_subprocess_shell(
        f"node get-pools-by-token.js {token}",
        cwd='./getLiquidityFromMint',
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE
    )
    stdout, stderr = await proc.communicate()
    dataLP = stdout.decode('utf-8')
    tokens_in_LP = await get_tokens_in_LP(dataLP)

    print('tokensLP curr_price')
    print(tokens_in_LP, curr_price)

    try:
        return tokens_in_LP * curr_price
    except ValueError as e:
        print(f"An error ocurred: {e}")
        return None

async def process_token(token, time_to_wait_in_seconds=60, counter=0, max_retries=3):
    print(f'{token} fetched! Processing price!')

    if token == 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v':
        print('Function receives correctly')
        return

    dictionary_prices={}
    dictionary_token={}

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
        #// Tries to process the initial price
        initial_price = await process_price(initial_price)
        dictionary_token['initial_price_LP'] = await calculate_total_value(token, initial_price)
        await sleep(3)
        if initial_price == -1.0:
            raise ValueError

    except ValueError:  #// In case that ValueError is received, it means that the price is still not the defined
        #// as the expected answer if the price is not defined should be 'Unable to fetch price.'
        print(f"Price or LP quantity for {token} not available yet... Trying again...")
        await sleep(3)
        #// Waits 5 seconds before trying to fetch price again.
        if counter == max_retries:
            #// If the maximum number of retries is reached, it stops trying and returns.
            print("Max retries reached.")
            return
        await process_token(token, time_to_wait_in_seconds=time_to_wait_in_seconds, counter=counter + 1,
                      max_retries=max_retries)
        return
    except RuntimeError:
        return

    dictionary_prices[0.0] = initial_price

    price = 0.0
    while True:

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

        if time_passed >= time_to_wait_in_seconds:
            break

    dictionary_token['final_price'] = await calculate_total_value(token, price)
    dictionary_token['prices'] = dictionary_prices

    print(json.dumps(dictionary_token, indent=2))

    await async_append_to_json_file('./logs/data.json', dictionary_token)

async def async_append_to_json_file(file_path, new_data, retries=5, backoff_factor=1.0):
    attempt = 0
    while attempt < retries:
        try:
            # Check if the file exists and has content; if not, initialize with an empty list
            if not os.path.exists(file_path) or os.path.getsize(file_path) == 0:
                async with aiofiles.open(file_path, 'w') as file:
                    await file.write(json.dumps([]))  # Initialize file with an empty list

            # Read the existing data from the file
            async with aiofiles.open(file_path, 'r') as file:
                try:
                    content = await file.read()
                    data = json.loads(content) if content else []
                except json.JSONDecodeError:
                    print("Couldn't append to file, creating a new one")
                    data = []  # In case the file content is corrupt or improperly formatted

            # Append new data to the existing list
            data.append(new_data)

            # Write the updated data back to the file
            async with aiofiles.open(file_path, 'w') as file:
                await file.write(json.dumps(data, indent=4))  # Pretty print for better readability

            break  # Break the loop on success
        except OSError as e:
            attempt += 1
            if attempt < retries:
                wait_time = backoff_factor * (2 ** attempt)
                print(f"Attempt {attempt}: Unable to access file, retrying in {wait_time} seconds...")
                await sleep(wait_time)
            else:
                print("Maximum retries reached. Failed to write to file.")
                raise e


signal.signal(signal.SIGINT, exit_gracefully)

asyncio.run(process_token('7Gspm8KMkF7GauN4EWVgvMoAZ4zNSTU29AC96rUjpump'))


file_path = Path('./logs/data.json')

if not file_path.exists():
    file_path.touch()
    with open('./logs/data.json', 'w') as file:
        file.write('[]')


PORT = 6789
HOST = ""
server = WebsocketServer(HOST, PORT)
server.set_fn_new_client(new_client)
server.set_fn_client_left(client_left)
server.set_fn_message_received(new_message)
server.run_forever()
