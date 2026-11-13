import React from 'react';
import {
    render,
    screen,
    waitFor,
    fireEvent,
} from '@testing-library/react';
import DesignerOrderDetailPage from '@/app/(main)/designerdetail/page';
import { OrderService } from '@/app/service/orderService';
import { ClientService } from '@/app/service/clientService';
import { CatalogService } from '@/app/service/catalogService';
import { downloadDesignFile } from '@/app/utils/downloadUtils';

const mockPush = jest.fn();
const mockToastShow = jest.fn();

jest.mock('next/navigation', () => ({
    useSearchParams: () => ({
        get: () => '101'
    }),
    useRouter: () => ({
        push: mockPush
    })
}));

jest.mock('next/link', () => {
    return function MockLink({
        href,
        children,
        legacyBehavior,
        passHref,
        ...props
    }: {
        href: string;
        children: React.ReactNode;
        legacyBehavior?: boolean;
        passHref?: boolean;
        [key: string]: unknown;
    }) {
        if (legacyBehavior) {
            return React.cloneElement(children as React.ReactElement, {
                href,
                ...props
            });
        }

        return (
            <a href={href} {...props}>
                {children}
            </a>
        );
    };
});


jest.mock('primereact/card', () => ({
    Card: ({ title, children, className }: any) => (
        <section className={className}>
            {title && <h2>{title}</h2>}
            {children}
        </section>
    )
}));

jest.mock('primereact/button', () => ({
    Button: ({
        label,
        children,
        onClick,
        disabled,
        loading,
        type,
        icon
    }: any) => (
        <button
            type={type || 'button'}
            onClick={onClick}
            disabled={disabled || loading}
        >
            {icon && <span className={icon} />}
            {label || children}
        </button>
    )
}));

jest.mock('primereact/toast', () => {
    const React = require('react');

    return {
        Toast: React.forwardRef((_props: any, ref: any) => {
            React.useImperativeHandle(ref, () => ({
                show: mockToastShow
            }));

            return <div data-testid="toast" />;
        })
    };
});

jest.mock('primereact/fileupload', () => {
    const React = require('react');

    return {
        FileUpload: React.forwardRef(
            ({ chooseLabel, onSelect, onClear }: any, ref: any) => {
                React.useImperativeHandle(ref, () => ({
                    clear: jest.fn()
                }));

                return (
                    <div>
                        <label htmlFor="design-file">{chooseLabel}</label>
                        <input
                            id="design-file"
                            type="file"
                            onChange={(event: any) => {
                                const files = Array.from(event.target.files || []);
                                onSelect?.({ files });
                            }}
                        />
                        <button type="button" onClick={onClear}>
                            Limpiar
                        </button>
                    </div>
                );
            }
        )
    };
});

jest.mock('primereact/image', () => ({
    Image: ({ src, alt, onError }: any) => (
        <img src={src} alt={alt} onError={onError} />
    )
}));

jest.mock('primereact/tag', () => ({
    Tag: ({ value }: any) => <span>{value}</span>
}));

jest.mock('primereact/steps', () => ({
    Steps: ({ model, activeIndex }: any) => (
        <div data-testid="steps" data-active-index={activeIndex}>
            {model.map((item: any) => (
                <span key={item.label}>{item.label}</span>
            ))}
        </div>
    )
}));

jest.mock('primereact/column', () => ({
    Column: () => null
}));

jest.mock('primereact/datatable', () => {
    const React = require('react');

    return {
        DataTable: ({ value, children, emptyMessage }: any) => {
            const columns = React.Children.toArray(children) as any[];

            if (!value?.length) {
                return <div>{emptyMessage}</div>;
            }

            return (
                <table>
                    <thead>
                        <tr>
                            {columns.map((column: any, index: number) => (
                                <th key={index}>{column.props.header}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {value.map((row: any, rowIndex: number) => (
                            <tr key={rowIndex}>
                                {columns.map((column: any, columnIndex: number) => (
                                    <td key={columnIndex}>
                                        {column.props.body
                                            ? column.props.body(row)
                                            : row[column.props.field]}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            );
        }
    };
});

jest.mock('@/app/service/orderService', () => ({
    OrderService: {
        getOrdenById: jest.fn(),
        getArchivoUrlVerificado: jest.fn(),
        avanzarEstatus: jest.fn(),
        subirArchivo: jest.fn()
    }
}));

jest.mock('@/app/service/clientService', () => ({
    ClientService: {
        getById: jest.fn()
    }
}));

jest.mock('@/app/service/catalogService', () => ({
    CatalogService: {
        getAllProductos: jest.fn()
    }
}));

jest.mock('@/app/utils/downloadUtils', () => ({
    downloadDesignFile: jest.fn()
}));

const mockOrder = {
    idOrden: 101,
    idCliente: 1,
    idEstatusActual: 7,
    fechaEntregaFormal: '2026-11-20',
    rutaArchivo: null,
    notasDiseno: 'Diseño de prueba',
    detalles: [
        {
            idProducto: 10,
            cantidad: 100
        },
        {
            idProducto: 20,
            cantidad: 50
        }
    ]
};

const mockProducts = [
    {
        idProducto: 10,
        descripcion: 'Tarjetas de presentación',
        formatoTamano: '9 x 5 cm',
        unidadVenta: 'Pieza'
    },
    {
        idProducto: 20,
        descripcion: 'Volantes',
        formatoTamano: 'Carta',
        unidadVenta: 'Pieza'
    }
];

const mockClient = {
    id: 1,
    nombre: 'Cliente de prueba',
    telefono: '2291234567'
};

const waitForInitialLoad = async () => {
    expect(await screen.findByText('Orden N° 101')).toBeInTheDocument();

    await waitFor(() => {
        expect(OrderService.getOrdenById).toHaveBeenCalledWith(101);
        expect(CatalogService.getAllProductos).toHaveBeenCalled();
    });
};

describe('DesignerOrderDetailPage - Pruebas de integración', () => {
    beforeEach(() => {
        jest.clearAllMocks();

        localStorage.setItem(
            'user',
            JSON.stringify({
                idUsuario: 15,
                nombre: 'Ana Diseñadora',
                rol: 'DISENADOR'
            })
        );

        (OrderService.getOrdenById as jest.Mock).mockResolvedValue({
            ...mockOrder
        });

        (OrderService.getArchivoUrlVerificado as jest.Mock).mockResolvedValue(null);
        (OrderService.avanzarEstatus as jest.Mock).mockResolvedValue({});
        (OrderService.subirArchivo as jest.Mock).mockResolvedValue({});
        (CatalogService.getAllProductos as jest.Mock).mockResolvedValue(mockProducts);
        (ClientService.getById as jest.Mock).mockResolvedValue(mockClient);
    });

    afterEach(() => {
        jest.restoreAllMocks();
        localStorage.clear();
    });

    it('debe cargar y mostrar la información general de la orden', async () => {
        render(<DesignerOrderDetailPage />);

        await waitForInitialLoad();

        expect(screen.getByText('Fecha de entrega: 2026-11-20')).toBeInTheDocument();
        expect(screen.getAllByText('En desarrollo')).toHaveLength(2);
        expect(screen.getByText('Diseño de prueba')).toBeInTheDocument();
        expect(await screen.findByText('Cliente de prueba')).toBeInTheDocument();
        expect(await screen.findByText('2291234567')).toBeInTheDocument();
    });

    it('debe mostrar los productos con sus cantidades y medidas', async () => {
        render(<DesignerOrderDetailPage />);

        await waitForInitialLoad();

        expect(screen.getByText('Tarjetas de presentación')).toBeInTheDocument();
        expect(screen.getByText('Volantes')).toBeInTheDocument();
        expect(screen.getByText('9 x 5 cm')).toBeInTheDocument();
        expect(screen.getByText('Carta')).toBeInTheDocument();
        expect(screen.getByText('100')).toBeInTheDocument();
        expect(screen.getByText('50')).toBeInTheDocument();
    });

    it('debe mostrar los valores predeterminados cuando un producto no existe en el catálogo', async () => {
        (CatalogService.getAllProductos as jest.Mock).mockResolvedValue([]);

        render(<DesignerOrderDetailPage />);

        await waitForInitialLoad();

        expect(screen.getByText('Producto #10')).toBeInTheDocument();
        expect(screen.getAllByText('Estándar')).toHaveLength(2);
    });

    it('debe mostrar Mostrador cuando la orden no tiene un cliente asociado', async () => {
        (OrderService.getOrdenById as jest.Mock).mockResolvedValue({
            ...mockOrder,
            idCliente: null
        });

        render(<DesignerOrderDetailPage />);

        await waitForInitialLoad();

        expect(screen.getByText('Mostrador')).toBeInTheDocument();
        expect(ClientService.getById).not.toHaveBeenCalled();
    });

    it('debe avanzar automáticamente una orden del estatus 3 al 7', async () => {
        (OrderService.getOrdenById as jest.Mock).mockResolvedValue({
            ...mockOrder,
            idEstatusActual: 3
        });

        render(<DesignerOrderDetailPage />);

        await waitForInitialLoad();

        await waitFor(() => {
            expect(OrderService.avanzarEstatus).toHaveBeenCalledWith(101, {
                idUsuario: 15,
                idEstatusDestino: 7
            });
        });

        expect(screen.getAllByText('En desarrollo')).toHaveLength(2);
        expect(mockToastShow).toHaveBeenCalledWith(
            expect.objectContaining({
                summary: 'Diseño iniciado'
            })
        );
    });

    it('debe avanzar automáticamente una orden del estatus 4 al 7', async () => {
        (OrderService.getOrdenById as jest.Mock).mockResolvedValue({
            ...mockOrder,
            idEstatusActual: 4
        });

        render(<DesignerOrderDetailPage />);

        await waitForInitialLoad();

        await waitFor(() => {
            expect(OrderService.avanzarEstatus).toHaveBeenCalledWith(101, {
                idUsuario: 15,
                idEstatusDestino: 7
            });
        });
    });

    it('debe regresar al desarrollo una orden con correcciones pendientes', async () => {
        (OrderService.getOrdenById as jest.Mock).mockResolvedValue({
            ...mockOrder,
            idEstatusActual: 10
        });

        render(<DesignerOrderDetailPage />);

        await waitForInitialLoad();

        await waitFor(() => {
            expect(OrderService.avanzarEstatus).toHaveBeenCalledWith(101, {
                idUsuario: 15,
                idEstatusDestino: 7
            });
        });

        expect(mockToastShow).toHaveBeenCalledWith(
            expect.objectContaining({
                summary: 'Correcciones pendientes'
            })
        );
    });

    it('debe mostrar la tarjeta de bloqueo cuando la orden espera insumos', async () => {
        (OrderService.getOrdenById as jest.Mock).mockResolvedValue({
            ...mockOrder,
            idEstatusActual: 2
        });

        render(<DesignerOrderDetailPage />);

        await waitForInitialLoad();

        expect(screen.getByText('Orden Bloqueada')).toBeInTheDocument();
        expect(
            screen.getByText('Esperando verificación de insumos del Taller.')
        ).toBeInTheDocument();
        expect(screen.queryByText('Entrega del diseño')).not.toBeInTheDocument();
        expect(OrderService.avanzarEstatus).not.toHaveBeenCalled();
    });

    it('debe mostrar el formulario de entrega y mantener deshabilitado el envío sin archivo', async () => {
        render(<DesignerOrderDetailPage />);

        await waitForInitialLoad();

        expect(screen.getByText('Entrega del diseño')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Enviar a Revisión' })).toBeDisabled();
    });

    it('debe habilitar el envío cuando se selecciona un archivo', async () => {
        render(<DesignerOrderDetailPage />);

        await waitForInitialLoad();

        const file = new File(['contenido'], 'diseno.pdf', {
            type: 'application/pdf'
        });

        fireEvent.change(screen.getByLabelText('Seleccionar archivo'), {
            target: {
                files: [file]
            }
        });

        expect(screen.getByText('diseno.pdf')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Enviar a Revisión' })).toBeEnabled();
    });

    it('debe subir el archivo y avanzar la orden a revisión', async () => {
        (OrderService.getOrdenById as jest.Mock)
            .mockResolvedValueOnce({ ...mockOrder })
            .mockResolvedValue({ ...mockOrder, idEstatusActual: 8 });

        render(<DesignerOrderDetailPage />);

        await waitForInitialLoad();

        const file = new File(['diseño'], 'diseno-final.pdf', {
            type: 'application/pdf'
        });

        fireEvent.change(screen.getByLabelText('Seleccionar archivo'), {
            target: {
                files: [file]
            }
        });

        fireEvent.click(screen.getByRole('button', { name: 'Enviar a Revisión' }));

        await waitFor(() => {
            expect(OrderService.subirArchivo).toHaveBeenCalledWith(101, file);
            expect(OrderService.avanzarEstatus).toHaveBeenCalledWith(101, {
                idUsuario: 15,
                idEstatusDestino: 8
            });
        });

        expect(mockToastShow).toHaveBeenCalledWith(
            expect.objectContaining({
                summary: 'Diseño enviado'
            })
        );
    });

    it('debe aprobar el diseño y avanzar la orden al estatus 9', async () => {
        (OrderService.getOrdenById as jest.Mock)
            .mockResolvedValueOnce({ ...mockOrder, idEstatusActual: 8 })
            .mockResolvedValue({ ...mockOrder, idEstatusActual: 9 });

        render(<DesignerOrderDetailPage />);

        await waitForInitialLoad();

        fireEvent.click(screen.getByRole('button', { name: 'Aprobado (Finalizar)' }));

        await waitFor(() => {
            expect(OrderService.avanzarEstatus).toHaveBeenCalledWith(101, {
                idUsuario: 15,
                idEstatusDestino: 9,
                clienteAprobo: true
            });
        });

        expect(mockToastShow).toHaveBeenCalledWith(
            expect.objectContaining({
                summary: 'Diseño aprobado'
            })
        );
    });

    it('debe rechazar el diseño y regresar la orden al desarrollo', async () => {
        (OrderService.getOrdenById as jest.Mock)
            .mockResolvedValueOnce({ ...mockOrder, idEstatusActual: 8 })
            .mockResolvedValue({ ...mockOrder, idEstatusActual: 7 });

        render(<DesignerOrderDetailPage />);

        await waitForInitialLoad();

        fireEvent.click(screen.getByRole('button', { name: 'Rechazado (Corregir)' }));

        await waitFor(() => {
            expect(OrderService.avanzarEstatus).toHaveBeenNthCalledWith(1, 101, {
                idUsuario: 15,
                idEstatusDestino: 10,
                clienteAprobo: false
            });

            expect(OrderService.avanzarEstatus).toHaveBeenNthCalledWith(2, 101, {
                idUsuario: 15,
                idEstatusDestino: 7
            });
        });

        expect(mockToastShow).toHaveBeenCalledWith(
            expect.objectContaining({
                summary: 'Diseño rechazado'
            })
        );
    });

    it('debe mostrar un error cuando no se puede cargar la información de la orden', async () => {
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
        (OrderService.getOrdenById as jest.Mock).mockRejectedValue(
            new Error('Error al consultar la orden')
        );

        render(<DesignerOrderDetailPage />);

        await waitFor(() => {
            expect(mockToastShow).toHaveBeenCalledWith(
                expect.objectContaining({
                    severity: 'error',
                    detail: 'Error cargando información.'
                })
            );
        });

        expect(consoleErrorSpy).toHaveBeenCalled();
        expect(screen.queryByText('Orden N° 101')).not.toBeInTheDocument();
    });

    it('debe mostrar un error cuando falla el envío del diseño', async () => {
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
        (OrderService.subirArchivo as jest.Mock).mockRejectedValue(
            new Error('Error al subir archivo')
        );

        render(<DesignerOrderDetailPage />);

        await waitForInitialLoad();

        const file = new File(['diseño'], 'diseno.pdf', {
            type: 'application/pdf'
        });

        fireEvent.change(screen.getByLabelText('Seleccionar archivo'), {
            target: {
                files: [file]
            }
        });

        fireEvent.click(screen.getByRole('button', { name: 'Enviar a Revisión' }));

        await waitFor(() => {
            expect(mockToastShow).toHaveBeenCalledWith(
                expect.objectContaining({
                    severity: 'error',
                    detail: 'No se pudo completar el envío a revisión.'
                })
            );
        });

        expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('debe mostrar un error cuando falla el registro de la decisión del cliente', async () => {
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
        (OrderService.getOrdenById as jest.Mock).mockResolvedValue({
            ...mockOrder,
            idEstatusActual: 8
        });
        (OrderService.avanzarEstatus as jest.Mock).mockRejectedValue(
            new Error('Error al actualizar estatus')
        );

        render(<DesignerOrderDetailPage />);

        await waitForInitialLoad();

        fireEvent.click(screen.getByRole('button', { name: 'Aprobado (Finalizar)' }));

        await waitFor(() => {
            expect(mockToastShow).toHaveBeenCalledWith(
                expect.objectContaining({
                    severity: 'error',
                    detail: 'No se pudo completar la transición de estado. Verifica el estado actual de la orden.'
                })
            );
        });

        expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('debe mostrar la imagen de referencia cuando existe un archivo asociado', async () => {
        (OrderService.getOrdenById as jest.Mock).mockResolvedValue({
            ...mockOrder,
            rutaArchivo: 'ordenes/referencia.png'
        });
        (OrderService.getArchivoUrlVerificado as jest.Mock).mockResolvedValue(
            'https://servidor.test/referencia.png'
        );

        render(<DesignerOrderDetailPage />);

        await waitForInitialLoad();

        expect(await screen.findByAltText('Referencia')).toHaveAttribute(
            'src',
            'https://servidor.test/referencia.png'
        );
    });

    it('debe ejecutar la utilidad de descarga de la referencia', async () => {
        (OrderService.getOrdenById as jest.Mock).mockResolvedValue({
            ...mockOrder,
            rutaArchivo: 'ordenes/referencia.png'
        });
        (OrderService.getArchivoUrlVerificado as jest.Mock).mockResolvedValue(
            'https://servidor.test/referencia.png'
        );

        render(<DesignerOrderDetailPage />);

        await waitForInitialLoad();

        fireEvent.click(
            await screen.findByRole('button', { name: 'Descargar referencia' })
        );

        expect(downloadDesignFile).toHaveBeenCalledWith(
            expect.objectContaining({
                imageUrl: 'https://servidor.test/referencia.png',
                rutaArchivo: 'ordenes/referencia.png',
                fallbackFilename: 'referencia-orden-101'
            })
        );
    });
});