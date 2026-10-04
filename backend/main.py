import os
import time
from pathlib import Path
from dotenv import load_dotenv
load_dotenv(Path(__file__).with_name('.env'))
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, field_validator
from .catalog import CATALOG
from .engine import classify

app = FastAPI(title='Jev POC', version='1.0.0')
app.add_middleware(CORSMiddleware, allow_origins=['http://localhost:5173','http://127.0.0.1:5173'], allow_methods=['GET','POST'], allow_headers=['Content-Type'])

class Query(BaseModel):
    prompt: str = Field(min_length=1, max_length=2000)
    @field_validator('prompt')
    @classmethod
    def clean(cls, value):
        if not value.strip():
            raise ValueError('Describe what you want to build.')
        return value.strip()

class Match(BaseModel):
    id: str
    confidence: float = Field(ge=0, le=1)

class Result(BaseModel):
    matches: list[Match]
    engine: str
    latency_ms: int
    cost_usd: float | None
    cost_estimated: bool
    reason: str | None = None
    input_tokens: int | None = None
    output_tokens: int | None = None

@app.get('/api/health')
async def health():
    return {'status':'ok','catalog_size':len(CATALOG)}

@app.get('/api/catalog')
async def catalog():
    return CATALOG

@app.post('/api/classify', response_model=Result)
async def recommend(query: Query):
    started = time.perf_counter()
    matches, engine, cost, estimated, reason, usage = await classify(query.prompt)
    return Result(matches=matches, engine=engine, latency_ms=round((time.perf_counter()-started)*1000), cost_usd=cost, cost_estimated=estimated, reason=reason, **usage)

if __name__ == '__main__':
    import uvicorn
    uvicorn.run('backend.main:app', host=os.getenv('HOST','0.0.0.0'), port=int(os.getenv('PORT','8000')))
