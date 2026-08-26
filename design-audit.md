# Auditoria visual — redesign inicial

A tela `/login` anterior usava um card estreito, centralizado e com roxo como cor dominante. A hierarquia era funcional, mas genérica: pouco contraste entre superfície e fundo, pouca diferenciação de marca e baixo aproveitamento do espaço em viewport desktop.

O primeiro passe aplicado criou uma direção de **estúdio investigativo/editorial**: fundo verde-petróleo quase preto com textura de grade muito discreta, dourado envelhecido para ação e destaque, verde-sálvia para informação secundária, bordas suaves e composição de autenticação em duas colunas. O resultado visual observado no navegador mostra uma área de marca ampla à esquerda, formulário destacado à direita, contraste consistente e melhor presença de produto.

A próxima prioridade é validar a mesma linguagem nas telas internas: sidebar, dashboard, explorador de arquivos, convites e componentes de status. Também é necessário conferir viewport estreito, foco de teclado, botões e estados vazios para evitar que o redesign fique apenas decorativo.

## Conferência no navegador após o segundo passe

A tela `/login` e a tela `/registro` mantiveram a mesma composição visual. O cadastro acomodou o terceiro campo sem quebrar a coluna do formulário, preservando o CTA dourado e os links de troca de fluxo. A hierarquia está legível em viewport desktop e o conteúdo permanece semanticamente acessível no texto extraído da página.

## Melhorias futuras priorizadas

1. **Sistema de componentes**: extrair Button, Input, Badge, Panel e EmptyState para reduzir variações entre páginas e acelerar futuras versões.
2. **Shell responsivo**: transformar a sidebar compacta em um drawer real no mobile, com botão de abertura e fechamento acessível.
3. **Busca global**: adicionar command palette para localizar campanhas, arquivos, NPCs, pistas e sessões sem navegar por várias telas.
4. **Feedback de operações**: substituir mensagens locais dispersas por toasts consistentes, skeletons e estados de carregamento por região.
5. **Dashboard mais operacional**: incluir atividade recente, próximos eventos da timeline, atalhos de criação e indicador de papel OWNER/PLAYER.
6. **Acessibilidade contínua**: revisar nomes acessíveis de ícones, navegação por teclado em favoritos/board e contraste em todos os temas.
7. **Assets de marca**: criar favicon, ícone da aplicação e ilustrações leves para empty states mantendo a identidade investigativa.

## Validação do redesign

- `npm install --no-audit --no-fund`: aprovado.
- `npx tsc --noEmit -p .`: aprovado.
- `npx next lint --dir src`: aprovado, sem warnings ou erros.
- `npm test -- --run`: aprovado, mantendo os testes existentes.
- `npm run build`: aprovado.
- Validação visual no navegador: login e cadastro conferidos após o redesign; a composição editorial e a nova paleta foram aplicadas também ao dashboard, sidebar, explorador de arquivos, cards, convites e criação de campanha.

## Referência externa consultada

Fonte: https://crisordemparanormal.com/

A página pública do C.R.I.S. se apresenta como uma plataforma de fichas digitais com acesso rápido às informações, rolagem de perícias, atributos e ataques, além de áreas separadas para agentes, campanhas, ameaças e ferramentas do Mestre. A implementação do RPG Campaign Studio usa apenas esses princípios de organização e não copia marca, assets ou textos proprietários.

## Conferência visual da rodada atual

A tela `/login` continua visualmente consistente após a inclusão do Command Palette global. O gatilho aparece como uma ação discreta no canto inferior direito e a composição de autenticação permanece legível, com CTA dourado e foco de campos preservados. A navegação global passa a estar disponível também em telas públicas, com o atalho Ctrl/Cmd+K.
