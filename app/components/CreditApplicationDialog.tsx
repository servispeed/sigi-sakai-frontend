'use client';
import React, { useState } from 'react';
import { Dialog } from 'primereact/dialog';
import { Button } from 'primereact/button';
import { FileUpload, FileUploadSelectEvent } from 'primereact/fileupload';
import { InputNumber } from 'primereact/inputnumber';
import { Dropdown } from 'primereact/dropdown';
import { ClientService } from '@/app/service/clientService';
import { Client } from '@/app/types/clients';

interface CreditApplicationDialogProps {
    visible: boolean;
    client: Client | null;
    onHide: () => void;
    onSuccess: () => void;
    onError: (msg: string) => void;
}

export const CreditApplicationDialog: React.FC<CreditApplicationDialogProps> = ({
    visible,
    client,
    onHide,
    onSuccess,
    onError
}) => {
    const [csfFile, setCsfFile] = useState<File | null>(null);
    const [domicilioFile, setDomicilioFile] = useState<File | null>(null);
    const [ineFile, setIneFile] = useState<File | null>(null);

    const [limite, setLimite] = useState<number | null>(25000);
    const [dias, setDias] = useState<number>(30);

    const [submitting, setSubmitting] = useState(false);
    const [documentsUploaded, setDocumentsUploaded] = useState(false);

    const diasOptions = [
        { label: '8 días', value: 8 },
        { label: '15 días', value: 15 },
        { label: '30 días', value: 30 }
    ];

    const resetForm = () => {
        setCsfFile(null);
        setDomicilioFile(null);
        setIneFile(null);
        setLimite(25000);
        setDias(30);
        setDocumentsUploaded(false);
    };

    const handleClose = () => {
        if (submitting) return;

        resetForm();
        onHide();
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!client?.id) return;

        if (!csfFile || !domicilioFile || !ineFile) {
            onError('Debes adjuntar todos los documentos requeridos.');
            return;
        }

        if (!limite || limite <= 0) {
            onError('Ingresa un límite de crédito válido.');
            return;
        }

        setSubmitting(true);

        try {
            if (!documentsUploaded) {
                await ClientService.uploadDocuments(client.id, {
                    csf: csfFile,
                    comprobanteDomicilio: domicilioFile,
                    ine: ineFile
                });

                setDocumentsUploaded(true);
            }

            await ClientService.updateCredit(client.id, {
                limiteCredito: limite,
                diasCredito: dias,
                creditoHabilitado: true
            });

            resetForm();
            onSuccess();

        } catch (err: any) {
            onError(err.message || 'Error al procesar la solicitud de crédito');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog
            visible={visible}
            style={{ width: '38rem' }}
            breakpoints={{ '960px': '75vw', '641px': '90vw' }}
            header={`Solicitud y asignación de crédito - ${client?.nombre || ''}`}
            modal
            closable={!submitting}
            onHide={handleClose}
        >
            <form onSubmit={handleSubmit} className="flex flex-column gap-3 mt-2">

                <p className="m-0 text-700 text-sm">
                    Cliente: <b>{client?.nombre}</b>
                    <br />
                    Adjunta la documentación requerida y establece las condiciones
                    para habilitar su línea de crédito.
                </p>

                <section>
                    <span className="font-bold text-900 block mb-3">
                        1. Documentación requerida
                    </span>

                    <div className="flex flex-column gap-3">

                        <div className="flex flex-column gap-1">
                            <label className="font-bold text-sm">
                                Constancia de situación fiscal (CSF)
                            </label>

                            <FileUpload
                                mode="basic"
                                name="csf"
                                accept=".pdf,.png,.jpg,.jpeg"
                                maxFileSize={5000000}
                                chooseLabel={csfFile ? csfFile.name : 'Seleccionar CSF'}
                                className="w-full"
                                disabled={submitting}
                                onSelect={(e: FileUploadSelectEvent) => {
                                    setCsfFile(e.files[0] || null);
                                    setDocumentsUploaded(false);
                                }}
                            />
                        </div>

                        <div className="flex flex-column gap-1">
                            <label className="font-bold text-sm">
                                Comprobante de domicilio
                            </label>

                            <FileUpload
                                mode="basic"
                                name="domicilio"
                                accept=".pdf,.png,.jpg,.jpeg"
                                maxFileSize={5000000}
                                chooseLabel={domicilioFile ? domicilioFile.name : 'Seleccionar Comprobante'}
                                className="w-full"
                                disabled={submitting}
                                onSelect={(e: FileUploadSelectEvent) => {
                                    setDomicilioFile(e.files[0] || null);
                                    setDocumentsUploaded(false);
                                }}
                            />
                        </div>

                        <div className="flex flex-column gap-1">
                            <label className="font-bold text-sm">
                                Identificación oficial (INE)
                            </label>

                            <FileUpload
                                mode="basic"
                                name="ine"
                                accept=".pdf,.png,.jpg,.jpeg"
                                maxFileSize={5000000}
                                chooseLabel={ineFile ? ineFile.name : 'Seleccionar INE'}
                                className="w-full"
                                disabled={submitting}
                                onSelect={(e: FileUploadSelectEvent) => {
                                    setIneFile(e.files[0] || null);
                                    setDocumentsUploaded(false);
                                }}
                            />
                        </div>

                    </div>
                </section>

                <div className="border-top-1 surface-border my-1" />

                <section>
                    <span className="font-bold text-900 block mb-3">
                        2. Condiciones del crédito
                    </span>

                    <div className="grid">

                        <div className="col-12 md:col-6 flex flex-column gap-1">
                            <label className="font-bold text-sm">
                                Límite de crédito ($)
                            </label>

                            <InputNumber
                                value={limite}
                                onValueChange={(e) => setLimite(e.value ?? null)}
                                mode="currency"
                                currency="MXN"
                                locale="es-MX"
                                min={1}
                                required
                                className="w-full"
                                disabled={submitting}
                            />
                        </div>

                        <div className="col-12 md:col-6 flex flex-column gap-1">
                            <label className="font-bold text-sm">
                                Plazo de pago (Días)
                            </label>

                            <Dropdown
                                value={dias}
                                options={diasOptions}
                                onChange={(e) => setDias(e.value)}
                                placeholder="Selecciona el plazo"
                                className="w-full"
                                disabled={submitting}
                            />
                        </div>

                    </div>
                </section>

                <div className="flex justify-content-end gap-2 mt-3">
                    <Button
                        type="button"
                        label="Cancelar"
                        icon="pi pi-times"
                        text
                        onClick={handleClose}
                        disabled={submitting}
                    />

                    <Button
                        type="submit"
                        label="Subir documentos y habilitar crédito"
                        icon="pi pi-check-circle"
                        severity="success"
                        loading={submitting}
                    />
                </div>

            </form>
        </Dialog>
    );
};
