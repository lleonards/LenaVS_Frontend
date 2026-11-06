/**
 * Mensagens de erro exibidas ao usuário do LenaVS.
 *
 * Regra do produto:
 *  - A pessoa só vê avisos curtos, claros e específicos sobre o que ELA
 *    precisa fazer (enviar a música, corrigir um dado, entrar novamente...).
 *  - Erro interno (Supabase, banco, servidor, storage, fila de vídeo,
 *    provedor de pagamento) nunca chega ao usuário com detalhe técnico.
 *    O detalhe é logado no console do navegador apenas para manutenção.
 */

export const GENERIC_ERROR_MESSAGE =
  'Não foi possível concluir a operação. Tente novamente.';

export const NETWORK_ERROR_MESSAGE =
  'Não foi possível conectar ao servidor. Verifique sua internet e tente novamente.';

export const TIMEOUT_ERROR_MESSAGE =
  'A operação demorou mais que o esperado. Tente novamente.';

export const SESSION_EXPIRED_MESSAGE =
  'Sua sessão expirou. Entre novamente para continuar.';

/**
 * Marcadores de conteúdo técnico que nunca devem ser exibidos.
 */
const TECHNICAL_PATTERN = new RegExp(
  [
    'supabase',
    'postgres',
    'postgrest',
    'row-level',
    'rls',
    'jwt',
    'sql',
    'econn\\w*',
    'etimedout',
    'enotfound',
    'eai_again',
    'axioserror',
    'typeerror',
    'referenceerror',
    'syntaxerror',
    'unhandled',
    'exception',
    'stack',
    'traceback',
    'service_role',
    'anon key',
    'bucket',
    'storagepath',
    'ffmpeg',
    'ffprobe',
    'demucs',
    'stripe',
    'pagarme',
    'webhook',
    'payload',
    'undefined',
    '\\bnull\\b',
    '\\bnan\\b',
    'localhost',
    '127\\.0\\.0\\.1',
    '\\bhttp[s]?://',
    '<html',
    '\\bat\\s+[\\w$.]+\\s*\\(',
    '\\.js\\b',
    '\\.mjs\\b',
    '\\b[45]\\d{2}\\b',
  ].join('|'),
  'i',
);

/**
 * Uma mensagem só é exibida se parecer texto de produto:
 * curta, em português e sem termos técnicos.
 */
export const isUserFacingMessage = (value) => {
  const message = String(value || '').trim();

  if (!message) return false;
  if (message.length < 4 || message.length > 180) return false;
  if (TECHNICAL_PATTERN.test(message)) return false;

  return true;
};

const statusFallback = (status) => {
  if (status === 400) return 'Confira os dados informados e tente novamente.';
  if (status === 401) return SESSION_EXPIRED_MESSAGE;
  if (status === 403) return 'Você não tem permissão para esta ação.';
  if (status === 404) return 'Não encontramos o que você procura. Recarregue a página e tente novamente.';
  if (status === 409) return 'Esta ação já foi feita. Atualize a página para ver o resultado.';
  if (status === 413) return 'O arquivo é muito grande. Envie um arquivo menor.';
  if (status === 415) return 'O formato do arquivo não é aceito. Confira a extensão e tente novamente.';
  if (status === 422) return 'Não foi possível ler o arquivo enviado. Confira se ele abre normalmente e tente novamente.';
  if (status === 429) return 'Muitas tentativas em pouco tempo. Aguarde um instante e tente novamente.';
  return '';
};

/**
 * Converte qualquer erro em uma mensagem segura para a interface.
 *
 * @param {unknown} error erro capturado (normalmente do axios)
 * @param {string} fallback mensagem específica da ação do usuário
 */
export const getApiErrorMessage = (error, fallback = GENERIC_ERROR_MESSAGE) => {
  const response = error?.response;
  const data = response?.data || {};

  const serverMessage = typeof data === 'string' ? '' : String(data.error || '').trim();

  if (isUserFacingMessage(serverMessage)) {
    return serverMessage;
  }

  if (!response) {
    const code = String(error?.code || '').toUpperCase();
    if (code === 'ECONNABORTED' || code === 'ETIMEDOUT') {
      return TIMEOUT_ERROR_MESSAGE;
    }
    return NETWORK_ERROR_MESSAGE;
  }

  const statusMessage = statusFallback(response.status);
  if (statusMessage) return statusMessage;

  // 5xx: falha interna, nunca mostrar detalhe.
  return fallback || GENERIC_ERROR_MESSAGE;
};

export default getApiErrorMessage;
