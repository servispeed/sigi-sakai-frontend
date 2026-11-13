import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ConsumeLeftoverDialog } from './ConsumeLeftoverDialog';

jest.mock('primereact/dialog', () => ({
    Dialog: ({ visible, header, onHide, footer, children }: any) =>
        visible ? (
            <div role="dialog" aria-label={header}>
                <h2>{header}</h2>
                {children}
                {footer}
                <button onClick={onHide}>Cerrar diálogo</button>
            </div>
        ) : null
}));

jest.mock('primereact/button', () => ({
    Button: ({ label, onClick, disabled, loading }: any) => (
        <button
            onClick={onClick}
            disabled={disabled || loading}
        >
            {loading ? 'Cargando...' : label}
        </button>
    )
}));

jest.mock('primereact/inputnumber', () => ({
    InputNumber: ({ value, onValueChange, min, max }: any) => (
        <input
            type="number"
            aria-label="Cantidad"
            value={value}
            min={min}
            max={max}
            onChange={(e) =>
                onValueChange({
                    value: e.target.value === '' ? null : Number(e.target.value)
                })
            }
        />
    )
}));

describe('ConsumeLeftoverDialog', () => {
    const defaultProps = {
        visible: true,
        onHide: jest.fn(),
        onConfirm: jest.fn(),
        maxQuantity: 10,
        productName: 'Lona impresa',
        isConsuming: false
    };

    const renderDialog = (props = {}) => {
        const finalProps = {
            ...defaultProps,
            ...props
        };

        return {
            ...render(<ConsumeLeftoverDialog {...finalProps} />),
            props: finalProps
        };
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('debe mostrar el diálogo cuando visible es true', () => {
        renderDialog();

        expect(screen.getByRole('dialog', {
            name: 'Consumir inventario'
        })).toBeInTheDocument();

        expect(screen.getByText('Lona impresa')).toBeInTheDocument();
        expect(screen.getByText('Máximo disponible: 10')).toBeInTheDocument();
    });

    it('no debe mostrar el diálogo cuando visible es false', () => {
        renderDialog({ visible: false });

        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('debe inicializar la cantidad en uno', () => {
        renderDialog();

        expect(screen.getByRole('spinbutton', {
            name: 'Cantidad'
        })).toHaveValue(1);
    });

    it('debe permitir modificar la cantidad', () => {
        renderDialog();

        fireEvent.change(screen.getByRole('spinbutton', {
            name: 'Cantidad'
        }), {
            target: { value: '5' }
        });

        expect(screen.getByRole('spinbutton', {
            name: 'Cantidad'
        })).toHaveValue(5);
    });

    it('debe confirmar el consumo con la cantidad seleccionada', () => {
        const { props } = renderDialog();

        fireEvent.change(screen.getByRole('spinbutton', {
            name: 'Cantidad'
        }), {
            target: { value: '4' }
        });

        fireEvent.click(screen.getByRole('button', {
            name: 'Confirmar'
        }));

        expect(props.onConfirm).toHaveBeenCalledTimes(1);
        expect(props.onConfirm).toHaveBeenCalledWith(4);
    });

    it('debe confirmar con cantidad uno si no se modifica el valor', () => {
        const { props } = renderDialog();

        fireEvent.click(screen.getByRole('button', {
            name: 'Confirmar'
        }));

        expect(props.onConfirm).toHaveBeenCalledWith(1);
    });

    it('debe restablecer la cantidad a uno cuando el diálogo vuelve a mostrarse', () => {
        const { rerender, props } = renderDialog();

        fireEvent.change(screen.getByRole('spinbutton', {
            name: 'Cantidad'
        }), {
            target: { value: '6' }
        });

        expect(screen.getByRole('spinbutton', {
            name: 'Cantidad'
        })).toHaveValue(6);

        rerender(
            <ConsumeLeftoverDialog
                {...props}
                visible={false}
            />
        );

        rerender(
            <ConsumeLeftoverDialog
                {...props}
                visible={true}
            />
        );

        expect(screen.getByRole('spinbutton', {
            name: 'Cantidad'
        })).toHaveValue(1);
    });

    it('debe llamar a onHide al cancelar', () => {
        const { props } = renderDialog();

        fireEvent.click(screen.getByRole('button', {
            name: 'Cancelar'
        }));

        expect(props.onHide).toHaveBeenCalledTimes(1);
    });

    it('debe deshabilitar cancelar mientras se consume', () => {
        renderDialog({ isConsuming: true });

        expect(screen.getByRole('button', {
            name: 'Cancelar'
        })).toBeDisabled();
    });

    it('debe mostrar el estado de carga en el botón confirmar mientras se consume', () => {
        renderDialog({ isConsuming: true });

        expect(screen.getByRole('button', {
            name: 'Cargando...'
        })).toBeDisabled();
    });

    it('no debe permitir cerrar el diálogo mientras se consume', () => {
        const { props } = renderDialog({ isConsuming: true });

        fireEvent.click(screen.getByRole('button', {
            name: 'Cerrar diálogo'
        }));

        expect(props.onHide).not.toHaveBeenCalled();
    });

    it('debe permitir cerrar el diálogo cuando no se está consumiendo', () => {
        const { props } = renderDialog();

        fireEvent.click(screen.getByRole('button', {
            name: 'Cerrar diálogo'
        }));

        expect(props.onHide).toHaveBeenCalledTimes(1);
    });

    it('debe mostrar el nombre del producto recibido por props', () => {
        renderDialog({ productName: 'Tarjetas de presentación' });

        expect(screen.getByText('Tarjetas de presentación')).toBeInTheDocument();
    });

    it('debe mostrar el máximo disponible recibido por props', () => {
        renderDialog({ maxQuantity: 25 });

        expect(screen.getByText('Máximo disponible: 25')).toBeInTheDocument();
    });

    it('debe establecer el máximo permitido en el control de cantidad', () => {
        renderDialog({ maxQuantity: 7 });

        expect(screen.getByRole('spinbutton', {
            name: 'Cantidad'
        })).toHaveAttribute('max', '7');
    });

    it('debe establecer el mínimo permitido en uno', () => {
        renderDialog();

        expect(screen.getByRole('spinbutton', {
            name: 'Cantidad'
        })).toHaveAttribute('min', '1');
    });
});