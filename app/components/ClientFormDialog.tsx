import React, { useState, useEffect, useRef } from 'react';
import { Dialog } from 'primereact/dialog';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { Dropdown } from 'primereact/dropdown';
import { Divider } from 'primereact/divider';
import { Toast } from 'primereact/toast';
import { classNames } from 'primereact/utils';

import { ClientService } from "@/app/service/clientService";
import { CatalogService } from "@/app/service/catalogService";
import { Client, ClientRequest } from "@/app/types/clients";

interface DropdownOption {
    label: string;
    value: number;
}

interface Props {
    visible: boolean;
    onHide: () => void;
    onSuccess: (client: Client) => void;
    clientToEdit?: Client | null;
}

const emptyClient: ClientRequest = {
    nombre: '', email: '', telefono: '', rfc: '', razonSocial: '',
    direccionFiscal: '', idUsoCfdi: null, idRegimenFiscal: null
};

export const ClientFormDialog = ({ visible, onHide, onSuccess, clientToEdit }: Props) => {
    const [clientData, setClientData] = useState<ClientRequest>(emptyClient);
    const [submitted, setSubmitted] = useState(false);
    const [regimenOptions, setRegimenOptions] = useState<DropdownOption[]>([]);
    const [cfdiOptions, setCfdiOptions] = useState<DropdownOption[]>([]);
    const toast = useRef<Toast>(null);

    useEffect(() => {
        if (visible) {
            loadCatalogs();
            if (clientToEdit && clientToEdit.id) {
                setClientData({
                    nombre: clientToEdit.nombre,
                    email: clientToEdit.email,
                    telefono: clientToEdit.telefono,
                    rfc: clientToEdit.rfc,
                    razonSocial: clientToEdit.razonSocial,
                    direccionFiscal: clientToEdit.direccionFiscal,
                    idUsoCfdi: clientToEdit.idUsoCfdi,
                    idRegimenFiscal: clientToEdit.idRegimenFiscal
                });
            } else {
                setClientData(emptyClient);
            }
            setSubmitted(false);
        }
    }, [visible, clientToEdit]);

    const loadCatalogs = async () => {
        try {
            if (regimenOptions.length > 0) return;
            const [regimenes, usos] = await Promise.all([
                CatalogService.getRegimenesFiscales(),
                CatalogService.getUsosCfdi()
            ]);
            setRegimenOptions(regimenes.map(r => ({ label: `${r.clave} - ${r.descripcion}`, value: r.idRegimen })));
            setCfdiOptions(usos.map(u => ({ label: `${u.clave} - ${u.descripcion}`, value: u.idUsoCfdi })));
        } catch (e) { console.error(e); }
    };

    const isRfcExceedingMax = Boolean(clientData.rfc && clientData.rfc.trim().length > 13);

    const handleSave = async () => {
        setSubmitted(true);
        if (!clientData.nombre.trim()) return;

        const cleanRfc = clientData.rfc?.trim().toUpperCase() || null;

        if (cleanRfc && cleanRfc.length > 13) {
            toast.current?.show({
                severity: 'warn',
                summary: 'R.F.C. inválido',
                detail: 'El R.F.C. debe tener un máximo de 13 caracteres.'
            });
            return;
        }

        const payload: ClientRequest = {
            ...clientData,
            email: clientData.email?.trim() === '' ? null : clientData.email?.trim() || null,
            telefono: clientData.telefono?.trim() === '' ? null : clientData.telefono?.trim() || null,
            rfc: cleanRfc,
            razonSocial: clientData.razonSocial?.trim() === '' ? null : clientData.razonSocial?.trim() || null,
            direccionFiscal: clientData.direccionFiscal?.trim() === '' ? null : clientData.direccionFiscal?.trim() || null,
            idUsoCfdi: clientData.idUsoCfdi,
            idRegimenFiscal: clientData.idRegimenFiscal
        };

        try {
            let resultClient: Client;

            if (clientToEdit && clientToEdit.id) {
                await ClientService.update(clientToEdit.id, payload);
                resultClient = { ...clientToEdit, ...payload } as Client;
                toast.current?.show({ severity: 'success', summary: 'Éxito', detail: 'Cliente actualizado' });
            } else {
                const response = await ClientService.create(payload);
                resultClient = {
                    ...response,
                    id: response.id || response.idCliente,
                    idCliente: response.idCliente || response.id
                } as Client;
                toast.current?.show({ severity: 'success', summary: 'Éxito', detail: 'Cliente creado' });
            }
            onSuccess(resultClient);
            onHide();
        } catch (error: any) {
            console.error("Error al guardar:", error);
            const errorMessage = error?.message || 'No se pudo guardar. Verifique los datos.';
            toast.current?.show({
                severity: 'error',
                summary: 'Error',
                detail: errorMessage
            });
        }
    };

    const onInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>, name: string) => {
        let val = (e.target && e.target.value) || '';

        if (name === 'rfc') {
            val = val.toUpperCase().replace(/[^A-Z0-9&Ñ]/g, '').slice(0, 13);
        }

        setClientData(prev => ({ ...prev, [name]: val }));
    };

    const onDropdownChange = (e: any, name: string) => {
        setClientData(prev => ({ ...prev, [name]: e.value }));
    };

    const dialogFooter = (
        <div className="pt-2">
            <Button label="Cancelar" icon="pi pi-times" text onClick={onHide} />
            <Button label="Guardar" icon="pi pi-check" onClick={handleSave} />
        </div>
    );

    return (
        <>
            <Toast ref={toast} />
            <Dialog
                visible={visible}
                style={{ width: '50vw', minWidth: '500px' }}
                header={clientToEdit && clientToEdit.id ? "Editar Cliente" : "Nuevo Cliente"}
                modal
                className="p-fluid"
                footer={dialogFooter}
                onHide={onHide}
            >
                <div className="p-fluid formgrid grid pt-2">
                    <div className="field col-12 mb-2">
                        <label htmlFor="nombre" className="font-bold block mb-1">Nombre / Razón Social*</label>
                        <InputText id="nombre" value={clientData.nombre} onChange={(e) => onInputChange(e, 'nombre')} required autoFocus className={classNames({ 'p-invalid': submitted && !clientData.nombre })} />
                        {submitted && !clientData.nombre && <small className="p-error block">El nombre es obligatorio.</small>}
                    </div>
                    <div className="field col-12 md:col-6 mb-2">
                        <label htmlFor="email" className="font-bold block mb-1">Correo Electrónico</label>
                        <InputText id="email" value={clientData.email || ''} onChange={(e) => onInputChange(e, 'email')} />
                    </div>
                    <div className="field col-12 md:col-6 mb-2">
                        <label htmlFor="telefono" className="font-bold block mb-1">Teléfono</label>
                        <InputText id="telefono" value={clientData.telefono || ''} onChange={(e) => onInputChange(e, 'telefono')} />
                    </div>
                    <div className="col-12"><Divider align="left" className="my-2"><span className="p-tag p-tag-rounded text-xs">Datos Fiscales</span></Divider></div>
                    <div className="field col-12 mb-2">
                        <div className="flex justify-content-between align-items-center mb-1">
                            <label htmlFor="rfc" className="font-bold">R.F.C.</label>
                            <small className="text-500">{(clientData.rfc || '').length}/13</small>
                        </div>
                        <InputText
                            id="rfc"
                            value={clientData.rfc || ''}
                            maxLength={13}
                            onChange={(e) => onInputChange(e, 'rfc')}
                            placeholder="Máximo 13 caracteres"
                            className={classNames({ 'p-invalid': isRfcExceedingMax })}
                        />
                        {isRfcExceedingMax && (
                            <small className="p-error block">El R.F.C. no puede exceder los 13 caracteres.</small>
                        )}
                    </div>
                    <div className="field col-12 mb-2">
                        <label htmlFor="direccionFiscal" className="font-bold block mb-1">Dirección Fiscal</label>
                        <InputTextarea id="direccionFiscal" value={clientData.direccionFiscal || ''} onChange={(e) => onInputChange(e, 'direccionFiscal')} rows={2} autoResize />
                    </div>
                    <div className="field col-12 md:col-6 mb-2">
                        <label htmlFor="idRegimenFiscal" className="font-bold block mb-1">Régimen Fiscal</label>
                        <Dropdown value={clientData.idRegimenFiscal} options={regimenOptions} onChange={(e) => onDropdownChange(e, 'idRegimenFiscal')} placeholder="Seleccione régimen" className="w-full" filter />
                    </div>
                    <div className="field col-12 md:col-6 mb-0">
                        <label htmlFor="idUsoCfdi" className="font-bold block mb-1">Uso del C.F.D.I.</label>
                        <Dropdown value={clientData.idUsoCfdi} options={cfdiOptions} onChange={(e) => onDropdownChange(e, 'idUsoCfdi')} placeholder="Seleccione uso" className="w-full" filter />
                    </div>
                </div>
            </Dialog>
        </>
    );
};