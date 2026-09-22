from io import BytesIO

from docx import Document
from docx.table import Table
from docx.text.paragraph import Paragraph

from app.models import BlockKind, DocumentBlock, DocumentKind, DocumentParseResponse, TextRun


def _font_size_pt(run) -> float | None:
    if run.font.size is None:
        return None
    return round(run.font.size.pt, 2)


def _paragraph_block(paragraph: Paragraph, index: int) -> DocumentBlock:
    runs = [
        TextRun(
            text=run.text,
            bold=run.bold,
            italic=run.italic,
            underline=run.underline,
            font_name=run.font.name,
            font_size_pt=_font_size_pt(run),
        )
        for run in paragraph.runs
        if run.text
    ]
    return DocumentBlock(
        id=f"docx-paragraph-{index}",
        kind=BlockKind.PARAGRAPH,
        text=paragraph.text,
        index=index,
        style_name=paragraph.style.name if paragraph.style else None,
        runs=runs,
    )


def _table_block(table: Table, index: int) -> DocumentBlock:
    rows: list[str] = []
    for row in table.rows:
        cells = [" ".join(cell.text.split()) for cell in row.cells]
        rows.append(" | ".join(cells))
    return DocumentBlock(
        id=f"docx-table-{index}",
        kind=BlockKind.TABLE,
        text="\n".join(rows),
        index=index,
    )


def parse_docx(content: bytes) -> DocumentParseResponse:
    document = Document(BytesIO(content))
    blocks: list[DocumentBlock] = []

    for item in document.iter_inner_content():
        index = len(blocks)
        if isinstance(item, Paragraph):
            block = _paragraph_block(item, index)
        elif isinstance(item, Table):
            block = _table_block(item, index)
        else:
            continue

        if block.text.strip():
            blocks.append(block.model_copy(update={"index": len(blocks)}))

    plain_text = "\n".join(block.text for block in blocks)
    return DocumentParseResponse(
        document_kind=DocumentKind.DOCX,
        blocks=blocks,
        plain_text=plain_text,
    )

