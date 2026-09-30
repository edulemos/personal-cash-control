import React, { useState, useEffect, useMemo } from 'react';
import {
  Sparkles,
  Upload,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  X,
  FileText,
  Filter,
  ArrowRight,
  Zap,
  Check,
  RefreshCw,
  Info,
  Calendar,
  Tag,
  User,
  DollarSign
} from 'lucide-react';
import clsx from 'clsx';

export default function ReconciliationModal({
  isOpen,
  onClose,
  onApplied,
  documentType = 'credit_card', // 'credit_card' | 'bank'
  contextData = {},
  categories = [],
  people = []
}) {
  const [step, setStep] = useState('select'); // 'select' | 'processing' | 'review' | 'success'
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successInfo, setSuccessInfo] = useState(null);

  // Dados da conciliação retornados pelo backend
  const [reconciliationResult, setReconciliationResult] = useState({
    institution: '',
    period: null,
    totalAmount: 0,
    items: []
  });

  // Filtro de visualização: 'all' | 'new' | 'divergent' | 'matched' | 'unmatched_in_app'
  const [activeTab, setActiveTab] = useState('all');

  // Itens em edição / seleção no modal
  const [items, setItems] = useState([]);
  const [selectedItemIds, setSelectedItemIds] = useState(new Set());

  // Reseta estado ao abrir
  useEffect(() => {
    if (isOpen) {
      setStep('select');
      setSelectedFile(null);
      setError(null);
      setSuccessInfo(null);
      setItems([]);
      setSelectedItemIds(new Set());
    }
  }, [isOpen]);

  // Abre o diálogo nativo do sistema operacional para selecionar o arquivo
  const handleSelectFile = async () => {
    setError(null);
    try {
      const res = await window.api.reconciliationSelectFile();
      if (!res.canceled && res.filePath) {
        setSelectedFile({
          path: res.filePath,
          name: res.fileName
        });
        // Inicia automaticamente o processamento
        processFile(res.filePath, res.fileName);
      }
    } catch (err) {
      setError('Erro ao selecionar arquivo: ' + err.message);
    }
  };

  // Envia para o backend ler com Gemini e comparar com o banco
  const processFile = async (filePath, fileName) => {
    setLoading(true);
    setStep('processing');
    setError(null);

    try {
      const params = {
        filePath,
        documentType,
        creditCardId: contextData.creditCardId,
        invoiceMonth: contextData.invoiceMonth,
        userId: contextData.userId,
        startDate: contextData.startDate,
        endDate: contextData.endDate
      };

      const res = await window.api.reconciliationProcess(params);
      if (!res.success) {
        throw new Error(res.error || 'Falha ao processar o documento com IA.');
      }

      setReconciliationResult({
        institution: res.institution || '',
        period: res.period || null,
        totalAmount: res.totalAmount || 0,
        items: res.items || []
      });

      // Inicializa os itens locais com seleção pré-marcada para os itens que precisam de ajuste
      const initialItems = (res.items || []).map(item => ({
        ...item,
        // Cópia editável dos campos
        editableDescription: item.description,
        editableDate: item.date,
        editableAmount: item.amount,
        editableCategoryId: item.categoryId || '',
        editablePersonId: item.personId || '',
        editableType: item.type || 'expense'
      }));

      setItems(initialItems);

      // Marca por padrão todos os itens 'new' e 'divergent'
      const defaultSelected = new Set(
        initialItems
          .filter(i => i.status === 'new' || i.status === 'divergent')
          .map(i => i.id)
      );
      setSelectedItemIds(defaultSelected);

      setStep('review');
    } catch (err) {
      console.error('Erro na conciliação:', err);
      setError(err.message || 'Erro inesperado na conciliação.');
      setStep('select');
    } finally {
      setLoading(false);
    }
  };

  // Atualiza um campo editável de um item na lista
  const handleItemFieldChange = (id, field, value) => {
    setItems(prev =>
      prev.map(item => {
        if (item.id === id) {
          return { ...item, [field]: value };
        }
        return item;
      })
    );
  };

  // Toggle de seleção de um item individual
  const toggleSelectItem = (id) => {
    setSelectedItemIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Selecionar ou desmarcar todos do tab atual
  const toggleSelectAllFiltered = () => {
    const visibleIds = filteredItems.filter(i => i.status === 'new' || i.status === 'divergent').map(i => i.id);
    const allSelected = visibleIds.every(id => selectedItemIds.has(id));

    setSelectedItemIds(prev => {
      const next = new Set(prev);
      if (allSelected) {
        visibleIds.forEach(id => next.delete(id));
      } else {
        visibleIds.forEach(id => next.add(id));
      }
      return next;
    });
  };

  // Resumo numérico dos itens
  const counts = useMemo(() => {
    const total = items.length;
    const newItems = items.filter(i => i.status === 'new').length;
    const divergent = items.filter(i => i.status === 'divergent').length;
    const matched = items.filter(i => i.status === 'matched').length;
    const unmatchedInApp = items.filter(i => i.status === 'unmatched_in_app').length;
    return { total, newItems, divergent, matched, unmatchedInApp };
  }, [items]);

  // Itens filtrados pela aba ativa
  const filteredItems = useMemo(() => {
    if (activeTab === 'new') return items.filter(i => i.status === 'new');
    if (activeTab === 'divergent') return items.filter(i => i.status === 'divergent');
    if (activeTab === 'matched') return items.filter(i => i.status === 'matched');
    if (activeTab === 'unmatched_in_app') return items.filter(i => i.status === 'unmatched_in_app');
    return items;
  }, [items, activeTab]);

  // Formata moeda BRL
  const formatMoney = (val) => {
    const num = Number(val) || 0;
    return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  // --- APLICAÇÃO DOS AJUSTES ---

  // Aplica todos os itens 'new' e 'divergent' (Autoajuste Total)
  const handleAutoAdjustAll = async () => {
    const itemsToApply = items
      .filter(i => i.status === 'new' || i.status === 'divergent')
      .map(i => ({
        action: i.status === 'new' ? 'insert' : 'update',
        existingId: i.existingId,
        date: i.editableDate,
        description: i.editableDescription,
        amount: Number(i.editableAmount),
        categoryId: i.editableCategoryId ? Number(i.editableCategoryId) : null,
        personId: i.editablePersonId ? Number(i.editablePersonId) : null,
        type: i.editableType || 'expense',
        installments: i.installments || 1,
        installmentNumber: i.installmentNumber || 1
      }));

    if (itemsToApply.length === 0) {
      alert('Não há itens pendentes para autoajuste.');
      return;
    }

    await applyChanges(itemsToApply);
  };

  // Aplica somente os itens marcados pelo usuário
  const handleApplySelected = async () => {
    const itemsToApply = items
      .filter(i => selectedItemIds.has(i.id) && (i.status === 'new' || i.status === 'divergent'))
      .map(i => ({
        action: i.status === 'new' ? 'insert' : 'update',
        existingId: i.existingId,
        date: i.editableDate,
        description: i.editableDescription,
        amount: Number(i.editableAmount),
        categoryId: i.editableCategoryId ? Number(i.editableCategoryId) : null,
        personId: i.editablePersonId ? Number(i.editablePersonId) : null,
        type: i.editableType || 'expense',
        installments: i.installments || 1,
        installmentNumber: i.installmentNumber || 1
      }));

    if (itemsToApply.length === 0) {
      alert('Nenhum item selecionado para aplicar.');
      return;
    }

    await applyChanges(itemsToApply);
  };

  const applyChanges = async (itemsToApply) => {
    setLoading(true);
    setError(null);
    try {
      const res = await window.api.reconciliationApply({
        documentType,
        creditCardId: contextData.creditCardId,
        invoiceMonth: contextData.invoiceMonth,
        userId: contextData.userId,
        itemsToApply
      });

      if (!res.success) {
        throw new Error(res.error || 'Erro ao salvar alterações no banco de dados.');
      }

      setSuccessInfo({
        inserted: res.countInserted || 0,
        updated: res.countUpdated || 0
      });
      setStep('success');

      if (onApplied) {
        onApplied();
      }
    } catch (err) {
      setError(err.message || 'Falha ao aplicar alterações.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* HEADER */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-accent/30 to-purple-500/30 text-accent flex items-center justify-center border border-accent/20">
              <Sparkles size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold flex items-center gap-2">
                Conciliação Inteligente com IA
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-accent/20 text-accent border border-accent/30">
                  Gemini Flash
                </span>
              </h3>
              <p className="text-xs text-text-muted">
                {documentType === 'credit_card'
                  ? `Fatura do Cartão: ${contextData.cardName || ''} (${contextData.invoiceMonth || ''})`
                  : `Extrato Bancário (${contextData.startDate || ''} a ${contextData.endDate || ''})`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-white p-2 rounded-lg hover:bg-white/5 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* BODY */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* MENSAGEM DE ERRO */}
          {error && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm flex items-start gap-3">
              <AlertTriangle size={18} className="shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold">Ocorreu um erro</p>
                <p className="text-xs text-rose-300/90 mt-0.5">{error}</p>
              </div>
            </div>
          )}

          {/* ETAPA 1: SELEÇÃO DE ARQUIVO */}
          {step === 'select' && (
            <div className="py-12 flex flex-col items-center justify-center text-center">
              <div className="w-20 h-20 rounded-2xl bg-accent/10 border border-accent/20 text-accent flex items-center justify-center mb-5">
                <Upload size={36} />
              </div>
              <h4 className="text-xl font-bold mb-2">Importar Fatura ou Extrato</h4>
              <p className="text-sm text-text-muted max-w-md mb-6">
                Carregue o arquivo em <strong className="text-white">PDF</strong>, <strong className="text-white">OFX</strong>, <strong className="text-white">CSV</strong> ou <strong className="text-white">Foto/Print</strong>. O Gemini fará a leitura e identificará o que falta ou diverge no seu controle.
              </p>

              <button
                onClick={handleSelectFile}
                disabled={loading}
                className="bg-accent hover:bg-accent-hover text-white px-6 py-3 rounded-xl font-medium text-sm transition-all shadow-lg shadow-accent/20 inline-flex items-center gap-2"
              >
                <Upload size={18} />
                Selecionar Arquivo do Computador
              </button>
            </div>
          )}

          {/* ETAPA 2: PROCESSANDO COM GEMINI */}
          {step === 'processing' && (
            <div className="py-16 flex flex-col items-center justify-center text-center space-y-4">
              <div className="relative">
                <div className="w-20 h-20 rounded-full border-4 border-accent/20 border-t-accent animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center text-accent">
                  <Sparkles size={24} className="animate-pulse" />
                </div>
              </div>
              <div className="space-y-1">
                <h4 className="text-lg font-bold">Lendo e conciliando documento com IA...</h4>
                <p className="text-sm text-text-muted max-w-sm">
                  O Gemini está extraindo os lançamentos do arquivo <strong className="text-white">{selectedFile?.name}</strong> e comparando com seus registros.
                </p>
              </div>
            </div>
          )}

          {/* ETAPA 3: REVISÃO E CONCILIAÇÃO */}
          {step === 'review' && (
            <div className="space-y-5">
              
              {/* CARDS DE RESUMO */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                  <p className="text-xs text-text-muted">Total no Documento</p>
                  <p className="text-lg font-bold text-white mt-1">
                    {formatMoney(reconciliationResult.totalAmount)}
                  </p>
                  <p className="text-[11px] text-text-muted mt-0.5 truncate">
                    {reconciliationResult.institution || 'Identificado pela IA'}
                  </p>
                </div>

                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4">
                  <p className="text-xs text-emerald-400 font-medium">Já Conciliados</p>
                  <p className="text-lg font-bold text-emerald-400 mt-1">{counts.matched}</p>
                  <p className="text-[11px] text-emerald-300/70 mt-0.5">Bate com o app</p>
                </div>

                <div className="bg-sky-500/10 border border-sky-500/20 rounded-xl p-4">
                  <p className="text-xs text-sky-400 font-medium">Novos a Lançar</p>
                  <p className="text-lg font-bold text-sky-400 mt-1">{counts.newItems}</p>
                  <p className="text-[11px] text-sky-300/70 mt-0.5">Ausentes no app</p>
                </div>

                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
                  <p className="text-xs text-amber-400 font-medium">Divergências</p>
                  <p className="text-lg font-bold text-amber-400 mt-1">{counts.divergent}</p>
                  <p className="text-[11px] text-amber-300/70 mt-0.5">Valor ou data diferente</p>
                </div>
              </div>

              {/* TABS DE FILTRO */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
                <div className="flex items-center gap-1.5 overflow-x-auto">
                  {[
                    { id: 'all', label: 'Todos', count: counts.total },
                    { id: 'new', label: 'Novos a Inserir', count: counts.newItems, color: 'text-sky-400' },
                    { id: 'divergent', label: 'Divergências', count: counts.divergent, color: 'text-amber-400' },
                    { id: 'matched', label: 'Conciliados', count: counts.matched, color: 'text-emerald-400' },
                    { id: 'unmatched_in_app', label: 'Apenas no App', count: counts.unmatchedInApp, color: 'text-text-muted' },
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={clsx(
                        'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5',
                        activeTab === tab.id
                          ? 'bg-accent text-white'
                          : 'bg-white/5 text-text-muted hover:bg-white/10 hover:text-white'
                      )}
                    >
                      <span>{tab.label}</span>
                      <span className={clsx(
                        'px-1.5 py-0.2 rounded-full text-[10px]',
                        activeTab === tab.id ? 'bg-black/30 text-white' : 'bg-white/10 text-white/70'
                      )}>
                        {tab.count}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Selecionar Todos / Desmarcar */}
                {(activeTab === 'all' || activeTab === 'new' || activeTab === 'divergent') && (
                  <button
                    onClick={toggleSelectAllFiltered}
                    className="text-xs text-text-muted hover:text-white transition-colors"
                  >
                    Marcar/Desmarcar Filtrados
                  </button>
                )}
              </div>

              {/* TABELA DE ITENS */}
              <div className="border border-white/10 rounded-xl overflow-hidden bg-black/20">
                <div className="overflow-x-auto max-h-[380px]">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-white/5 text-text-muted sticky top-0 z-10 backdrop-blur-md">
                      <tr>
                        <th className="p-3 w-10 text-center">Sel.</th>
                        <th className="p-3 w-28">Status</th>
                        <th className="p-3 w-28">Data</th>
                        <th className="p-3">Descrição</th>
                        <th className="p-3 w-40">Categoria</th>
                        <th className="p-3 w-32">Pessoa</th>
                        <th className="p-3 w-28 text-right">Valor</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-white/90">
                      {filteredItems.length === 0 ? (
                        <tr>
                          <td colSpan="7" className="p-8 text-center text-text-muted">
                            Nenhum registro encontrado nesta categoria.
                          </td>
                        </tr>
                      ) : (
                        filteredItems.map(item => {
                          const isActionable = item.status === 'new' || item.status === 'divergent';
                          const isSelected = selectedItemIds.has(item.id);

                          return (
                            <tr
                              key={item.id}
                              className={clsx(
                                'hover:bg-white/[0.02] transition-colors',
                                isSelected ? 'bg-accent/[0.04]' : ''
                              )}
                            >
                              {/* CHECKBOX */}
                              <td className="p-3 text-center">
                                {isActionable ? (
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => toggleSelectItem(item.id)}
                                    className="rounded border-white/20 text-accent focus:ring-accent w-4 h-4 bg-black/40"
                                  />
                                ) : (
                                  <span className="text-text-muted/40">•</span>
                                )}
                              </td>

                              {/* BADGE DE STATUS */}
                              <td className="p-3">
                                {item.status === 'new' && (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-sky-500/20 text-sky-400 border border-sky-500/30">
                                    + Novo
                                  </span>
                                )}
                                {item.status === 'divergent' && (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                                    Divergente
                                  </span>
                                )}
                                {item.status === 'matched' && (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                    ✓ Conciliado
                                  </span>
                                )}
                                {item.status === 'unmatched_in_app' && (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white/10 text-text-muted border border-white/15">
                                    Só no App
                                  </span>
                                )}
                              </td>

                              {/* DATA */}
                              <td className="p-3">
                                {isActionable ? (
                                  <input
                                    type="date"
                                    value={item.editableDate || ''}
                                    onChange={(e) => handleItemFieldChange(item.id, 'editableDate', e.target.value)}
                                    className="bg-black/30 border border-white/10 rounded px-2 py-1 text-xs text-white outline-none focus:border-accent"
                                  />
                                ) : (
                                  <span className="font-mono text-text-muted">{item.date}</span>
                                )}
                              </td>

                              {/* DESCRIÇÃO */}
                              <td className="p-3">
                                {isActionable ? (
                                  <div>
                                    <input
                                      type="text"
                                      value={item.editableDescription}
                                      onChange={(e) => handleItemFieldChange(item.id, 'editableDescription', e.target.value)}
                                      className="w-full bg-black/30 border border-white/10 rounded px-2 py-1 text-xs text-white outline-none focus:border-accent"
                                    />
                                    {item.status === 'divergent' && item.existing?.description && (
                                      <p className="text-[10px] text-amber-300/80 mt-0.5">
                                        No app: {item.existing.description}
                                      </p>
                                    )}
                                  </div>
                                ) : (
                                  <div>
                                    <span>{item.description}</span>
                                    {item.installments > 1 && (
                                      <span className="ml-1.5 text-[10px] text-text-muted">
                                        ({item.installmentNumber}/{item.installments})
                                      </span>
                                    )}
                                  </div>
                                )}
                              </td>

                              {/* CATEGORIA */}
                              <td className="p-3">
                                {isActionable ? (
                                  <select
                                    value={item.editableCategoryId}
                                    onChange={(e) => handleItemFieldChange(item.id, 'editableCategoryId', e.target.value)}
                                    className="w-full bg-black/30 border border-white/10 rounded px-2 py-1 text-xs text-white outline-none focus:border-accent"
                                  >
                                    <option value="">Sem Categoria</option>
                                    {categories.map(c => (
                                      <option key={c.id} value={c.id}>
                                        {c.name}
                                      </option>
                                    ))}
                                  </select>
                                ) : (
                                  <span className="text-text-muted">{item.categoryName || 'Sem Categoria'}</span>
                                )}
                              </td>

                              {/* PESSOA */}
                              <td className="p-3">
                                {isActionable ? (
                                  <select
                                    value={item.editablePersonId}
                                    onChange={(e) => handleItemFieldChange(item.id, 'editablePersonId', e.target.value)}
                                    className="w-full bg-black/30 border border-white/10 rounded px-2 py-1 text-xs text-white outline-none focus:border-accent"
                                  >
                                    <option value="">Ninguém</option>
                                    {people.map(p => (
                                      <option key={p.id} value={p.id}>
                                        {p.name}
                                      </option>
                                    ))}
                                  </select>
                                ) : (
                                  <span className="text-text-muted">{item.personName || '-'}</span>
                                )}
                              </td>

                              {/* VALOR */}
                              <td className="p-3 text-right">
                                {isActionable ? (
                                  <div className="flex flex-col items-end">
                                    <input
                                      type="number"
                                      step="0.01"
                                      value={item.editableAmount}
                                      onChange={(e) => handleItemFieldChange(item.id, 'editableAmount', e.target.value)}
                                      className={`w-24 text-right bg-black/30 border rounded px-2 py-1 text-xs font-mono font-medium outline-none focus:border-accent ${
                                        Number(item.editableAmount) < 0
                                          ? 'text-emerald-400 border-emerald-500/40 font-bold'
                                          : 'text-white border-white/10'
                                      }`}
                                    />
                                    {Number(item.editableAmount) < 0 && (
                                      <span className="text-[10px] text-emerald-400 font-medium mt-0.5">
                                        Crédito / Estorno
                                      </span>
                                    )}
                                    {item.status === 'divergent' && item.existing?.amount !== undefined && (
                                      <p className="text-[10px] text-amber-300/80 mt-0.5">
                                        No app: {formatMoney(item.existing.amount)}
                                      </p>
                                    )}
                                  </div>
                                ) : (
                                  <div className="flex flex-col items-end">
                                    <span className={`font-mono font-medium ${Number(item.amount) < 0 ? 'text-emerald-400 font-bold' : ''}`}>
                                      {formatMoney(item.amount)}
                                    </span>
                                    {Number(item.amount) < 0 && (
                                      <span className="text-[10px] text-emerald-400 font-medium mt-0.5">
                                        Crédito / Estorno
                                      </span>
                                    )}
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ETAPA 4: SUCESSO */}
          {step === 'success' && (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                <Check size={32} />
              </div>
              <div className="space-y-1">
                <h4 className="text-xl font-bold text-white">Conciliação Concluída com Sucesso!</h4>
                <p className="text-sm text-text-muted">
                  {successInfo?.inserted || 0} novos lançamentos inseridos e {successInfo?.updated || 0} registros atualizados.
                </p>
              </div>
              <button
                onClick={onClose}
                className="bg-accent hover:bg-accent-hover text-white px-6 py-2.5 rounded-xl font-medium text-sm transition-colors mt-4"
              >
                Concluir e Fechar
              </button>
            </div>
          )}

        </div>

        {/* FOOTER */}
        {step === 'review' && (
          <div className="p-5 border-t border-white/10 flex items-center justify-between bg-white/[0.02]">
            <button
              onClick={() => setStep('select')}
              disabled={loading}
              className="text-text-muted hover:text-white text-xs transition-colors flex items-center gap-1.5"
            >
              <RefreshCw size={14} /> Selecionar outro arquivo
            </button>

            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2 rounded-xl text-text-muted hover:text-white text-sm transition-colors"
              >
                Cancelar
              </button>

              <button
                onClick={handleApplySelected}
                disabled={loading || selectedItemIds.size === 0}
                className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors disabled:opacity-40"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : `Aplicar Selecionados (${selectedItemIds.size})`}
              </button>

              <button
                onClick={handleAutoAdjustAll}
                disabled={loading || (counts.newItems === 0 && counts.divergent === 0)}
                className="bg-gradient-to-r from-accent to-accent-hover hover:opacity-95 text-white px-5 py-2 rounded-xl text-sm font-semibold transition-all shadow-lg shadow-accent/20 flex items-center gap-2 disabled:opacity-40"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />}
                Autoajuste Total ({counts.newItems + counts.divergent})
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
