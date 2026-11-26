const CAMPOS_PESSOAIS_DESCARTADOS = new Set([
  'solicitantechamada',
  'nomesolicitante',
  'dadosvigentesenvolvidoschamada',
  'dadosvigentesenvolvidochamadav1',
  'envolvidos',
  'idusuarioinclusao',
  'nomeusuarioinclusao',
  'codigousuarioinclusao',
  'idcabineatendimentoligacao',
  'referenciaatendimentoligacao',
  'rg',
  'cpf',
  'nomemae',
  'nomepai',
  'datanascimento',
  'telefone',
  'celular',
  'email',
  'idunidadefederativarg',
]);

const CAMPOS_TEXTO_MASCARADOS = new Set([
  'descricao',
  'referencialocalfato',
  'complementolocalfato',
  'referencia',
  'descricaohistorico',
]);

function mascararDadosPessoaisTexto(texto: string): string {
  return texto
    .replace(/\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/g, '[CPF PROTEGIDO]')
    .replace(
      /(?:\+?55[\s.-]?)?(?:\(\d{2}\)|\b\d{2})[\s.-]+(?:9\d{4}|\d{4})[\s.-]?\d{4}\b|\b[1-9]{2}9\d{8}\b/g,
      '[CONTATO PROTEGIDO]'
    )
    .replace(/\b(?:WHATSAPP|ZAP|CONTATO|TEL(?:EFONE)?|CEL(?:ULAR)?)\s*[:=-]?\s*[\d\s().-]{8,16}\b/gi, '[CONTATO PROTEGIDO]');
}

function sanitizarValor(valor: unknown, profundidade: number, mascararTexto = false): unknown {
  if (profundidade > 25) return valor;

  if (typeof valor === 'string') {
    return mascararTexto ? mascararDadosPessoaisTexto(valor) : valor;
  }

  if (valor === null || typeof valor !== 'object') {
    return valor;
  }

  if (Array.isArray(valor)) {
    return valor.map((item) => sanitizarValor(item, profundidade + 1, mascararTexto));
  }

  const obj = valor as Record<string, unknown>;
  const limpo: Record<string, unknown> = {};

  for (const [chave, val] of Object.entries(obj)) {
    const chaveNorm = chave.toLowerCase();
    if (CAMPOS_PESSOAIS_DESCARTADOS.has(chaveNorm)) {
      continue;
    }
    const deveMascarar = mascararTexto || CAMPOS_TEXTO_MASCARADOS.has(chaveNorm);
    limpo[chave] = sanitizarValor(val, profundidade + 1, deveMascarar);
  }

  return limpo;
}

export function sanitizarPayloadCadLgpd<T = unknown>(payload: T): T {
  return sanitizarValor(payload, 0, false) as T;
}
