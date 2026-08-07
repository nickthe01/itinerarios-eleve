# Itinerários Eleve

Site para os alunos assistirem aos vídeos de apresentação dos itinerários do contraturno e escolherem um para terça e um para quarta-feira. As vagas são controladas pelo banco de dados: quando uma turma enche, o vídeo é bloqueado automaticamente para quem ainda não escolheu.

Stack: Node.js + Express, banco Postgres hospedado no **Supabase**, deploy no **Vercel**, vídeos hospedados no **Supabase Storage**.

## Como rodar localmente

```bash
cd "itinerario apresentação"
npm install
cp .env.example .env   # edite ADMIN_TOKEN e DATABASE_URL no .env
npm run migrate        # cria as tabelas no Supabase (só precisa rodar uma vez)
npm run seed           # insere os itinerários (idempotente, pode rodar de novo sem duplicar)
npm start
```

Abra:
- Aluno: http://localhost:3000/
- Admin: http://localhost:3000/admin.html (peça o token que está no `.env`)

## Onde vem o banco de dados

O `DATABASE_URL` deve ser a **connection string do pooler em modo Transaction** do Supabase (Project Settings → Database → Connection string, porta `6543`, não a `5432` direta). Isso é importante: a porta direta tem limite baixo de conexões simultâneas e não é pensada para ambientes serverless como o Vercel.

## Preenchendo o itinerário pendente (4ª turma de quarta-feira)

Assim que tiver a descrição do professor que falta, abra o painel admin, clique em **Editar** no card marcado como "PENDENTE" e salve título, professor, descrição e o link do vídeo.

## Vídeos

Os vídeos ficam hospedados no **Supabase Storage** (bucket público) — não fazem parte do repositório nem do deploy. O campo "URL do vídeo" de cada itinerário aceita:
- URLs do Supabase Storage (`.../storage/v1/object/public/...mp4`)
- Links do YouTube (`youtube.com/watch?v=...` ou `youtu.be/...`)
- Links do Google Drive (`drive.google.com/file/d/.../view`)
- Qualquer arquivo `.mp4` direto
- Qualquer outro link (aparece como "Ver vídeo")

Você pode editar o link de cada itinerário no painel admin a qualquer momento, sem precisar tocar no código.

## Regras de vagas

- Terça-feira: 3 turmas, 25 vagas cada.
- Quarta-feira: 4 turmas, 20 vagas cada.
- Cada aluno escolhe **um itinerário de terça e um de quarta** e revisa as duas opções antes de confirmar.
- As duas escolhas são gravadas juntas na confirmação final. Se uma delas tiver acabado de lotar, nenhuma alteração é aplicada e o aluno pode escolher outra opção.
- Se o aluno mudar de ideia depois de confirmar, pode revisar os dois dias e confirmar novamente. A vaga anterior é liberada automaticamente.
- Quando uma turma atinge a capacidade, a apresentação continua disponível, mas a ação de matrícula é bloqueada.
- O controle de vagas usa travamento de linha no Postgres (`SELECT ... FOR UPDATE`) dentro de uma transação, então não há risco de vender mais vagas do que a capacidade, mesmo com várias pessoas escolhendo ao mesmo tempo em instâncias diferentes do Vercel.
- **Importante:** a identificação do aluno é só nome + turma digitados, sem login. Isso significa que não há garantia de que a pessoa é realmente quem diz ser — é uma solução simples pensada para uso interno da escola, não à prova de fraude.

## Exportar lista de inscritos

No painel admin, use os botões **Exportar CSV** (por itinerário) ou **Exportar CSV (tudo)**. O arquivo abre corretamente no Excel, com acentos e nomes brasileiros.

## Deploy no Vercel

```bash
vercel login          # interativo, abre o navegador
vercel link           # conecta esta pasta a um projeto Vercel
vercel env add DATABASE_URL production
vercel env add ADMIN_TOKEN production
vercel deploy --prod
```

Não é preciso `vercel.json` — o Vercel detecta o `server.js` automaticamente (zero config para Express). Só é necessário rodar `npm run migrate` e `npm run seed` uma vez, localmente, apontando para o mesmo `DATABASE_URL` do Supabase que o Vercel vai usar.
