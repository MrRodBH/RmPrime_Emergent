from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from deps import obter_usuario_atual

router = APIRouter(prefix="/ia", tags=["ia (simulada)"])


class MelhorarDescricaoEntrada(BaseModel):
    texto: str = Field(max_length=5000)


@router.post("/melhorar-descricao")
async def melhorar_descricao(dados: MelhorarDescricaoEntrada, atual: dict = Depends(obter_usuario_atual)):
    texto = dados.texto.strip()
    if len(texto) < 10:
        raise HTTPException(
            status_code=422,
            detail="Escreva um texto inicial (mínimo de 10 caracteres) antes de usar a IA.",
        )

    # SIMULAÇÃO (Fase 3): a chamada real ao modelo de IA (Universal LLM Key) será conectada na Fase 6.
    paragrafos = [p.strip() for p in texto.split("\n") if p.strip()]
    primeiro = paragrafos[0]
    if not primeiro.endswith((".", "!", "?")):
        primeiro += "."
    melhorado = primeiro[0].upper() + primeiro[1:]
    for extra in paragrafos[1:]:
        melhorado += "\n\n" + extra
    melhorado += (
        "\n\nEntre em contato com a nossa equipe e agende uma visita — "
        "imóveis com este perfil costumam atrair muito interesse."
    )
    return {
        "texto_melhorado": melhorado,
        "simulado": True,
        "aviso": "Melhoria simulada. A integração real com IA será ativada na Fase 6.",
    }
