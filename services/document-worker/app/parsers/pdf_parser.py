import pymupdf

from app.models import (
    BlockKind,
    DocumentBlock,
    DocumentKind,
    DocumentParseResponse,
    ParseWarning,
)


MIN_TEXT_CHARACTERS = 30


def parse_pdf(content: bytes) -> DocumentParseResponse:
    document = pymupdf.open(stream=content, filetype="pdf")
    blocks: list[DocumentBlock] = []

    for page_index, page in enumerate(document):
        raw_blocks = page.get_text("blocks", sort=True)
        for raw in raw_blocks:
            x0, y0, x1, y1, text, *_ = raw
            normalized = " ".join(text.split())
            if not normalized:
                continue
            index = len(blocks)
            blocks.append(
                DocumentBlock(
                    id=f"pdf-page-{page_index + 1}-block-{index}",
                    kind=BlockKind.PDF_TEXT,
                    text=normalized,
                    index=index,
                    page=page_index + 1,
                    bbox=(x0, y0, x1, y1),
                )
            )

    plain_text = "\n".join(block.text for block in blocks)
    warnings: list[ParseWarning] = []
    if len(plain_text.strip()) < MIN_TEXT_CHARACTERS:
        warnings.append(
            ParseWarning(
                code="PDF_TEXT_TOO_SPARSE",
                message="PDF 中可提取文字过少，可能是扫描版或图片型 PDF，建议上传 Word。",
            )
        )

    return DocumentParseResponse(
        document_kind=DocumentKind.PDF,
        blocks=blocks,
        plain_text=plain_text,
        warnings=warnings,
    )

