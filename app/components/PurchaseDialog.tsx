'use client';
import React, { useState, useEffect } from 'react';
import { Dialog } from 'primereact/dialog';
import { Button } from 'primereact/button';
import { InputNumber } from 'primereact/inputnumber';
import { FileUpload } from 'primereact/fileupload';
import { Calendar } from 'primereact/calendar';

export type PurchaseDialogMode = 'SUCCESS' | 'DELAY' | 'ARRIVAL';

export interface PurchaseSubmitData {
    costoReal?: number;
    file?: File;
    fechaEntrega?: string;
}

interface PurchaseActionDialogProps {
    visible: boolean;
    mode: PurchaseDialogMode;
    onHide: () => void;
    onSubmit: (data: PurchaseSubmitData) => void;
    isSubmitting: boolean;
}

export const PurchaseActionDialog: React.FC<PurchaseActionDialogProps> = ({
    visible,
    mode,
    onHide,
    onSubmit,
    isSubmitting
}) => {
    const [costoReal, setCostoReal] = useState<number | null>(null);
    const [file, setFile] = useState<File | null>(null);
    const [nuevaFecha, setNuevaFecha] = useState<Date | null>(null);

    useEffect(() => {
        if (visible) {
            setCostoReal(null);
            setFile(null);
            setNuevaFecha(null);
        }
    }, [visible]);

    const handleSubmit = () => {
        let formattedDate = undefined;
        if (nuevaFecha) {
            const year = nuevaFecha.getFullYear();
            const month = String(nuevaFecha.getMonth() + 1).padStart(2, '0');
            const day = String(nuevaFecha.getDate()).padStart(2, '0');
            formattedDate = `${year}-${month}-${day}`;
        }

        onSubmit({
            costoReal: costoReal ?? undefined,
            file: file ?? undefined,
            fechaEntrega: formattedDate
        });
    };

    const isArrival = mode === 'ARRIVAL';
    const isSuccess = mode === 'SUCCESS';
    const isDelay = mode === 'DELAY';

    const getHeader = () => {
        if (isArrival) return "Llegada de insumos atrasados";
        if (isSuccess) return "Registrar compra exitosa";
        if (isDelay) return "Reportar insumos atrasados";
        return "Procesar insumos";
    };

    const isFormValid = () => {
        if (isArrival) return true;
        if (isSuccess) return costoReal !== null && file !== null;
        if (isDelay) return costoReal !== null && file !== null && nuevaFecha !== null;
        return false;
    };

    const getSubmitButtonProps = () => {
        if (isArrival) {
            return { label: "Confirmar llegada", icon: "pi pi-check-circle", severity: "success" as const };
        }
        if (isSuccess) {
            return { label: "Guardar compra", icon: "pi pi-save", severity: undefined };
        }
        if (isDelay) {
            return { label: "Confirmar atraso", icon: "pi pi-calendar-plus", severity: "warning" as const };
        }
        return { label: "Confirmar", icon: "pi pi-check", severity: undefined };
    };

    const submitActionProps = getSubmitButtonProps();

    return (
        <Dialog
            header={getHeader()}
            visible={visible}
            style={{ width: '90vw', maxWidth: '450px' }}
            modal
            onHide={onHide}
        >
            <div className="flex flex-column gap-4 pt-2">

                {/* 1. Textos de Ayuda Dinámicos */}
                {isArrival && (
                    <p className="m-0 line-height-3 text-sm text-600">
                        El gasto de estos insumos ya fue cobrado. Al confirmar, le avisaremos al taller que los insumos físicos por fin llegaron y la orden está lista para producirse.
                    </p>
                )}
                {isSuccess && (
                    <p className="m-0 line-height-3 text-sm text-600">
                        Registra el monto final de la compra y adjunta el comprobante para cerrar esta solicitud exitosamente.
                    </p>
                )}
                {isDelay && (
                    <p className="m-0 line-height-3 text-sm text-600">
                        Registra el gasto de los insumos y selecciona la <b>nueva fecha de entrega</b> acordada con el cliente debido a la falta de stock.
                    </p>
                )}

                {/* 2. Inputs para Costo y Archivo (Para SUCCESS y DELAY) */}
                {(isSuccess || isDelay) && (
                    <>
                        <div className="field">
                            <label className="font-bold block mb-2">Costo de los insumos ($)</label>
                            <InputNumber
                                value={costoReal}
                                onValueChange={(e) => setCostoReal(e.value ?? null)}
                                mode="currency"
                                currency="MXN"
                                locale="es-MX"
                                placeholder="Ej. 450.50"
                                className="w-full"
                            />
                        </div>

                        <div className="field">
                            <label className="font-bold block mb-2">Comprobante o Ticket</label>
                            <FileUpload
                                mode="basic"
                                name="file"
                                accept="image/*,application/pdf"
                                maxFileSize={2000000}
                                chooseLabel={file ? file.name : "Subir Recibo (PDF/JPG)"}
                                onSelect={(e) => setFile(e.files[0])}
                                auto={false}
                                customUpload
                                className="w-full"
                            />
                        </div>
                    </>
                )}

                {/* 3. Input Exclusivo para Nueva Fecha (Solo DELAY) */}
                {isDelay && (
                    <div className="field">
                        <label className="font-bold block mb-2">Nueva fecha de entrega</label>
                        <Calendar
                            value={nuevaFecha}
                            onChange={(e) => setNuevaFecha(e.value as Date)}
                            dateFormat="dd/mm/yy"
                            minDate={new Date()}
                            placeholder="Selecciona una fecha"
                            showIcon
                            className="w-full"
                        />
                    </div>
                )}

                {/* 4. Botones de Acción */}
                <div className="flex justify-content-end gap-2 mt-3 pt-3 border-top-1 surface-border">
                    <Button
                        label="Cancelar"
                        icon="pi pi-times"
                        text
                        onClick={onHide}
                        disabled={isSubmitting}
                    />
                    <Button
                        label={submitActionProps.label}
                        icon={submitActionProps.icon}
                        severity={submitActionProps.severity}
                        loading={isSubmitting}
                        onClick={handleSubmit}
                        disabled={!isFormValid()}
                    />
                </div>
            </div>
        </Dialog>
    );
};