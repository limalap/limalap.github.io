import re
import requests
from bs4 import BeautifulSoup

def buscar_produto_por_ean(ean: str) -> dict:
    url = f"https://bage.supernicolini.com.br/produto/{ean}/"
    headers = {"User-Agent": "Mozilla/5.0"}

    try:
        resp = requests.get(url, headers=headers, timeout=20)
        resp.raise_for_status()
    except requests.RequestException as e:
        return {"ean": ean, "erro": str(e), "url": url}

    soup = BeautifulSoup(resp.text, "html.parser")

    nome = soup.select_one("h1")
    nome = nome.get_text(strip=True) if nome else None

    texto = soup.get_text(" ", strip=True)
    m = re.search(r"R\$\s*\d+,\d{2}", texto)
    preco = m.group(0) if m else None

    return {
        "ean": ean,
        "nome": nome,
        "preco": preco,
        "url": url
    }

# Exemplo de uso
print(buscar_produto_por_ean("7891000066560"))
