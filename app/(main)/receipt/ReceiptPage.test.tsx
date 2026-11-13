import React from 'react';
import {
    render,
    screen,
    fireEvent,
    waitFor,
    act
} from '@testing-library/react';
import '@testing-library/jest-dom';
import UploadReceiptPage from './page';

import { comprasService } from '@/app/service/shopService';
import { CatalogService } from '@/app/service/catalogService';

const mockPush = jest.fn();
const mockToastShow = jest.fn();

jest.mock('next/navigation', () => ({
    useSearchParams: () => new URLSearchParams('id=123'),
    useRouter: () => ({ push: mockPush })
}));

jest.mock('next/link', () => {
    const React = require('react');

    const Link = ({ children }: any) => <>{children}</>;

    Link.displayName = 'MockLink';

    return {
        __esModule: true,
        default: Link
    };
});

jest.mock('primereact/card', () => ({
    Card: ({ children, className }: any) => (
        <div className={className}>{children}</div>
    )
}));

jest.mock('primereact/toast', () => {
    const React = require('react');

    const Toast = React.forwardRef((_props: any, ref: any) => {
        React.useImperativeHandle(ref, () => ({
            show: (...args: any[]) => mockToastShow(...args)
        }));

        return <div data-testid="toast" />;
    });

    Toast.displayName = 'MockToast';

    return { Toast };
});

jest.mock('primereact/button', () => ({
    Button: ({
        label,
        icon,
        tooltip,
        onClick,
        disabled,
        loading
    }: any) => (
        <button
            type="button"
            aria-label={tooltip || label || icon || 'button'}
            onClick={onClick}
            disabled={disabled || loading}
        >
            {icon && <span aria-hidden="true">{icon}</span>}
            {label}
        </button>
    )
}));

jest.mock('primereact/dialog', () => ({
    Dialog: ({ visible, header, children, onHide }: any) =>
        visible ? (
            <section role="dialog" aria-label={header}>
                <h2>{header}</h2>
                {children}
                <button type="button" onClick={onHide}>
                    Cerrar diálogo
                </button>
            </section>
        ) : null
}));

jest.mock('primereact/inputnumber', () => ({
    InputNumber: ({ value, onValueChange, placeholder }: any) => (
        <input
            type="number"
            placeholder={placeholder}
            value={value ?? ''}
            onChange={(event) =>
                onValueChange?.({
                    value:
                        event.target.value === ''
                            ? null
                            : Number(event.target.value)
                })
            }
        />
    )
}));

jest.mock('primereact/fileupload', () => ({
    FileUpload: ({ onSelect, chooseLabel, accept, maxFileSize }: any) => (
        <input
            type="file"
            aria-label={chooseLabel}
            accept={accept}
            data-max-file-size={maxFileSize}
            onChange={(event) => {
                const file = event.currentTarget.files?.[0];

                if (file) {
                    onSelect?.({ files: [file] });
                }
            }}
        />
    )
}));

jest.mock('primereact/calendar', () => ({
    Calendar: ({ value, onChange, placeholder }: any) => (
        <input
            type="date"
            aria-label="Nueva fecha de entrega"
            placeholder={placeholder}
            value={
                value
                    ? `${value.getFullYear()}-${String(
                        value.getMonth() + 1
                    ).padStart(2, '0')}-${String(
                        value.getDate()
                    ).padStart(2, '0')}`
                    : ''
            }
            onChange={(event) => {
                const date = event.target.value
                    ? new Date(`${event.target.value}T12:00:00`)
                    : null;

                onChange?.({ value: date });
            }}
        />
    )
}));

jest.mock('@/app/service/shopService', () => ({
    comprasService: {
        getPendientes: jest.fn(),
        registrarCompraExitosa: jest.fn(),
        registrarCompraAtrasada: jest.fn(),
        registrarLlegadaAtrasada: jest.fn()
    }
}));

jest.mock('@/app/service/catalogService', () => ({
    CatalogService: {
        getProductos: jest.fn()
    }
}));

const mockGetPendientes = comprasService.getPendientes as jest.Mock;
const mockRegistrarCompraExitosa =
    comprasService.registrarCompraExitosa as jest.Mock;
const mockRegistrarCompraAtrasada =
    comprasService.registrarCompraAtrasada as jest.Mock;
const mockRegistrarLlegadaAtrasada =
    comprasService.registrarLlegadaAtrasada as jest.Mock;
const mockGetProductos = CatalogService.getProductos as jest.Mock;

const mockSolicitud = {
    idSolicitud: 77,
    idOrden: 123,
    idEstatus: 1,
    descripcionSolicitud: 'Material para impresión',
    fechaCreacion: '2026-01-15T10:30:00',
    detalles: [
        {
            idDetalle: 1,
            idProducto: 10,
            cantidad: 2
        },
        {
            idDetalle: 2,
            idProducto: 20,
            cantidad: 5
        },
        {
            idDetalle: 3,
            idProducto: 30,
            cantidad: 3
        }
    ]
};

const mockProductos = [
    {
        idProducto: 10,
        nombre: 'Papel couché',
        unidadVenta: 'Millar',
        cantidadPaquete: 1000,
        formatoTamano: 'Carta'
    },
    {
        idProducto: 20,
        nombre: 'Lona',
        unidadVenta: 'm²',
        cantidadPaquete: 1,
        formatoTamano: 'Gran formato'
    }
];

const renderPage = () => render(<UploadReceiptPage />);

const seleccionarComprobante = async () => {
    const file = new File(['comprobante'], 'recibo.pdf', {
        type: 'application/pdf'
    });

    const fileInput = screen.getByLabelText('Subir Recibo (PDF/JPG)');

    fireEvent.change(fileInput, {
        target: { files: [file] }
    });

    return file;
};

const ingresarCosto = () => {
    fireEvent.change(screen.getByPlaceholderText('Ej. 450.50'), {
        target: { value: '450.50' }
    });
};

describe('UploadReceiptPage', () => {
    beforeEach(() => {
        jest.clearAllMocks();

        mockGetPendientes.mockResolvedValue([mockSolicitud]);
        mockGetProductos.mockResolvedValue(mockProductos);

        mockRegistrarCompraExitosa.mockResolvedValue(undefined);
        mockRegistrarCompraAtrasada.mockResolvedValue(undefined);
        mockRegistrarLlegadaAtrasada.mockResolvedValue(undefined);
    });

    it('redirige al inicio dos segundos después de registrar la compra', async () => {
        renderPage();

        await screen.findByText('Material para impresión');

        fireEvent.click(
            screen.getByRole('button', {
                name: 'Registrar compra exitosa'
            })
        );

        ingresarCosto();
        await seleccionarComprobante();

        jest.useFakeTimers();

        await act(async () => {
            fireEvent.click(
                screen.getByRole('button', {
                    name: 'Guardar compra'
                })
            );

            await Promise.resolve();
            await Promise.resolve();
        });

        expect(mockRegistrarCompraExitosa).toHaveBeenCalled();

        act(() => {
            jest.advanceTimersByTime(2000);
        });

        expect(mockPush).toHaveBeenCalledWith('/');

        jest.useRealTimers();
    });

    it('muestra el indicador de carga mientras obtiene los datos', () => {
        mockGetPendientes.mockReturnValue(new Promise(() => { }));

        renderPage();

        expect(
            screen.getByText('Cargando solicitud de insumos...')
        ).toBeInTheDocument();
    });

    it('carga la solicitud correspondiente a la orden y los productos', async () => {
        renderPage();

        expect(
            await screen.findByText('Material para impresión')
        ).toBeInTheDocument();

        expect(mockGetPendientes).toHaveBeenCalledTimes(1);
        expect(mockGetProductos).toHaveBeenCalledTimes(1);
    });

    it('muestra el identificador de la orden y los datos de la solicitud', async () => {
        renderPage();

        expect(
            await screen.findByText('Orden N° 123')
        ).toBeInTheDocument();

        expect(screen.getByText(/Solicitud #77/)).toBeInTheDocument();

        expect(
            screen.getByText('Materiales / Insumos requeridos:')
        ).toBeInTheDocument();
    });

    it('formatea la cantidad de productos vendidos por paquete', async () => {
        renderPage();

        expect(
            await screen.findByText('2 Millar (2,000 pzs en total)')
        ).toBeInTheDocument();
    });

    it('muestra la cantidad en metros cuadrados para productos de esa unidad', async () => {
        renderPage();

        expect(await screen.findByText('5 m²')).toBeInTheDocument();
    });

    it('muestra el nombre y formato del producto cuando están disponibles', async () => {
        renderPage();

        expect(
            await screen.findByText('Papel couché')
        ).toBeInTheDocument();

        expect(screen.getByText('Formato: Carta')).toBeInTheDocument();
        expect(screen.getByText('Lona')).toBeInTheDocument();
        expect(
            screen.getByText('Formato: Gran formato')
        ).toBeInTheDocument();
    });

    it('usa el identificador del producto si no existe en el catálogo', async () => {
        mockGetProductos.mockResolvedValue([]);

        renderPage();

        expect(
            await screen.findByText('Producto ID #10')
        ).toBeInTheDocument();

        expect(screen.getByText('2 unidad(es)')).toBeInTheDocument();
    });

    it('muestra un mensaje cuando la solicitud no existe para la orden', async () => {
        mockGetPendientes.mockResolvedValueOnce([]);

        renderPage();

        await waitFor(() => {
            expect(mockToastShow).toHaveBeenCalledWith(
                expect.objectContaining({
                    severity: 'warn',
                    summary: 'Solicitud no encontrada',
                    detail: expect.stringContaining('123')
                })
            );
        });
    });

    it('muestra un error si falla la carga de solicitudes', async () => {
        const consoleErrorSpy = jest
            .spyOn(console, 'error')
            .mockImplementation(() => { });

        mockGetPendientes.mockRejectedValueOnce(
            new Error('Error de servidor')
        );

        renderPage();

        await waitFor(() => {
            expect(mockToastShow).toHaveBeenCalledWith(
                expect.objectContaining({
                    severity: 'error',
                    summary: 'Error de Servidor'
                })
            );
        });

        expect(consoleErrorSpy).toHaveBeenCalledWith(
            'Error al cargar la información:',
            expect.any(Error)
        );

        consoleErrorSpy.mockRestore();
    });

    it('continúa mostrando la solicitud si falla la carga del catálogo', async () => {
        const consoleErrorSpy = jest
            .spyOn(console, 'error')
            .mockImplementation(() => { });

        mockGetProductos.mockRejectedValue(
            new Error('Catálogo no disponible')
        );

        renderPage();

        expect(
            await screen.findByText('Material para impresión')
        ).toBeInTheDocument();

        expect(
            screen.getByText('Producto ID #10')
        ).toBeInTheDocument();

        expect(consoleErrorSpy).toHaveBeenCalledWith(
            'Error al cargar productos:',
            expect.any(Error)
        );

        consoleErrorSpy.mockRestore();
    });

    it('abre el diálogo para registrar una compra exitosa', async () => {
        renderPage();

        await screen.findByText('Material para impresión');

        fireEvent.click(
            screen.getByRole('button', {
                name: 'Registrar compra exitosa'
            })
        );

        expect(
            screen.getByRole('dialog', {
                name: 'Registrar compra exitosa'
            })
        ).toBeInTheDocument();

        expect(
            screen.getByText('Costo de los insumos ($)')
        ).toBeInTheDocument();

        expect(
            screen.getByText('Comprobante o Ticket')
        ).toBeInTheDocument();
    });

    it('registra una compra exitosa con costo y comprobante', async () => {
        renderPage();

        await screen.findByText('Material para impresión');

        fireEvent.click(
            screen.getByRole('button', {
                name: 'Registrar compra exitosa'
            })
        );

        ingresarCosto();

        const file = await seleccionarComprobante();

        fireEvent.click(
            screen.getByRole('button', {
                name: 'Guardar compra'
            })
        );

        await waitFor(() => {
            expect(mockRegistrarCompraExitosa).toHaveBeenCalledWith(
                77,
                450.5,
                file
            );
        });

        expect(mockToastShow).toHaveBeenCalledWith(
            expect.objectContaining({
                severity: 'success',
                summary: 'Éxito',
                detail: 'Compra registrada correctamente.'
            })
        );
    });

    it('no permite registrar una compra sin costo ni comprobante', async () => {
        renderPage();

        await screen.findByText('Material para impresión');

        fireEvent.click(
            screen.getByRole('button', {
                name: 'Registrar compra exitosa'
            })
        );

        expect(
            screen.getByRole('button', {
                name: 'Guardar compra'
            })
        ).toBeDisabled();

        expect(mockRegistrarCompraExitosa).not.toHaveBeenCalled();
    });

    it('muestra un error cuando falla el registro de una compra exitosa', async () => {
        const consoleErrorSpy = jest
            .spyOn(console, 'error')
            .mockImplementation(() => { });

        mockRegistrarCompraExitosa.mockRejectedValueOnce(
            new Error('Error al registrar la compra')
        );

        renderPage();

        await screen.findByText('Material para impresión');

        fireEvent.click(
            screen.getByRole('button', {
                name: 'Registrar compra exitosa'
            })
        );

        ingresarCosto();

        await seleccionarComprobante();

        fireEvent.click(
            screen.getByRole('button', {
                name: 'Guardar compra'
            })
        );

        await waitFor(() => {
            expect(mockToastShow).toHaveBeenCalledWith(
                expect.objectContaining({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'Ocurrió un error al procesar la solicitud.'
                })
            );
        });

        expect(consoleErrorSpy).toHaveBeenCalledWith(
            expect.any(Error)
        );

        expect(
            screen.getByRole('dialog', {
                name: 'Registrar compra exitosa'
            })
        ).toBeInTheDocument();

        consoleErrorSpy.mockRestore();
    });

    it('abre el diálogo para reportar insumos atrasados', async () => {
        renderPage();

        await screen.findByText('Material para impresión');

        fireEvent.click(
            screen.getByRole('button', {
                name: 'Reportar insumos atrasados'
            })
        );

        expect(
            screen.getByRole('dialog', {
                name: 'Reportar insumos atrasados'
            })
        ).toBeInTheDocument();

        expect(
            screen.getByText('Nueva fecha de entrega')
        ).toBeInTheDocument();
    });

    it('registra una compra atrasada con costo, comprobante y nueva fecha', async () => {
        renderPage();

        await screen.findByText('Material para impresión');

        fireEvent.click(
            screen.getByRole('button', {
                name: 'Reportar insumos atrasados'
            })
        );

        ingresarCosto();

        const file = await seleccionarComprobante();

        fireEvent.change(
            screen.getByLabelText('Nueva fecha de entrega'),
            {
                target: { value: '2026-12-01' }
            }
        );

        fireEvent.click(
            screen.getByRole('button', {
                name: 'Confirmar atraso'
            })
        );

        await waitFor(() => {
            expect(mockRegistrarCompraAtrasada).toHaveBeenCalledWith(
                77,
                450.5,
                '2026-12-01',
                file
            );
        });

        expect(mockToastShow).toHaveBeenCalledWith(
            expect.objectContaining({
                severity: 'success',
                summary: 'Éxito',
                detail: 'Compra y atraso registrados.'
            })
        );
    });

    it('no permite reportar un atraso sin ingresar todos los datos', async () => {
        renderPage();

        await screen.findByText('Material para impresión');

        fireEvent.click(
            screen.getByRole('button', {
                name: 'Reportar insumos atrasados'
            })
        );

        expect(
            screen.getByRole('button', {
                name: 'Confirmar atraso'
            })
        ).toBeDisabled();

        ingresarCosto();

        expect(
            screen.getByRole('button', {
                name: 'Confirmar atraso'
            })
        ).toBeDisabled();

        expect(mockRegistrarCompraAtrasada).not.toHaveBeenCalled();
    });

    it('muestra un error cuando falla el registro de una compra atrasada', async () => {
        const consoleErrorSpy = jest
            .spyOn(console, 'error')
            .mockImplementation(() => { });

        mockRegistrarCompraAtrasada.mockRejectedValueOnce(
            new Error('Error al registrar el atraso')
        );

        renderPage();

        await screen.findByText('Material para impresión');

        fireEvent.click(
            screen.getByRole('button', {
                name: 'Reportar insumos atrasados'
            })
        );

        ingresarCosto();

        await seleccionarComprobante();

        fireEvent.change(
            screen.getByLabelText('Nueva fecha de entrega'),
            {
                target: { value: '2026-12-01' }
            }
        );

        fireEvent.click(
            screen.getByRole('button', {
                name: 'Confirmar atraso'
            })
        );

        await waitFor(() => {
            expect(mockToastShow).toHaveBeenCalledWith(
                expect.objectContaining({
                    severity: 'error',
                    summary: 'Error'
                })
            );
        });

        expect(consoleErrorSpy).toHaveBeenCalledWith(
            expect.any(Error)
        );

        consoleErrorSpy.mockRestore();
    });

    it('muestra el panel de llegada cuando la solicitud está atrasada', async () => {
        mockGetPendientes.mockResolvedValueOnce([
            {
                ...mockSolicitud,
                idEstatus: 3
            }
        ]);

        renderPage();

        expect(
            await screen.findByText('Insumos atrasados')
        ).toBeInTheDocument();

        expect(
            screen.getByText(
                'Esta solicitud está marcada como ATRASADA. El gasto ya fue cobrado y registrado.'
            )
        ).toBeInTheDocument();

        expect(
            screen.getByRole('button', {
                name: 'Confirmar llegada de los insumos'
            })
        ).toBeInTheDocument();
    });

    it('abre el diálogo para confirmar la llegada de insumos atrasados', async () => {
        mockGetPendientes.mockResolvedValueOnce([
            {
                ...mockSolicitud,
                idEstatus: 3
            }
        ]);

        renderPage();

        await screen.findByText('Insumos atrasados');

        fireEvent.click(
            screen.getByRole('button', {
                name: 'Confirmar llegada de los insumos'
            })
        );

        expect(
            screen.getByRole('dialog', {
                name: 'Llegada de insumos atrasados'
            })
        ).toBeInTheDocument();

        expect(
            screen.getByRole('button', {
                name: 'Confirmar llegada'
            })
        ).toBeEnabled();
    });

    it('confirma la llegada de los insumos atrasados', async () => {
        mockGetPendientes.mockResolvedValueOnce([
            {
                ...mockSolicitud,
                idEstatus: 3
            }
        ]);

        renderPage();

        await screen.findByText('Insumos atrasados');

        fireEvent.click(
            screen.getByRole('button', {
                name: 'Confirmar llegada de los insumos'
            })
        );

        fireEvent.click(
            screen.getByRole('button', {
                name: 'Confirmar llegada'
            })
        );

        await waitFor(() => {
            expect(mockRegistrarLlegadaAtrasada).toHaveBeenCalledWith(77);
        });

        expect(mockToastShow).toHaveBeenCalledWith(
            expect.objectContaining({
                severity: 'success',
                summary: 'Éxito',
                detail: 'Llegada de insumos confirmada.'
            })
        );
    });

    it('muestra un error cuando falla la confirmación de llegada', async () => {
        const consoleErrorSpy = jest
            .spyOn(console, 'error')
            .mockImplementation(() => { });

        mockRegistrarLlegadaAtrasada.mockRejectedValueOnce(
            new Error('Error al confirmar llegada')
        );

        mockGetPendientes.mockResolvedValueOnce([
            {
                ...mockSolicitud,
                idEstatus: 3
            }
        ]);

        renderPage();

        await screen.findByText('Insumos atrasados');

        fireEvent.click(
            screen.getByRole('button', {
                name: 'Confirmar llegada de los insumos'
            })
        );

        fireEvent.click(
            screen.getByRole('button', {
                name: 'Confirmar llegada'
            })
        );

        await waitFor(() => {
            expect(mockToastShow).toHaveBeenCalledWith(
                expect.objectContaining({
                    severity: 'error',
                    summary: 'Error'
                })
            );
        });

        expect(consoleErrorSpy).toHaveBeenCalledWith(
            expect.any(Error)
        );

        consoleErrorSpy.mockRestore();
    });

    it('cierra el diálogo al cancelar la operación', async () => {
        renderPage();

        await screen.findByText('Material para impresión');

        fireEvent.click(
            screen.getByRole('button', {
                name: 'Registrar compra exitosa'
            })
        );

        expect(
            screen.getByRole('dialog', {
                name: 'Registrar compra exitosa'
            })
        ).toBeInTheDocument();

        fireEvent.click(
            screen.getByRole('button', {
                name: 'Cancelar'
            })
        );

        expect(
            screen.queryByRole('dialog', {
                name: 'Registrar compra exitosa'
            })
        ).not.toBeInTheDocument();
    });

    it('permite cerrar el diálogo mediante su acción de cierre', async () => {
        renderPage();

        await screen.findByText('Material para impresión');

        fireEvent.click(
            screen.getByRole('button', {
                name: 'Reportar insumos atrasados'
            })
        );

        fireEvent.click(
            screen.getByRole('button', {
                name: 'Cerrar diálogo'
            })
        );

        expect(
            screen.queryByRole('dialog', {
                name: 'Reportar insumos atrasados'
            })
        ).not.toBeInTheDocument();
    });
});
