from pathlib import Path

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.responses import Response
from pydantic import BaseModel

from app.models import ApiError, DocumentParseResponse, ResumeExportRequest
from app.parsers.docx_parser import parse_docx
from app.parsers.pdf_parser import parse_pdf
from app.resume_exporter import export_docx_from_template, export_pdf


class HealthResponse(BaseModel):
    service: str
    status: str


app = FastAPI(title="AI 求职文档服务", version="0.0.0")

MAX_FILE_BYTES = 10 * 1024 * 1024
SUPPORTED_SUFFIXES = {".docx", ".pdf"}


@app.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(service="document-worker", status="ok")


@app.post(
    "/v1/documents/parse",
    response_model=DocumentParseResponse,
    responses={400: {"model": ApiError}, 413: {"model": ApiError}},
)
async def parse_document(file: UploadFile = File(...)) -> DocumentParseResponse:
    suffix = Path(file.filename or "").suffix.lower()
    if suffix not in SUPPORTED_SUFFIXES:
        raise HTTPException(
            status_code=400,
            detail={"code": "UNSUPPORTED_FILE_TYPE", "message": "仅支持 .docx 和 .pdf 文件。"},
        )

    content = await file.read(MAX_FILE_BYTES + 1)
    if len(content) > MAX_FILE_BYTES:
        raise HTTPException(
            status_code=413,
            detail={"code": "FILE_TOO_LARGE", "message": "文件不能超过 10 MB。"},
        )
    if not content:
        raise HTTPException(
            status_code=400,
            detail={"code": "EMPTY_FILE", "message": "文件内容为空。"},
        )

    try:
        if suffix == ".docx":
            return parse_docx(content)
        return parse_pdf(content)
    except Exception as exc:
        raise HTTPException(
            status_code=400,
            detail={"code": "DOCUMENT_PARSE_FAILED", "message": "文件无法解析，请检查文件是否损坏。"},
        ) from exc


@app.post("/v1/resumes/export/{file_format}")
def export_resume(file_format: str, resume: ResumeExportRequest) -> Response:
    if file_format not in {"docx", "pdf"}:
        raise HTTPException(
            status_code=400,
            detail={"code": "UNSUPPORTED_EXPORT_FORMAT", "message": "仅支持 docx 和 pdf。"},
        )

    try:
        if file_format == "docx":
            content = export_docx_from_template(resume)
            media_type = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        else:
            content = export_pdf(resume)
            media_type = "application/pdf"
        return Response(
            content=content,
            media_type=media_type,
            headers={"Content-Disposition": f'attachment; filename="optimized-resume.{file_format}"'},
        )
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail={"code": "RESUME_EXPORT_FAILED", "message": "简历导出失败，请重试。"},
        ) from exc

