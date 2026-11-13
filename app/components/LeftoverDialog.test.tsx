import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { LeftoversDialog, OrderItem } from './LeftoversDialog';

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
            disabled={disabled}
            aria-busy={loading || undefined}
        >
            {loading ? 'Cargando...' : label}
        </button>
    )
}));

jest.mock('primereact/checkbox', () => ({
    Checkbox: ({ inputId, checked, onChange }: any) => (
        <input
            id={inputId}
            type="checkbox"
            checked={checked}
            onChange={(e) =>
                onChange({ checked: e.target.checked })
            }
        />
    )
}));

jest.mock('primereact/inputnumber', () => ({
    InputNumber: ({ value, onValueChange, min }: any) => (
        <input
            type="number"
            aria-label="Cantidad sobrante"
            value={value}
            min={min}
            onChange={(e) =>
                onValueChange({
                    value: e.target.value === '' ? null : Number(e.target.value)
                })
            }
        />
    )
}));

describe('LeftoversDialog', () => {
    const orderItems: OrderItem[] = [
        {
            idDetalle: 1,
            idProducto: 101,
            nombreProducto: 'Lona impresa',
            cantidad: 10,
            unidadVenta: 'metros'
        },
        {
            idDetalle: 2,
            idProducto: 102,
            nombreProducto: 'Tarjetas de presentación',
            cantidad: 500,
            unidadVenta: 'piezas'
        }
    ];

    const defaultProps = {
        visible: true,
        onHide: jest.fn(),
        onConfirm: jest.fn(),
        orderItems,
        isSubmitting: false
    };

    const renderDialog = (props = {}) => {
        const finalProps = {
            ...defaultProps,
            ...props
        };

        return {
            ...render(<LeftoversDialog {...finalProps} />),
            props: finalProps
        };
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('debe mostrar el diálogo cuando visible es true', () => {
        renderDialog();

        expect(screen.getByRole('dialog', {
            name: 'Finalizar orden'
        })).toBeInTheDocument();

        expect(screen.getByText(
            '¿Quedaron materiales sobrantes de esta orden?'
        )).toBeInTheDocument();
    });

    it('no debe mostrar el diálogo cuando visible es false', () => {
        renderDialog({ visible: false });

        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('debe iniciar con la opción de sobrantes desactivada', () => {
        renderDialog();

        expect(screen.getByRole('checkbox')).not.toBeChecked();
    });

    it('no debe mostrar los productos cuando no hay sobrantes', () => {
        renderDialog();

        expect(screen.queryByText('Lona impresa')).not.toBeInTheDocument();
        expect(screen.queryByText('Tarjetas de presentación')).not.toBeInTheDocument();
    });

    it('debe mostrar los productos al activar la opción de sobrantes', () => {
        renderDialog();

        fireEvent.click(screen.getByRole('checkbox'));

        expect(screen.getByText('Lona impresa')).toBeInTheDocument();
        expect(screen.getByText('Tarjetas de presentación')).toBeInTheDocument();
    });

    it('debe mostrar las cantidades originales y unidades de cada producto', () => {
        renderDialog();

        fireEvent.click(screen.getByRole('checkbox'));

        expect(screen.getByText('Ordenado: 10 metros')).toBeInTheDocument();
        expect(screen.getByText('Ordenado: 500 piezas')).toBeInTheDocument();
    });

    it('debe mostrar la descripción para registrar los sobrantes', () => {
        renderDialog();

        fireEvent.click(screen.getByRole('checkbox'));

        expect(screen.getByText(
            'Indica la cantidad de piezas sobrantes por producto para agregarlas al inventario del cliente.'
        )).toBeInTheDocument();
    });

    it('debe mostrar una cantidad inicial de cero para cada producto', () => {
        renderDialog();

        fireEvent.click(screen.getByRole('checkbox'));

        const inputs = screen.getAllByRole('spinbutton', {
            name: 'Cantidad sobrante'
        });

        expect(inputs).toHaveLength(2);
        expect(inputs[0]).toHaveValue(0);
        expect(inputs[1]).toHaveValue(0);
    });

    it('debe actualizar la cantidad sobrante de un producto', () => {
        renderDialog();

        fireEvent.click(screen.getByRole('checkbox'));

        const inputs = screen.getAllByRole('spinbutton', {
            name: 'Cantidad sobrante'
        });

        fireEvent.change(inputs[0], {
            target: { value: '3' }
        });

        expect(inputs[0]).toHaveValue(3);
        expect(inputs[1]).toHaveValue(0);
    });

    it('debe mantener cantidades independientes para cada producto', () => {
        renderDialog();

        fireEvent.click(screen.getByRole('checkbox'));

        const inputs = screen.getAllByRole('spinbutton', {
            name: 'Cantidad sobrante'
        });

        fireEvent.change(inputs[0], {
            target: { value: '2' }
        });

        fireEvent.change(inputs[1], {
            target: { value: '15' }
        });

        expect(inputs[0]).toHaveValue(2);
        expect(inputs[1]).toHaveValue(15);
    });

    it('debe configurar el mínimo de cantidad en cero', () => {
        renderDialog();

        fireEvent.click(screen.getByRole('checkbox'));

        const inputs = screen.getAllByRole('spinbutton', {
            name: 'Cantidad sobrante'
        });

        inputs.forEach(input => {
            expect(input).toHaveAttribute('min', '0');
        });
    });

    it('debe confirmar sin sobrantes cuando la opción está desactivada', () => {
        const { props } = renderDialog();

        fireEvent.click(screen.getByRole('button', {
            name: 'Confirmar y cerrar orden'
        }));

        expect(props.onConfirm).toHaveBeenCalledTimes(1);
        expect(props.onConfirm).toHaveBeenCalledWith(false, {});
    });

    it('debe confirmar con sobrantes y sus cantidades correspondientes', () => {
        const { props } = renderDialog();

        fireEvent.click(screen.getByRole('checkbox'));

        const inputs = screen.getAllByRole('spinbutton', {
            name: 'Cantidad sobrante'
        });

        fireEvent.change(inputs[0], {
            target: { value: '3' }
        });

        fireEvent.change(inputs[1], {
            target: { value: '20' }
        });

        fireEvent.click(screen.getByRole('button', {
            name: 'Confirmar y cerrar orden'
        }));

        expect(props.onConfirm).toHaveBeenCalledTimes(1);
        expect(props.onConfirm).toHaveBeenCalledWith(true, {
            1: 3,
            2: 20
        });
    });

    it('debe conservar la cantidad cero de un producto al confirmar', () => {
        const { props } = renderDialog();

        fireEvent.click(screen.getByRole('checkbox'));

        const inputs = screen.getAllByRole('spinbutton', {
            name: 'Cantidad sobrante'
        });

        fireEvent.change(inputs[0], {
            target: { value: '4' }
        });

        fireEvent.click(screen.getByRole('button', {
            name: 'Confirmar y cerrar orden'
        }));

        expect(props.onConfirm).toHaveBeenCalledWith(true, {
            1: 4
        });
    });

    it('debe convertir un valor nulo de cantidad a cero', () => {
        const { props } = renderDialog();

        fireEvent.click(screen.getByRole('checkbox'));

        const input = screen.getAllByRole('spinbutton', {
            name: 'Cantidad sobrante'
        })[0];

        fireEvent.change(input, {
            target: { value: '' }
        });

        fireEvent.click(screen.getByRole('button', {
            name: 'Confirmar y cerrar orden'
        }));

        expect(props.onConfirm).toHaveBeenCalledWith(true, {
            1: 0
        });
    });

    it('debe restablecer la opción de sobrantes al volver a mostrar el diálogo', () => {
        const { rerender, props } = renderDialog();

        fireEvent.click(screen.getByRole('checkbox'));

        fireEvent.change(screen.getAllByRole('spinbutton', {
            name: 'Cantidad sobrante'
        })[0], {
            target: { value: '5' }
        });

        rerender(
            <LeftoversDialog
                {...props}
                visible={false}
            />
        );

        rerender(
            <LeftoversDialog
                {...props}
                visible={true}
            />
        );

        expect(screen.getByRole('checkbox')).not.toBeChecked();
        expect(screen.queryByText('Lona impresa')).not.toBeInTheDocument();
    });

    it('debe restablecer las cantidades al volver a mostrar el diálogo', () => {
        const { rerender, props } = renderDialog();

        fireEvent.click(screen.getByRole('checkbox'));

        fireEvent.change(screen.getAllByRole('spinbutton', {
            name: 'Cantidad sobrante'
        })[0], {
            target: { value: '5' }
        });

        rerender(
            <LeftoversDialog
                {...props}
                visible={false}
            />
        );

        rerender(
            <LeftoversDialog
                {...props}
                visible={true}
            />
        );

        fireEvent.click(screen.getByRole('checkbox'));

        const inputs = screen.getAllByRole('spinbutton', {
            name: 'Cantidad sobrante'
        });

        expect(inputs[0]).toHaveValue(0);
        expect(inputs[1]).toHaveValue(0);
    });

    it('debe llamar a onHide al cancelar', () => {
        const { props } = renderDialog();

        fireEvent.click(screen.getByRole('button', {
            name: 'Cancelar'
        }));

        expect(props.onHide).toHaveBeenCalledTimes(1);
    });

    it('debe deshabilitar cancelar mientras se envía la información', () => {
        renderDialog({ isSubmitting: true });

        expect(screen.getByRole('button', {
            name: 'Cancelar'
        })).toBeDisabled();
    });

    it('debe mostrar el estado de carga en confirmar mientras se envía la información', () => {
        renderDialog({ isSubmitting: true });

        const confirmButton = screen.getByRole('button', {
            name: 'Cargando...'
        });

        expect(confirmButton).toHaveAttribute('aria-busy', 'true');
        expect(confirmButton).not.toBeDisabled();
    });

    it('no debe permitir cerrar el diálogo mientras se envía la información', () => {
        const { props } = renderDialog({ isSubmitting: true });

        fireEvent.click(screen.getByRole('button', {
            name: 'Cerrar diálogo'
        }));

        expect(props.onHide).not.toHaveBeenCalled();
    });

    it('debe permitir cerrar el diálogo cuando no se está enviando información', () => {
        const { props } = renderDialog();

        fireEvent.click(screen.getByRole('button', {
            name: 'Cerrar diálogo'
        }));

        expect(props.onHide).toHaveBeenCalledTimes(1);
    });

    it('debe permitir confirmar mientras se está enviando información', () => {
        const { props } = renderDialog({ isSubmitting: true });

        fireEvent.click(screen.getByRole('button', {
            name: 'Cargando...'
        }));

        expect(props.onConfirm).toHaveBeenCalledWith(false, {});
    });
});