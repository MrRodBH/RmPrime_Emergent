from datetime import datetime
from typing import Annotated, Any, Literal, Optional

from bson import ObjectId
from pydantic import BaseModel, BeforeValidator, ConfigDict, EmailStr, Field

PyObjectId = Annotated[str, BeforeValidator(str)]

Papel = Literal["admin", "gestor", "corretor"]


class BaseDocument(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: Optional[PyObjectId] = Field(default=None, alias="_id")

    def to_mongo(self) -> dict:
        dados = self.model_dump(by_alias=True, exclude={"id"}, exclude_none=True)
        return dados

    @classmethod
    def from_mongo(cls, doc: Optional[dict]) -> Optional["BaseDocument"]:
        if doc is None:
            return None
        return cls(**doc)


class UsuarioCriar(BaseModel):
    nome: str = Field(min_length=2, max_length=120)
    email: EmailStr
    senha: str = Field(min_length=6, max_length=128)
    papel: Papel
    telefone: Optional[str] = None
    foto: Optional[str] = None
    ativo: bool = True


class UsuarioAtualizar(BaseModel):
    nome: Optional[str] = Field(default=None, min_length=2, max_length=120)
    email: Optional[EmailStr] = None
    senha: Optional[str] = Field(default=None, min_length=6, max_length=128)
    papel: Optional[Papel] = None
    telefone: Optional[str] = None
    foto: Optional[str] = None
    ativo: Optional[bool] = None


class LoginEntrada(BaseModel):
    email: EmailStr
    senha: str


class EsqueciSenhaEntrada(BaseModel):
    email: EmailStr


class RedefinirSenhaEntrada(BaseModel):
    token: str
    senha: str = Field(min_length=6, max_length=128)


def usuario_para_saida(doc: dict) -> dict:
    return {
        "id": str(doc["_id"]),
        "nome": doc["nome"],
        "email": doc["email"],
        "telefone": doc.get("telefone"),
        "foto": doc.get("foto"),
        "papel": doc["role"],
        "ativo": doc.get("ativo", True),
        "criado_em": doc.get("criado_em"),
    }
