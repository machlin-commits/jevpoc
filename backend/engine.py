import math
import os
import re
import httpx
from .catalog import CATALOG, CATEGORIES

PROFILES = [
    (r'\b(ios|macos|swift|apple|iphone|mac)\b', ['swift','swiftui','ios','macos','appkit','mac-catalyst','sqlite']),
    (r'\b(azure|microsoft|enterprise)\b', ['csharp','dotnet','azure','azure-functions','azure-container-apps','azure-cosmos-db','semantic-kernel','autogen']),
    (r'\b(agent|agents|multi-agent|ai|llm)\b', ['python','fastapi','langgraph','langchain','openai-api','anthropic-claude','postgresql','redis']),
    (r'\b(saas|b2b|next\.?js)\b', ['typescript','nextjs','react','tailwind-css','nodejs','postgresql','prisma','vercel']),
    (r'\b(streaming|media|video|pipeline)\b', ['go','python','ffmpeg','apache-kafka','apache-flink','redis','amazon-s3','docker']),
    (r'\b(cross-platform|cross platform)\b', ['react-native','flutter','kotlin-multiplatform','tauri']),
    (r'\b(android|mobile)\b', ['kotlin','android','react-native','flutter','firebase']),
    (r'\b(realtime|real-time|real time|chat)\b', ['typescript','nodejs','socketio','redis','postgresql']),
    (r'\b(website|web app|dashboard)\b', ['typescript','react','tailwind-css','fastapi','postgresql','vercel']),
]

def heuristic(prompt):
    text = prompt.lower()
    scores = {}
    for pattern, ids in PROFILES:
        if re.search(pattern, text):
            for i, tech_id in enumerate(ids):
                scores[tech_id] = max(scores.get(tech_id, 0), round(.89 - i * .018, 3))
    for tech in CATALOG:
        # Boundaries avoid accidental substring matches (e.g. Go in MongoDB).
        matched = [k for k in tech['keywords'] if re.search(r'(?<!\w)' + re.escape(k) + r'(?!\w)', text)]
        if matched:
            explicit = bool(re.search(r'(?<!\w)' + re.escape(tech['name'].lower()) + r'(?!\w)', text))
            value = .98 if explicit else min(.83, .58 + .06 * len(matched))
            scores[tech['id']] = max(scores.get(tech['id'], 0), value)
    if re.search(r'\b(microsoft|azure)\b', text) and re.search(r'\bagents?\b', text):
        for tech_id in ['autogen','semantic-kernel','azure-ai-foundry','copilot-studio']:
            scores[tech_id] = max(scores.get(tech_id, 0), .94)
    return select(scores)

def select(scores):
    selected = []
    for category in CATEGORIES:
        choices = [dict(id=t['id'], confidence=scores[t['id']]) for t in CATALOG
                   if t['category'] == category and scores.get(t['id'], 0) >= .56]
        selected.extend(sorted(choices, key=lambda t: (-t['confidence'], t['id']))[:5])
    return selected

def configured_key():
    key = os.getenv('JEV_API_KEY', '').strip()
    if not key or any(part in key.lower() for part in ('placeholder','your_key','your_actual','replace','example')):
        return None
    return key

async def classify(prompt):
    key = configured_key()
    if not key:
        return heuristic(prompt), 'Keyword Heuristic Fallback', 0.0, False, 'API key is not configured.'
    # One consolidated request; independent binary relevance probabilities per technology.
    questions = {t['id']: {'type': 'noul', 'instructions':
        f"Would {t['name']} ({t['category']}; {', '.join(t['keywords'][1:])}) be a strong, relevant technology recommendation for the requested project? Prefer a focused stack, avoid unrelated technologies."}
        for t in CATALOG}
    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(12.0, connect=4.0)) as client:
            response = await client.post('https://api.typesafe.ai/v1/systemone',
                headers={'Authorization': f'Bearer {key}'},
                json={'model': 'jev-latest', 'state': prompt, 'questions': questions})
            response.raise_for_status()
            data = response.json()
        answers = data['answers']
        scores = {}
        for t in CATALOG:
            answer = answers[t['id']]
            value = answer['noul']
            if answer.get('type') != 'noul' or isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value) or not 0 <= value <= 1:
                raise ValueError('Invalid probability')
            scores[t['id']] = value
        # Estimated from official input-token pricing ($42 / billion); never fabricated usage.
        tokens = data.get('usage', {}).get('input_tokens')
        cost = tokens * 42 / 1_000_000_000 if isinstance(tokens, int) and tokens >= 0 else None
        return select(scores), 'Jay API (System One)', cost, True, None
    except httpx.TimeoutException:
        reason = 'System One timed out; showing keyword matches.'
    except httpx.HTTPStatusError as exc:
        reason = f'System One returned HTTP {exc.response.status_code}; showing keyword matches.'
    except (httpx.RequestError, ValueError, KeyError, TypeError):
        reason = 'System One is unavailable or returned an invalid response; showing keyword matches.'
    return heuristic(prompt), 'Keyword Heuristic Fallback', 0.0, False, reason
