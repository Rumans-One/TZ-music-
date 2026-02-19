import logging
import os
import re
from contextlib import asynccontextmanager
from typing import Any

import httpx
from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, field_validator

from src.db import create_application, init_db

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class ApplicationIn(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    phone: str = Field(min_length=10, max_length=20)
    musicStyle: str = Field(min_length=2, max_length=120)
    comment: str = Field(min_length=10, max_length=1000)

    @field_validator("name", "musicStyle", "comment")
    @classmethod
    def trim_required(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("Поле обязательно")
        return stripped

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, value: str) -> str:
        cleaned = value.strip()
        if not re.match(r"^\+?[0-9\s\-()]{10,20}$", cleaned):
            raise ValueError("Введите корректный телефон")
        return cleaned


@asynccontextmanager
async def lifespan(_app: FastAPI):
    init_db()
    yield


app = FastAPI(title="Suno AI Backend", lifespan=lifespan)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(_request: Request, exc: RequestValidationError):
    field_errors: dict[str, list[str]] = {}

    for err in exc.errors():
        loc = err.get("loc", [])
        if len(loc) >= 2 and loc[0] == "body":
            field = str(loc[1])
            field_errors.setdefault(field, []).append(err.get("msg", "Некорректное значение"))

    return JSONResponse(
        status_code=400,
        content={
            "message": "Ошибка валидации данных",
            "errors": field_errors,
        },
    )


@app.get("/api/health")
def health() -> dict[str, bool]:
    return {"ok": True}


@app.post("/api/applications", status_code=201)
async def submit_application(payload: ApplicationIn) -> dict[str, Any]:
    try:
        saved = create_application(payload.model_dump())
    except Exception as error:
        logger.exception("Create application error")
        raise HTTPException(status_code=500, detail="Внутренняя ошибка сервера") from error

    bot_url = os.getenv("BOT_INTERNAL_URL")
    bot_token = os.getenv("BOT_INTERNAL_TOKEN")
    if bot_url and bot_token:
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                await client.post(
                    f"{bot_url}/internal/new-application",
                    json=saved,
                    headers={"x-internal-token": bot_token},
                )
        except Exception:
            logger.exception("Failed to notify bot")

    return {"message": "Заявка успешно отправлена", "data": saved}
