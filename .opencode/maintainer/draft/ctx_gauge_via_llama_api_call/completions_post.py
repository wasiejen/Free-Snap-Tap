import httpx

# url = "http://192.168.178.20:8033/v1/chat/completions"
# url = "http://192.168.178.20:8033/v1/messages"
url = "http://192.168.178.20:4096/api/experimental/session/stats"
payload = {
    "model": "Qwen3.8-27B-IQ4KT-120K",
    "messages": [{"role": "user", "content": "blub"}],
    "stream": False,
}

resp = httpx.post(url, json=payload, timeout=30.0)
resp.raise_for_status()
data = resp.json()
print(data)
usage = data.get("usage", {})
print("prompt_tokens:", usage.get("prompt_tokens"))
print("completion_tokens:", usage.get("completion_tokens"))
print("total_tokens:", usage.get("total_tokens"))
