"""
MiMo Code API — Python SDK

Usage:
    from client import MiMoClient

    client = MiMoClient(url="http://localhost:3456", api_key="key")
    response = client.chat("Hello!")
    print(response["response"])
"""

import json
import requests
from typing import Optional, Generator


class MiMoClient:
    def __init__(
        self,
        url: str = "http://localhost:3456",
        api_key: str = "",
        timeout: int = 120,
    ):
        self.url = url.rstrip("/")
        self.api_key = api_key
        self.timeout = timeout
        self.session = requests.Session()

    def _headers(self) -> dict:
        h = {"Content-Type": "application/json"}
        if self.api_key:
            h["X-API-Key"] = self.api_key
        return h

    def chat(self, prompt: str, **kwargs) -> dict:
        r = self.session.post(
            f"{self.url}/chat",
            json={"prompt": prompt, **kwargs},
            headers=self._headers(),
            timeout=self.timeout,
        )
        r.raise_for_status()
        return r.json()

    def chat_stream(self, prompt: str, **kwargs) -> Generator[dict, None, None]:
        r = self.session.post(
            f"{self.url}/chat/stream",
            json={"prompt": prompt, **kwargs},
            headers=self._headers(),
            stream=True,
            timeout=self.timeout,
        )
        r.raise_for_status()

        for line in r.iter_lines(decode_unicode=True):
            if line and line.startswith("data: "):
                data = line[6:].strip()
                if data:
                    try:
                        yield json.loads(data)
                    except json.JSONDecodeError:
                        pass

    def models(self) -> dict:
        r = self.session.get(f"{self.url}/models", headers=self._headers())
        r.raise_for_status()
        return r.json()

    def health(self) -> dict:
        r = self.session.get(f"{self.url}/health")
        r.raise_for_status()
        return r.json()
