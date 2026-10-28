import React, { useState } from 'react';
import { ChamadaAtiva } from '../types/cbm';
import { enriquecerChamada, extrairChamadasDeJson } from '../services/cbmStorage';
import { UploadCloud, FileText, CheckCircle2, AlertCircle, X, Download } from 'lucide-react';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: (novasChamadas: ChamadaAtiva[]) => void;
}

export const ImportModal: React.FC<ImportModalProps> = ({
  isOpen,
  onClose,
  onImportSuccess,
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  if (!isOpen) return null;

  const processarTextoJSON = (text: string) => {
    try {
      const parsed = JSON.parse(text);
      const itens = extrairChamadasDeJson(parsed);

      if (itens.length === 0) {
        throw new Error('O arquivo JSON foi lido, porém nenhuma chamada ativa foi encontrada na estrutura.');
      }

      const chamadasEnriquecidas: ChamadaAtiva[] = itens.map((item) => enriquecerChamada(item));
      setSucesso(`${chamadasEnriquecidas.length} ocorrências importadas e enriquecidas com sucesso!`);
      setTimeout(() => {
        onImportSuccess(chamadasEnriquecidas);
        onClose();
      }, 1200);
    } catch (err: any) {
      setErro(`Erro ao processar JSON: ${err.message || err}`);
    } finally {
      setCarregando(false);
    }
  };

  const processarTextoCSV = (text: string) => {
    try {
      const linhas = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
      if (linhas.length < 2) {
        throw new Error('O arquivo CSV deve conter ao menos cabeçalho e 1 linha de dados.');
      }

      // Detectar separador (; ou ,)
      const primeiraLinha = linhas[0];
      const sep = primeiraLinha.includes(';') ? ';' : ',';
      const cabecalhos = primeiraLinha.split(sep).map((c) => c.replace(/"/g, '').trim().toLowerCase());

      const indexOcorrencia = cabecalhos.findIndex((c) => c.includes('ocorrencia') || c.includes('numero'));
      const indexNatureza = cabecalhos.findIndex((c) => c.includes('natureza') || c.includes('descricao'));
      const indexMunicipio = cabecalhos.findIndex((c) => c.includes('municipio') || c.includes('cidade'));
      const indexPrioridade = cabecalhos.findIndex((c) => c.includes('prioridade'));
      const indexLat = cabecalhos.findIndex((c) => c.includes('lat'));
      const indexLng = cabecalhos.findIndex((c) => c.includes('lon') || c.includes('lng'));
      const indexCob = cabecalhos.findIndex((c) => c.includes('cob'));
      const indexBbm = cabecalhos.findIndex((c) => c.includes('bbm'));

      const chamadasEnriquecidas: ChamadaAtiva[] = [];

      for (let i = 1; i < linhas.length; i++) {
        const valores = linhas[i].split(sep).map((v) => v.replace(/^"|"$/g, '').trim());
        if (valores.length === 0 || !valores[0]) continue;

        const num = indexOcorrencia >= 0 ? valores[indexOcorrencia] : `O-2026-${10000 + i}`;
        const nat = indexNatureza >= 0 ? valores[indexNatureza] : 'Atendimento CBMMG';
        const mun = indexMunicipio >= 0 ? valores[indexMunicipio] : 'Belo Horizonte';
        const prio = indexPrioridade >= 0 ? valores[indexPrioridade] : 'Média';
        const lat = indexLat >= 0 && valores[indexLat] ? parseFloat(valores[indexLat]) : null;
        const lng = indexLng >= 0 && valores[indexLng] ? parseFloat(valores[indexLng]) : null;
        const cob = indexCob >= 0 && valores[indexCob] ? valores[indexCob] : undefined;
        const bbm = indexBbm >= 0 && valores[indexBbm] ? valores[indexBbm] : undefined;

        chamadasEnriquecidas.push(
          enriquecerChamada({
            numeroOcorrencia: num,
            descricaoNatureza: nat,
            prioridade: prio,
            endereco: { municipio: mun, uf: 'MG' },
            latitude: isNaN(lat as number) ? null : lat,
            longitude: isNaN(lng as number) ? null : lng,
            cob,
            bbm,
          })
        );
      }

      setSucesso(`${chamadasEnriquecidas.length} ocorrências importadas do CSV com sucesso!`);
      setTimeout(() => {
        onImportSuccess(chamadasEnriquecidas);
        onClose();
      }, 1200);
    } catch (err: any) {
      setErro(`Erro ao processar CSV: ${err.message || err}`);
    } finally {
      setCarregando(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErro(null);
    setSucesso(null);
    setCarregando(true);

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (file.name.endsWith('.json')) {
        processarTextoJSON(content);
      } else {
        processarTextoCSV(content);
      }
    };
    reader.onerror = () => {
      setErro('Falha na leitura do arquivo.');
      setCarregando(false);
    };
    reader.readAsText(file);
  };

  const baixarExemploJSON = () => {
    const exemplo = {
      dataset: 'chamadas',
      fonte: 'banco',
      atualizado_em: new Date().toISOString(),
      total: 2,
      dados: [
        {
          idChamada: '2026-099123',
          numeroOcorrencia: 'O-2026-099123',
          dataHoraAbertura: new Date().toISOString(),
          codigoSituacaoChamada: 'E',
          codigoSituacaoAtendimentoChamada: 'NL',
          codigoOrigemChamada: 'L',
          prioridade: 'Alta',
          descricaoNatureza: 'Incêndio em Vegetação / Florestal',
          grupoNatureza: 'Incêndio',
          latitude: -19.9238,
          longitude: -43.9405,
          endereco: {
            logradouro: 'Avenida Afonso Pena',
            bairro: 'Centro',
            municipio: 'Belo Horizonte',
            uf: 'MG',
          },
          recursos: [
            {
              prefixo: 'ABT-10',
              tipo: 'Auto Bomba Tanque',
              componentes: 4,
            },
          ],
        },
      ],
    };

    const blob = new Blob([JSON.stringify(exemplo, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'modelo_importacao_cad_cbmmg.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UploadCloud className="w-5 h-5 text-red-500" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Importar Dados do CAD CBMMG (JSON / CSV)
            </h3>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 text-xs font-sans">
          <p className="text-slate-300">
            Você pode carregar arquivos brutos exportados da <strong>API CAD CBMMG</strong> ou planilhas CSV.
            Os dados serão automaticamente enriquecidos com o catálogo oficial de naturezas e unidades militares.
          </p>

          {/* Upload Area */}
          <label
            onDragOver={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragActive(false);
              const file = e.dataTransfer.files?.[0];
              if (file) {
                const fakeEvent = { target: { files: [file] } } as any;
                handleFileChange(fakeEvent);
              }
            }}
            className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition ${
              dragActive
                ? 'border-red-500 bg-red-950/20'
                : 'border-slate-700 bg-slate-950/50 hover:border-slate-500'
            }`}
          >
            <input
              type="file"
              accept=".json,.csv"
              onChange={handleFileChange}
              className="hidden"
            />
            <FileText className="w-10 h-10 text-red-500 mb-2 opacity-80" />
            <span className="font-semibold text-slate-200">
              Clique para selecionar ou arraste o arquivo aqui
            </span>
            <span className="text-slate-500 text-[11px] mt-1">
              Formatos aceitos: <strong>.JSON</strong> (API CAD) ou <strong>.CSV</strong>
            </span>
          </label>

          {/* Feedback Messages */}
          {carregando && (
            <div className="flex items-center gap-2 text-amber-400 bg-amber-950/20 p-2.5 rounded-lg border border-amber-900/40">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              <span>Processando e enriquecendo dados com catálogo de naturezas...</span>
            </div>
          )}

          {sucesso && (
            <div className="flex items-center gap-2 text-emerald-400 bg-emerald-950/20 p-2.5 rounded-lg border border-emerald-900/40">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{sucesso}</span>
            </div>
          )}

          {erro && (
            <div className="flex items-center gap-2 text-red-400 bg-red-950/20 p-2.5 rounded-lg border border-red-900/40">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{erro}</span>
            </div>
          )}

          {/* Helper Download */}
          <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
            <span>Deseja testar com a estrutura padrão?</span>
            <button
              onClick={baixarExemploJSON}
              className="text-amber-400 hover:text-amber-300 flex items-center gap-1 font-semibold"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Baixar Modelo JSON</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
