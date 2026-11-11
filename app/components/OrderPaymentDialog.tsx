'use client';
import React, { useEffect, useState } from 'react';
import { Dialog } from 'primereact/dialog';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { InputNumber } from 'primereact/inputnumber';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { Divider } from 'primereact/divider';
import { FileUpload } from 'primereact/fileupload';
import { Message } from 'primereact/message';
import { ClientService } from '@/app/service/clientService';
import { Client } from '@/app/types/clients';

interface OrderPaymentDialogProps {
    visible: boolean;
    onHide: () => void;
    orderId: number | null;
    client?: Client | null;
    items: any[];
    total: number;
    paidAmount: number;
    currentConditionId?: number;
    paymentConditions: any[];
    onConfirmPayment: (paymentData: PaymentData) => void;
    isSubmitting: boolean;
    notes: string;
    onNotesChange: (value: string) => void;
    isAbono?: boolean;
}

export type PaymentType = 'unico' | 'anticipo' | 'credito';

export interface PaymentData {
    amount: number;
    paymentType: PaymentType;
    notes: string;
    conditionId: number;
    file: File | null;
}

const normalize = (value?: string | null) =>
    (value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

export const OrderPaymentDialog = (props: OrderPaymentDialogProps) => {
    const {
        visible,
        onHide,
        orderId,
        client: initialClient,
        items,
        total,
        paidAmount,
        currentConditionId,
        paymentConditions,
        onConfirmPayment,
        isSubmitting,
        notes,
        onNotesChange,
        isAbono = false,
    } = props;

    const [clientData, setClientData] = useState<Client | null>(initialClient || null);
    const [loadingClient, setLoadingClient] = useState(false);
    const [paymentType, setPaymentType] = useState<PaymentType>('unico');
    const [advanceAmount, setAdvanceAmount] = useState(0);
    const [paymentReference, setPaymentReference] = useState('');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    const saldoPendiente = Math.max(0, total - paidAmount);

    const currentCondition = paymentConditions.find(
        (condition) => Number(condition.idCondicion) === Number(currentConditionId)
    );

    const getPaymentType = (): PaymentType => {
        if (!currentCondition) return 'unico';

        const description = normalize(currentCondition.descripcion);
        const creditDays = Number(currentCondition.diasCredito || 0);

        if (
            creditDays > 0 ||
            description.includes('credito') ||
            description.includes('crédito')
        ) {
            return 'credito';
        }

        if (
            Number(currentCondition.idCondicion) === 2 ||
            description.includes('anticipo') ||
            description.includes('50%')
        ) {
            return 'anticipo';
        }

        return 'unico';
    };

    useEffect(() => {
        if (!visible) return;

        let cancelled = false;

        const loadClient = async () => {
            setLoadingClient(true);

            try {
                if (!initialClient) {
                    if (!cancelled) setClientData(null);
                    return;
                }

                const clientId = initialClient.id || (initialClient as any).idCliente;

                if (
                    initialClient.creditoHabilitado !== undefined &&
                    initialClient.creditoHabilitado !== null &&
                    initialClient.diasCredito !== undefined
                ) {
                    if (!cancelled) setClientData(initialClient);
                    return;
                }

                if (clientId) {
                    const data = await ClientService.getById(clientId);
                    if (!cancelled) setClientData(data);
                } else if (!cancelled) {
                    setClientData(initialClient);
                }
            } catch (error) {
                console.error('Error consultando cliente:', error);
                if (!cancelled) setClientData(initialClient || null);
            } finally {
                if (!cancelled) setLoadingClient(false);
            }
        };

        setPaymentReference('');
        setSelectedFile(null);
        
        const detectedType = getPaymentType();
        setPaymentType(detectedType);

        setAdvanceAmount(Number(saldoPendiente.toFixed(2)));

        void loadClient();

        return () => {
            cancelled = true;
        };
    }, [
        visible,
        orderId,
        initialClient,
        total,
        paidAmount,
        currentConditionId,
        paymentConditions
    ]);

    const isAtrasado = clientData?.estatusCredito === 'ATRASADO';
    const isCreditoHabilitado = Boolean(clientData?.creditoHabilitado) && !isAtrasado;

    const handleQuickSet = (type: PaymentType) => {
        // Si es abono de orden existente, no se permite cambiar de método
        if (isAbono) return;

        setPaymentType(type);

        if (type === 'unico') {
            setAdvanceAmount(Number(saldoPendiente.toFixed(2)));
        } else if (type === 'anticipo') {
            setAdvanceAmount(
                Number(Math.min(total * 0.5, saldoPendiente).toFixed(2))
            );
        } else if (type === 'credito') {
            setAdvanceAmount(0);
        }
    };

    const getConditionId = (): number => {
        if (paymentType === 'unico') {
            return (
                paymentConditions.find(
                    (condition) => Number(condition.numeroPlazos) === 1 &&
                        Number(condition.diasCredito || 0) === 0
                )?.idCondicion || 1
            );
        }

        if (paymentType === 'anticipo') {
            return (
                paymentConditions.find((condition) => {
                    const description = normalize(condition.descripcion);
                    return (
                        Number(condition.idCondicion) === 2 ||
                        description.includes('anticipo') ||
                        description.includes('50%')
                    );
                })?.idCondicion || 2
            );
        }

        const matchingCredit = paymentConditions.find(
            (condition) =>
                Number(condition.diasCredito) > 0 &&
                Number(condition.diasCredito) === Number(clientData?.diasCredito)
        );

        if (matchingCredit) return matchingCredit.idCondicion;

        if (currentCondition && Number(currentCondition.diasCredito) > 0) {
            return currentCondition.idCondicion;
        }

        return 5;
    };

    const handleConfirmClick = () => {
        if (advanceAmount > (saldoPendiente + 0.1) || advanceAmount <= 0) return;
        if (!isAbono && paymentType === 'credito' && !isCreditoHabilitado) return;

        onConfirmPayment({
            amount: Number(advanceAmount.toFixed(2)),
            paymentType,
            notes: paymentReference.trim(),
            conditionId: isAbono && currentConditionId
                ? Number(currentConditionId)
                : getConditionId(),
            file: selectedFile
        });
    };

    const montoACredito =
        paymentType === 'credito'
            ? Math.max(0, saldoPendiente - advanceAmount)
            : 0;

    const restanteFinal = Math.max(0, saldoPendiente - advanceAmount);

    return (
        <Dialog
            header={
                isAbono
                    ? `Registrar abono a orden #${orderId || ''}`
                    : items.length > 0
                    ? `Resumen de la orden #${orderId || ''}`
                    : `Cobrar orden #${orderId || ''}`
            }
            visible={visible}
            style={{ width: '90vw', maxWidth: '1300px' }}
            modal
            onHide={onHide}
        >
            <div className="grid">
                <div className="col-12 lg:col-8">
                    <div className="surface-card p-4 border-round shadow-1 h-full flex flex-column">
                        <h3 className="mb-4 text-700 text-xl font-bold flex align-items-center gap-2">
                            <i className="pi pi-list text-primary" />
                            Detalle de la orden
                        </h3>

                        <DataTable
                            value={items}
                            responsiveLayout="scroll"
                            size="small"
                            showGridlines
                            stripedRows
                            emptyMessage="Sin productos"
                            scrollHeight="300px"
                        >
                            <Column field="descripcion" header="Producto" />
                            <Column
                                field="cantidad"
                                header="Cant."
                                className="text-center"
                                style={{ width: '10%' }}
                            />
                            <Column
                                field="costo"
                                header="Precio"
                                body={(item) =>
                                    `$${Number(item.costo || 0).toFixed(2)}`
                                }
                                className="text-right"
                                style={{ width: '20%' }}
                            />
                            <Column
                                field="importe"
                                header="Total"
                                body={(item) =>
                                    `$${Number(item.importe || 0).toFixed(2)}`
                                }
                                className="text-right font-bold"
                                style={{ width: '20%' }}
                            />
                        </DataTable>

                        <div className="flex justify-content-end mt-3">
                            <div className="text-right p-3 border-round surface-50 border-1 border-200">
                                <span className="text-xl text-600 mr-3">
                                    Total de la orden:
                                </span>
                                <span className="text-3xl font-bold text-primary">
                                    ${total.toFixed(2)}
                                </span>
                            </div>
                        </div>

                        <Divider />

                        <div className="mb-4">
                            <label className="font-bold block mb-2 text-900">
                                <i className="pi pi-pencil mr-2 text-primary" />
                                Notas de diseño
                            </label>
                            <InputTextarea
                                value={notes || ''}
                                onChange={(event) =>
                                    onNotesChange(event.target.value)
                                }
                                rows={4}
                                className="w-full"
                                placeholder="Escribe aquí las instrucciones detalladas para el diseñador..."
                            />
                        </div>

                        <div className="mb-2">
                            <label className="font-bold block mb-2 text-700">
                                <i className="pi pi-cloud-upload mr-2" />
                                Archivos / Diseño
                            </label>
                            <FileUpload
                                mode="advanced"
                                name="orderFile"
                                accept="image/*,application/pdf"
                                maxFileSize={10000000}
                                chooseLabel="Seleccionar"
                                uploadLabel="Guardar"
                                cancelLabel="Eliminar"
                                customUpload
                                auto={false}
                                onSelect={(event) => {
                                    setSelectedFile(event.files?.[0] || null);
                                }}
                                onRemove={() => setSelectedFile(null)}
                                onClear={() => setSelectedFile(null)}
                                emptyTemplate={
                                    <p className="m-0 p-3 text-center text-500">
                                        Arrastra archivos aquí.
                                    </p>
                                }
                            />
                        </div>
                    </div>
                </div>

                <div className="col-12 lg:col-4">
                    <div className="surface-card p-4 border-round shadow-1 h-full flex flex-column">
                        <h3 className="mb-3 text-700 text-xl font-bold">
                            {isAbono ? 'Modalidad de pago fija' : 'Formas de pago'}
                        </h3>

                        {isAtrasado && !isAbono && (
                            <Message
                                severity="error"
                                className="w-full mb-3 justify-content-start"
                                text="CRÉDITO BLOQUEADO: El cliente tiene saldo atrasado. Debe regularizar su cuenta para solicitar nuevo crédito."
                            />
                        )}

                        {/* Botones de Selección Bloqueados si isAbono = true */}
                        <div className="flex flex-column gap-2 mb-4">
                            <Button
                                label="Pago total (Liquidar)"
                                disabled={isAbono}
                                icon="pi pi-check-circle"
                                className={`p-button-sm text-left ${
                                    paymentType === 'unico'
                                        ? 'p-button-primary'
                                        : 'p-button-outlined p-button-secondary'
                                }`}
                                onClick={() => handleQuickSet('unico')}
                            />

                            <Button
                                label="Anticipo (50%)"
                                disabled={isAbono}
                                icon="pi pi-wallet"
                                className={`p-button-sm text-left ${
                                    paymentType === 'anticipo'
                                        ? 'p-button-primary'
                                        : 'p-button-outlined p-button-secondary'
                                }`}
                                onClick={() => handleQuickSet('anticipo')}
                            />

                            <Button
                                label={
                                    loadingClient
                                        ? 'Cargando...'
                                        : `Crédito directo (${clientData?.diasCredito || 0} días)`
                                }
                                icon="pi pi-credit-card"
                                className={`p-button-sm text-left ${
                                    paymentType === 'credito'
                                        ? 'p-button-primary'
                                        : 'p-button-outlined p-button-secondary'
                                }`}
                                onClick={() => handleQuickSet('credito')}
                                loading={loadingClient}
                                disabled={isAbono || !isCreditoHabilitado || loadingClient}
                                tooltip={
                                    isAtrasado
                                        ? 'Cliente con saldo atrasado'
                                        : !clientData?.creditoHabilitado
                                        ? 'El cliente no tiene línea de crédito activa'
                                        : ''
                                }
                                tooltipOptions={{ showOnDisabled: true }}
                            />
                        </div>

                        <Divider />

                        {/* Input de Monto HABILITADO para ingresar el abono */}
                        <div className="mb-2">
                            <label className="font-bold block mb-2 text-700">
                                {isAbono ? 'Monto del abono hoy' : paymentType === 'credito' ? 'Anticipo opcional' : 'Monto a cobrar hoy'}
                            </label>

                            <div className="p-inputgroup">
                                <span className="p-inputgroup-addon text-green-600 font-bold">
                                    $
                                </span>
                                <InputNumber
                                    value={advanceAmount}
                                    onValueChange={(event) =>
                                        setAdvanceAmount(event.value ?? 0)
                                    }
                                    placeholder="0.00"
                                    mode="currency"
                                    currency="MXN"
                                    locale="es-MX"
                                    minFractionDigits={2}
                                    maxFractionDigits={2}
                                    min={0}
                                    max={saldoPendiente}
                                    inputStyle={{
                                        fontWeight: 'bold',
                                        fontSize: '1.2rem'
                                    }}
                                    className={
                                        advanceAmount > (saldoPendiente + 0.1)
                                            ? 'p-invalid'
                                            : ''
                                    }
                                />
                            </div>
                        </div>

                        <div className="surface-100 p-3 border-round mb-4 mt-2 text-sm">
                            <div className="flex justify-content-between mb-1">
                                <span className="text-600">Total de la orden:</span>
                                <span className="font-semibold">
                                    ${total.toFixed(2)}
                                </span>
                            </div>

                            {paidAmount > 0 && (
                                <div className="flex justify-content-between mb-1">
                                    <span className="text-600">
                                        Abonado anteriormente:
                                    </span>
                                    <span className="font-semibold text-green-600">
                                        -${paidAmount.toFixed(2)}
                                    </span>
                                </div>
                            )}

                            <div className="flex justify-content-between mb-2 pt-2 border-top-1 border-300">
                                <span className="text-800 font-bold">
                                    Saldo pendiente:
                                </span>
                                <span className="font-bold text-900">
                                    ${saldoPendiente.toFixed(2)}
                                </span>
                            </div>

                            <div className="flex justify-content-between mb-2 align-items-center bg-white p-2 border-round">
                                <span className="text-primary font-bold">
                                    Abono actual:
                                </span>
                                <span className="font-bold text-primary text-lg">
                                    -${advanceAmount.toFixed(2)}
                                </span>
                            </div>

                            <div className="border-top-1 surface-border my-2" />

                            <div className="flex justify-content-between align-items-center">
                                <span className="text-900 font-medium">
                                    Saldo restante final:
                                </span>
                                <span
                                    className={`text-lg font-bold ${
                                        restanteFinal <= 0.01
                                            ? 'text-green-500'
                                            : 'text-red-500'
                                    }`}
                                >
                                    ${restanteFinal.toFixed(2)}
                                </span>
                            </div>
                        </div>

                        <div className="mb-4">
                            <label
                                htmlFor="paymentRef"
                                className="block text-600 text-sm mb-1"
                            >
                                Referencia de pago
                            </label>
                            <InputText
                                id="paymentRef"
                                className="w-full"
                                value={paymentReference}
                                onChange={(event) =>
                                    setPaymentReference(event.target.value)
                                }
                                placeholder="Efectivo / Transf / #Recibo"
                            />
                        </div>

                        <Button
                            label={isAbono ? 'Registrar Abono' : 'Confirmar Pago y Guardar'}
                            icon="pi pi-check-circle"
                            size="large"
                            className="mt-auto w-full shadow-3"
                            onClick={handleConfirmClick}
                            loading={isSubmitting}
                            disabled={
                                isSubmitting ||
                                advanceAmount <= 0 ||
                                advanceAmount > (saldoPendiente + 0.1) ||
                                (!isAbono && paymentType === 'credito' && !isCreditoHabilitado)
                            }
                        />
                    </div>
                </div>
            </div>
        </Dialog>
    );
};