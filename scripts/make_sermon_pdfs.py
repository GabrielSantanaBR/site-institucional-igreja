from pathlib import Path
from reportlab.lib.colors import HexColor
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import KeepTogether, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

ROOT=Path(__file__).resolve().parents[1]; OUT=ROOT/"public"/"sermoes"; OUT.mkdir(parents=True,exist_ok=True)
SERMONS=[
("esperanca-que-permanece.pdf","Esperança que permanece","Romanos 5:1-5",[("1. Paz com Deus","Nossa esperança começa na graça: não lutamos para conquistar aceitação, mas vivemos a partir da reconciliação recebida em Cristo."),("2. Perseverança no processo","A tribulação não é celebrada, mas pode produzir perseverança quando atravessada com fé, comunidade e verdade."),("3. Esperança que não decepciona","O amor de Deus derramado em nosso coração sustenta uma confiança maior que as circunstâncias.")],"Onde tenho buscado segurança quando a vida fica incerta?"),
("uma-casa-edificada-na-graca.pdf","Uma casa edificada na graça","Salmo 127:1",[("1. Deus no centro","Uma família é fortalecida quando decisões, conversas e prioridades são submetidas à sabedoria de Deus."),("2. Graça nas relações","Casas saudáveis criam espaço para escuta, perdão, limites e recomeços."),("3. Práticas que constroem","Oração, presença, serviço e palavras de encorajamento transformam a cultura do lar.")],"Qual prática simples pode tornar minha casa mais acolhedora nesta semana?"),
("chamados-para-servir.pdf","Chamados para servir","Marcos 10:45",[("1. O exemplo de Jesus","Jesus redefine grandeza: no Reino, influência começa com disposição para servir."),("2. Olhos para perceber","Servir exige atenção às necessidades reais das pessoas ao nosso redor."),("3. Mãos disponíveis","Todo dom pode se tornar uma expressão concreta de amor quando colocado à disposição.")],"Quem Deus colocou perto de mim que pode ser cuidado de forma prática?")]
GREEN=HexColor("#173D2C"); GOLD=HexColor("#C69B4A"); CREAM=HexColor("#F6F3EB"); INK=HexColor("#1D2821"); MUTED=HexColor("#5D6A62")
pdfmetrics.registerFont(TTFont("DejaVu","/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf")); pdfmetrics.registerFont(TTFont("DejaVu-Bold","/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"))
styles=getSampleStyleSheet();
styles.add(ParagraphStyle(name="Brand",fontName="DejaVu-Bold",fontSize=8.5,leading=12,textColor=GOLD,spaceAfter=14)); styles.add(ParagraphStyle(name="SermonTitle",fontName="DejaVu-Bold",fontSize=23,leading=29,textColor=GREEN,spaceAfter=6)); styles.add(ParagraphStyle(name="Reference",fontName="DejaVu",fontSize=10.5,leading=15,textColor=MUTED,spaceAfter=18)); styles.add(ParagraphStyle(name="PointTitle",fontName="DejaVu-Bold",fontSize=11.5,leading=16,textColor=INK,spaceAfter=5)); styles.add(ParagraphStyle(name="BodyCustom",fontName="DejaVu",fontSize=9.8,leading=16,textColor=MUTED)); styles.add(ParagraphStyle(name="QuestionLabel",fontName="DejaVu-Bold",fontSize=8.5,leading=12,textColor=GOLD,spaceAfter=4)); styles.add(ParagraphStyle(name="Question",fontName="DejaVu-Bold",fontSize=11.5,leading=17,textColor=GREEN)); styles.add(ParagraphStyle(name="FooterCustom",fontName="DejaVu",fontSize=8,leading=11,textColor=MUTED,alignment=1))
for filename,title,reference,points,question in SERMONS:
 doc=SimpleDocTemplate(str(OUT/filename),pagesize=A4,leftMargin=23*mm,rightMargin=23*mm,topMargin=22*mm,bottomMargin=18*mm,title=title,author="Igreja Esperança")
 story=[Paragraph("IGREJA ESPERANÇA  |  ESBOÇO DE MENSAGEM",styles["Brand"]),Paragraph(title,styles["SermonTitle"]),Paragraph(f"Texto-base: {reference}",styles["Reference"])]
 for point_title,body in points:
  block=Table([[Paragraph(point_title,styles["PointTitle"])],[Paragraph(body,styles["BodyCustom"]) ]],colWidths=[157*mm]); block.setStyle(TableStyle([("BACKGROUND",(0,0),(-1,-1),CREAM),("BOX",(0,0),(-1,-1),.5,HexColor("#E0DDD3")),("LEFTPADDING",(0,0),(-1,-1),8*mm),("RIGHTPADDING",(0,0),(-1,-1),8*mm),("TOPPADDING",(0,0),(-1,0),6*mm),("BOTTOMPADDING",(0,-1),(-1,-1),6*mm),("TOPPADDING",(0,1),(-1,1),0)])); story.extend([KeepTogether(block),Spacer(1,5*mm)])
 box=Table([[Paragraph("PARA REFLETIR",styles["QuestionLabel"])],[Paragraph(question,styles["Question"]) ]],colWidths=[157*mm]); box.setStyle(TableStyle([("BACKGROUND",(0,0),(-1,-1),HexColor("#E7EFE8")),("LINEBEFORE",(0,0),(0,-1),3,GOLD),("LEFTPADDING",(0,0),(-1,-1),7*mm),("RIGHTPADDING",(0,0),(-1,-1),7*mm),("TOPPADDING",(0,0),(-1,0),5*mm),("BOTTOMPADDING",(0,-1),(-1,-1),5*mm),("TOPPADDING",(0,1),(-1,1),0)])); story.extend([box,Spacer(1,9*mm),Paragraph("Material demonstrativo para acompanhamento da mensagem • igrejaesperanca.org",styles["FooterCustom"])]); doc.build(story)
print(f"Created {len(SERMONS)} PDFs")
