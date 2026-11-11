import React, { useState, useEffect } from 'react';
import { Dialog } from 'primereact/dialog';
import { Button } from 'primereact/button';
import { InputNumber } from 'primereact/inputnumber';

interface ConsumeLeftoverDialogProps {
    visible: boolean;
    onHide: () => void;
    onConfirm: (quantity: number) => void;
    maxQuantity: number;
    productName: string;
    isConsuming: boolean;
}

export const ConsumeLeftoverDialog: React.FC<ConsumeLeftoverDialogProps> = ({
    visible,
    onHide,
    onConfirm,
    maxQuantity,
    productName,
    isConsuming
}) => {
    const [quantity, setQuantity] = useState<number>(1);

    useEffect(() => {
        if (visible) {
            setQuantity(1);
        }
    }, [visible]);

    const footer = (
        <div>
            <Button
                label="Cancelar"
                icon="pi pi-times"
                onClick={onHide}
                className="p-button-text"
                disabled={isConsuming}
            />
            <Button
                label="Confirmar"
                icon="pi pi-check"
                onClick={() => onConfirm(quantity)}
                autoFocus
                loading={isConsuming}
            />
        </div>
    );

    return (
        <Dialog
            header="Consumir inventario"
            visible={visible}
            style={{ width: '90vw', maxWidth: '400px' }}
            onHide={() => !isConsuming && onHide()}
            footer={footer}
        >
            <div className="flex flex-column gap-3">
                <p className="m-0 text-center">
                    ¿Cuántas unidades de <strong className="text-blue-600">{productName}</strong> vas a descontar del inventario?
                </p>
                <div className="flex align-items-center justify-content-center mt-3">
                    <InputNumber
                        value={quantity}
                        onValueChange={(e) => setQuantity(e.value ?? 1)}
                        showButtons
                        buttonLayout="horizontal"
                        step={1}
                        min={1}
                        max={maxQuantity}
                        decrementButtonClassName="p-button-secondary"
                        incrementButtonClassName="p-button-secondary"
                        incrementButtonIcon="pi pi-plus"
                        decrementButtonIcon="pi pi-minus"
                        inputStyle={{ width: '4rem', textAlign: 'center', fontSize: '1.2rem' }}
                    />
                </div>
                <small className="text-center text-gray-500 font-medium">
                    Máximo disponible: {maxQuantity}
                </small>
            </div>
        </Dialog>
    );
};