# Itinerários Eleve

Site para os alunos assistirem aos vídeos de apresentação dos itinerários do contraturno e escolherem um para terça e um para quarta-feira. As vagas são controladas pelo servidor: quando uma turma enche, o vídeo é bloqueado automaticamente para quem ainda não escolheu.

## Como rodar localmente

```bash
cd "itinerario apresentação"
npm install
cp .env.example .env   # depois edite o ADMIN_TOKEN no .env
npm start
```

Abra:
- Aluno: http://localhost:3000/
- Admin: http://localhost:3000/admin.html (peça o token que está no `.env`)

O banco de dados SQLite é criado automaticamente em `data/app.db` na primeira execução, junto com os 7 itinerários (6 já preenchidos + 1 de quarta-feira marcado como "PENDENTE" até você preencher os dados do 4º professor).

## Preenchendo o itinerário pendente (4ª turma de quarta-feira)

Assim que tiver a descrição do professor que falta, abra o painel admin, clique em **Editar** no card marcado como "PENDENTE" e salve título, professor, descrição e o link do vídeo.

## Vídeos

O campo "URL do vídeo" aceita:
- Links do YouTube (`youtube.com/watch?v=...` ou `youtu.be/...`)
- Links do Google Drive (`drive.google.com/file/d/.../view`)
- Arquivos `.mp4` diretos
- Qualquer outro link (aparece como "Ver vídeo")

Você pode editar o link de cada itinerário no painel admin a qualquer momento, sem precisar tocar no código.

## Regras de vagas

- Terça-feira: 3 turmas, 25 vagas cada.
- Quarta-feira: 4 turmas, 20 vagas cada.
- Cada aluno escolhe **um itinerário de terça e um de quarta** (duas escolhas independentes).
- Se o aluno mudar de ideia, basta escolher outro itinerário no mesmo dia — a vaga anterior é liberada automaticamente (se a nova turma ainda tiver vaga).
- Quando uma turma atinge a capacidade, o vídeo fica bloqueado (some da lista) para qualquer aluno que ainda não tenha escolhido aquele itinerário. Quem já garantiu a vaga continua vendo seu próprio vídeo normalmente.
- **Importante:** a identificação do aluno é só nome + turma digitados, sem login. Isso significa que não há garantia de que a pessoa é realmente quem diz ser — é uma solução simples pensada para uso interno da escola, não à prova de fraude.

## Exportar lista de inscritos

No painel admin, use os botões **Exportar CSV** (por itinerário) ou **Exportar CSV (tudo)**. O arquivo abre corretamente no Excel, com acentos e nomes brasileiros.

## Publicando o site (quando decidir a hospedagem)

Isso é um app Node.js comum — funciona em qualquer serviço que rode Node (Render, Railway, Fly.io, um VPS, etc.). Só é preciso:
1. Definir as variáveis de ambiente `PORT`, `ADMIN_TOKEN` e `DB_PATH`.
2. Garantir que a pasta `data/` (onde fica o banco SQLite) tenha armazenamento **persistente** entre reinícios/deploys — em serviços com disco efêmero, será necessário trocar o SQLite por um banco hospedado (ex: Postgres) mais adiante.
3. Rodar `npm install && npm start`.
