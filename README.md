# Christian Personal
Projeto Angular 19 + Supabase. MVP para um personal trainer e seus alunos.

## Instalação
1. Crie um projeto Supabase novo. No SQL Editor execute `supabase/schema.sql` uma vez.
2. Em Authentication > Providers, mantenha confirmação de e-mail habilitada. Crie a conta do personal em Authentication > Users e copie seu UUID. Execute no SQL Editor: `insert into public.admins(id) values ('UUID-DO-PERSONAL');` substituindo pelo UUID real.
3. Em `src/config.js`, informe a URL e a chave pública publishable (ou anon) do projeto. Nunca use service_role ou secret key no frontend.
4. Com Node 22, execute `npm install` e `npm start`. Abra http://localhost:4200. Para produção, `npm run build`.
5. Entre como personal, cadastre o aluno com o e-mail exato que ele usará para criar a conta. O vínculo usa o e-mail confirmado. Não reutilize e-mails entre alunos. Mantenha a confirmação de e-mail ativa.
6. Envie o conteúdo desta pasta a um repositório GitHub. No Netlify, importe o repositório. O arquivo netlify.toml define build e publicação. Configure a URL do site e redirects autorizados em Supabase Authentication > URL Configuration.

## Regras e limitações
RLS separa registros dos alunos; a tabela admins só é gerenciada pelo SQL Editor. A reserva usa bloqueio da turma no banco para evitar exceder capacidade. Check-in interpretado literalmente como prazo final de 30 minutos antes da aula; cancelamento até 45 minutos antes. Recovery diário exigido no check-in. O check-in registra confirmação, não prova presença física. Horários de entrada usam o fuso do navegador; Recovery usa São Paulo.

Ainda faltam gráficos, relatórios, lista de espera, fotos, recuperação de senha pela interface, pagamentos automáticos, WhatsApp e configurações editáveis. Não é uma versão final validada. Antes de dados reais, testar RLS com duas contas distintas, reservas simultâneas, prazos, cadastro, edição e exclusão. Excluir aluno remove seus registros vinculados; faça backup. Dados de saúde são sensíveis: definir consentimento/base legal, retenção, acesso e backups antes da operação. Não há dados fictícios pré-carregados.
