import json
import re
import time
from pathlib import Path

import requests
from bs4 import BeautifulSoup

BASE = "https://bage.supernicolini.com.br"
EAN_RE = re.compile(r"^/produto/(\d{8,14})/?$")

def coletar_eans(
    inicio: int = 1,
    fim: int = 285,
    arquivo: str = "eans_supernicolini_bage.json",
    delay: float = 0.6
) -> list[str]:

    path = Path(arquivo)
    session = requests.Session()
    session.headers.update({"User-Agent": "Mozilla/5.0"})

    eans = set()

    for page in range(inicio, fim + 1):
        url = f"{BASE}/page/{page}/"
        try:
            resp = session.get(url, timeout=25)
            resp.raise_for_status()
        except requests.RequestException as e:
            print(f"[ERRO] page={page} -> {e}")
            continue

        soup = BeautifulSoup(resp.text, "html.parser")

        for a in soup.select("a[href]"):
            href = a.get("href", "").strip()
            if href.startswith(BASE):
                href = href[len(BASE):]

            m = EAN_RE.match(href)
            if m:
                eans.add(m.group(1))

        print(f"[OK] page={page:03d} total_eans={len(eans)}")
        time.sleep(delay)

    lista = sorted(eans)

    path.write_text(
        json.dumps(lista, ensure_ascii=False, indent=2),
        encoding="utf-8"
    )

    return lista


# Exemplo de uso
if __name__ == "__main__":
    dados = coletar_eans()
    print(f"EANs coletados: {len(dados)}")
