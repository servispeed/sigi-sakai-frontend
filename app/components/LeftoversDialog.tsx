import React, { useState, useEffect } from 'react';
import { Dialog } from 'primereact/dialog';
import { Button } from 'primereact/button';
import { Checkbox } from 'primereact/checkbox';
import { InputNumber } from 'primereact/inputnumber';

export interface OrderItem {
    idDetalle: number;
    idProducto: number;
    nombreProducto: string;
    cantidad: number;
    unidadVenta: string;
}

interface LeftoversDialogProps {
    visible: boolean;
    onHide: () => void;
    onConfirm: (hasLeftovers: boolean, leftoverQuantities: { [key: number]: number }) => void;
    orderItems: OrderItem[];
    isSubmitting: boolean;
}

export const LeftoversDialog: React.FC<LeftoversDialogProps> = ({
    visible,
    onHide,
    onConfirm,
    orderItems,
    isSubmitting
}) => {
    const [hasLeftovers, setHasLeftovers] = useState(false);
    const [leftoverQuantities, setLeftoverQuantities] = useState<{ [key: number]: number }>({});

    useEffect(() => {
        if (visible) {
            setHasLeftovers(false);
            setLeftoverQuantities({});
        }
    }, [visible]);

    const handleQuantityChange = (idDetalle: number, value: number | null | undefined) => {
        setLeftoverQuantities(prev => ({
            ...prev,
            [idDetalle]: value ?? 0
        }));
    };

    const handleConfirm = () => {
        onConfirm(hasLeftovers, leftoverQuantities);
    };

    const footer = (
        <div>
            <Button
                label="Cancelar"
                icon="pi pi-times"
                onClick={onHide}
                className="p-button-text"
                disabled={isSubmitting}
            />
            <Button
                label="Confirmar y cerrar orden"
                icon="pi pi-check"
                onClick={handleConfirm}
                autoFocus
                loading={isSubmitting}
            />
        </div>
    );

    return (
        <Dialog
            header="Finalizar orden"
            visible={visible}
            style={{ width: '90vw', maxWidth: '500px' }}
            onHide={() => !isSubmitting && onHide()}
            footer={footer}
        >
            <div className="flex flex-column gap-4">
                <div className="flex align-items-center justify-content-center gap-2">

                    <label htmlFor="cb-leftovers" className="align-items-center font-bold cursor-pointer">
                        ¿Quedaron materiales sobrantes de esta orden?
                    </label>
                    <Checkbox
                        inputId="cb-leftovers"
                        checked={hasLeftovers}
                        onChange={e => setHasLeftovers(e.checked || false)}
                        style={{marginTop: '8px'}}
                    />
                </div>

                {hasLeftovers && (
                    <div className="p-3 border-round border-1 border-gray-200">
                        <p className="mt-0 mb-3 text-sm text-600">
                            Indica la cantidad de piezas sobrantes por producto para agregarlas al inventario del cliente.
                        </p>

                        {orderItems.map(item => (
                            <div key={item.idDetalle} className="flex align-items-center justify-content-between mb-3 border-bottom-1 border-gray-300 pb-2 last-of-type:border-none last-of-type:mb-0 last-of-type:pb-0">
                                <div className="flex flex-column w-8">
                                    <span className="font-medium text-sm text-overflow-ellipsis overflow-hidden white-space-nowrap">
                                        {item.nombreProducto}
                                    </span>
                                    <span className="text-xs text-gray-500">
                                        Ordenado: {item.cantidad} {item.unidadVenta}
                                    </span>
                                </div>
                                <div className="w-4 flex justify-content-end">
                                    <InputNumber
                                        value={leftoverQuantities[item.idDetalle] || 0}
                                        onValueChange={(e) => handleQuantityChange(item.idDetalle, e.value)}
                                        showButtons
                                        buttonLayout="horizontal"
                                        step={1}
                                        min={0}
                                        decrementButtonClassName="p-button-secondary"
                                        incrementButtonClassName="p-button-secondary"
                                        incrementButtonIcon="pi pi-plus"
                                        decrementButtonIcon="pi pi-minus"
                                        inputStyle={{ width: '3rem', textAlign: 'center' }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </Dialog>
    );
};