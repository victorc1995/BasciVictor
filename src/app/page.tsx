"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Wallet,
  PiggyBank,
  BadgeDollarSign,
  CreditCard,
  Plus,
  Trash2,
  Upload,
  CheckCircle2,
  ShieldCheck,
  Calculator,
  ArrowRightLeft,
  Download,
  FileText,
  AlertCircle,
} from "lucide-react";
import {
  CartaoBanco,
  CompraCartao,
  ContaCasa,
  MovimentacaoPoupanca,
  Pagador,
  ParametrosSalario,
  TABELA_RS_2026,
  calcularContrachequeRS,
  formatarMoeda,
} from "@/lib/finance-engine";
import {
  INITIAL_COMPRAS_CARTAO,
  INITIAL_CONTAS_CASA,
  INITIAL_POUPANCA,
  INITIAL_SALARIO_LETICIA,
  INITIAL_SALARIO_VICTOR,
} from "@/lib/initial-data";
import { extrairComprasDePDF } from "@/lib/pdf-parser";

type AbaAtiva = "inicio" | "poupanca" | "salarios" | "cartoes";

export default function DashboardPage() {
  const [aba, setAba] = useState<AbaAtiva>("inicio");
  const [mesSelecionado, setMesSelecionado] = useState<string>("2026-11");
  const [carregado, setCarregado] = useState(false);

  // Estados principais (persistidos em LocalStorage + Backup JSON)
  const [contasCasa, setContasCasa] = useState<ContaCasa[]>(INITIAL_CONTAS_CASA);
  const [poupanca, setPoupanca] = useState<MovimentacaoPoupanca[]>(INITIAL_POUPANCA);
  const [salVictor, setSalVictor] = useState<ParametrosSalario>(INITIAL_SALARIO_VICTOR);
  const [salLeticia, setSalLeticia] = useState<ParametrosSalario>(INITIAL_SALARIO_LETICIA);
  const [comprasCartao, setComprasCartao] = useState<CompraCartao[]>(INITIAL_COMPRAS_CARTAO);

  // Modal de inclusão de contas / upload de PDF na Tela Inicial
  const [modalAberto, setModalAberto] = useState(false);
  const [tipoInclusao, setTipoInclusao] = useState<"conta" | "fatura_pdf">("conta");
  const [novaDescricao, setNovaDescricao] = useState("");
  const [novaCategoria, setNovaCategoria] = useState<ContaCasa["categoria"]>("Luz");
  const [novoValor, setNovoValor] = useState("");
  const [novoVencimento, setNovoVencimento] = useState("2026-11-20");
  const [novoPagador, setNovoPagador] = useState<Pagador>("DIV");

  // Upload PDF
  const [bancoPDF, setBancoPDF] = useState<CartaoBanco>("C6 Bank");
  const [statusPDF, setStatusPDF] = useState<string>("");

  // Formulário Poupança
  const [poupData, setPoupData] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [poupDesc, setPoupDesc] = useState("");
  const [poupTipo, setPoupTipo] = useState<"ENTRADA" | "SAIDA">("ENTRADA");
  const [poupValor, setPoupValor] = useState("");
  const [poupCat, setPoupCat] = useState<MovimentacaoPoupanca["categoria"]>("Metas / Projetos");

  // Filtro Cartões
  const [bancoFiltro, setBancoFiltro] = useState<CartaoBanco>("C6 Bank");

  // Carrega dados salvos localmente
  useEffect(() => {
    const saved = localStorage.getItem("financas_victor_leticia_v2");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.contasCasa) setContasCasa(parsed.contasCasa);
        if (parsed.poupanca) {
          const limpos = parsed.poupanca.map((p: any) => ({
            ...p,
            categoria: (p.categoria === "Carro / Creta" || p.categoria === "Carro/Creta") ? "Metas / Projetos" : p.categoria,
          }));
          setPoupanca(limpos);
        }
        if (parsed.salVictor) setSalVictor(parsed.salVictor);
        if (parsed.salLeticia) setSalLeticia(parsed.salLeticia);
        if (parsed.comprasCartao) setComprasCartao(parsed.comprasCartao);
      } catch (e) {
        console.error("Erro ao ler dados salvos:", e);
      }
    }
    setCarregado(true);
  }, []);

  // Salva automaticamente a cada alteração
  useEffect(() => {
    if (!carregado) return;
    localStorage.setItem(
      "financas_victor_leticia_v2",
      JSON.stringify({ contasCasa, poupanca, salVictor, salLeticia, comprasCartao })
    );
  }, [contasCasa, poupanca, salVictor, salLeticia, comprasCartao, carregado]);

  // Cálculos de Salários (Legislação RS 2026)
  const resVictor = useMemo(() => calcularContrachequeRS(salVictor), [salVictor]);
  const resLeticia = useMemo(() => calcularContrachequeRS(salLeticia), [salLeticia]);
  const salarioLiquidoTotalCasal = resVictor.totalDisponivelMes + resLeticia.totalDisponivelMes;

  // Cálculos de Poupança (Trava de R$ 5.000,00 de Reserva de Emergência)
  const resumoPoupanca = useMemo(() => {
    const totalEntradas = poupanca.filter((p) => p.tipo === "ENTRADA").reduce((acc, p) => acc + p.valor, 0);
    const totalSaidas = poupanca.filter((p) => p.tipo === "SAIDA").reduce((acc, p) => acc + p.valor, 0);
    const saldoTotal = totalEntradas - totalSaidas;
    const reservaEmergencia = 5000;
    const saldoLivreMetas = Math.max(0, saldoTotal - reservaEmergencia);
    return { totalEntradas, totalSaidas, saldoTotal, reservaEmergencia, saldoLivreMetas };
  }, [poupanca]);

  // Cálculos de Cartões no Mês Selecionado
  const resumoCartoesMes = useMemo(() => {
    const doMes = comprasCartao.filter((c) => c.mesFatura === mesSelecionado);
    let vicDireto = 0;
    let leDireto = 0;
    let divTotal = 0;

    doMes.forEach((item) => {
      if (item.quemPaga === "VIC") vicDireto += item.valor;
      else if (item.quemPaga === "LE") leDireto += item.valor;
      else divTotal += item.valor;
    });

    const metadeDiv = divTotal / 2;
    return {
      vicDireto,
      leDireto,
      divTotal,
      metadeDiv,
      totalVictorCartoes: vicDireto + metadeDiv,
      totalLeticiaCartoes: leDireto + metadeDiv,
      totalGeralCartoes: vicDireto + leDireto + divTotal,
    };
  }, [comprasCartao, mesSelecionado]);

  // Cálculos de Contas da Casa + Cartões (Gasto Total de Cada Um no Mês)
  const resumoMensalCasal = useMemo(() => {
    const contasDoMes = contasCasa.filter((c) => c.mesAno === mesSelecionado);
    let casaVic = 0;
    let casaLe = 0;
    let casaDiv = 0;

    contasDoMes.forEach((c) => {
      if (c.quemPaga === "VIC") casaVic += c.valor;
      else if (c.quemPaga === "LE") casaLe += c.valor;
      else casaDiv += c.valor;
    });

    const totalGastoVictor = casaVic + casaDiv / 2 + resumoCartoesMes.totalVictorCartoes;
    const totalGastoLeticia = casaLe + casaDiv / 2 + resumoCartoesMes.totalLeticiaCartoes;
    const totalGastoCasal = totalGastoVictor + totalGastoLeticia;

    return {
      contasDoMes,
      totalGastoVictor,
      totalGastoLeticia,
      totalGastoCasal,
      saldoVictor: resVictor.totalDisponivelMes - totalGastoVictor,
      saldoLeticia: resLeticia.totalDisponivelMes - totalGastoLeticia,
    };
  }, [contasCasa, mesSelecionado, resumoCartoesMes, resVictor, resLeticia]);

  // Handlers
  const adicionarContaCasa = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(novoValor.replace(",", "."));
    if (!novaDescricao || isNaN(val) || val <= 0) return;

    const nova: ContaCasa = {
      id: Date.now().toString(),
      mesAno: mesSelecionado,
      descricao: novaDescricao,
      categoria: novaCategoria,
      valor: val,
      vencimento: novoVencimento,
      quemPaga: novoPagador,
      pago: false,
    };
    setContasCasa((prev) => [nova, ...prev]);
    setNovaDescricao("");
    setNovoValor("");
    setModalAberto(false);
  };

  const handleUploadFaturaPDF = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setStatusPDF("Lendo PDF da fatura e identificando compras...");
    try {
      const extraidas = await extrairComprasDePDF(file, bancoPDF, mesSelecionado);
      if (extraidas.length === 0) {
        setStatusPDF("Não foi possível detectar linhas automáticas neste PDF (pode ser imagem escaneada). Adicione manualmente na aba Cartões.");
        return;
      }
      const comIds: CompraCartao[] = extraidas.map((item, idx) => ({
        ...item,
        id: `${Date.now()}-${idx}`,
      }));
      setComprasCartao((prev) => [...comIds, ...prev]);

      // Também registra um resumo na lista de contas da casa para visibilidade
      const somaFatura = comIds.reduce((acc, i) => acc + i.valor, 0);
      setContasCasa((prev) => [
        {
          id: `fat-${Date.now()}`,
          mesAno: mesSelecionado,
          descricao: `Fatura ${bancoPDF} (${comIds.length} lançamentos via PDF)`,
          categoria: "Fatura Cartão",
          valor: somaFatura,
          vencimento: `${mesSelecionado}-01`,
          quemPaga: "DIV",
          pago: false,
        },
        ...prev,
      ]);

      setStatusPDF(`Sucesso! ${comIds.length} lançamentos importados para a aba Cartões (${bancoPDF}).`);
      setTimeout(() => {
        setModalAberto(false);
        setStatusPDF("");
        setAba("cartoes");
        setBancoFiltro(bancoPDF);
      }, 1500);
    } catch (err) {
      console.error(err);
      setStatusPDF("Erro ao processar o PDF. Verifique se o arquivo não possui senha.");
    }
  };

  const adicionarMovPoupanca = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(poupValor.replace(",", "."));
    if (!poupDesc || isNaN(val) || val <= 0) return;
    setPoupanca((prev) => [
      {
        id: Date.now().toString(),
        data: poupData || new Date().toISOString().slice(0, 10),
        descricao: poupDesc,
        tipo: poupTipo,
        valor: val,
        categoria: poupCat,
      },
      ...prev,
    ]);
    setPoupDesc("");
    setPoupValor("");
  };

  const alterarPagadorCompra = (id: string, novoPagador: Pagador) => {
    setComprasCartao((prev) => prev.map((c) => (c.id === id ? { ...c, quemPaga: novoPagador } : c)));
  };

  const exportarBackup = () => {
    const blob = new Blob(
      [JSON.stringify({ contasCasa, poupanca, salVictor, salLeticia, comprasCartao }, null, 2)],
      { type: "application/json" }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `backup-financas-victor-leticia-${mesSelecionado}.json`;
    a.click();
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-16">
      {/* Header Superior */}
      <header className="bg-slate-900 text-white shadow-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-emerald-400" />
              Gestão Financeira — Victor & Letícia
            </h1>
            <p className="text-xs text-slate-400">CBMRS / BMRS • Sistema Autônomo Sem Planilha</p>
          </div>

          <div className="flex items-center gap-3">
            <label className="text-xs text-slate-300">Mês Referência:</label>
            <input
              type="month"
              value={mesSelecionado}
              onChange={(e) => setMesSelecionado(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-white text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:border-emerald-400"
            />
            <button
              onClick={exportarBackup}
              title="Baixar backup dos dados"
              className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 hover:text-white transition"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Navegação das 4 Abas */}
        <nav className="max-w-7xl mx-auto px-4 flex gap-1 overflow-x-auto border-t border-slate-800">
          {[
            { id: "inicio", label: "1. Tela Inicial", icon: Wallet },
            { id: "poupanca", label: "2. Poupança & Metas", icon: PiggyBank },
            { id: "salarios", label: "3. Salários (Legislação RS)", icon: BadgeDollarSign },
            { id: "cartoes", label: "4. Cartões (C6 & Sicredi)", icon: CreditCard },
          ].map((item) => {
            const Icon = item.icon;
            const ativo = aba === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setAba(item.id as AbaAtiva)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition ${
                  ativo
                    ? "border-emerald-400 text-emerald-400 bg-slate-800/50"
                    : "border-transparent text-slate-400 hover:text-white"
                }`}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </button>
            );
          })}
        </nav>
      </header>

      <main className="max-w-7xl mx-auto px-4 pt-6">
        {/* ========================================================= */}
        {/* ABA 1: TELA INICIAL                                       */}
        {/* ========================================================= */}
        {aba === "inicio" && (
          <div className="space-y-6">
            {/* Barra de Ação Principal */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
              <div>
                <h2 className="text-lg font-bold text-slate-800">Resumo Geral do Mês ({mesSelecionado})</h2>
                <p className="text-sm text-slate-500">
                  Consolidado automático dos salários líquidos, faturas importadas e contas da casa.
                </p>
              </div>
              <button
                onClick={() => setModalAberto(true)}
                className="inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-5 py-3 rounded-xl shadow-sm transition"
              >
                <Plus className="w-5 h-5" />
                Incluir Contas / Fatura PDF
              </button>
            </div>

            {/* 4 Cards Principais (KPIs) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
                <span className="text-xs font-semibold uppercase text-slate-400">Salário Líquido Total (Casal)</span>
                <p className="text-2xl font-extrabold text-emerald-600 mt-1">
                  {formatarMoeda(salarioLiquidoTotalCasal)}
                </p>
                <p className="text-xs text-slate-500 mt-2">
                  Victor: {formatarMoeda(resVictor.totalDisponivelMes)} • Letícia: {formatarMoeda(resLeticia.totalDisponivelMes)}
                </p>
              </div>

              <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
                <span className="text-xs font-semibold uppercase text-slate-400">Gastos Victor no Mês</span>
                <p className="text-2xl font-extrabold text-blue-600 mt-1">
                  {formatarMoeda(resumoMensalCasal.totalGastoVictor)}
                </p>
                <p className="text-xs text-slate-500 mt-2">
                  Saldo restante: <strong className={resumoMensalCasal.saldoVictor >= 0 ? "text-emerald-600" : "text-rose-600"}>{formatarMoeda(resumoMensalCasal.saldoVictor)}</strong>
                </p>
              </div>

              <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
                <span className="text-xs font-semibold uppercase text-slate-400">Gastos Letícia no Mês</span>
                <p className="text-2xl font-extrabold text-purple-600 mt-1">
                  {formatarMoeda(resumoMensalCasal.totalGastoLeticia)}
                </p>
                <p className="text-xs text-slate-500 mt-2">
                  Saldo restante: <strong className={resumoMensalCasal.saldoLeticia >= 0 ? "text-emerald-600" : "text-rose-600"}>{formatarMoeda(resumoMensalCasal.saldoLeticia)}</strong>
                </p>
              </div>

              <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
                <span className="text-xs font-semibold uppercase text-slate-400">Poupança Atualizada</span>
                <p className="text-2xl font-extrabold text-slate-900 mt-1">
                  {formatarMoeda(resumoPoupanca.saldoTotal)}
                </p>
                <p className="text-xs text-amber-600 font-medium mt-2">
                  Livre p/ Metas: {formatarMoeda(resumoPoupanca.saldoLivreMetas)} (R$ 5k blindados)
                </p>
              </div>
            </div>

            {/* Lista de Contas da Casa do Mês */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-bold text-slate-800">Contas da Casa & Faturas Lançadas ({mesSelecionado})</h3>
                <span className="text-xs text-slate-500">{resumoMensalCasal.contasDoMes.length} itens</span>
              </div>
              <div className="divide-y divide-slate-100">
                {resumoMensalCasal.contasDoMes.length === 0 ? (
                  <p className="p-6 text-sm text-slate-500 text-center">Nenhuma conta lançada para este mês ainda.</p>
                ) : (
                  resumoMensalCasal.contasDoMes.map((conta) => (
                    <div key={conta.id} className="px-6 py-3.5 flex items-center justify-between hover:bg-slate-50">
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={conta.pago}
                          onChange={() =>
                            setContasCasa((prev) =>
                              prev.map((c) => (c.id === conta.id ? { ...c, pago: !c.pago } : c))
                            )
                          }
                          className="w-4 h-4 accent-emerald-600 rounded"
                        />
                        <div>
                          <p className={`text-sm font-semibold ${conta.pago ? "line-through text-slate-400" : "text-slate-800"}`}>
                            {conta.descricao}
                          </p>
                          <p className="text-xs text-slate-500">
                            {conta.categoria} • Vencimento: {conta.vencimento} •{" "}
                            <span className="font-semibold text-slate-700">
                              {conta.quemPaga === "DIV" ? "Dividido (50/50)" : conta.quemPaga === "VIC" ? "100% Victor" : "100% Letícia"}
                            </span>
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="font-bold text-slate-800">{formatarMoeda(conta.valor)}</span>
                        <button
                          onClick={() => setContasCasa((prev) => prev.filter((c) => c.id !== conta.id))}
                          className="text-slate-400 hover:text-rose-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* ABA 2: POUPANÇA DIRETA                                    */}
        {/* ========================================================= */}
        {aba === "poupanca" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-sm">
                <span className="text-xs uppercase text-slate-400 font-semibold">Saldo Total na Poupança</span>
                <p className="text-3xl font-extrabold mt-1">{formatarMoeda(resumoPoupanca.saldoTotal)}</p>
              </div>
              <div className="bg-amber-50 border border-amber-200 p-6 rounded-2xl">
                <span className="text-xs uppercase text-amber-700 font-semibold">Reserva de Emergência (Trava)</span>
                <p className="text-3xl font-extrabold text-amber-800 mt-1">{formatarMoeda(resumoPoupanca.reservaEmergencia)}</p>
                <p className="text-xs text-amber-700 mt-1">Valor intocável de segurança</p>
              </div>
              <div className="bg-emerald-50 border border-emerald-200 p-6 rounded-2xl">
                <span className="text-xs uppercase text-emerald-700 font-semibold">Saldo Livre para Metas</span>
                <p className="text-3xl font-extrabold text-emerald-700 mt-1">{formatarMoeda(resumoPoupanca.saldoLivreMetas)}</p>
                <p className="text-xs text-emerald-700 mt-1">Disponível após descontar reserva</p>
              </div>
            </div>

            {/* Formulário Direto na Tela com Seleção Manual de Data */}
            <form onSubmit={adicionarMovPoupanca} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 items-end">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Data</label>
                <input
                  type="date"
                  required
                  value={poupData}
                  onChange={(e) => setPoupData(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm font-medium text-slate-800"
                />
              </div>
              <div className="lg:col-span-2">
                <label className="block text-xs font-semibold text-slate-600 mb-1">Descrição do Lançamento</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Diárias Op. Verão ou Difa Banrisul"
                  value={poupDesc}
                  onChange={(e) => setPoupDesc(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Tipo</label>
                <select
                  value={poupTipo}
                  onChange={(e) => setPoupTipo(e.target.value as "ENTRADA" | "SAIDA")}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm font-medium"
                >
                  <option value="ENTRADA">+ Entrada (Guardar)</option>
                  <option value="SAIDA">- Saída (Resgatar)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Valor (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="0,00"
                  value={poupValor}
                  onChange={(e) => setPoupValor(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm"
                />
              </div>
              <button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2 px-4 rounded-xl text-sm transition-colors shadow-sm">
                Registrar
              </button>
            </form>

            {/* Histórico de Movimentações */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 font-bold text-slate-800">Extrato da Poupança</div>
              <div className="divide-y divide-slate-100">
                {poupanca.map((mov) => (
                  <div key={mov.id} className="px-6 py-3.5 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{mov.descricao}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <input
                          type="date"
                          value={mov.data}
                          onChange={(e) => {
                            const novaData = e.target.value;
                            setPoupanca((prev) =>
                              prev.map((p) => (p.id === mov.id ? { ...p, data: novaData } : p))
                            );
                          }}
                          className="text-xs text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded px-1.5 py-0.5 cursor-pointer"
                          title="Clique para editar a data deste lançamento"
                        />
                        <span className="text-xs text-slate-400">• {mov.categoria}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className={`font-bold ${mov.tipo === "ENTRADA" ? "text-emerald-600" : "text-rose-600"}`}>
                        {mov.tipo === "ENTRADA" ? "+" : "-"} {formatarMoeda(mov.valor)}
                      </span>
                      <button onClick={() => setPoupanca((prev) => prev.filter((p) => p.id !== mov.id))} className="text-slate-400 hover:text-rose-600">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* ABA 3: SALÁRIOS (LEGISLAÇÃO VIGENTE RS - VICTOR & LETÍCIA)  */}
        {/* ========================================================= */}
        {aba === "salarios" && (
          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 p-4 rounded-2xl flex items-start gap-3">
              <Calculator className="w-5 h-5 text-blue-700 mt-0.5 shrink-0" />
              <div className="text-xs text-blue-900 space-y-1">
                <p className="font-bold">Base Legal Aplicada Automaticamente (RS & Federal 2026):</p>
                <p>
                  • <strong>Subsídio Sd 1ª Classe (CBMRS / BMRS):</strong> R$ 6.429,95 vigente desde 01/10/2026 (Lei Estadual nº 16.165/2024 - 3ª parcela de 4%, editável abaixo caso haja parcela completiva).
                </p>
                <p>
                  • <strong>Descontos Legais:</strong> Previdência Militar RS (SPSMER - LC 15.602/21), IPE Saúde (3,6% titular) e IRRF 2026 (Tabela Progressiva + Redutor da Lei nº 15.270/2025 até R$ 7.350,00).
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Card Victor (CBMRS) */}
              <SalarioCard
                titulo="Victor Roque — Sd CBMRS"
                cor="blue"
                params={salVictor}
                onChange={setSalVictor}
                resultado={resVictor}
              />

              {/* Card Letícia (BMRS) */}
              <SalarioCard
                titulo="Letícia Ribeiro — Sd BMRS"
                cor="purple"
                params={salLeticia}
                onChange={setSalLeticia}
                resultado={resLeticia}
              />
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* ABA 4: CARTÕES DE CRÉDITO (C6 BANK & SICREDI)             */}
        {/* ========================================================= */}
        {aba === "cartoes" && (
          <div className="space-y-6">
            {/* Seletor C6 Bank vs Sicredi + Resumo de Divisão */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
              <div className="flex gap-2">
                {(["C6 Bank", "Sicredi"] as CartaoBanco[]).map((banco) => (
                  <button
                    key={banco}
                    onClick={() => setBancoFiltro(banco)}
                    className={`px-5 py-2.5 rounded-xl font-bold text-sm transition ${
                      bancoFiltro === banco
                        ? "bg-slate-900 text-white shadow-sm"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {banco}
                  </button>
                ))}
              </div>

              <button
                onClick={() => {
                  setTipoInclusao("fatura_pdf");
                  setBancoPDF(bancoFiltro);
                  setModalAberto(true);
                }}
                className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl"
              >
                <Upload className="w-4 h-4" />
                Importar PDF {bancoFiltro}
              </button>
            </div>

            {/* Cards de Divisão Automática (VIC / LE / DIV 50-50) */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-2xl border border-slate-200">
                <span className="text-xs text-slate-400 font-semibold uppercase">Exclusivo Victor (VIC)</span>
                <p className="text-xl font-bold text-blue-600 mt-1">{formatarMoeda(resumoCartoesMes.vicDireto)}</p>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-slate-200">
                <span className="text-xs text-slate-400 font-semibold uppercase">Exclusivo Letícia (LE)</span>
                <p className="text-xl font-bold text-purple-600 mt-1">{formatarMoeda(resumoCartoesMes.leDireto)}</p>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-slate-200">
                <span className="text-xs text-slate-400 font-semibold uppercase">Dividido (DIV Total)</span>
                <p className="text-xl font-bold text-amber-600 mt-1">{formatarMoeda(resumoCartoesMes.divTotal)}</p>
                <p className="text-xs text-slate-500">Metade p/ cada: {formatarMoeda(resumoCartoesMes.metadeDiv)}</p>
              </div>
              <div className="bg-slate-900 text-white p-4 rounded-2xl">
                <span className="text-xs text-slate-400 font-semibold uppercase">Total Final c/ Rateio</span>
                <p className="text-sm mt-1">
                  Victor: <strong className="text-emerald-400">{formatarMoeda(resumoCartoesMes.totalVictorCartoes)}</strong>
                </p>
                <p className="text-sm">
                  Letícia: <strong className="text-emerald-400">{formatarMoeda(resumoCartoesMes.totalLeticiaCartoes)}</strong>
                </p>
              </div>
            </div>

            {/* Tabela de Lançamentos do Cartão Selecionado */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-bold text-slate-800">Lançamentos — {bancoFiltro} ({mesSelecionado})</h3>
                <span className="text-xs text-slate-500">Clique em VIC / LE / DIV para recalcular o rateio na hora</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
                    <tr>
                      <th className="px-6 py-3">Data</th>
                      <th className="px-6 py-3">Estabelecimento / Parcela</th>
                      <th className="px-6 py-3">Valor</th>
                      <th className="px-6 py-3">Quem Paga</th>
                      <th className="px-6 py-3 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {comprasCartao
                      .filter((c) => c.banco === bancoFiltro && c.mesFatura === mesSelecionado)
                      .map((compra) => (
                        <tr key={compra.id} className="hover:bg-slate-50">
                          <td className="px-6 py-3 text-slate-500 whitespace-nowrap">{compra.dataCompra}</td>
                          <td className="px-6 py-3 font-medium text-slate-800">
                            {compra.descricao}{" "}
                            {compra.parcelaInfo && (
                              <span className="ml-2 text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                                {compra.parcelaInfo}
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-3 font-bold text-slate-800 whitespace-nowrap">
                            {formatarMoeda(compra.valor)}
                          </td>
                          <td className="px-6 py-3">
                            <div className="inline-flex rounded-lg border border-slate-200 overflow-hidden">
                              {(["VIC", "LE", "DIV"] as Pagador[]).map((opcao) => (
                                <button
                                  key={opcao}
                                  onClick={() => alterarPagadorCompra(compra.id, opcao)}
                                  className={`px-2.5 py-1 text-xs font-bold transition ${
                                    compra.quemPaga === opcao
                                      ? opcao === "VIC"
                                        ? "bg-blue-600 text-white"
                                        : opcao === "LE"
                                        ? "bg-purple-600 text-white"
                                        : "bg-amber-500 text-white"
                                      : "bg-white text-slate-500 hover:bg-slate-100"
                                  }`}
                                >
                                  {opcao}
                                </button>
                              ))}
                            </div>
                          </td>
                          <td className="px-6 py-3 text-right">
                            <button
                              onClick={() => setComprasCartao((prev) => prev.filter((c) => c.id !== compra.id))}
                              className="text-slate-400 hover:text-rose-600"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ========================================================= */}
      {/* MODAL: INCLUIR CONTAS DA CASA OU FATURA PDF               */}
      {/* ========================================================= */}
      {modalAberto && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-lg text-slate-800">Incluir Contas / Faturas</h3>
              <button onClick={() => setModalAberto(false)} className="text-slate-400 hover:text-slate-700 font-bold">
                ✕
              </button>
            </div>

            {/* Seletor de Tipo */}
            <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setTipoInclusao("conta")}
                className={`py-2 text-xs font-bold rounded-lg transition ${
                  tipoInclusao === "conta" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
                }`}
              >
                Conta da Casa (Luz, Água, etc.)
              </button>
              <button
                type="button"
                onClick={() => setTipoInclusao("fatura_pdf")}
                className={`py-2 text-xs font-bold rounded-lg transition ${
                  tipoInclusao === "fatura_pdf" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
                }`}
              >
                Importar Fatura Cartão (PDF)
              </button>
            </div>

            {tipoInclusao === "conta" ? (
              <form onSubmit={adicionarContaCasa} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Categoria</label>
                  <select
                    value={novaCategoria}
                    onChange={(e) => setNovaCategoria(e.target.value as ContaCasa["categoria"])}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm"
                  >
                    <option value="Luz">Luz (Energia Elétrica)</option>
                    <option value="Água">Água / Saneamento</option>
                    <option value="Internet">Internet Residencial</option>
                    <option value="Telefone">Telefone / Celular</option>
                    <option value="Aluguel">Aluguel / Condomínio</option>
                    <option value="Carro">Carro / Seguro / IPVA</option>
                    <option value="Outros">Outros</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Descrição</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Conta de Luz CEEE"
                    value={novaDescricao}
                    onChange={(e) => setNovaDescricao(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Valor (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="0,00"
                      value={novoValor}
                      onChange={(e) => setNovoValor(e.target.value)}
                      className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Vencimento</label>
                    <input
                      type="date"
                      value={novoVencimento}
                      onChange={(e) => setNovoVencimento(e.target.value)}
                      className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Quem Paga?</label>
                  <select
                    value={novoPagador}
                    onChange={(e) => setNovoPagador(e.target.value as Pagador)}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm"
                  >
                    <option value="DIV">Dividido (50% Victor / 50% Letícia)</option>
                    <option value="VIC">100% Victor</option>
                    <option value="LE">100% Letícia</option>
                  </select>
                </div>
                <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl">
                  Salvar Conta no Mês
                </button>
              </form>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Selecione o Banco da Fatura</label>
                  <select
                    value={bancoPDF}
                    onChange={(e) => setBancoPDF(e.target.value as CartaoBanco)}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm"
                  >
                    <option value="C6 Bank">C6 Bank</option>
                    <option value="Sicredi">Sicredi</option>
                  </select>
                </div>
                <label className="border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer transition bg-slate-50">
                  <FileText className="w-8 h-8 text-emerald-600 mb-2" />
                  <span className="text-sm font-semibold text-slate-700">Clique para selecionar o PDF da fatura</span>
                  <span className="text-xs text-slate-400 mt-1">Os lançamentos irão direto para a Aba 4 (Cartões)</span>
                  <input type="file" accept="application/pdf" onChange={handleUploadFaturaPDF} className="hidden" />
                </label>
                {statusPDF && (
                  <div className="p-3 rounded-xl bg-blue-50 text-blue-800 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{statusPDF}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Componente Reutilizável da Aba 3 (Contracheque Militar RS)
function SalarioCard({
  titulo,
  cor,
  params,
  onChange,
  resultado,
}: {
  titulo: string;
  cor: "blue" | "purple";
  params: ParametrosSalario;
  onChange: (p: ParametrosSalario) => void;
  resultado: ReturnType<typeof calcularContrachequeRS>;
}) {
  const badgeColor = cor === "blue" ? "bg-blue-600" : "bg-purple-600";

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      <div className={`${badgeColor} text-white px-6 py-4 flex items-center justify-between`}>
        <h3 className="font-bold text-base">{titulo}</h3>
        <span className="text-xs bg-white/20 px-2.5 py-1 rounded-full font-semibold">Tabela RS 2026</span>
      </div>

      <div className="p-6 space-y-4">
        {/* Parâmetros Editáveis */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Subsídio Base (R$)</label>
            <input
              type="number"
              step="0.01"
              value={params.subsídioBase}
              onChange={(e) => onChange({ ...params, subsídioBase: parseFloat(e.target.value) || 0 })}
              className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm font-semibold"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Substituição de Posto</label>
            <select
              value={params.tipoSubstituicao}
              onChange={(e) =>
                onChange({
                  ...params,
                  tipoSubstituicao: e.target.value as ParametrosSalario["tipoSubstituicao"],
                  diasSubstituicao: e.target.value === "NENHUMA" ? 0 : 30,
                })
              }
              className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm"
            >
              <option value="NENHUMA">Sem Substituição</option>
              <option value="2_SGT">Substituição 2º Sgt</option>
              <option value="1_SGT">Substituição 1º Sgt</option>
              <option value="1_TEN">Substituição 1º Ten</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Dias Substit.</label>
            <input
              type="number"
              min={0}
              max={30}
              value={params.diasSubstituicao}
              onChange={(e) => onChange({ ...params, diasSubstituicao: parseInt(e.target.value) || 0 })}
              className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Horas-Extra (Qtd)</label>
            <input
              type="number"
              min={0}
              value={params.horasExtrasQtd}
              onChange={(e) => onChange({ ...params, horasExtrasQtd: parseFloat(e.target.value) || 0 })}
              className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Dias Férias (1/3)</label>
            <input
              type="number"
              min={0}
              max={30}
              value={params.diasFerias}
              onChange={(e) => onChange({ ...params, diasFerias: parseInt(e.target.value) || 0 })}
              className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Diárias (Qtd)</label>
            <input
              type="number"
              min={0}
              value={params.diariasQtd}
              onChange={(e) => onChange({ ...params, diariasQtd: parseInt(e.target.value) || 0 })}
              className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Acordo Banrisul (R$)</label>
            <input
              type="number"
              step="0.01"
              value={params.descontoBanrisul}
              onChange={(e) => onChange({ ...params, descontoBanrisul: parseFloat(e.target.value) || 0 })}
              className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Outros Consignados (GBOEX)</label>
            <input
              type="number"
              step="0.01"
              value={params.outrosDescontosFixos}
              onChange={(e) => onChange({ ...params, outrosDescontosFixos: parseFloat(e.target.value) || 0 })}
              className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm"
            />
          </div>
        </div>

        <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 pt-1">
          <input
            type="checkbox"
            checked={params.incluirValeRefeicao}
            onChange={(e) => onChange({ ...params, incluirValeRefeicao: e.target.checked })}
            className="w-4 h-4 accent-emerald-600"
          />
          Incluir Auxílio-Refeição RS (Dia 20 — {formatarMoeda(TABELA_RS_2026.VALE_REFEICAO_MENSAL)})
        </label>

        {/* Demonstrativo Detalhado */}
        <div className="bg-slate-50 rounded-xl p-4 space-y-2 text-xs border border-slate-200">
          <div className="flex justify-between text-slate-600">
            <span>(+) Subsídio Base:</span>
            <span className="font-semibold">{formatarMoeda(resultado.subsidio)}</span>
          </div>
          {resultado.valorSubstituicao > 0 && (
            <div className="flex justify-between text-emerald-700">
              <span>(+) Substituição ({params.diasSubstituicao} dias):</span>
              <span className="font-semibold">+ {formatarMoeda(resultado.valorSubstituicao)}</span>
            </div>
          )}
          {resultado.valorHorasExtras > 0 && (
            <div className="flex justify-between text-emerald-700">
              <span>(+) Horas-Extra ({params.horasExtrasQtd}h GSE):</span>
              <span className="font-semibold">+ {formatarMoeda(resultado.valorHorasExtras)}</span>
            </div>
          )}
          {resultado.valorFeriasTerco > 0 && (
            <div className="flex justify-between text-emerald-700">
              <span>(+) 1/3 Férias ({params.diasFerias} dias):</span>
              <span className="font-semibold">+ {formatarMoeda(resultado.valorFeriasTerco)}</span>
            </div>
          )}
          <div className="border-t border-slate-200 pt-1.5 flex justify-between font-bold text-slate-800">
            <span>Total Bruto Tributável:</span>
            <span>{formatarMoeda(resultado.totalBrutoTributavel)}</span>
          </div>

          <div className="flex justify-between text-rose-600">
            <span>(-) IPE Previdência Militar (SPSMER):</span>
            <span>- {formatarMoeda(resultado.ipePrev)}</span>
          </div>
          <div className="flex justify-between text-rose-600">
            <span>(-) IPE Saúde (3,6%):</span>
            <span>- {formatarMoeda(resultado.ipeSaude)}</span>
          </div>
          <div className="flex justify-between text-rose-600">
            <span>(-) IRRF (Tabela 2026 + Redutor Lei 15.270):</span>
            <span>- {formatarMoeda(resultado.irrf)}</span>
          </div>
          <div className="flex justify-between text-rose-600">
            <span>(-) Consignados / Banrisul / GBOEX:</span>
            <span>- {formatarMoeda(resultado.descontosConsignados)}</span>
          </div>

          <div className="border-t border-slate-300 pt-2 flex justify-between text-sm font-extrabold text-slate-900">
            <span>Líquido em Conta (Contracheque):</span>
            <span className="text-emerald-600">{formatarMoeda(resultado.liquidoFolha)}</span>
          </div>

          {(resultado.valeRefeicaoIndenizatorio > 0 || resultado.valorDiarias > 0) && (
            <div className="pt-1 space-y-1 text-slate-600">
              {resultado.valeRefeicaoIndenizatorio > 0 && (
                <div className="flex justify-between">
                  <span>(+) Vale-Refeição (Dia 20 - Isento):</span>
                  <span>+ {formatarMoeda(resultado.valeRefeicaoIndenizatorio)}</span>
                </div>
              )}
              {resultado.valorDiarias > 0 && (
                <div className="flex justify-between">
                  <span>(+) Diárias ({params.diariasQtd} diárias - Isento):</span>
                  <span>+ {formatarMoeda(resultado.valorDiarias)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-slate-900 pt-1 border-t border-slate-200">
                <span>Total Disponível no Mês:</span>
                <span>{formatarMoeda(resultado.totalDisponivelMes)}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
