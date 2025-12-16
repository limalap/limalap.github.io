import re
import json
import time
from pathlib import Path

import requests
from bs4 import BeautifulSoup


def buscar_produto_por_ean(ean: str) -> dict:
    url = f"https://bage.supernicolini.com.br/produto/{ean}/"
    headers = {"User-Agent": "Mozilla/5.0"}

    try:
        resp = requests.get(url, headers=headers, timeout=20)
        resp.raise_for_status()
    except requests.RequestException as e:
        return {"ean": ean, "nome": None, "erro": str(e)}

    soup = BeautifulSoup(resp.text, "html.parser")

    nome_el = soup.select_one("h1")
    nome = nome_el.get_text(strip=True) if nome_el else None

    # Se o site retornar página "ok" mas sem produto, tenta detectar rápido
    if not nome:
        texto = soup.get_text(" ", strip=True).lower()
        if "produto" in texto and "não" in texto and "encontr" in texto:
            return {"ean": ean, "nome": None, "erro": "produto_nao_encontrado"}
        return {"ean": ean, "nome": None, "erro": "nome_nao_encontrado"}

    return {"ean": ean, "nome": nome}


def completar_dados_por_arquivo_eans(
    arquivo_eans: str,
    arquivo_saida: str = "produtos_complementares.json",
    delay: float = 0.5,
    salvar_incremental: bool = True
) -> list[dict]:
    path_in = Path(arquivo_eans)
    path_out = Path(arquivo_saida)

    eans = json.loads(path_in.read_text(encoding="utf-8"))
    if not isinstance(eans, list):
        raise ValueError("O arquivo de entrada deve conter um JSON array de EANs.")

    session = requests.Session()
    session.headers.update({"User-Agent": "Mozilla/5.0"})

    resultados = []

    for i, ean in enumerate(eans, start=1):
        ean = str(ean).strip()
        if not re.fullmatch(r"\d{8,14}", ean):
            resultados.append({"ean": ean, "nome": None, "erro": "ean_invalido"})
            continue

        # usa a função que já faz request (simples e claro)
        dados = buscar_produto_por_ean(ean)
        resultados.append(dados)

        if salvar_incremental and (i % 50 == 0 or i == len(eans)):
            path_out.write_text(
                json.dumps(resultados, ensure_ascii=False, indent=2),
                encoding="utf-8"
            )

        print(f"[{i}/{len(eans)}] {ean} -> {dados.get('nome') or dados.get('erro')}")
        time.sleep(delay)

    # grava final
    path_out.write_text(
        json.dumps(resultados, ensure_ascii=False, indent=2),
        encoding="utf-8"
    )

    return resultados


if __name__ == "__main__":
    completar_dados_por_arquivo_eans(
        arquivo_eans="eans_supernicolini_bage.json",
        arquivo_saida="produtos_complementares.json",
        delay=0.6
    )
