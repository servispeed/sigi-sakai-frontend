'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Dialog } from 'primereact/dialog';
import { DataTable, DataTablePageEvent } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { Tag } from 'primereact/tag';
import { InputNumber } from 'primereact/inputnumber';
import { InputText } from 'primereact/inputtext';
import { Toast } from 'primereact/toast';
import { OrderService, ClienteConSaldoDTO } from '@/app/service/orderService';
import { ClientService } from '@/app/service/clientService';
import { Client } from '@/app/types/clients';

interface DebtClientsDialogProps {
    visible: boolean;
    onHide: () => void;
    currentUserId: number;
    onPaymentSuccess?: () => void;
}

export const DebtClientsDialog: React.FC<DebtClientsDialogProps> = ({
    visible,
    onHide,
    currentUserId,
    onPaymentSuccess
}) => {
    const toast = useRef<Toast>(null);

    // Estado de tabla paginada
    const [debtors, setDebtors] = useState<ClienteConSaldoDTO[]>([]);
    const [loading, setLoading] = useState(false);
    const [first, setFirst] = useState(0);
    const [rows, setRows] = useState(10);
    const [totalRecords, setTotalRecords] = useState(0);

    // Estado para sub-modal de Abono Directo a Cuenta
    const [showAbonoModal, setShowAbonoModal] = useState(false);
    const [selectedDebtor, setSelectedDebtor] = useState<ClienteConSaldoDTO | null>(null);
    const [abonoAmount, setAbonoAmount] = useState<number>(0);
    const [abonoRef, setAbonoRef] = useState<string>('');
    const [isSubmittingAbono, setIsSubmittingAbono] = useState(false);
    const [clientesMap, setClientesMap] = useState<Map<number, Client>>(new Map());

    const loadDebtors = useCallback(async (pageIndex: number = 0, pageSize: number = 10) => {
        setLoading(true);
        try {
            const response = await OrderService.getClientesConSaldoDeudor(pageIndex, pageSize);
            const content = response.content || [];
            const total = response.page?.totalElements ?? response.totalElements ?? content.length;

            setDebtors(content);
            setTotalRecords(total);
        } catch (error) {
            console.error('Error cargando saldos deudores:', error);
            toast.current?.show({
                severity: 'error',
                summary: 'Error',
                detail: 'No se pudieron cargar los clientes con saldo deudor.'
            });
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!visible) return;

        setFirst(0);

        const loadClients = async () => {
            try {
                const clientes = await ClientService.getAll();

                const map = new Map<number, Client>();

                clientes.forEach((cliente) => {
                    map.set(Number(cliente.id), cliente);
                });

                setClientesMap(map);
            } catch (error) {
                console.error('Error cargando clientes:', error);
            }
        };

        loadClients();
        loadDebtors(0, rows);
    }, [visible, rows, loadDebtors]);

    const onPage = (event: DataTablePageEvent) => {
        setFirst(event.first);
        setRows(event.rows);
        const pageIndex = event.page ?? Math.floor(event.first / event.rows);
        loadDebtors(pageIndex, event.rows);
    };

    const openAbonoModal = (rowData: ClienteConSaldoDTO) => {
        setSelectedDebtor(rowData);
        setAbonoAmount(Number((rowData.saldoDeudor || 0).toFixed(2)));
        setAbonoRef('');
        setShowAbonoModal(true);
    };

    const handleConfirmAbono = async () => {
        if (!selectedDebtor || abonoAmount <= 0 || abonoAmount > selectedDebtor.saldoDeudor + 0.01) return;

        setIsSubmittingAbono(true);
        try {
            // Envía idOrden: null para abonar directamente al saldo general del cliente
            await OrderService.registrarPago(null, {
                idCliente: selectedDebtor.idCliente,
                monto: Number(abonoAmount.toFixed(2)),
                referencia: abonoRef.trim() ? `Abono a cuenta - ${abonoRef.trim()}` : 'Abono directo a cuenta',
                idUsuario: currentUserId
            });

            toast.current?.show({
                severity: 'success',
                summary: 'Abono Registrado',
                detail: `Se registró el abono de $${abonoAmount.toFixed(2)} a la cuenta de ${selectedDebtor.cliente?.nombre}.`
            });

            setShowAbonoModal(false);
            setSelectedDebtor(null);

            // Recargar página actual de deudores y notificar al padre
            const currentPage = Math.floor(first / rows);
            await loadDebtors(currentPage, rows);
            if (onPaymentSuccess) onPaymentSuccess();
        } catch (error: any) {
            toast.current?.show({
                severity: 'error',
                summary: 'Error',
                detail: error.message || 'No se pudo registrar el abono.'
            });
        } finally {
            setIsSubmittingAbono(false);
        }
    };

    const clienteBodyTemplate = (rowData: ClienteConSaldoDTO) => {
        const cliente = clientesMap.get(Number(rowData.idCliente));
        const nombre = rowData.cliente?.nombre || cliente?.nombre;

        return (
            <div className="flex flex-column">
                <span className="font-bold text-900">
                    {nombre || `Cliente #${rowData.idCliente}`}
                </span>

                <span className="text-xs text-500">
                    {cliente?.telefono ? `Tel: ${cliente.telefono}` : ''}
                    {cliente?.rfc ? ` | RFC: ${cliente.rfc}` : ''}
                </span>
            </div>
        );
    };

    const estatusCreditoTemplate = (rowData: ClienteConSaldoDTO) => {
        const estatus = rowData.cliente?.estatusCredito?.toUpperCase();
        switch (estatus) {
            case 'AL CORRIENTE':
                return <Tag value="AL CORRIENTE" severity="success" />;
            case 'ATRASADO':
                return <Tag value="ATRASADO" severity="danger" />;
            case 'SUSPENDIDO':
                return <Tag value="SUSPENDIDO" severity="warning" />;
            default:
                return <Tag value="CON ADEUDO" severity="info" />;
        }
    };

    const saldoBodyTemplate = (rowData: ClienteConSaldoDTO) => (
        <span className="font-bold text-red-600 text-lg">
            ${Number(rowData.saldoDeudor || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
    );

    const actionBodyTemplate = (rowData: ClienteConSaldoDTO) => (
        <div className="flex justify-content-center">
            <Button
                label="Abonar"
                icon="pi pi-dollar"
                size="small"
                severity="success"
                outlined
                onClick={() => openAbonoModal(rowData)}
                tooltip="Registrar abono a saldo"
            />
        </div>
    );

    return (
        <>
            <Toast ref={toast} />

            <Dialog
                header={
                    <div className="flex align-items-center gap-2">
                        <i className="pi pi-wallet text-red-600 text-xl" />
                        <span>Lista de clientes con adeudo</span>
                    </div>
                }
                visible={visible}
                style={{ width: '90vw', maxWidth: '1000px' }}
                modal
                onHide={onHide}
            >

                <DataTable
                    value={debtors}
                    lazy
                    paginator
                    first={first}
                    rows={rows}
                    totalRecords={totalRecords}
                    onPage={onPage}
                    rowsPerPageOptions={[5, 10, 20]}
                    loading={loading}
                    emptyMessage="No hay clientes con saldo deudor pendiente."
                    responsiveLayout="scroll"
                    stripedRows
                    dataKey="idCliente"
                >
                    <Column header="Cliente" body={clienteBodyTemplate} style={{ minWidth: '16rem' }} />
                    <Column header="Estatus Crédito" body={estatusCreditoTemplate} align="center" style={{ width: '10rem' }} />
                    <Column
                        header="Plazo"
                        body={(r: ClienteConSaldoDTO) => (r.cliente?.diasCredito ? `${r.cliente.diasCredito} días` : 'N/A')}
                        align="center"
                        style={{ width: '8rem' }}
                    />
                    <Column header="Saldo Deudor" body={saldoBodyTemplate} align="right" style={{ width: '11rem' }} />
                    <Column header="Acciones" body={actionBodyTemplate} align="center" style={{ width: '9rem' }} />
                </DataTable>
            </Dialog>

            {/* SUB-MODAL: REGISTRAR ABONO DIRECTO A CUENTA */}
            <Dialog
                header={`Abono a cuenta: ${selectedDebtor?.cliente?.nombre || ''}`}
                visible={showAbonoModal}
                style={{ width: '90vw', maxWidth: '450px' }}
                modal
                onHide={() => setShowAbonoModal(false)}
                footer={
                    <div className="flex justify-content-end gap-2">
                        <Button
                            label="Cancelar"
                            icon="pi pi-times"
                            text
                            severity="secondary"
                            onClick={() => setShowAbonoModal(false)}
                        />
                        <Button
                            label="Confirmar Abono"
                            icon="pi pi-check"
                            severity="success"
                            loading={isSubmittingAbono}
                            disabled={
                                isSubmittingAbono ||
                                abonoAmount <= 0 ||
                                abonoAmount > (selectedDebtor?.saldoDeudor || 0) + 0.01
                            }
                            onClick={handleConfirmAbono}
                        />
                    </div>
                }
            >
                {selectedDebtor && (
                    <div className="flex flex-column gap-3 pt-2">
                        <div className="surface-100 p-3 border-round flex justify-content-between align-items-center">
                            <span className="text-700 font-medium">Saldo Deudor Total:</span>
                            <span className="text-xl font-bold text-red-600">
                                ${selectedDebtor.saldoDeudor.toFixed(2)}
                            </span>
                        </div>

                        <div className="field m-0">
                            <label htmlFor="abonoMonto" className="font-bold block mb-2">Monto a abonar</label>
                            <InputNumber
                                id="abonoMonto"
                                value={abonoAmount}
                                onValueChange={(e) => setAbonoAmount(e.value ?? 0)}
                                mode="currency"
                                currency="MXN"
                                locale="es-MX"
                                min={0.01}
                                max={selectedDebtor.saldoDeudor}
                                className="w-full"
                                inputStyle={{ fontWeight: 'bold', fontSize: '1.2rem' }}
                            />
                        </div>

                        <div className="field m-0">
                            <label htmlFor="abonoReferencia" className="font-bold block mb-2">Referencia / Método de pago</label>
                            <InputText
                                id="abonoReferencia"
                                value={abonoRef}
                                onChange={(e) => setAbonoRef(e.target.value)}
                                placeholder="Ej. Transferencia #4589 / Efectivo"
                                className="w-full"
                            />
                        </div>
                    </div>
                )}
            </Dialog>
        </>
    );
};