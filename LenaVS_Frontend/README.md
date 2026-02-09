# LenaVS Frontend

Frontend do sistema LenaVS - Editor de vídeo karaokê com sincronização de letras.

## 🚀 Tecnologias

- **React 18** com **Vite**
- **React Router DOM** - Roteamento
- **Supabase** - Autenticação
- **Axios** - Requisições HTTP
- **Lucide React** - Ícones
- **CSS3** - Estilização

## 📋 Pré-requisitos

- Node.js 18 ou superior
- Conta no Supabase configurada

## 🔧 Configuração

### 1. Instalar Dependências

```bash
npm install
```

### 2. Configurar Variáveis de Ambiente

Copie o arquivo `.env.example` para `.env` e preencha as variáveis:

```bash
cp .env.example .env
```

Edite o arquivo `.env`:

```env
VITE_API_URL=https://seu-backend.onrender.com
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anon
```

## 🏃 Executar Localmente

### Modo Desenvolvimento

```bash
npm run dev
```

A aplicação estará rodando em `http://localhost:5173`

### Build de Produção

```bash
npm run build
```

Os arquivos otimizados estarão em `dist/`

### Preview da Build

```bash
npm run preview
```

## 🌐 Deploy no Render

### 1. Criar Static Site no Render

1. Conecte seu repositório GitHub ao Render
2. Escolha "Static Site"
3. Configure:
   - **Name**: lenavs-frontend
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`
   - **Auto-Deploy**: Yes

### 2. Configurar Variáveis de Ambiente

No painel do Render, adicione as variáveis:

- `VITE_API_URL` → https://seu-backend.onrender.com
- `VITE_SUPABASE_URL` → https://seu-projeto.supabase.co
- `VITE_SUPABASE_ANON_KEY` → sua-chave-anon

### 3. Configurar Redirecionamento (SPA)

Crie o arquivo `dist/_redirects` (Render faz isso automaticamente com React Router):

```
/*    /index.html   200
```

Ou adicione no `vite.config.js` um plugin para gerar este arquivo automaticamente.

## 📁 Estrutura do Projeto

```
src/
├── components/          # Componentes reutilizáveis
│   ├── Header.jsx
│   ├── FilesPanel.jsx
│   ├── PreviewPanel.jsx
│   ├── LyricsEditorPanel.jsx
│   └── ExportPanel.jsx
├── pages/              # Páginas da aplicação
│   ├── Login.jsx
│   ├── Register.jsx
│   └── Editor.jsx
├── services/           # Serviços e APIs
│   ├── api.js
│   └── supabase.js
├── contexts/           # Contextos React
│   └── AuthContext.jsx
├── utils/              # Utilitários
├── assets/             # Imagens, fontes, etc
├── App.jsx             # Componente principal
├── main.jsx            # Entry point
└── index.css           # Estilos globais
```

## 🎨 Design

- **Tema**: Dark mode
- **Cores principais**:
  - Primary: #FF8C5A (Laranja)
  - Background: #000000 (Preto)
  - Panels: #1e1e1e
  - Text: #ffffff
- **Fonte**: Montserrat (Google Fonts)
- **Logo**: Mantém fundo preto com "VS" em laranja

## 🔐 Autenticação

A autenticação é gerenciada 100% pelo Supabase:

- **Login**: Email + Senha
- **Registro**: Nome + Email + Senha + Confirmação
- **Sessão**: Persistente com tokens JWT
- **Logout**: Limpa sessão e redireciona para login

## 📱 Rotas

- `/login` - Tela de login
- `/register` - Tela de cadastro
- `/editor` - Editor de vídeo (requer autenticação)
- `/` - Redireciona para `/editor`

## 🛠️ Funcionalidades

### Painel de Arquivos
- Upload de música original
- Upload de música instrumental (playback)
- Upload de vídeo/foto de fundo
- Upload de arquivo de letra (.txt)
- Colar letra manualmente

### Painel de Preview
- Visualização em tempo real (16:9)
- Player de áudio com controles
- Alternância entre áudio original/playback
- Seletor de cor de fundo
- Exibição de letras sincronizadas

### Painel Editor de Letras
- Edição estrofe por estrofe
- Sincronização de tempo (início/fim)
- Controles de estilo (fonte, tamanho, cores)
- Formatação (negrito, itálico, sublinhado)
- Alinhamento (esquerda, centro, direita)
- Transições (fade, slide, zoom)
- Adicionar/remover estrofes

### Painel de Exportação
- Nome do projeto
- Seleção de áudio (original/playback)
- Formato de vídeo (MP4, AVI, MOV, MKV)
- Botão de exportação

## 🔗 Integração com Backend

O frontend se comunica com o backend através de:

- `POST /api/video/upload` - Upload de arquivos de mídia
- `POST /api/lyrics/upload` - Upload de arquivo de letra
- `POST /api/lyrics/manual` - Processar letra colada
- `POST /api/video/generate` - Gerar vídeo final
- `GET /api/video/download/:fileName` - Download do vídeo

Todas as requisições incluem automaticamente o token JWT do Supabase.

## 🐛 Tratamento de Erros

- Validação de formulários
- Mensagens de erro amigáveis
- Redirecionamento automático em caso de sessão expirada
- Feedback visual de carregamento

## 📝 Notas Importantes

- **Autenticação**: 100% gerenciada pelo Supabase no frontend
- **Token**: Automaticamente incluído em todas as requisições à API
- **Logo**: Usar imagem oficial (não texto "LenaVS")
- **Design**: Seguir exatamente o layout das imagens fornecidas
- **Responsivo**: Otimizado para desktop (mobile-friendly em desenvolvimento)

## 🚀 Performance

- **Code Splitting**: Chunks automáticos por rota
- **Lazy Loading**: Componentes carregados sob demanda
- **Otimização de Bundle**: Vite faz tree-shaking automático
- **Assets**: Imagens e fontes otimizadas

## 📄 Licença

MIT

## 👨‍💻 Suporte

Para problemas ou dúvidas, use o sistema de relatório de erros integrado no aplicativo ou abra uma issue no repositório.

---

**Desenvolvido com ❤️ para LenaVS**
