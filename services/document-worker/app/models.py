from enum import StrEnum

from pydantic import BaseModel, ConfigDict, Field


def to_camel(value: str) -> str:
    first, *rest = value.split("_")
    return first + "".join(part.capitalize() for part in rest)


class ContractModel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class DocumentKind(StrEnum):
    DOCX = "docx"
    PDF = "pdf"


class BlockKind(StrEnum):
    PARAGRAPH = "paragraph"
    TABLE = "table"
    PDF_TEXT = "pdf_text"


class TextRun(ContractModel):
    text: str
    bold: bool | None = None
    italic: bool | None = None
    underline: bool | None = None
    font_name: str | None = None
    font_size_pt: float | None = None


class DocumentBlock(ContractModel):
    id: str
    kind: BlockKind
    text: str
    index: int = Field(ge=0)
    page: int | None = Field(default=None, ge=1)
    style_name: str | None = None
    runs: list[TextRun] = Field(default_factory=list)
    bbox: tuple[float, float, float, float] | None = None


class ParseWarning(ContractModel):
    code: str
    message: str


class DocumentParseResponse(ContractModel):
    contract: str = "document-parse.v1"
    document_kind: DocumentKind
    blocks: list[DocumentBlock]
    plain_text: str
    warnings: list[ParseWarning] = Field(default_factory=list)


class ApiError(ContractModel):
    code: str
    message: str


class ResumeExportSection(ContractModel):
    heading: str
    items: list[str]


class ResumeExportRequest(ContractModel):
    title: str
    summary: str = ""
    sections: list[ResumeExportSection]
    source_file_name: str | None = None
    source_docx_base64: str | None = None

