'use client';
import React, { useState } from 'react';
import { Dialog } from 'primereact/dialog';
import { Button } from 'primereact/button';
import { FileUpload, FileUploadSelectEvent } from 'primereact/fileupload';
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
    const [submitting, setSubmitting] = useState(false);

    const resetForm = () => {
        setCsfFile(null);
        setDomicilioFile(null);
        setIneFile(null);
    };

    const handleClose = () => {
        resetForm();
        onHide();
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!client?.id) return;

        if (!csfFile || !domicilioFile || !ineFile) {
            onError('Debes adjuntar todos los documentos requeridos (.pdf, .png, .jpg)');
            return;
        }

        setSubmitting(true);
        try {
            await ClientService.uploadDocuments(client.id, {
                csf: csfFile,
                comprobanteDomicilio: domicilioFile,
                ine: ineFile
            });

            resetForm();
            onSuccess();
        } catch (err: any) {
            onError(err.message || 'Error al subir la documentación');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog
            visible={visible}
            style={{ width: '32rem' }}
            breakpoints={{ '960px': '75vw', '641px': '90vw' }}
            header="Solicitud de crédito"
            modal
            onHide={handleClose}
        >
            <form onSubmit={handleSubmit} className="flex flex-column gap-3 mt-2">
                <p className="m-0 text-700 text-sm">
                    Cliente: <b>{client?.nombre}</b>
                    <br />
                    Para aperturar la línea de crédito, sube los tres documentos escaneados.
                </p>

                <div className="flex flex-column gap-1">
                    <label className="font-bold text-sm">Constancia de situación fiscal (CSF)</label>
                    <FileUpload
                        mode="basic"
                        name="csf"
                        accept=".pdf,.png,.jpg,.jpeg"
                        maxFileSize={5000000}
                        chooseLabel={csfFile ? csfFile.name : "Seleccionar CSF"}
                        className="w-full"
                        onSelect={(e: FileUploadSelectEvent) => setCsfFile(e.files[0] || null)}
                    />
                </div>

                <div className="flex flex-column gap-1">
                    <label className="font-bold text-sm">Comprobante de domicilio</label>
                    <FileUpload
                        mode="basic"
                        name="domicilio"
                        accept=".pdf,.png,.jpg,.jpeg"
                        maxFileSize={5000000}
                        chooseLabel={domicilioFile ? domicilioFile.name : "Seleccionar Comprobante"}
                        className="w-full"
                        onSelect={(e: FileUploadSelectEvent) => setDomicilioFile(e.files[0] || null)}
                    />
                </div>

                <div className="flex flex-column gap-1">
                    <label className="font-bold text-sm">Identificación oficial (INE)</label>
                    <FileUpload
                        mode="basic"
                        name="ine"
                        accept=".pdf,.png,.jpg,.jpeg"
                        maxFileSize={5000000}
                        chooseLabel={ineFile ? ineFile.name : "Seleccionar INE"}
                        className="w-full"
                        onSelect={(e: FileUploadSelectEvent) => setIneFile(e.files[0] || null)}
                    />
                </div>

                <div className="flex justify-content-end gap-2 mt-4">
                    <Button type="button" label="Cancelar" icon="pi pi-times" text onClick={handleClose} />
                    <Button type="submit" label="Enviar Solicitud" icon="pi pi-upload" loading={submitting} />
                </div>
            </form>
        </Dialog>
    );
};