# Manual de deployment — LenaVS Frontend

## 1) Pré-requisitos
- Node.js 20.x
- Backend LenaVS publicado e funcionando
- Projeto Supabase com Auth habilitado

## 2) Variáveis de ambiente
Use o arquivo `.env.example` como base e crie um `.env` com:

```env
VITE_API_URL=https://seu-backend.onrender.com
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=...
```

## 3) Instalação
```bash
npm install
```

## 4) Desenvolvimento
```bash
npm run dev
```

## 5) Build de produção
```bash
npm run build
```

## 6) Publicação
- Pode ser publicado no Render Static Site, Netlify ou outro host estático.
- O frontend usa `HashRouter`, então as rotas privadas e públicas continuam funcionando sem tela branca por refresh direto.
- Mantenha o arquivo `public/_redirects` junto da build quando o host suportar redirects.

## 7) Observações do build atual
- Upload de áudio original e instrumental com limite de 15 minutos.
- Página de pagamento simplificada com duas opções: Pix/Boleto e Cartão.
- Resoluções disponíveis no export: 360p, 480p e 720p.
- 1080p permanece visível, porém bloqueado com o aviso "disponível em breve".
- 4K removido do seletor.

## 8) Não incluir no pacote
- `node_modules`
