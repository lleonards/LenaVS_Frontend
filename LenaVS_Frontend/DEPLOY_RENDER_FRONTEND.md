# Deploy do Frontend no Render

## Tipo de serviço
Static Site

## Build Command
```bash
npm install && npm run build
```

## Publish Directory
```text
dist
```

## Variáveis de ambiente obrigatórias
```env
VITE_API_URL=https://SEU-BACKEND.onrender.com
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=SEU_SUPABASE_ANON_KEY
```

## Observações importantes
- O frontend foi migrado para `HashRouter`, então as rotas ficam estáveis no Render sem depender de rewrite manual para `/editor`, `/upgrade` ou `/payment/...`.
- Não suba `node_modules`.
- Depois do deploy, valide login, upgrade, retorno do pagamento e exportação.

## Domínio próprio
Se você usar domínio próprio, também adicione esse domínio em:
- `ALLOWED_ORIGINS` do backend
- `FRONTEND_URL` do backend
- URLs autorizadas do Supabase Auth

## Checklist rápido pós-deploy
1. Abrir `/#/login`
2. Fazer login
3. Entrar no editor
4. Ir para upgrade
5. Iniciar checkout Pix/Boleto e Cartão
6. Validar retorno para `/#/payment/success`, `/#/payment/pending` e `/#/payment/failure`
