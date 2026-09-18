#!/usr/bin/env python3
"""Add the published student-manual footer and page numbers to a PDF."""

from __future__ import annotations

import argparse
from io import BytesIO
from pathlib import Path

from pypdf import PdfReader, PdfWriter
from reportlab.pdfgen import canvas


FOOTER_TEXT = "TECHNICAL UNIVERSITY OF MUNICH  •  SPHERE PROJECT 2026  •  STUDENT EDITION"
MM = 72 / 25.4


def footer_overlay(width: float, height: float, page_number: int) -> PdfReader:
    buffer = BytesIO()
    pdf = canvas.Canvas(buffer, pagesize=(width, height))

    left = 14 * MM
    right = width - 14 * MM
    rule_y = 9.3 * MM
    text_y = 5.7 * MM

    pdf.setStrokeColorRGB(0.80, 0.84, 0.89)
    pdf.setLineWidth(0.55)
    pdf.line(left, rule_y, right, rule_y)

    pdf.setFillColorRGB(0.29, 0.35, 0.43)
    pdf.setFont("Helvetica-Oblique", 7.1)
    pdf.drawString(left, text_y, FOOTER_TEXT)

    pdf.setFont("Helvetica-Oblique", 7.1)
    pdf.drawRightString(right, text_y, f"PAGE {page_number}")
    pdf.save()
    buffer.seek(0)
    return PdfReader(buffer)


def add_footer(source: Path, output: Path) -> None:
    reader = PdfReader(source)
    writer = PdfWriter()

    for physical_page, page in enumerate(reader.pages, start=1):
        if physical_page > 1:
            width = float(page.mediabox.width)
            height = float(page.mediabox.height)
            overlay = footer_overlay(width, height, physical_page - 1)
            page.merge_page(overlay.pages[0])
        writer.add_page(page)

    if reader.metadata:
        writer.add_metadata({
            key: str(value)
            for key, value in reader.metadata.items()
            if key and value is not None
        })

    output.parent.mkdir(parents=True, exist_ok=True)
    with output.open("wb") as stream:
        writer.write(stream)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    add_footer(args.source, args.output)


if __name__ == "__main__":
    main()
