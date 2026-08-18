"use client";

import { useForm, useWatch } from "react-hook-form";
import { useRouter } from "next/navigation";
import { useState, useMemo, useEffect } from "react";
import { createDocumentAction, updateDocumentAction, createClientAction, createPaymentSchedulesAction, attachInvoiceToQuoteAction, markScheduleInvoicedAction, registerInvoicePaymentAction } from "@/app/(empresa)/empresa/actions";
import { ReceivablesInvoicePanel } from "@/components/empresa/receivables-invoice-panel";
import type { ReceivableForInvoice } from "@/lib/receivables-for-invoice";
import { ClientSelector } from "@/components/empresa/document-builder/client-selector";
import { LanguageToggle } from "@/components/empresa/document-builder/language-toggle";
import { LineItemsEditor, type DocumentFormValues } from "@/components/empresa/document-builder/line-items-editor";
import { AiEnhanceButton } from "@/components/empresa/document-builder/ai-enhance-button";
import { DraftPdfPreview } from "@/components/empresa/document-builder/draft-pdf-preview";
import { PdfDownloadButton } from "@/components/empresa/document-builder/pdf-download-button";
import { PaymentSelector } from "@/components/empresa/payment-selector";
import type { Client } from "@prisma/client";
import type { SerializedPaymentMethod, SerializedProject, SerializedContract, SerializedDocument } from "@/lib/serializers";
import { buildInstallmentPlan, isFinancingPlan } from "@/lib/financing";

function getInitialValues(
  doc?: SerializedDocument,
  currency = "USD",
  taxRate = 7
): Partial<DocumentFormValues> {
  if (!doc) {
    return {
      language: "es",
      currency,
      clientId: "",
      clientName: "",
      saveAsNewClient: false,
      paymentMethodId: "",
      issueDate: new Date().toISOString().split("T")[0],
      lineItems: [
        {
          description: "",
          quantity: 1,
          unitPrice: 0,
          taxPercent: taxRate,
          discount: 0,
        },
      ],
    };
  }

  const content = doc.content as Record<string, unknown>;
  return {
    language: (doc.language as "es" | "en") ?? "es",
    currency: doc.currency,
    clientId: doc.clientId ?? "",
    clientName: doc.clientName ?? "",
    clientEmail: doc.clientEmail ?? "",
    clientCompany: doc.clientCompany ?? "",
    clientAddress: doc.clientAddress ?? "",
    clientRuc: doc.clientRuc ?? "",
    issueDate: new Date(doc.issueDate).toISOString().split("T")[0],
    dueDate: doc.dueDate ? new Date(doc.dueDate).toISOString().split("T")[0] : "",
    notes: (content?.notes as string) ?? "",
    paymentMethodId: doc.paymentMethodId ?? "",
    saveAsNewClient: false,
    lineItems:
      (content?.lineItems as DocumentFormValues["lineItems"]) ?? [
        {
          description: "",
          quantity: 1,
          unitPrice: 0,
          taxPercent: taxRate,
          discount: 0,
        },
      ],
  };
}

/** Proyecto con la lista de clientes a los que pertenece (tabla ProjectClient). */
export type ProjectWithClients = SerializedProject & {
  clientIds: string[];
  financingPlan?: unknown;
};

type CollectionMode = "none" | "full" | "partial";

type InstallmentRow = { description: string; amount: string; dueDate: string };

function addDaysISO(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

interface FacturaBuilderProps {
  taxRateDefault: number;
  currency: string;
  clients: Client[];
  paymentMethods: SerializedPaymentMethod[];
  projects?: ProjectWithClients[];
  contracts?: SerializedContract[];
  receivables?: ReceivableForInvoice[];
  /** Id de un saldo por cobrar a preseleccionar (viene de ?cobrar= en la URL). */
  preselectReceivableId?: string;
  /** Cliente a precargar (viene de ?clientId= al pulsar "+ Factura" en su perfil). */
  preselectClientId?: string;
  mode?: "create" | "edit";
  initialDocument?: SerializedDocument;
}

export function FacturaBuilder({
  taxRateDefault,
  currency,
  clients,
  paymentMethods,
  projects = [],
  contracts = [],
  receivables = [],
  preselectReceivableId,
  preselectClientId,
  mode = "create",
  initialDocument,
}: FacturaBuilderProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [selectedReceivable, setSelectedReceivable] = useState<ReceivableForInvoice | null>(null);

  // Cobro al momento de crear la factura — no requiere proyecto ni contrato.
  const [collection, setCollection] = useState<CollectionMode>("none");
  const [collectedAmount, setCollectedAmount] = useState("");
  const [balanceDueDate, setBalanceDueDate] = useState("");
  const [installments, setInstallments] = useState<InstallmentRow[]>([]);

  const { register, control, setValue, handleSubmit, watch } =
    useForm<DocumentFormValues>({
      defaultValues: getInitialValues(
        initialDocument,
        currency,
        taxRateDefault
      ) as DocumentFormValues,
    });

  const language = useWatch({ control, name: "language" });
  const paymentMethodId = useWatch({ control, name: "paymentMethodId" });
  const projectId = useWatch({ control, name: "projectId" });
  const contractId = useWatch({ control, name: "contractId" });
  const watchedClientId = useWatch({ control, name: "clientId" });
  const notes = watch("notes");
  const lineItems = watch("lineItems") ?? [];
  const allValues = useWatch({ control });
  const previewPayload = {
    type: "FACTURA" as const,
    number: initialDocument?.number,
    title: allValues.clientName || "Factura",
    language: allValues.language,
    currency: allValues.currency,
    clientName: allValues.clientName,
    clientEmail: allValues.clientEmail,
    clientCompany: allValues.clientCompany,
    clientAddress: allValues.clientAddress,
    clientRuc: allValues.clientRuc,
    issueDate: allValues.issueDate,
    dueDate: allValues.dueDate,
    content: { lineItems: allValues.lineItems, notes: allValues.notes },
    paymentMethodId: allValues.paymentMethodId || null,
  };

  // Un proyecto solo aparece si el cliente elegido pertenece a él. Los proyectos
  // sin ningún cliente asignado (datos viejos) se muestran igual: son "sin
  // asignar", no "de otro cliente", y ocultarlos los volvería inalcanzables.
  const filteredProjects = useMemo(() => {
    if (!watchedClientId) return projects;
    return projects.filter((p) => {
      const owners = p.clientIds.length > 0 ? p.clientIds : p.clientId ? [p.clientId] : [];
      return owners.length === 0 || owners.includes(watchedClientId);
    });
  }, [projects, watchedClientId]);

  // Reset project/contract when the client changes and the selected project no longer belongs to the new client
  useEffect(() => {
    if (!projectId) return;
    const currentProject = projects.find((p) => p.id === projectId);
    const owners = currentProject
      ? currentProject.clientIds.length > 0
        ? currentProject.clientIds
        : currentProject.clientId
          ? [currentProject.clientId]
          : []
      : [];
    const belongs = owners.length === 0 || (watchedClientId ? owners.includes(watchedClientId) : true);
    if (currentProject && watchedClientId && !belongs) {
      setValue("projectId", "");
      setValue("contractId", "");
    }
  }, [watchedClientId]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectedProject = useMemo(() => projects.find((p) => p.id === projectId) ?? null, [projects, projectId]);
  // Los contratos se filtran por proyecto y por cliente: un contrato de otro
  // cliente no tiene por qué aparecer en esta factura.
  const filteredContracts = useMemo(
    () =>
      contracts.filter((c) => {
        if (projectId) return c.projectId === projectId;
        if (watchedClientId) return c.clientId === watchedClientId || !c.clientId;
        return true;
      }),
    [contracts, projectId, watchedClientId]
  );
  const activeContract = useMemo(
    () => filteredContracts.find((c) => c.id === contractId) ?? filteredContracts.find((c) => c.status === "ACTIVE") ?? null,
    [filteredContracts, contractId]
  );

  // Auto-seleccionar el contrato si el proyecto elegido tiene exactamente uno activo
  useEffect(() => {
    if (contractId) return;
    const activeOnes = filteredContracts.filter((c) => c.status === "ACTIVE");
    if (activeOnes.length === 1) setValue("contractId", activeOnes[0].id);
  }, [projectId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Precarga del cliente al entrar desde su perfil (?clientId=)
  useEffect(() => {
    if (mode !== "create" || !preselectClientId) return;
    const client = clients.find((c) => c.id === preselectClientId);
    if (!client) return;
    setValue("clientId", client.id);
    setValue("clientName", client.name);
    setValue("clientEmail", client.email ?? "");
    setValue("clientCompany", client.company ?? "");
    setValue("clientAddress", client.address ?? "");
    setValue("clientRuc", client.ruc ?? "");
  }, [preselectClientId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Preselección desde "Facturar" en Cuentas por Cobrar
  useEffect(() => {
    if (mode !== "create" || !preselectReceivableId) return;
    const match = receivables.find(
      (r) => r.id === preselectReceivableId || r.documentId === preselectReceivableId
    );
    if (match) applyReceivable(match);
  }, [preselectReceivableId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Elegir proyecto o contrato llena la factura: descripción y monto salen del
  // contrato (su valor) o del proyecto (su presupuesto). Solo se autocompleta
  // mientras el detalle siga vacío, para no pisar lo que ya escribiste.
  const lineItemsAreEmpty = useMemo(() => {
    const rows = lineItems ?? [];
    if (rows.length === 0) return true;
    return rows.every((r) => !r.description?.trim() && !(Number(r.unitPrice) > 0));
  }, [lineItems]);

  useEffect(() => {
    if (mode !== "create" || !lineItemsAreEmpty) return;

    const contract = contracts.find((c) => c.id === contractId);
    const project = projects.find((p) => p.id === projectId);

    const amount =
      contract?.value != null
        ? Number(contract.value)
        : project?.totalBudget != null
          ? Number(project.totalBudget)
          : null;
    if (amount == null || amount <= 0) return;

    const description = contract
      ? `${contract.title}${project ? ` — ${project.name}` : ""}`
      : project
        ? project.scope?.trim() || project.description?.trim() || project.name
        : "";
    if (!description) return;

    setValue("lineItems", [
      { description, quantity: 1, unitPrice: amount, taxPercent: 0, discount: 0 },
    ]);

    // Proyecto financiado: el abono inicial se cobra ahora y el saldo queda
    // repartido en cuotas, tal como se definió al crear el proyecto.
    if (project && isFinancingPlan(project.financingPlan)) {
      const built = buildInstallmentPlan({ ...project.financingPlan, total: amount });
      if (built.rows.length > 0) {
        setInstallments(
          built.rows.map((r) => ({
            description: r.description,
            amount: String(r.amount),
            dueDate: r.dueDate,
          }))
        );
      }
      if (built.downPayment > 0) {
        setCollection("partial");
        setCollectedAmount(built.downPayment.toFixed(2));
        setBalanceDueDate(built.rows[0]?.dueDate ?? "");
      }
    }

    // El cliente del contrato/proyecto manda si aún no hay uno elegido.
    if (!watchedClientId) {
      const ownerId = contract?.clientId ?? project?.clientIds[0] ?? project?.clientId ?? null;
      const owner = ownerId ? clients.find((c) => c.id === ownerId) : null;
      if (owner) {
        setValue("clientId", owner.id);
        setValue("clientName", owner.name);
        setValue("clientEmail", owner.email ?? "");
        setValue("clientCompany", owner.company ?? "");
        setValue("clientAddress", owner.address ?? "");
        setValue("clientRuc", owner.ruc ?? "");
      }
    }
  }, [projectId, contractId]); // eslint-disable-line react-hooks/exhaustive-deps

  const grossTotal = lineItems.reduce((acc, item) => {
    const qty = Number(item.quantity) || 0;
    const price = Number(item.unitPrice) || 0;
    const disc = Number(item.discount) || 0;
    const tax = Number(item.taxPercent) || 0;
    const base = qty * price * (1 - disc / 100);
    return acc + base * (1 + tax / 100);
  }, 0);

  function applyReceivable(item: ReceivableForInvoice) {
    if (item.documentType === "FACTURA") {
      router.push(`/empresa/facturas/${item.documentId}`);
      return;
    }

    setSelectedReceivable(item);

    if (item.clientId) {
      setValue("clientId", item.clientId);
      const client = clients.find((c) => c.id === item.clientId);
      if (client) {
        setValue("clientName", client.name);
        setValue("clientEmail", client.email ?? "");
        setValue("clientCompany", client.company ?? "");
        setValue("clientAddress", client.address ?? "");
        setValue("clientRuc", client.ruc ?? "");
      }
    } else if (item.clientName) {
      setValue("clientName", item.clientName);
      setValue("clientCompany", item.clientCompany ?? "");
    }

    if (item.projectId) setValue("projectId", item.projectId);

    setValue("lineItems", [
      {
        description: item.label,
        quantity: 1,
        unitPrice: item.amount,
        taxPercent: 0,
        discount: 0,
      },
    ]);

    if (item.dueDate) {
      setValue("dueDate", item.dueDate.slice(0, 10));
    }
  }

  async function onSubmit(data: DocumentFormValues) {
    setSaving(true);
    try {
      const lineItems = data.lineItems ?? [];
      const subtotal = lineItems.reduce((acc, item) => {
        const qty = Number(item.quantity) || 0;
        const price = Number(item.unitPrice) || 0;
        const disc = Number(item.discount) || 0;
        return acc + qty * price * (1 - disc / 100);
      }, 0);
      const taxAmount = lineItems.reduce((acc, item) => {
        const qty = Number(item.quantity) || 0;
        const price = Number(item.unitPrice) || 0;
        const disc = Number(item.discount) || 0;
        const tax = Number(item.taxPercent) || 0;
        const base = qty * price * (1 - disc / 100);
        return acc + base * (tax / 100);
      }, 0);

      const total = subtotal + taxAmount;

      let commissionAmt: number | undefined;
      let netAmount: number | undefined;
      if (data.paymentMethodId) {
        const pm = paymentMethods.find((m) => m.id === data.paymentMethodId);
        if (pm) {
          const { calcCommission } = await import("@/lib/commission");
          const result = calcCommission(
            total,
            Number(pm.commissionPct),
            Number(pm.commissionFlat),
            Number(pm.commissionTax)
          );
          commissionAmt = result.totalCommission;
          netAmount = result.netAmount;
        }
      }

      let clientId = data.clientId || undefined;
      if (!clientId && data.saveAsNewClient && data.clientName?.trim()) {
        const newClient = await createClientAction({
          name: data.clientName,
          company: data.clientCompany || undefined,
          ruc: data.clientRuc || undefined,
          email: data.clientEmail || undefined,
          phone: data.clientPhone || undefined,
          address: data.clientAddress || undefined,
        });
        clientId = newClient.id;
      }

      const payload = {
        title: data.clientName || initialDocument?.title || `Factura ${new Date().toLocaleDateString()}`,
        language: data.language,
        clientId,
        clientName: data.clientName,
        clientEmail: data.clientEmail,
        clientCompany: data.clientCompany,
        clientAddress: data.clientAddress,
        clientRuc: data.clientRuc,
        content: {
          lineItems: data.lineItems,
          notes: data.notes,
          currency: data.currency,
          ...(selectedReceivable?.quoteId ? { sourceQuoteId: selectedReceivable.quoteId } : {}),
        },
        issueDate: new Date(data.issueDate),
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
        subtotal,
        taxAmount,
        total,
        commissionAmt,
        netAmount,
        currency: data.currency,
        paymentMethodId: data.paymentMethodId || undefined,
        projectId: data.projectId || undefined,
        contractId: data.contractId || undefined,
      };

      if (mode === "edit" && initialDocument) {
        await updateDocumentAction(initialDocument.id, payload);
        router.push(`/empresa/facturas/${initialDocument.id}`);
        router.refresh();
      } else {
        const doc = await createDocumentAction({ type: "FACTURA", ...payload });

        if (selectedReceivable?.quoteId) {
          await attachInvoiceToQuoteAction(doc.id, selectedReceivable.quoteId);
        }
        if (selectedReceivable?.paymentScheduleId) {
          await markScheduleInvoicedAction(selectedReceivable.paymentScheduleId, doc.id);
        }

        // Plan de cuotas del saldo — no requiere proyecto ni contrato
        const validInstallments = installments
          .filter((i) => Number(i.amount) > 0 && i.dueDate)
          .map((i, idx) => ({
            description: i.description.trim() || `Cuota ${idx + 1}`,
            amount: Number(i.amount),
            dueDate: i.dueDate,
          }));
        if (validInstallments.length > 0) {
          await createPaymentSchedulesAction(doc.id, validInstallments);
        }

        // Cobro registrado en el mismo paso que la creación de la factura
        const payment =
          collection === "full" ? total : collection === "partial" ? Number(collectedAmount) || 0 : 0;
        if (payment > 0) {
          await registerInvoicePaymentAction(
            doc.id,
            payment,
            collection === "partial" && balanceDueDate ? balanceDueDate : undefined
          );
        }

        router.push(`/empresa/facturas/${doc.id}`);
      }
    } finally {
      setSaving(false);
    }
  }

  const isEs = language === "es";

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white text-2xl font-semibold tracking-tight">
            {mode === "edit"
              ? isEs
                ? "Editar Factura"
                : "Edit Invoice"
              : isEs
                ? "Nueva Factura"
                : "New Invoice"}
          </h1>
          <p className="text-white/60 text-sm mt-1">
            {mode === "edit" && initialDocument?.number ? (
              <span className="font-mono">{initialDocument.number}</span>
            ) : isEs ? (
              "Complete los datos para generar la factura"
            ) : (
              "Fill in the details to generate the invoice"
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <PdfDownloadButton
            draftEndpoint="/api/empresa/documents/preview"
            draftPayload={previewPayload}
            filename={`${initialDocument?.number ?? "factura"}.pdf`}
          />
          <LanguageToggle value={language} onChange={(l) => setValue("language", l)} />
        </div>
      </div>

      {/* Client */}
      <ClientSelector register={register} setValue={setValue} watch={watch} clients={clients} lang={language} />

      {mode === "create" && receivables.length > 0 && (
        <ReceivablesInvoicePanel
          items={receivables}
          selectedId={selectedReceivable?.id ?? null}
          onSelect={applyReceivable}
          onClear={() => setSelectedReceivable(null)}
          language={language}
        />
      )}

      {/* Proyecto y Contrato */}
      {projects.length > 0 && (filteredProjects.length > 0 || !watchedClientId) && (
        <div className="bg-[#0a0a10] border border-white/[0.06] rounded-xl p-5 space-y-4">
          <h3 className="text-white/60 text-xs uppercase tracking-widest font-medium">
            {isEs ? "Proyecto y contrato" : "Project & contract"}
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-white/50 text-xs uppercase tracking-widest font-medium mb-1.5">
                {isEs ? "Proyecto" : "Project"}
              </label>
              <select
                {...register("projectId")}
                onChange={(e) => { setValue("projectId", e.target.value); setValue("contractId", ""); }}
                aria-label={isEs ? "Proyecto" : "Project"}
                className="w-full bg-white/[0.03] border border-white/[0.07] rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#1AA7F0]/40 transition-all"
              >
                <option value="">{isEs ? "Sin proyecto" : "No project"}</option>
                {filteredProjects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}{p.totalBudget != null ? ` — $${p.totalBudget.toLocaleString("en-US", { minimumFractionDigits: 2 })}` : ""}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-white/50 text-xs uppercase tracking-widest font-medium mb-1.5">
                {isEs ? "Contrato" : "Contract"}
              </label>
              <select
                {...register("contractId")}
                aria-label={isEs ? "Contrato" : "Contract"}
                className="w-full bg-white/[0.03] border border-white/[0.07] rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#1AA7F0]/40 transition-all"
              >
                <option value="">{isEs ? "Sin contrato" : "No contract"}</option>
                {filteredContracts.map((c) => (
                  <option key={c.id} value={c.id}>{c.title}{c.value != null ? ` — $${Number(c.value).toLocaleString("en-US", { minimumFractionDigits: 2 })}` : ""}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Active contract banner */}
          {activeContract?.responsibilities && (
            <div className="bg-[#C8A96E]/[0.05] border border-[#C8A96E]/20 rounded-lg p-4">
              <p className="text-[#C8A96E] text-[10px] uppercase tracking-widest font-medium mb-1.5">
                {isEs ? "Responsabilidades del contrato" : "Contract responsibilities"}
              </p>
              <p className="text-white/60 text-xs leading-relaxed whitespace-pre-line line-clamp-4">
                {activeContract.responsibilities}
              </p>
            </div>
          )}

          {/* Presupuesto del proyecto — solo informativo */}
          {selectedProject?.totalBudget != null && (
            <div className="border-t border-white/[0.05] pt-4 flex items-center justify-between">
              <div>
                <p className="text-white/50 text-xs uppercase tracking-widest font-medium">
                  {isEs ? "Presupuesto del proyecto" : "Project budget"}
                </p>
                <p className="text-[#C8A96E] font-mono text-base font-semibold mt-0.5">
                  ${selectedProject.totalBudget.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="text-right">
                <p className="text-white/50 text-xs uppercase tracking-widest font-medium">
                  {isEs ? "Esta factura" : "This invoice"}
                </p>
                <p className="text-white/70 font-mono text-base mt-0.5">
                  ${grossTotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </p>
              </div>
              {grossTotal < selectedProject.totalBudget && (
                <div className="text-right">
                  <p className="text-white/50 text-xs uppercase tracking-widest font-medium">
                    {isEs ? "Resto del presupuesto" : "Budget remaining"}
                  </p>
                  <p className="text-amber-400 font-mono text-base font-semibold mt-0.5">
                    ${(selectedProject.totalBudget - grossTotal).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Dates + currency */}
      <div className="bg-[#0a0a10] border border-white/[0.06] rounded-xl p-5">
        <h3 className="text-white/60 text-xs uppercase tracking-widest font-medium mb-4">
          {isEs ? "Detalles del documento" : "Document details"}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-white/50 text-xs uppercase tracking-widest mb-1.5">
              {isEs ? "Fecha de emisión" : "Issue date"}
            </label>
            <input
              {...register("issueDate")}
              type="date"
              className="w-full bg-white/[0.03] border border-white/[0.07] rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#C8A96E]/40 transition-all"
            />
          </div>
          <div>
            <label className="block text-white/50 text-xs uppercase tracking-widest mb-1.5">
              {isEs ? "Fecha de vencimiento" : "Due date"}
            </label>
            <input
              {...register("dueDate")}
              type="date"
              className="w-full bg-white/[0.03] border border-white/[0.07] rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#C8A96E]/40 transition-all"
            />
          </div>
          <div>
            <label className="block text-white/50 text-xs uppercase tracking-widest mb-1.5">
              {isEs ? "Moneda" : "Currency"}
            </label>
            <select
              {...register("currency")}
              aria-label={isEs ? "Moneda" : "Currency"}
              className="w-full bg-white/[0.03] border border-white/[0.07] rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#C8A96E]/40 transition-all"
            >
              <option value="USD">USD — Dólar</option>
              <option value="PAB">PAB — Balboa</option>
              <option value="EUR">EUR — Euro</option>
            </select>
          </div>
        </div>
      </div>

      {/* Line items */}
      <LineItemsEditor
        control={control}
        register={register}
        setValue={setValue}
        language={language}
        taxRateDefault={taxRateDefault}
      />

      {/* Cobro — funciona sin proyecto, sin contrato y sin cotización previa */}
      {mode === "create" && (
        <div className="bg-[#0a0a10] border border-white/[0.06] rounded-xl p-5 space-y-4">
          <div>
            <h3 className="text-white/60 text-xs uppercase tracking-widest font-medium">
              {isEs ? "Cobro" : "Collection"}
            </h3>
            <p className="text-white/55 text-xs mt-1">
              {isEs
                ? "Registra aquí el dinero que ya entró. El saldo pendiente aparece solo en Cuentas por Cobrar."
                : "Register money already received. The outstanding balance shows up in Receivables automatically."}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {([
              { key: "none", es: "Sin cobrar aún", en: "Not collected" },
              { key: "partial", es: "Pago parcial", en: "Partial payment" },
              { key: "full", es: "Pagada completa", en: "Paid in full" },
            ] as const).map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => {
                  setCollection(opt.key);
                  if (opt.key === "partial") {
                    if (!collectedAmount) setCollectedAmount((grossTotal / 2).toFixed(2));
                    if (!balanceDueDate) setBalanceDueDate(addDaysISO(30));
                  }
                }}
                className={`px-3 py-2.5 rounded-lg text-xs font-medium border transition-all ${
                  collection === opt.key
                    ? "bg-[#1AA7F0]/10 border-[#1AA7F0]/35 text-[#1AA7F0]"
                    : "border-white/[0.07] text-white/55 hover:text-white/80 hover:border-white/20"
                }`}
              >
                {isEs ? opt.es : opt.en}
              </button>
            ))}
          </div>

          {collection === "partial" && (
            <div className="bg-amber-500/[0.06] border border-amber-500/20 rounded-lg p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-white/50 text-xs uppercase tracking-widest font-medium mb-1.5">
                  {isEs ? "Monto recibido" : "Amount received"}
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={collectedAmount}
                  onChange={(e) => setCollectedAmount(e.target.value)}
                  className="w-full bg-white/[0.03] border border-white/[0.07] rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-amber-400/40 transition-all"
                />
              </div>
              <div>
                <label className="block text-white/50 text-xs uppercase tracking-widest font-medium mb-1.5">
                  {isEs ? "Vencimiento del saldo" : "Balance due date"}
                </label>
                <input
                  type="date"
                  value={balanceDueDate}
                  onChange={(e) => setBalanceDueDate(e.target.value)}
                  className="w-full bg-white/[0.03] border border-white/[0.07] rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-amber-400/40 transition-all [color-scheme:dark]"
                />
              </div>
              <p className="text-amber-400 text-xs sm:col-span-2">
                {isEs
                  ? `Saldo por cobrar: $${Math.max(0, grossTotal - (Number(collectedAmount) || 0)).toLocaleString("en-US", { minimumFractionDigits: 2 })}`
                  : `Outstanding: $${Math.max(0, grossTotal - (Number(collectedAmount) || 0)).toLocaleString("en-US", { minimumFractionDigits: 2 })}`}
              </p>
            </div>
          )}

          {collection === "full" && (
            <p className="text-green-400 text-xs">
              ✓ {isEs
                ? `Se registrará el cobro completo de $${grossTotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}. La factura no entrará a Cuentas por Cobrar.`
                : `Full payment of $${grossTotal.toLocaleString("en-US", { minimumFractionDigits: 2 })} will be recorded. The invoice skips Receivables.`}
            </p>
          )}

          {/* Plan de cuotas opcional */}
          <div className="border-t border-white/[0.05] pt-4 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-white/50 text-xs uppercase tracking-widest font-medium">
                {isEs ? "Plan de cuotas (opcional)" : "Installment plan (optional)"}
              </p>
              <button
                type="button"
                onClick={() =>
                  setInstallments((rows) => [
                    ...rows,
                    { description: "", amount: "", dueDate: addDaysISO(30 * (rows.length + 1)) },
                  ])
                }
                className="text-[#1AA7F0] text-xs hover:text-[#4FC0FF] transition-colors"
              >
                + {isEs ? "Agregar cuota" : "Add installment"}
              </button>
            </div>

            {installments.length === 0 ? (
              <p className="text-white/40 text-xs">
                {isEs
                  ? "Sin cuotas: el saldo se cobra completo en la fecha de vencimiento."
                  : "No installments: the balance is due in full on the due date."}
              </p>
            ) : (
              installments.map((row, idx) => (
                <div key={idx} className="grid grid-cols-[1fr_120px_150px_32px] gap-2 items-center">
                  <input
                    placeholder={isEs ? `Cuota ${idx + 1}` : `Installment ${idx + 1}`}
                    value={row.description}
                    onChange={(e) =>
                      setInstallments((rows) => rows.map((r, i) => (i === idx ? { ...r, description: e.target.value } : r)))
                    }
                    className="bg-white/[0.03] border border-white/[0.07] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#1AA7F0]/40"
                  />
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={row.amount}
                    onChange={(e) =>
                      setInstallments((rows) => rows.map((r, i) => (i === idx ? { ...r, amount: e.target.value } : r)))
                    }
                    className="bg-white/[0.03] border border-white/[0.07] rounded-lg px-3 py-2 text-white text-sm font-mono focus:outline-none focus:border-[#1AA7F0]/40"
                  />
                  <input
                    type="date"
                    value={row.dueDate}
                    onChange={(e) =>
                      setInstallments((rows) => rows.map((r, i) => (i === idx ? { ...r, dueDate: e.target.value } : r)))
                    }
                    className="bg-white/[0.03] border border-white/[0.07] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#1AA7F0]/40 [color-scheme:dark]"
                  />
                  <button
                    type="button"
                    onClick={() => setInstallments((rows) => rows.filter((_, i) => i !== idx))}
                    className="text-white/35 hover:text-red-400 text-sm"
                  >
                    ×
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {paymentMethods.length > 0 && (
        <div className="bg-[#0a0a10] border border-white/[0.06] rounded-xl p-5">
          <h3 className="text-white/60 text-xs uppercase tracking-widest font-medium mb-4">
            {isEs ? "Método de pago" : "Payment method"}
          </h3>
          <p className="text-white/55 text-xs mb-4">
            {isEs
              ? "Seleccione cómo se recibió el pago para calcular comisión y neto recibido. Solo el método elegido aparecerá en el PDF."
              : "Select how payment was received to calculate commission and net amount. Only the selected method appears on the PDF."}
          </p>
          <PaymentSelector
            methods={paymentMethods}
            selectedId={paymentMethodId ?? ""}
            grossAmount={grossTotal}
            onChange={(id) => setValue("paymentMethodId", id)}
            lang={language}
          />
        </div>
      )}

      {/* Notes */}
      <div className="bg-[#0a0a10] border border-white/[0.06] rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <label className="text-white/60 text-xs uppercase tracking-widest font-medium">
            {isEs ? "Notas / términos de pago" : "Notes / payment terms"}
          </label>
          <AiEnhanceButton
            text={notes ?? ""}
            language={language}
            context="payment terms and notes for a corporate invoice"
            onEnhanced={(t) => setValue("notes", t)}
          />
        </div>
        <textarea
          {...register("notes")}
          rows={3}
          placeholder={isEs ? "Condiciones de pago, instrucciones bancarias..." : "Payment conditions, bank details..."}
          className="w-full bg-white/[0.03] border border-white/[0.07] rounded-lg px-3 py-2.5 text-white/80 text-sm placeholder-white/20 focus:outline-none focus:border-[#C8A96E]/40 resize-none transition-all"
        />
      </div>

      <DraftPdfPreview endpoint="/api/empresa/documents/preview" payload={previewPayload} title={isEs ? "Vista previa del documento" : "Document preview"} />

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-4 py-2.5 text-white/50 hover:text-white/80 text-sm transition-colors"
        >
          {isEs ? "Cancelar" : "Cancel"}
        </button>
        <button
          type="submit"
          disabled={saving}
          className="px-6 py-2.5 bg-[#C8A96E] hover:bg-[#d4b87a] disabled:opacity-50 text-[#030611] text-sm font-semibold rounded-lg transition-all"
        >
          {saving
            ? isEs
              ? "Guardando..."
              : "Saving..."
            : mode === "edit"
              ? isEs
                ? "Guardar cambios"
                : "Save changes"
              : isEs
                ? "Crear factura"
                : "Create invoice"}
        </button>
      </div>
    </form>
  );
}
