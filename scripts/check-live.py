import asyncio
import json
from dotenv import load_dotenv
load_dotenv('backend/.env')
from backend.engine import classify
async def main():
    matches, engine, cost, estimated, reason = await classify('Cross-platform iOS & Mac app')
    print(json.dumps({'engine':engine,'matches':matches,'cost_usd':cost,'cost_estimated':estimated,'reason':reason}))
asyncio.run(main())
