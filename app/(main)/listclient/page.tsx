'use client';
import React, { useState, useRef, useEffect } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Toast } from 'primereact/toast';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { SelectButton } from 'primereact/selectbutton';
import { Tag } from 'primereact/tag';
import { FilterMatchMode } from 'primereact/api';
import Link from 'next/link';

import { ClientService } from "@/app/service/clientService";
import { CatalogService } from "@/app/service/catalogService";
import { Client, TipoClienteFiltro } from "@/app/types/clients";
import { ClientFormDialog } from "@/app/components/ClientFormDialog";
import { UltimaCompraDialog } from "@/app/components/LastPurchaseDialog";
import { CreditApplicationDialog } from "@/app/components/CreditApplicationDialog";
import { AssignCreditDialog } from "@/app/components/AssignCreditDialog";

const initialClient: Client = {
    id: null,
    nombre: '', email: null, telefono: null, rfc: null, razonSocial: null,
    direccionFiscal: null, idUsoCfdi: null, idRegimenFiscal: null,
    creditoHabilitado: false, estatusCredito: null, diasCredito: null, limiteCredito: null,
};

interface DropdownOption { label: string; value: number; }

const ListClientsPage = () => {
    const [clients, setClients] = useState<Client[]>([]);
    const [tipoFiltro, setTipoFiltro] = useState<TipoClienteFiltro>('todos');
    const [clientDialog, setClientDialog] = useState(false);
    const [deleteClientDialog, setDeleteClientDialog] = useState(false);
    const [client, setClient] = useState<Client>(initialClient);
    const [loading, setLoading] = useState(false);

    const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
    const [ultimaCompraDialog, setUltimaCompraDialog] = useState(false);

    const [creditDialogVisible, setCreditDialogVisible] = useState(false);
    const [assignCreditDialogVisible, setAssignCreditDialogVisible] = useState(false);
    const [clientForCredit, setClientForCredit] = useState<Client | null>(null);

    const [globalFilterValue, setGlobalFilterValue] = useState('');
    const [filters, setFilters] = useState({ global: { value: null, matchMode: FilterMatchMode.CONTAINS } });
    const [regimenOptions, setRegimenOptions] = useState<DropdownOption[]>([]);
    const [cfdiOptions, setCfdiOptions] = useState<DropdownOption[]>([]);

    const toast = useRef<Toast>(null);

    const filtroOptions = [
        { label: 'Todos', value: 'todos' },
        { label: 'Mostrador', value: 'mostrador' },
        { label: 'Fiscales', value: 'factura' }
    ];

    useEffect(() => {
        loadClients(tipoFiltro);
        loadCatalogs();
    }, [tipoFiltro]);

    const loadClients = async (tipo: TipoClienteFiltro) => {
        setLoading(true);
        try {
            const data = await ClientService.getAll(tipo);

            const dataWithCounts = await Promise.all(
                data.map(async (item) => {
                    if (!item.id) return item;

                    try {
                        const [count] = await Promise.all([
                            ClientService.getPurchasesCount(item.id),
                        ]);

                        return {
                            ...item,
                            totalCompras: count,
                        };
                    } catch {
                        return {
                            ...item,
                            totalCompras: item.totalCompras ?? 0,
                        };
                    }
                })
            );

            setClients(dataWithCounts);
        } catch (err) {
            toast.current?.show({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar los clientes' });
        } finally {
            setLoading(false);
        }
    };

    const loadCatalogs = async () => {
        try {
            const [regimenesData, usosData] = await Promise.all([
                CatalogService.getRegimenesFiscales(),
                CatalogService.getUsosCfdi()
            ]);
            setRegimenOptions(regimenesData.map((r: any) => ({ label: `${r.clave} ${r.descripcion}`, value: r.idRegimen })));
            setCfdiOptions(usosData.map((u: any) => ({ label: `${u.clave} ${u.descripcion}`, value: u.idUsoCfdi })));
        } catch (error) {
            console.error("Error cargando catálogos", error);
        }
    };

    const handleVerUltimaCompra = (c: Client) => {
        if (!c.id) return;
        setSelectedClientId(c.id);
        setUltimaCompraDialog(true);
    };

    const handleOpenCreditDialog = (c: Client) => {
        setClientForCredit(c);
        setCreditDialogVisible(true);
    };

    const handleOpenAssignCredit = (c: Client) => {
        setClientForCredit(c);
        setAssignCreditDialogVisible(true);
    };

    const openNew = () => {
        setClient({ ...initialClient });
        setClientDialog(true);
    };

    const editClient = (c: Client) => {
        setClient({ ...c });
        setClientDialog(true);
    };

    const handleClientSaved = () => {
        loadClients(tipoFiltro);
        setClientDialog(false);
    };

    const confirmDeleteClient = (c: Client) => {
        setClient(c);
        setDeleteClientDialog(true);
    };

    const deleteClient = async () => {
        if (!client.id) return;
        try {
            await ClientService.delete(client.id);
            setClients(clients.filter((val) => val.id !== client.id));
            setDeleteClientDialog(false);
            setClient({ ...initialClient });
            toast.current?.show({ severity: 'success', summary: 'Eliminado', detail: 'Cliente eliminado' });
        } catch (error) {
            toast.current?.show({ severity: 'error', summary: 'Error', detail: 'No se pudo eliminar el cliente' });
        }
    };

    const onGlobalFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        let _filters = { ...filters };
        // @ts-ignore
        _filters['global'].value = value;
        setFilters(_filters);
        setGlobalFilterValue(value);
    };

    const getRegimenLabel = (id: number | null) => regimenOptions.find(op => op.value === id)?.label || '-';
    const getCfdiLabel = (id: number | null) => cfdiOptions.find(op => op.value === id)?.label || '-';

    const comprasBodyTemplate = (rowData: Client) => {
        const count = rowData.totalCompras || 0;
        return (
            <div className="flex align-items-center gap-2">
                <span className="text-xs font-semibold">Compras:</span>
                <Tag value={`${count}/3`} severity={count >= 3 ? 'success' : 'warning'} />
            </div>
        );
    };

    const creditoStatusBodyTemplate = (rowData: Client) => {
        if (!rowData.creditoHabilitado) {
            return <span className="text-500 text-xs italic">Inactivo</span>;
        }

        const estatus = rowData.estatusCredito || 'AL CORRIENTE';
        let severity: 'success' | 'danger' | 'warning' | 'info' = 'info';

        if (estatus === 'AL CORRIENTE') severity = 'success';
        if (estatus === 'ATRASADO') severity = 'danger';
        if (estatus === 'SUSPENDIDO') severity = 'warning';

        return (
            <div className="flex flex-column gap-1 text-xs">
                <div><Tag value={estatus} severity={severity} /></div>
                <div><b>Límite:</b> {rowData.limiteCredito ? `$${rowData.limiteCredito.toLocaleString('es-MX', { minimumFractionDigits: 2 })}` : 'Sin Límite'}</div>
                <div><b>Plazo:</b> {rowData.diasCredito ? `${rowData.diasCredito} días` : 'N/A'}</div>
            </div>
        );
    };

    const header = (
        <div className="flex flex-column md:flex-row md:align-items-center justify-content-between gap-3">
            <div className="flex flex-column sm:flex-row gap-2 align-items-center w-full md:w-auto">
                <span className="p-input-icon-left w-full sm:w-auto">
                    <i className="pi pi-search" />
                    <InputText
                        value={globalFilterValue}
                        onChange={onGlobalFilterChange}
                        placeholder="Buscar cliente..."
                        className="w-full sm:w-auto"
                    />
                </span>
                <SelectButton
                    value={tipoFiltro}
                    onChange={(e) => e.value && setTipoFiltro(e.value)}
                    options={filtroOptions}
                    className="p-button-sm"
                />
            </div>

            <Button label="Agregar cliente" icon="pi pi-plus" onClick={openNew} />
        </div>
    );

    const actionBodyTemplate = (rowData: Client) => {
        const canRequestCredit = (rowData.totalCompras || 0) >= 3;
        const hasDocs = (rowData.documentosCount || 0) >= 3;
        const hasCredit = rowData.creditoHabilitado;

        return (
            <div className="flex gap-1 justify-content-center align-items-center">
                {!hasCredit && (
                    <Button
                        icon="pi pi-id-card"
                        rounded
                        text
                        severity={canRequestCredit ? "success" : "secondary"}
                        disabled={!canRequestCredit}
                        tooltip={canRequestCredit ? "Solicitar Crédito" : "Mínimo 3 compras requeridas"}
                        tooltipOptions={{ showOnDisabled: true }}
                        onClick={() => handleOpenCreditDialog(rowData)}
                    />
                )}
                {!hasCredit && (
                    <Button
                        icon="pi pi-check-square"
                        rounded
                        text
                        severity={hasDocs ? 'success' : 'secondary'}
                        disabled={false}
                        tooltip={hasDocs ? 'Asignar Línea de Crédito' : 'Requiere expediente completo (3 documentos)'}
                        tooltipOptions={{ showOnDisabled: true }}
                        onClick={() => handleOpenAssignCredit(rowData)}
                    />
                )}
                <Button
                    icon="pi pi-history"
                    rounded
                    text
                    severity="help"
                    tooltip="Última compra"
                    onClick={() => handleVerUltimaCompra(rowData)}
                />
                <Button
                    icon="pi pi-pencil"
                    rounded
                    text
                    severity="info"
                    tooltip="Editar"
                    onClick={() => editClient(rowData)}
                />
                <Button
                    icon="pi pi-trash"
                    rounded
                    text
                    severity="danger"
                    tooltip="Eliminar"
                    onClick={() => confirmDeleteClient(rowData)}
                />
            </div>
        );
    };

    const deleteClientDialogFooter = (
        <>
            <Button label="No" icon="pi pi-times" text onClick={() => setDeleteClientDialog(false)} />
            <Button label="Sí" icon="pi pi-check" text severity="danger" onClick={deleteClient} />
        </>
    );

    return (
        <div className="card">
            <Toast ref={toast} />

            <div className="flex justify-content-between align-items-center mb-4">
                <h2 className="m-0">Lista de clientes</h2>
                <Link href="/counter" passHref legacyBehavior>
                    <a className="p-button p-component p-button-text p-button-plain">
                        <i className="pi pi-arrow-left mr-2"></i>
                        <span className="font-bold">Volver</span>
                    </a>
                </Link>
            </div>

            <DataTable
                value={clients}
                paginator rows={10}
                header={header}
                filters={filters}
                globalFilterFields={['nombre', 'email', 'telefono', 'rfc', 'direccionFiscal']}
                emptyMessage="No se encontraron clientes."
                responsiveLayout="scroll"
                stripedRows
                loading={loading}
                dataKey="id"
            >
                <Column field="nombre" header="Nombre" sortable style={{ minWidth: '10rem' }} />
                <Column body={comprasBodyTemplate} header="Compras" style={{ minWidth: '9rem' }} />
                <Column body={creditoStatusBodyTemplate} header="Crédito" style={{ minWidth: '10rem' }} />
                <Column field="email" header="Correo" sortable style={{ minWidth: '10rem' }} />
                <Column field="telefono" header="Teléfono" sortable style={{ minWidth: '8rem' }} />
                <Column field="rfc" header="R.F.C." sortable style={{ minWidth: '7rem' }} />
                <Column body={(row: Client) => getRegimenLabel(row.idRegimenFiscal)} header="Régimen fiscal" sortable style={{ minWidth: '11rem' }} />
                <Column body={(row: Client) => getCfdiLabel(row.idUsoCfdi)} header="Uso del C.F.D.I." sortable style={{ minWidth: '10rem' }} />
                <Column body={actionBodyTemplate} exportable={false} style={{ minWidth: '11rem', textAlign: 'center' }} />
            </DataTable>

            <ClientFormDialog
                visible={clientDialog}
                onHide={() => setClientDialog(false)}
                onSuccess={handleClientSaved}
                clientToEdit={client.id ? client : null}
            />

            <UltimaCompraDialog
                visible={ultimaCompraDialog}
                idCliente={selectedClientId}
                onHide={() => {
                    setUltimaCompraDialog(false);
                    setSelectedClientId(null);
                }}
            />

            <CreditApplicationDialog
                visible={creditDialogVisible}
                client={clientForCredit}
                onHide={() => {
                    setCreditDialogVisible(false);
                    setClientForCredit(null);
                }}
                onSuccess={() => {
                    setCreditDialogVisible(false);
                    setClientForCredit(null);
                    toast.current?.show({
                        severity: 'success',
                        summary: 'Expediente Recibido',
                        detail: 'La solicitud y los documentos fueron enviados con éxito'
                    });
                    loadClients(tipoFiltro);
                }}
                onError={(message) => {
                    toast.current?.show({
                        severity: 'error',
                        summary: 'Error',
                        detail: message
                    });
                }}
            />

            <AssignCreditDialog
                visible={assignCreditDialogVisible}
                client={clientForCredit}
                onHide={() => {
                    setAssignCreditDialogVisible(false);
                    setClientForCredit(null);
                }}
                onSuccess={() => {
                    setAssignCreditDialogVisible(false);
                    setClientForCredit(null);
                    toast.current?.show({
                        severity: 'success',
                        summary: 'Crédito Habilitado',
                        detail: 'Se asignó la línea de crédito correctamente'
                    });
                    loadClients(tipoFiltro);
                }}
                onError={(message) => {
                    toast.current?.show({
                        severity: 'error',
                        summary: 'Error',
                        detail: message
                    });
                }}
            />

            <Dialog
                visible={deleteClientDialog}
                style={{ width: '32rem' }}
                breakpoints={{ '960px': '75vw', '641px': '90vw' }}
                header="Confirmar"
                modal
                footer={deleteClientDialogFooter}
                onHide={() => setDeleteClientDialog(false)}
            >
                <div className="confirmation-content">
                    <i className="pi pi-exclamation-triangle mr-3 text-yellow-500" style={{ fontSize: '2rem' }} />
                    {client && (<span>¿Estás seguro de que quieres eliminar a <b>{client.nombre}</b>?</span>)}
                </div>
            </Dialog>
        </div>
    );
};

export default ListClientsPage;