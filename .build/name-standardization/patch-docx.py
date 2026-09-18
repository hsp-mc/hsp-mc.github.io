from __future__ import annotations

import argparse
import shutil
import tempfile
import zipfile
from pathlib import Path

from lxml import etree


OFFICIAL_NAME = "SPACESUIT THERMAL SHIELDING KIT"
REPLACEMENTS = [
    ("the project's SPHERE thermal-insulation classroom kit", f"the {OFFICIAL_NAME}"),
    ("our SPHERE thermal-insulation classroom kit", f"our {OFFICIAL_NAME}"),
    ("SPHERE thermal-insulation classroom kit", OFFICIAL_NAME),
    ("SPHERE Spacesuit Thermal Insulation Laboratory", OFFICIAL_NAME),
    ("SPHERE Thermal Insulation Laboratory", OFFICIAL_NAME),
    ("SPHERE THERMAL INSULATION LABORATORY", OFFICIAL_NAME),
    ("SPHERE Thermal Insulation Kit", OFFICIAL_NAME),
    ("SPHERE thermal-insulation laboratory", OFFICIAL_NAME),
    ("Spacesuit Thermal Insulation Laboratory", OFFICIAL_NAME),
    ("Spacesuit Thermal Shielding Kit", OFFICIAL_NAME),
    ("Spacesuit Thermal Shielding", OFFICIAL_NAME),
    ("Thermal Insulation Laboratory final presentation", f"{OFFICIAL_NAME} final presentation"),
    ("Thermal Insulation Laboratory  |  Four Presenter Guide", f"{OFFICIAL_NAME}  |  Four Presenter Guide"),
]


def replace_across_text_nodes(root: etree._Element) -> int:
    changes = 0
    for paragraph in root.xpath('//*[local-name()="p"]'):
        nodes = paragraph.xpath('.//*[local-name()="t"]')
        if not nodes:
            continue
        node_texts = [node.text or "" for node in nodes]
        original = "".join(node_texts)
        matches: list[tuple[int, int, str]] = []
        claimed: list[tuple[int, int]] = []
        for old, new in REPLACEMENTS:
            start = 0
            while True:
                index = original.find(old, start)
                if index < 0:
                    break
                end = index + len(old)
                if not any(index < used_end and end > used_start for used_start, used_end in claimed):
                    matches.append((index, end, new))
                    claimed.append((index, end))
                start = end
        if not matches:
            continue
        boundaries: list[tuple[int, int]] = []
        position = 0
        for text in node_texts:
            boundaries.append((position, position + len(text)))
            position += len(text)
        for start, end, replacement in sorted(matches, reverse=True):
            start_node = next(i for i, (left, right) in enumerate(boundaries) if left <= start < right)
            end_node = next(i for i, (left, right) in enumerate(boundaries) if left < end <= right)
            start_left, _ = boundaries[start_node]
            end_left, _ = boundaries[end_node]
            local_start = start - start_left
            local_end = end - end_left
            if start_node == end_node:
                text = nodes[start_node].text or ""
                nodes[start_node].text = text[:local_start] + replacement + text[local_end:]
            else:
                first = nodes[start_node].text or ""
                last = nodes[end_node].text or ""
                nodes[start_node].text = first[:local_start] + replacement
                for index in range(start_node + 1, end_node):
                    nodes[index].text = ""
                nodes[end_node].text = last[local_end:]
            changes += 1
    return changes


def patch_docx(source: Path, destination: Path) -> int:
    destination.parent.mkdir(parents=True, exist_ok=True)
    changes = 0
    with tempfile.TemporaryDirectory(prefix="docx-name-patch-") as temp_dir:
        temp = Path(temp_dir)
        with zipfile.ZipFile(source) as archive:
            archive.extractall(temp)
        for xml_path in temp.rglob("*.xml"):
            parser = etree.XMLParser(remove_blank_text=False)
            try:
                root = etree.parse(str(xml_path), parser).getroot()
            except etree.XMLSyntaxError:
                continue
            xml_changes = replace_across_text_nodes(root)
            if xml_changes:
                changes += xml_changes
                xml_path.write_bytes(etree.tostring(root, xml_declaration=True, encoding="UTF-8", standalone=True))
        with zipfile.ZipFile(destination, "w", zipfile.ZIP_DEFLATED) as archive:
            for item in sorted(temp.rglob("*")):
                if item.is_file():
                    archive.write(item, item.relative_to(temp))
    return changes


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path)
    parser.add_argument("destination", type=Path)
    parser.add_argument("--allow-zero", action="store_true")
    args = parser.parse_args()
    changes = patch_docx(args.source, args.destination)
    if not changes and not args.allow_zero:
        raise SystemExit(f"No official-name variants found in {args.source}")
    print(f"{args.source} -> {args.destination}: {changes} replacements")


if __name__ == "__main__":
    main()
