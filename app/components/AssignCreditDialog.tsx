'use client';
import React, { useEffect, useState } from 'react';
import { Dialog } from 'primereact/dialog';
import { Button } from 'primereact/button';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { InputNumber } from 'primereact/inputnumber';
import { Dropdown } from 'primereact/dropdown';
import { Divider } from 'primereact/divider';

import { ClientService } from '@/app/service/clientService';
import { Client } from '@/app/types/clients';

interface DocumentoDTO {
    id?: number;
    idDocumento?: number;
    nombreArchivo: string;
    tipoDocumento: string;
}

interface AssignCreditDialogProps {
    visible: boolean;
    client: Client | null;
    onHide: () => void;
    onSuccess: () => void;
    onError: (msg: string) => void;
}

export const AssignCreditDialog: React.FC<AssignCreditDialogProps> = ({
    visible,
    client,
    onHide,
    onSuccess,
    onError,
}) => {
    const [documentos, setDocumentos] = useState<DocumentoDTO[]>([]);
    const [loadingDocs, setLoadingDocs] = useState(false);

    const [limite, setLimite] = useState<number | null>(25000);
    const [dias, setDias] = useState<number>(30);
    const [submitting, setSubmitting] = useState(false);

    const diasOptions = [
        { label: '8 días', value: 8 },
        { label: '15 días', value: 15 },
        { label: '30 días', value: 30 },
    ];

    useEffect(() => {
        if (visible && client?.id) {
            loadDocs(client.id);
            setLimite(client.limiteCredito || 0);
            setDias(client.diasCredito || 30);
        }
    }, [visible, client]);

    const loadDocs = async (idCliente: number) => {
        setLoadingDocs(true);
        try {
            const data = await ClientService.getDocuments(idCliente);
            setDocumentos(data);
        } catch {
            setDocumentos([]);
        } finally {
            setLoadingDocs(false);
        }
    };

    const handleApproveCredit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!client?.id || !limite) return;

        setSubmitting(true);
        try {
            await ClientService.updateCredit(client.id, {
                limiteCredito: limite,
                diasCredito: dias,
                creditoHabilitado: true,
            });
            
            // Retardo diferido para permitir que el portal del Dialog se desmonte sin error de nodos en el DOM
            setTimeout(() => {
                onSuccess();
            }, 0);
        } catch (err: any) {
            onError(err.message || 'Error al asignar el crédito');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDownload = async (rowData: DocumentoDTO) => {
        const docId = rowData.idDocumento ?? rowData.id;

        if (!client?.id || !docId) {
            onError('No se encontró un ID válido para este documento');
            return;
        }

        try {
            const { blob, filename } = await ClientService.downloadDocument(client.id, docId);

            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = rowData.nombreArchivo || filename;
            link.style.display = 'none';
            document.body.appendChild(link);
            link.click();

            setTimeout(() => {
                if (document.body.contains(link)) {
                    document.body.removeChild(link);
                }
                window.URL.revokeObjectURL(url);
            }, 100);
        } catch (error) {
            onError('No se pudo descargar el documento');
        }
    };

    const downloadActionTemplate = (rowData: DocumentoDTO) => {
        return (
            <Button
                type="button"
                icon="pi pi-download"
                label="Descargar"
                className="p-button-sm p-button-outlined p-button-info"
                onClick={() => handleDownload(rowData)}
            />
        );
    };

    return (
        <Dialog
            visible={visible}
            style={{ width: '42rem' }}
            breakpoints={{ '960px': '75vw', '641px': '90vw' }}
            header={`Aprobación de crédito - ${client?.nombre || ''}`}
            modal
            onHide={onHide}
        >
            <form onSubmit={handleApproveCredit} className="flex flex-column gap-3 mt-1">
                <section>
                    <span className="font-bold text-900 block mb-2">1. Revisión de expediente</span>
                    <DataTable
                        value={documentos}
                        loading={loadingDocs}
                        emptyMessage="No hay documentos adjuntos para este cliente."
                        className="p-datatable-sm"
                    >
                        <Column field="nombreArchivo" header="Archivo" />
                        <Column field="tipoDocumento" header="Tipo" />
                        <Column
                            body={downloadActionTemplate}
                            style={{ width: '11rem', textAlign: 'center' }}
                        />
                    </DataTable>
                </section>

                <Divider className="my-2" />

                <section>
                    <span className="font-bold text-900 block mb-2">2. Condiciones del crédito</span>
                    <div className="grid">
                        <div className="col-12 md:col-6 flex flex-column gap-1">
                            <label className="font-bold text-sm">Límite de crédito ($)</label>
                            <InputNumber
                                value={limite}
                                onValueChange={(e) => setLimite(e.value || null)}
                                mode="currency"
                                currency="MXN"
                                locale="es-MX"
                                min={0}
                                required
                                className="w-full"
                            />
                        </div>

                        <div className="col-12 md:col-6 flex flex-column gap-1">
                            <label className="font-bold text-sm">Plazo de pago (Días)</label>
                            <Dropdown
                                value={dias}
                                options={diasOptions}
                                onChange={(e) => setDias(e.value)}
                                placeholder="Selecciona el plazo"
                                className="w-full"
                            />
                        </div>
                    </div>

                    <div className="flex justify-content-end gap-2 mt-3">
                        <Button
                            type="button"
                            label="Cancelar"
                            icon="pi pi-times"
                            text
                            onClick={onHide}
                        />
                        <Button
                            type="submit"
                            label="Aprobar y habilitar Crédito"
                            icon="pi pi-check-circle"
                            severity="success"
                            loading={submitting}
                        />
                    </div>
                </section>
            </form>
        </Dialog>
    );
};