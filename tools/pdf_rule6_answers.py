from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import mm
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, KeepTogether
from reportlab.graphics.shapes import Drawing, Rect, String, Line
INK=colors.HexColor('#2b1405'); WINE=colors.HexColor('#7a1f2b'); MUTE=colors.HexColor('#6b5a45'); LINE=colors.HexColor('#d8c9a6'); BG=colors.HexColor('#f7efdc')
CA=colors.HexColor('#8a6a33'); CB=colors.HexColor('#2f6f8f')
st=lambda n,**k: ParagraphStyle(n,fontName=k.pop('font','Helvetica'),textColor=k.pop('color',INK),**k)
H0=st('h0',font='Helvetica-Bold',fontSize=21,leading=25,color=WINE,spaceAfter=3)
SUB=st('sub',fontSize=10.5,leading=14,color=MUTE,spaceAfter=10)
H1=st('h1',font='Helvetica-Bold',fontSize=13,leading=16,color=WINE,spaceBefore=13,spaceAfter=5,keepWithNext=1)
P=st('p',fontSize=10,leading=14.2,spaceAfter=6)
B=st('b',fontSize=10,leading=14.2,leftIndent=12,bulletIndent=2,spaceAfter=3)
SM=st('sm',fontSize=8.5,leading=11.5,color=MUTE,spaceAfter=6)
KEY=st('key',fontSize=11,leading=15.5,spaceAfter=0)
C=st('c',fontSize=9.3,leading=12); CH=st('ch',font='Helvetica-Bold',fontSize=9.3,leading=12,color=colors.white); CBD=st('cb',font='Helvetica-Bold',fontSize=9.3,leading=12)
def tbl(rows,widths,bold_row=None):
  data=[[Paragraph(str(x),CH) for x in rows[0]]]+[[Paragraph(str(x),CBD if (bold_row is not None and i==bold_row) else C) for x in r] for i,r in enumerate(rows[1:])]
  t=Table(data,colWidths=widths,repeatRows=1)
  s=[('BACKGROUND',(0,0),(-1,0),WINE),('VALIGN',(0,0),(-1,-1),'MIDDLE'),('LINEBELOW',(0,1),(-1,-1),0.5,LINE),('TOPPADDING',(0,0),(-1,-1),4),('BOTTOMPADDING',(0,0),(-1,-1),4),('LEFTPADDING',(0,0),(-1,-1),6)]
  if bold_row is not None: s.append(('BACKGROUND',(0,bold_row+1),(-1,bold_row+1),BG))
  t.setStyle(TableStyle(s)); return t


S=[]
S.append(Paragraph('Magister: answers on the "rule of 6"',H0))
S.append(Paragraph('Data on the three concerns raised, and an adjusted proposal for the Emeritus tokens.',SUB))
box=Table([[Paragraph('<b>Adjusted proposal.</b> Game end at <b>6 VP</b>. Rector at <b>6 influence</b>. Emeritus objective tokens: one fewer than the number of players, so that second place keeps its value where it matters: <b>2 players: one token of 2 VP</b> &nbsp;|&nbsp; <b>3 players: 2 / 1 VP</b> &nbsp;|&nbsp; <b>4 players: 2 / 2 VP</b>.',KEY)]],colWidths=[170*mm])
box.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,-1),BG),('BOX',(0,0),(-1,-1),0.8,CA),('LEFTPADDING',(0,0),(-1,-1),10),('RIGHTPADDING',(0,0),(-1,-1),10),('TOPPADDING',(0,0),(-1,-1),8),('BOTTOMPADDING',(0,0),(-1,-1),8)]))
S.append(box)
S.append(Spacer(1,7))
S.append(Paragraph('Since the Rector at 6 influence is agreed, sections 1 to 3 compare "8 VP, tokens 3/2, Rector 6" with "6 VP, tokens 2/1, Rector 6". 2 players, AI against AI, 400 to 500 games per measure.',SM))
S.append(Paragraph('Concern 1. "The Emeritus are weaker: only first place is worth the effort"',H1))
S.append(Paragraph('<b>Confirmed for second place.</b> At 1 VP the second token is rarely worth chasing. The first token keeps all its weight.',P))
S.append(tbl([['','8 VP, tokens 3/2','6 VP, tokens 2/1'],['Second tokens taken per game','0.46','0.25'],['Win rate of players who take a first token','69%','69%'],['Promotions to Emeritus per player','2.00','1.84']],[80*mm,45*mm,45*mm],bold_row=0))
S.append(Spacer(1,4))
S.append(Paragraph('This is what the adjusted proposal fixes: see section 4.',P))
S.append(Paragraph('Concern 2. "Books are stronger, so their value and the green activation should be raised"',H1))
S.append(Paragraph('<b>Each Book weighs more (1/6 of the goal instead of 1/8), but play does not shift towards Books.</b>',P))
S.append(tbl([['','8 VP, tokens 3/2','6 VP, tokens 2/1'],['Books played by the winner','2.0','2.1'],['Books drawn per player','8.9','8.7'],['Artist (green) activation, share of all activations','36%','36%'],['Same share among winners only','36%','36%']],[80*mm,45*mm,45*mm]))
S.append(Spacer(1,4))
S.append(Paragraph('About the values in the calculations: an AI retrained on 700 games played with the rule of 6 does what you suggest. It values each VP about 30% higher (9.5 against 7.4) and Emeritus lower. It is not stronger than the current AI: 48% of wins over 200 games. Misjudging Books costs nothing measurable.',P))
S.append(Paragraph('Concern 3. "More Books means more randomness"',H1))
S.append(Paragraph('<b>Not measurable.</b> If luck grew, a stronger player would beat a weaker one less often. The skill gap is unchanged, and the kind of game you met (8 rounds, 4 Books) is as rare as before.',P))
S.append(tbl([['','8 VP, tokens 3/2','6 VP, tokens 2/1'],['Hard AI beats Medium AI','76%','77%'],['Hard AI beats Easy AI','89%','90%'],['Games ending in 8 rounds or less','2%','3%'],['Winner plays 4 Books or more','12%','9%']],[80*mm,45*mm,45*mm]))
S.append(Paragraph('4. The adjusted proposal: tokens by number of players',H1))
S.append(Paragraph('Second place is worth nothing at 2 players (the 1 VP token was almost never taken), 1 VP at 3 players and 2 VP at 4 players, where the race for objectives is the most crowded.',P))
S.append(tbl([['6 VP, Rector 6','2 players (token 2)','3 players (2 / 1)','4 players (2 / 2)'],['Rounds per player (average)','10.9','10.4','9.9'],['Games lasting 10 to 12 rounds','82%','75%','68%'],['Share of winner\'s VP from objectives','53%','51%','52%'],['Share of winner\'s VP from Books','32%','36%','35%'],['Winners with a single objective','34%','37%','34%'],['Games decided by 1 VP or less','31%','45%','50%']],[62*mm,36*mm,36*mm,36*mm]))
S.append(Spacer(1,4))
S.append(Paragraph('For reference, with the original rules (8 VP, tokens 3/2, Rector 8) objectives give 70% of the winner\'s VP at 2 players and 69% at 4 players, for 11.0 and 10.4 rounds.',SM))
S.append(Paragraph('<bullet>&bull;</bullet><b>Same balance at every player count.</b> Objectives give about half of the winner\'s VP at 2, 3 and 4 players, and one winner in three wins with a single objective plus Books and a Rector.',B))
S.append(Paragraph('<bullet>&bull;</bullet><b>Second place matters again at 4 players.</b> With tokens 2/1/1/1 objectives fell to 47% of the winner\'s VP; with 2/2 they are back to 52%.',B))
S.append(Paragraph('<bullet>&bull;</bullet><b>One point to watch.</b> At 4 players games are about half a round shorter than with the original rules (9.9 against 10.4), and one game in three ends before round 10.',B))
S.append(Spacer(1,5))
S.append(Paragraph('All figures come from AI-versus-AI games at the highest heuristic level, three journeys drawn at random among the nine, Rector tiles 5a and 5b never in play. Section 4: 400 games at 2 players, 300 at 3 and at 4. Sections 1 to 3 were measured with tokens 2/1 at 2 players, before the 1 VP token was removed there. Human playtests remain the final word.',SM))
def foot(c,d):
  c.saveState(); c.setFont('Helvetica',8); c.setFillColor(MUTE); c.drawString(20*mm,11*mm,'Magister - answers on the rule of 6'); c.drawRightString(190*mm,11*mm,f'Page {d.page}'); c.restoreState()
SimpleDocTemplate('Magister_rule_of_6_answers.pdf',pagesize=A4,leftMargin=20*mm,rightMargin=20*mm,topMargin=18*mm,bottomMargin=18*mm,title='Magister: answers on the rule of 6',author='Mosaic Studio').build(S,onFirstPage=foot,onLaterPages=foot)
