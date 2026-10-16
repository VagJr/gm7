import fs from 'node:fs';
import path from 'node:path';
const replacements = {
  'CRÔNICAS': 'DRAGONS', 'DO VAZIO': 'AND DUNGEONS', 'Crônicas do Vazio': 'Dragons and Dungeons', 'Cr?nicas do Vazio': 'Dragons and Dungeons',
  'Per?cias': 'Perícias', 'per?cias': 'perícias', 'Per?cia': 'Perícia', 'per?cia': 'perícia',
  'Conjura??o': 'Conjuração', 'conjura??o': 'conjuração', 'n?o': 'não', 'N?o': 'Não', 'n?vel': 'nível', 'N?vel': 'Nível',
  'op??es': 'opções', 'Op??es': 'Opções', 'op??o': 'opção', 'a??es': 'ações', 'A??es': 'Ações', 'a??o': 'ação', 'A??o': 'Ação',
  'Rea??o': 'Reação', 'rea??o': 'reação', 'B?nus': 'Bônus', 'b?nus': 'bônus', 'M?gico': 'Mágico', 'm?gico': 'mágico',
  'Esp?cie': 'Espécie', 'esp?cie': 'espécie', 'M?xim': 'Máxim', 'm?xim': 'máxim', 'm?nimo': 'mínimo',
  'Condi??es': 'Condições', 'condi??es': 'condições', 'condi??o': 'condição', 'Condi??o': 'Condição',
  'Sele??o': 'Seleção', 'sele??o': 'seleção', 'Descri??o': 'Descrição', 'descri??o': 'descrição', 'prote??o': 'proteção',
  'Po??o': 'Poção', 'po??o': 'poção', 's?o': 'são', 'voc?': 'você', 'Voc?': 'Você', 'her?i': 'herói', 'Her?i': 'Herói',
  'j? determinado': 'já determinado', 'tens?o': 'tensão', 'avan?am': 'avançam', 'portugu?s': 'português',
  'Ac?lito':'Acólito','Amea?a':'Ameaça','Anci?o':'Ancião','B?rbaro':'Bárbaro','C?rculo':'Círculo','Ca?adora':'Caçadora','Ca?do':'Caído','Capit?o':'Capitão','Cart?grafo':'Cartógrafo','Cl?rigo':'Clérigo','Conclu?da':'Concluída','Constitui??o':'Constituição','Di?rio':'Diário','Din?mico':'Dinâmico','Dire??o':'Direção','Drag?o':'Dragão','Espa?os':'Espaços','Evolu??o':'Evolução','F?lego':'Fôlego','F?ria':'Fúria','For?a':'Força','Grim?rio':'Grimório','Guardi?es':'Guardiões','Guardi?o':'Guardião','INTEN??O':'INTENÇÃO','In?cio':'Início','Inten??o':'Intenção','Invis?vel':'Invisível','Lan?a':'Lança','M?os':'Mãos','M?sseis':'Mísseis','M?stica':'Mística','Magm?tica':'Magmática','Mudan?a':'Mudança','P?s':'Pés','Port?es':'Portões','Profici?ncia':'Proficiência','Provis?es':'Provisões','R?nica':'Rúnica','Reposi??o':'Reposição','Resist?ncia':'Resistência','Ru?nas':'Ruínas','Secund?ria':'Secundária','Vit?ria':'Vitória','Vulc?nica':'Vulcânica',
  'al?m':'além','amea?a':'ameaça','ap?s':'após','apare?a':'apareça','atra?das':'atraídas','bot?o':'botão','c?maras':'câmaras','ca?adas':'caçadas','ca?adores':'caçadores','ca?ram':'caíram','carro?as':'carroças','cat?logo':'catálogo','com?rcio':'comércio','come?ar':'começar','conclu?da':'concluída','conex?o':'conexão','cont?m':'contém','corrup??o':'corrupção','decis?es':'decisões','defini??o':'definição','destru?da':'destruída','di?rio':'diário','dire??o':'direção','dispon?veis':'disponíveis','dom?nio':'domínio','drac?nica':'dracônica','drag?o':'dragão','ecol?gica':'ecológica','econ?mica':'econômica','eleg?veis':'elegíveis','espa?o':'espaço','est?o':'estão','estat?sticas':'estatísticas','expl?cita':'explícita','f?sico':'físico','grim?rio':'grimório','guardi?es':'guardiões','imposs?vel':'impossível','in?cio':'início','inscri??es':'inscrições','inten??o':'intenção','inv?lida':'inválida','inv?lido':'inválido','invent?rio':'inventário','m?o':'mão','mec?nicos':'mecânicos','mudan?a':'mudança','murm?rio':'murmúrio','n?cleo':'núcleo','n?mero':'número','ningu?m':'ninguém','not?cias':'notícias','obstru?da':'obstruída','ofere?a':'ofereça','org?nica':'orgânica','padr?o':'padrão','poder?o':'poderão','port?es':'portões','pr?logo':'prólogo','pr?pria':'própria','pr?prio':'próprio','pr?ximo':'próximo','pra?a':'praça','presen?a':'presença','press?gio':'presságio','provis?es':'provisões','raz?o':'razão','regi?es':'regiões','regi?o':'região','rel?quias':'relíquias','repet?veis':'repetíveis','resolu??o':'resolução','s?mbolos':'símbolos','secund?ria':'secundária','ser?o':'serão','sil?ncio':'silêncio','substitu?do':'substituído','t?tica':'tática','t?tico':'tático','tempor?ria':'temporária','tend?ncia':'tendência','territ?rio':'território','tr?s':'três','v?lida':'válida','v?lido':'válido','vit?ria':'vitória','?rea':'área','?gua':'água','?rvore':'árvore','at? ':'até ','est? ':'está ','h? ':'há ',' ? uma ':' é uma ',
};
function repair(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) repair(file);
    else if (/\.(tsx?|md)$/.test(file)) {
      const original = fs.readFileSync(file, 'utf8'); let content = original;
      for (const [bad, good] of Object.entries(replacements)) content = content.replaceAll(bad, good);
      if (content !== original) fs.writeFileSync(file, content);
    }
  }
}
for (const directory of ['app','components','lib']) repair(directory);
console.log('Textos de interface e marca revisados.');
