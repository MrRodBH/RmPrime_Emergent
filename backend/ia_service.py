import asyncio
import os

from emergentintegrations.llm.chat import LlmChat, StreamDone, TextDelta, UserMessage

PROVEDOR = "gemini"
MODELO = "gemini-2.5-flash"
TIMEOUT_SEGUNDOS = 60


async def _stream(chat, prompt: str) -> str:
    partes: list[str] = []
    async for evento in chat.stream_message(UserMessage(text=prompt)):
        if isinstance(evento, TextDelta):
            partes.append(evento.content)
        elif isinstance(evento, StreamDone):
            break
    return "".join(partes).strip()


async def gerar_texto(sistema: str, prompt: str, sessao: str) -> str:
    chat = LlmChat(
        api_key=os.environ["EMERGENT_LLM_KEY"],
        session_id=sessao,
        system_message=sistema,
    ).with_model(PROVEDOR, MODELO)
    return await asyncio.wait_for(_stream(chat, prompt), timeout=TIMEOUT_SEGUNDOS)
