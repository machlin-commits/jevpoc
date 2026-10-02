import asyncio
import json
import httpx
import pytest
from fastapi.testclient import TestClient
from . import engine
from .main import app

@pytest.fixture(autouse=True)
def no_real_key(monkeypatch):
    monkeypatch.setenv('JEV_API_KEY','')

@pytest.mark.parametrize('prompt,expected',[
    ('Enterprise multi-agent workflow on Microsoft stack', {'autogen','semantic-kernel','csharp','dotnet'}),
    ('Cross-platform iOS & Mac app', {'swift','swiftui','ios','macos','react-native'}),
    ('Real-time streaming media pipeline', {'ffmpeg','apache-kafka','redis'}),
    ('B2B SaaS with Next.js & Postgres', {'nextjs','postgresql','typescript'}),
])
def test_profiles(prompt,expected):
    assert expected <= {m['id'] for m in engine.heuristic(prompt)}

def test_unknown_and_word_boundaries():
    assert engine.heuristic('a garden journal') == []
    assert 'go' not in {m['id'] for m in engine.heuristic('MongoDB database')}

def test_api_validation_and_fallback():
    with TestClient(app) as client:
        assert client.get('/api/health').json()['catalog_size'] == 140
        assert client.post('/api/classify',json={'prompt':'  '}).status_code == 422
        assert client.post('/api/classify',json={'prompt':'x'*2001}).status_code == 422
        data=client.post('/api/classify',json={'prompt':'ios native app'}).json()
        assert data['engine'] == 'Keyword Heuristic Fallback'
        assert data['cost_usd'] == 0
        assert data['matches']

def test_one_consolidated_call_and_probabilities(monkeypatch):
    monkeypatch.setenv('JEV_API_KEY','test-key')
    calls=[]
    def handler(request):
        calls.append(request)
        payload=json.loads(request.content)
        assert len(payload['questions']) == 140
        assert payload['model'] == 'jev-latest'
        return httpx.Response(200,json={'answers':{t['id']:{'type':'noul','noul':.98 if t['id']=='swift' else .1} for t in engine.CATALOG},'usage':{'input_tokens':1000}})
    original=httpx.AsyncClient
    monkeypatch.setattr(engine.httpx,'AsyncClient',lambda **kwargs:original(transport=httpx.MockTransport(handler)))
    matches,name,cost,estimated,reason=asyncio.run(engine.classify('native app'))
    assert len(calls)==1 and matches==[{'id':'swift','confidence':.98}]
    assert name=='Jay API (System One)' and cost==.000042 and estimated and reason is None

@pytest.mark.parametrize('mode',['timeout','unauthorized','malformed'])
def test_upstream_failures_fall_back(monkeypatch,mode):
    monkeypatch.setenv('JEV_API_KEY','test-key')
    def handler(request):
        if mode=='timeout':raise httpx.ReadTimeout('timeout',request=request)
        if mode=='unauthorized':return httpx.Response(401)
        return httpx.Response(200,json={'answers':{'swift':{'noul':'invalid'}}})
    original=httpx.AsyncClient
    monkeypatch.setattr(engine.httpx,'AsyncClient',lambda **kwargs:original(transport=httpx.MockTransport(handler)))
    matches,name,cost,estimated,reason=asyncio.run(engine.classify('ios native app'))
    assert matches and name=='Keyword Heuristic Fallback' and cost==0 and not estimated and reason
