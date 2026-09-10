from pathlib import Path
from html import escape
from docx import Document
from docx.table import Table as DocxTable
from docx.text.paragraph import Paragraph
from docx.oxml.ns import qn

ROOT = Path('/Users/mandinu/Downloads/project')
DOCX = ROOT/'output/docx/SPHERE_Thermal_Insulation_Project_Report_Updated.docx'
OUT = ROOT/'tmp/report_build/submission.html'
ASSET = ROOT/'tmp/report_build/html_assets'
FONT = ROOT/'tmp/report_build/latin_modern/fonts'
ASSET.mkdir(parents=True, exist_ok=True)

doc = Document(DOCX)

def blocks(parent):
    body = parent.element.body
    for child in body.iterchildren():
        if child.tag == qn('w:p'):
            yield Paragraph(child, parent)
        elif child.tag == qn('w:tbl'):
            yield DocxTable(child, parent)

def image_paths(p):
    out=[]
    for blip in p._p.xpath('.//a:blip'):
        rid=blip.get(qn('r:embed'))
        if not rid: continue
        part=p.part.related_parts[rid]
        suffix=Path(str(part.partname)).suffix or '.png'
        dst=ASSET/f'image_{len(list(ASSET.glob("image_*")))+1:03d}{suffix}'
        dst.write_bytes(part.blob); out.append(dst)
    return out

css=f'''@font-face{{font-family:LMRoman;src:url("{(FONT/'lmroman12-regular.otf').as_uri()}") format("opentype");font-weight:400}}
@font-face{{font-family:LMRoman;src:url("{(FONT/'lmroman12-bold.otf').as_uri()}") format("opentype");font-weight:700}}
@font-face{{font-family:LMRoman;src:url("{(FONT/'lmroman12-italic.otf').as_uri()}") format("opentype");font-style:italic}}
@font-face{{font-family:LMRomanDisplay;src:url("{(FONT/'lmroman17-regular.otf').as_uri()}") format("opentype")}}
@font-face{{font-family:LMMath;src:url("{(FONT/'latinmodern-math.otf').as_uri()}") format("opentype")}}
@page{{size:A4;margin:19mm 21mm 18mm 21mm}}
*{{box-sizing:border-box}} html,body{{margin:0;padding:0}}
body{{font-family:LMRoman,serif;font-size:10.2pt;line-height:1.18;color:#202326}}
p{{margin:0 0 5.5pt;text-align:justify;orphans:3;widows:3}}
.cover{{height:250mm;display:flex;flex-direction:column;align-items:center;text-align:center;padding-top:28mm}}
.cover .cover-title{{font-family:LMRomanDisplay,LMRoman,serif;font-size:23pt;font-weight:400;margin:0 0 9mm}}
.cover .cover-subtitle{{font-size:12.5pt;color:#2e617f;text-align:center;margin-bottom:28mm}}
.cover p{{text-align:center;margin:0 0 5mm}}
.cover .report-label{{font-size:15pt;font-weight:700;margin-top:10mm}}
h1{{font-family:LMRoman,serif;font-size:16pt;line-height:1.08;color:#295c80;margin:0 0 8pt;font-weight:700;border-bottom:0.6pt solid #8aa8ba;padding-bottom:2pt;break-after:avoid}}
h2{{font-size:12.5pt;line-height:1.1;color:#295c80;margin:10pt 0 4pt;font-weight:700;break-after:avoid}}
h3{{font-size:10.8pt;line-height:1.1;color:#295c80;margin:8pt 0 3pt;font-weight:700;break-after:avoid}}
.pagebreak{{break-before:page}}
.running-header{{position:fixed;top:-12.5mm;left:0;right:0;font-size:7.5pt;color:#555;display:flex;justify-content:space-between}}
.running-footer{{position:fixed;bottom:-11.5mm;left:0;right:0;text-align:center;font-size:7.5pt;color:#555}}
.running-footer:after{{content:'Page ' counter(page)}}
.center{{text-align:center}} .caption{{text-align:center;font-size:8.2pt;font-style:italic;color:#59636a;margin-top:2pt;margin-bottom:7pt}}
.toc{{font-size:10pt;white-space:pre-wrap;text-align:left;margin-bottom:4pt}}
ul{{margin:2pt 0 7pt 17pt;padding:0}} li{{margin:0 0 2.5pt}}
figure{{margin:6pt auto 3pt;text-align:center;break-inside:avoid}} figure img{{display:block;max-width:100%;max-height:104mm;margin:auto}}
table{{width:100%;border-collapse:collapse;margin:6pt 0 8pt;font-size:8.7pt;break-inside:avoid}}
th,td{{border:0.45pt solid #b8c0c5;padding:4pt 5pt;vertical-align:middle}} th{{background:#e8eef4;color:#183d58;font-weight:700;text-align:center}} tr:nth-child(even) td{{background:#f6f8f9}}
.cell-img{{display:block;max-width:44mm;max-height:54mm;margin:2pt auto 4pt}}
.math{{font-family:LMMath,LMRoman,serif;text-align:center;font-size:13pt;margin:8pt 0}}
'''

items=[]; first_break=True; cover=True; cover_index=0
for block in blocks(doc):
    if isinstance(block, Paragraph):
        p=block
        has_break=bool(p._p.xpath('.//w:br[@w:type="page"]'))
        if has_break:
            if first_break:
                items.append('</section><div class="running-header"><span>Spacesuit Thermal Shielding</span><span>TUM Engineering Report</span></div><div class="running-footer"></div>')
                first_break=False; cover=False
            items.append('<div class="pagebreak"></div>')
            continue
        pics=image_paths(p)
        if pics:
            for path in pics: items.append(f'<figure><img src="{path.as_uri()}"></figure>')
            continue
        text=p.text.strip()
        if not text: continue
        if cover:
            cover_index += 1
            cls='cover-title' if cover_index==1 else ('cover-subtitle' if cover_index==2 else ('report-label' if text=='Engineering Project Report' else ''))
            items.append(f'<p class="{cls}">{escape(text)}</p>'); continue
        style=p.style.name if p.style else ''
        if style=='Title':
            items.append(f'<h1>{escape(text)}</h1>')
        elif style.startswith('Heading 1'):
            items.append(f'<h2>{escape(text)}</h2>')
        elif style.startswith('Heading 2') or style.startswith('Heading 3'):
            items.append(f'<h3>{escape(text)}</h3>')
        elif style.startswith('List Bullet'):
            items.append(f'<ul><li>{escape(text)}</li></ul>')
        else:
            centered=(p.alignment is not None and int(p.alignment)==1)
            if centered and ('=' in text or 'Σ' in text): cls='math'
            elif centered: cls='caption'
            elif '.'*10 in text: cls='toc'
            else: cls=''
            items.append(f'<p class="{cls}">{escape(text)}</p>')
    else:
        rows=[]
        for ri,row in enumerate(block.rows):
            tag='th' if ri==0 else 'td'
            rendered=[]
            for c in row.cells:
                parts=[]
                for cp in c.paragraphs:
                    for path in image_paths(cp): parts.append(f'<img class="cell-img" src="{path.as_uri()}">')
                    if cp.text.strip(): parts.append(escape(cp.text.strip()))
                rendered.append(f'<{tag}>{"".join(parts)}</{tag}>')
            rows.append('<tr>'+''.join(rendered)+'</tr>')
        items.append('<table><thead>'+rows[0]+'</thead><tbody>'+''.join(rows[1:])+'</tbody></table>')

html='<!doctype html><html><head><meta charset="utf-8"><style>'+css+'</style></head><body><section class="cover">'+''.join(items)+'</body></html>'
OUT.write_text(html,encoding='utf-8')
print(OUT)
